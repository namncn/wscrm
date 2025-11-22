/**
 * Order Service Handler
 * Handles creation of service instances (hosting, VPS, domain) when order is completed
 */

import { db } from './database'
import { orderItems, hosting, vps, domain, orders, domainPackages, hostingPackages, vpsPackages } from './schema'
import { eq, sql, desc } from 'drizzle-orm'
import { ControlPanelSyncService } from './control-panel-sync/sync-service'
import { RetryQueue } from './control-panel-sync/retry-queue'

/**
 * Create service instances from order items when payment is completed
 * This is payment-method agnostic and can be called from any payment provider
 */
export async function createServicesFromOrder(orderId: number | string) {
  try {
    // Convert orderId to number if it's a string
    const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId
    if (isNaN(orderIdNum)) {
      throw new Error(`Invalid orderId: ${orderId}`)
    }

    // Get all order items
    const items = await db.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderIdNum))

    if (items.length === 0) {
      return
    }

    // Get order details to get customerId
    const orderDetails = await db.select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, orderIdNum))
      .limit(1)
    
    if (!orderDetails[0] || !orderDetails[0].customerId) {
      console.error('[OrderService] Order not found:', orderId)
      return
    }

    const customerId = orderDetails[0].customerId

    // Process each order item
    // Track success and failures separately to allow partial success
    const results = {
      success: [] as string[],
      failed: [] as Array<{ itemId: string, serviceType: string, error: string }>,
      skipped: [] as Array<{ itemId: string, serviceType: string, reason: string }>
    }

    for (const item of items) {
      try {
        let created = false
        if (item.serviceType === 'HOSTING') {
          await createHostingService(item, customerId)
          results.success.push(`Hosting: ${item.serviceId}`)
        } else if (item.serviceType === 'VPS') {
          await createVpsService(item, customerId)
          results.success.push(`VPS: ${item.serviceId}`)
        } else if (item.serviceType === 'DOMAIN') {
          created = await createDomainService(item, customerId)
          if (created) {
            results.success.push(`Domain: ${item.id}`)
          } else {
            results.skipped.push({
              itemId: item.id.toString(),
              serviceType: 'DOMAIN',
              reason: 'Domain already exists'
            })
          }
        } else {
          console.warn('[OrderService] Unknown service type:', item.serviceType, 'for item:', item.id)
          results.failed.push({
            itemId: item.id.toString(),
            serviceType: item.serviceType,
            error: 'Unknown service type'
          })
        }
      } catch (itemError: any) {
        // Log error but continue processing other items
        const errorMessage = itemError?.message || 'Unknown error'
        console.error(`[OrderService] Error creating service for item ${item.id} (${item.serviceType}):`, errorMessage)
        results.failed.push({
          itemId: item.id.toString(),
          serviceType: item.serviceType || 'UNKNOWN',
          error: errorMessage
        })
      }
    }

    // Log summary
    if (results.failed.length > 0) {
      console.error('[OrderService] Failed to create', results.failed.length, 'service(s):', results.failed.map(f => `${f.serviceType} (${f.itemId}): ${f.error}`).join(', '))
    }

    // Only throw error if ALL services failed
    if (results.success.length === 0 && results.failed.length > 0) {
      throw new Error(`Failed to create all services: ${results.failed.map(f => f.error).join(', ')}`)
    }
  } catch (error: any) {
    console.error('[OrderService] Critical error creating services:', error)
    throw error
  }
}

/**
 * Create hosting instance for customer
 * @returns true if instance was created
 */
