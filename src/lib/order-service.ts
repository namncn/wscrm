/**
 * Order Service Handler
 * Handles creation of service instances (hosting, VPS, domain) when order is completed
 */

import { db } from './database'
import { orderItems, hosting, vps, domain, orders } from './schema'
import { eq } from 'drizzle-orm'

/**
 * Create service instances from order items when payment is completed
 * This is payment-method agnostic and can be called from any payment provider
 */
export async function createServicesFromOrder(orderId: number) {
  try {
    console.log('[OrderService] Creating services from order:', orderId)

    // Get all order items
    const items = await db.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    if (items.length === 0) {
      console.log('[OrderService] No items found for order:', orderId)
      return
    }

    console.log('[OrderService] Processing', items.length, 'order items')

    // Get order details to get customerId
    const orderDetails = await db.select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
    
    if (!orderDetails[0] || !orderDetails[0].customerId) {
      console.error('[OrderService] Order not found:', orderId)
      return
    }

    const customerId = orderDetails[0].customerId
    console.log('[OrderService] Customer ID:', customerId)

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
    if (results.success.length > 0) {
      console.log('[OrderService] Successfully created', results.success.length, 'service(s):', results.success.join(', '))
    }
    if (results.skipped.length > 0) {
      console.log('[OrderService] Skipped', results.skipped.length, 'service(s) (already exists):', results.skipped.map(s => `${s.serviceType} (${s.itemId}): ${s.reason}`).join(', '))
    }
    if (results.failed.length > 0) {
      console.error('[OrderService] Failed to create', results.failed.length, 'service(s):', results.failed.map(f => `${f.serviceType} (${f.itemId}): ${f.error}`).join(', '))
    }

    // Only throw error if ALL services failed
    if (results.success.length === 0 && results.failed.length > 0) {
      throw new Error(`Failed to create all services: ${results.failed.map(f => f.error).join(', ')}`)
    }

    console.log('[OrderService] Completed processing order:', orderId, '- Created:', results.success.length, 'Skipped:', results.skipped.length, 'Failed:', results.failed.length)
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
    console.log('[OrderService] Creating hosting for item:', item.id)

    // Get hosting plan details (template/package)
    const hostingPlan = await db.select()
      .from(hosting)
      .where(eq(hosting.id, item.serviceId))
      .limit(1)

    if (hostingPlan.length === 0) {
      console.error('[OrderService] Hosting plan not found:', item.serviceId)
      throw new Error(`Hosting plan not found: ${item.serviceId}`)
    }

    // Create new hosting instance (allow multiple instances per customer)
    console.log('[OrderService] Creating hosting instance for customer:', customerId, '- Plan:', hostingPlan[0].planName)
    await db.insert(hosting).values({
      planName: hostingPlan[0].planName,
      domain: null,
      storage: hostingPlan[0].storage,
      bandwidth: hostingPlan[0].bandwidth,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      status: 'ACTIVE',
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
      expiryDate: null,
      serverLocation: hostingPlan[0].serverLocation || null,
      addonDomain: hostingPlan[0].addonDomain || 'Unlimited',
      subDomain: hostingPlan[0].subDomain || 'Unlimited',
      ftpAccounts: hostingPlan[0].ftpAccounts || 'Unlimited',
      databases: hostingPlan[0].databases || 'Unlimited',
      hostingType: hostingPlan[0].hostingType || 'VPS Hosting',
      operatingSystem: hostingPlan[0].operatingSystem || 'Linux'
    })

    console.log('[OrderService] Hosting created successfully')
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
    console.log('[OrderService] Creating VPS for item:', item.id)

    // Get VPS plan details
    const vpsPlan = await db.select()
      .from(vps)
      .where(eq(vps.id, item.serviceId))
      .limit(1)

    if (vpsPlan.length === 0) {
      console.error('[OrderService] VPS plan not found:', item.serviceId)
      throw new Error(`VPS plan not found: ${item.serviceId}`)
    }

    // Create new VPS instance (allow multiple instances per customer)
    console.log('[OrderService] Creating VPS instance for customer:', customerId, '- Plan:', vpsPlan[0].planName)
    await db.insert(vps).values({
      planName: vpsPlan[0].planName,
      ipAddress: null,
      cpu: vpsPlan[0].cpu,
      ram: vpsPlan[0].ram,
      storage: vpsPlan[0].storage,
      bandwidth: vpsPlan[0].bandwidth,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      status: 'ACTIVE',
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
      expiryDate: null,
      os: vpsPlan[0].os || null
    })

    console.log('[OrderService] VPS created successfully')
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
    console.log('[OrderService] Creating domain for item:', item.id)

    // Get domain name from multiple possible sources
    let domainName = ''
    
    // Priority 1: Get from serviceData.domainName (most reliable)
    if (item.serviceData) {
      try {
        const serviceData = typeof item.serviceData === 'string' ? JSON.parse(item.serviceData) : item.serviceData
        domainName = serviceData?.domainName || ''
        if (domainName) {
          console.log('[OrderService] Found domainName in serviceData:', domainName)
        }
      } catch (parseError) {
        console.error('[OrderService] Error parsing serviceData:', parseError, 'serviceData:', item.serviceData)
      }
    }
    
    // Priority 2: Get from serviceName (if it looks like a domain - contains a dot)
    if (!domainName && item.serviceName && item.serviceName.includes('.')) {
      domainName = item.serviceName
      console.log('[OrderService] Using serviceName as domainName:', domainName)
    }
    
    // Priority 3: Fallback to serviceId if it looks like a domain
    // (for old orders that might have domain name in serviceId)
    if (!domainName && item.serviceId && item.serviceId.includes('.')) {
      domainName = item.serviceId
      console.log('[OrderService] Using serviceId as domainName fallback:', domainName)
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

    // Check if domain already exists
    const existingDomain = await db.select()
      .from(domain)
      .where(eq(domain.domainName, domainName))
      .limit(1)

    if (existingDomain.length > 0) {
      console.log('[OrderService] Domain already exists, skipping:', domainName)
      return false
    }

    // Create new domain instance
    console.log('[OrderService] Creating domain instance for customer:', customerId, '- Domain:', domainName)
    await db.insert(domain).values({
      domainName: domainName,
      registrar: null,
      registrationDate: new Date(),
      expiryDate: null, // Will be set by admin or based on registration period
      status: 'ACTIVE',
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
    })

    console.log('[OrderService] Domain created successfully')
    return true
  } catch (error: any) {
    console.error('[OrderService] Error creating domain:', error)
    throw error
  }
}