async function createHostingService(item: any, customerId: number): Promise<boolean> {
  try {
    // Parse serviceId to get hostingTypeId
    const hostingTypeId = typeof item.serviceId === 'string' ? parseInt(item.serviceId, 10) : item.serviceId
    
    if (isNaN(hostingTypeId)) {
      console.error('[OrderService] Invalid hostingTypeId:', item.serviceId)
      throw new Error(`Invalid hostingTypeId: ${item.serviceId}`)
    }

    // Get hosting package details
    const hostingPackage = await db.select()
      .from(hostingPackages)
      .where(eq(hostingPackages.id, hostingTypeId))
      .limit(1)

    if (hostingPackage.length === 0) {
      console.error('[OrderService] Hosting package not found:', hostingTypeId)
      throw new Error(`Hosting package not found: ${hostingTypeId}`)
    }

    // Calculate expiry date: 1 year from today
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Create new hosting instance (allow multiple instances per customer)
    const insertResult = await db.insert(hosting).values({
      hostingTypeId: hostingTypeId,
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
      status: 'ACTIVE',
      ipAddress: null,
      expiryDate: expiryDate, // 1 year from today
      syncStatus: 'PENDING', // Will be synced to control panel
    })

    // Get the created hosting record
    const createdHosting = await db.select()
      .from(hosting)
      .where(eq(hosting.customerId, typeof customerId === 'string' ? parseInt(customerId, 10) : customerId))
      .orderBy(desc(hosting.createdAt))
      .limit(1)

    if (createdHosting[0]) {
      // Sync với control panel (async, không block)
      // Không await để không block order completion
      ControlPanelSyncService.syncHostingToControlPanel(createdHosting[0].id)
        .then(result => {
          if (result.success) {
            console.log(`[OrderService] Hosting ${createdHosting[0].id} synced to control panel successfully`)
          } else {
            console.error(`[OrderService] Failed to sync hosting ${createdHosting[0].id}:`, result.error)
            // Add to retry queue
            RetryQueue.addToQueue(createdHosting[0].id, result.error || 'Unknown error')
              .catch(err => console.error(`[OrderService] Error adding to retry queue:`, err))
          }
        })
        .catch(error => {
          console.error(`[OrderService] Error syncing hosting ${createdHosting[0].id}:`, error)
          // Add to retry queue
          RetryQueue.addToQueue(createdHosting[0].id, error.message || 'Unknown error')
            .catch(err => console.error(`[OrderService] Error adding to retry queue:`, err))
        })
    }

    return true
  } catch (error: any) {
    console.error('[OrderService] Error creating hosting:', error)
    throw error
  }
}

/**
 * Create VPS instance for customer
 * @returns true if instance was created
 */
async function createVpsService(item: any, customerId: number): Promise<boolean> {
  try {
    // Parse serviceId to get vpsTypeId
    const vpsTypeId = typeof item.serviceId === 'string' ? parseInt(item.serviceId, 10) : item.serviceId
    
    if (isNaN(vpsTypeId)) {
      console.error('[OrderService] Invalid vpsTypeId:', item.serviceId)
      throw new Error(`Invalid vpsTypeId: ${item.serviceId}`)
    }

    // Get VPS package details
    const vpsPackage = await db.select()
      .from(vpsPackages)
      .where(eq(vpsPackages.id, vpsTypeId))
      .limit(1)

    if (vpsPackage.length === 0) {
      console.error('[OrderService] VPS package not found:', vpsTypeId)
      throw new Error(`VPS package not found: ${vpsTypeId}`)
    }

    // Calculate expiry date: 1 year from today
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Create new VPS instance (allow multiple instances per customer)
    await db.insert(vps).values({
      vpsTypeId: vpsTypeId,
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
      status: 'ACTIVE',
      ipAddress: null,
      expiryDate: expiryDate // 1 year from today
    })

    return true
  } catch (error: any) {
    console.error('[OrderService] Error creating VPS:', error)
    throw error
  }
}

/**
 * Create domain instance for customer
 * @returns true if instance was created, false if skipped (already exists)
 */
async function createDomainService(item: any, customerId: number): Promise<boolean> {
  try {
    // Parse serviceData to get domainTypeId and domainName
    let domainName = ''
    let domainTypeId: number | null = null
    
    if (item.serviceData) {
      try {
        // Handle different formats of serviceData
        let serviceData: any = null
        if (typeof item.serviceData === 'string') {
          // Try to parse as JSON string
          try {
            serviceData = JSON.parse(item.serviceData)
          } catch {
            // If parsing fails, might be a plain string representation
            console.warn('[OrderService] serviceData is string but not valid JSON:', item.serviceData)
          }
        } else if (typeof item.serviceData === 'object') {
          serviceData = item.serviceData
        }
        
        if (serviceData) {
          domainName = serviceData.domainName || ''
          if (serviceData.domainTypeId !== undefined && serviceData.domainTypeId !== null) {
            const parsedDomainTypeId = typeof serviceData.domainTypeId === 'string' 
              ? parseInt(serviceData.domainTypeId, 10) 
              : (typeof serviceData.domainTypeId === 'number' ? serviceData.domainTypeId : null)
            
            // Only set domainTypeId if it's a valid positive number
            if (parsedDomainTypeId !== null && !isNaN(parsedDomainTypeId) && parsedDomainTypeId > 0) {
              domainTypeId = parsedDomainTypeId
            } else {
              console.warn('[OrderService] Invalid domainTypeId in serviceData:', serviceData.domainTypeId, 'parsed as:', parsedDomainTypeId)
            }
          }
        }
      } catch (parseError) {
        console.error('[OrderService] Error parsing serviceData:', parseError, 'serviceData:', item.serviceData)
      }
    }
    
    // Priority 2: Get from serviceName (if it looks like a domain - contains a dot)
    if (!domainName && item.serviceName && typeof item.serviceName === 'string' && item.serviceName.includes('.')) {
      domainName = item.serviceName
    }
    
    // Priority 3: Fallback to serviceId if it looks like a domain
    // (for old orders that might have domain name in serviceId)
    if (!domainName && item.serviceId && typeof item.serviceId === 'string' && item.serviceId.includes('.')) {
      domainName = item.serviceId
    }

    // If domainTypeId is not in serviceData, try to get it from serviceId
    // Note: For DOMAIN orders, serviceId is usually 0, so this won't work
    // But we'll try anyway for backward compatibility
    if (!domainTypeId && item.serviceId !== undefined && item.serviceId !== null) {
      const serviceIdStr = String(item.serviceId)
      // Only try if serviceId doesn't look like a domain name (doesn't contain a dot)
      if (!serviceIdStr.includes('.')) {
        const parsedId = parseInt(serviceIdStr, 10)
        if (!isNaN(parsedId) && parsedId !== 0) {
          domainTypeId = parsedId
        }
      }
    }

    if (!domainName) {
      console.error('[OrderService] Domain name not found for item:', item.id, {
        serviceData: item.serviceData,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        serviceType: item.serviceType
      })
      throw new Error(`Domain name not found for order item ${item.id}`)
    }

    // If domainTypeId is invalid, try to find it by domain extension
    if (!domainTypeId || domainTypeId <= 0) {
      if (domainName) {
        // Extract domain extension (e.g., "net" from "example.net")
        const domainParts = domainName.split('.')
        if (domainParts.length > 1) {
          const extension = domainParts[domainParts.length - 1].toLowerCase()
          
          // Try to find domain package by name (e.g., ".net", ".com")
          const matchingPackages = await db.select()
            .from(domainPackages)
            .where(sql`LOWER(${domainPackages.name}) LIKE ${'%.' + extension + '%'}`)
            .limit(1)
          
          if (matchingPackages.length > 0) {
            domainTypeId = matchingPackages[0].id
          }
        }
      }
    }
    
    // Validate domainTypeId exists and is valid (must be > 0)
    if (!domainTypeId || domainTypeId <= 0) {
      console.error('[OrderService] DomainTypeId not found or invalid for item:', item.id, {
        domainTypeId,
        domainName,
        serviceData: item.serviceData,
        serviceId: item.serviceId
      })
      throw new Error(`DomainTypeId not found or invalid (must be > 0) for order item ${item.id}. Found: ${domainTypeId}. Domain: ${domainName}`)
    }

    // Verify domainTypeId exists in domain_packages table
    const domainPackage = await db.select()
      .from(domainPackages)
      .where(eq(domainPackages.id, domainTypeId))
      .limit(1)

    if (domainPackage.length === 0) {
      console.error('[OrderService] Domain package not found:', domainTypeId)
      throw new Error(`Domain package not found: ${domainTypeId}`)
    }

    // Check if domain already exists
    const existingDomain = await db.select()
      .from(domain)
      .where(eq(domain.domainName, domainName))
      .limit(1)

    if (existingDomain.length > 0) {
      return false
    }

    // Calculate expiry date: 1 year from registration date
    const registrationDate = new Date()
    const expiryDate = new Date(registrationDate)
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Create new domain instance
    await db.insert(domain).values({
      domainName: domainName,
      domainTypeId: domainTypeId,
      registrar: null,
      ipAddress: null,
      registrationDate: registrationDate,
      expiryDate: expiryDate, // 1 year from registration date
      status: 'ACTIVE',
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
    })

    return true
  } catch (error: any) {
    console.error('[OrderService] Error creating domain:', error)
    throw error
  }
}

