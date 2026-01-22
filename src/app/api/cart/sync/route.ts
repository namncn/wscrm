import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { cart, customers } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to create error response
function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

// Helper function to create success response
function createSuccessResponse(data: any, message?: string) {
  return NextResponse.json({ 
    success: true, 
    data, 
    message 
  })
}

// POST - Sync cart items from localStorage to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only customers can sync cart
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Cart is only available for customers', 403)
    }

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return createErrorResponse('Invalid cart items', 400)
    }

    // Find customer record
    const customer = await db
      .select({ id: customers.id, userId: customers.userId })
      .from(customers)
      .where(eq(customers.email, session.user.email))
      .limit(1)

    const userId: number | null = customer[0]?.userId || customer[0]?.id || null
    
    if (!userId) {
      return createErrorResponse('Customer account not found', 404)
    }

    // Get existing cart items from database
    const existingCartItems = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, userId))

    // If database already has cart items, don't sync from localStorage
    // This prevents conflicts and confusion
    if (existingCartItems.length > 0) {
      return createSuccessResponse({
        synced: 0,
        skipped: items.length,
        items: [],
        skippedItems: items.map(item => ({ item, reason: 'Database already has cart items' })),
        message: 'Giỏ hàng trong database đã có sản phẩm, không đồng bộ từ localStorage'
      }, 'Giỏ hàng trong database đã có sản phẩm, không đồng bộ từ localStorage')
    }

    const syncedItems = []
    const skippedItems = []

    // Process each item from localStorage
    for (const item of items) {
      const { serviceId, serviceType, serviceName, quantity = 1, price, domainName, serviceData } = item

      // Validate required fields
      if (!serviceId || !serviceType || !serviceName || !price) {
        skippedItems.push({ item, reason: 'Missing required fields' })
        continue
      }

      // For DOMAIN service type, serviceId is a string (domain type ID like 'com', 'vn')
      // For HOSTING/VPS, serviceId is a number (service ID from database)
      let serviceIdNum: number
      let finalServiceData: any = null

      if (serviceType === 'DOMAIN') {
        // For domain, store the domain type ID in serviceData and use 0 as serviceId
        serviceIdNum = 0
        finalServiceData = serviceData || {
          domainTypeId: serviceId,
          domainName: domainName || null
        }
      } else {
        // For HOSTING/VPS, parse serviceId to number
        serviceIdNum = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId
        if (isNaN(serviceIdNum)) {
          skippedItems.push({ item, reason: 'Invalid serviceId' })
          continue
        }
        finalServiceData = serviceData || null
      }

      // Check if item already exists in database cart
      let existingItem
      if (serviceType === 'DOMAIN' && finalServiceData?.domainName) {
        // For domain, check by userId, serviceType, and domainName in serviceData
        const allCartItems = await db
          .select()
          .from(cart)
          .where(
            and(
              eq(cart.userId, userId),
              eq(cart.serviceType, serviceType)
            )
          )
        
        existingItem = allCartItems.find(dbItem => {
          if (!dbItem.serviceData) return false
          const data = typeof dbItem.serviceData === 'string' 
            ? JSON.parse(dbItem.serviceData) 
            : dbItem.serviceData
          return data.domainName === finalServiceData.domainName
        })
      } else {
        // For HOSTING/VPS, check by userId, serviceType, and serviceId
        const items = await db
          .select()
          .from(cart)
          .where(
            and(
              eq(cart.userId, userId),
              eq(cart.serviceType, serviceType),
              eq(cart.serviceId, serviceIdNum)
            )
          )
          .limit(1)
        existingItem = items[0]
      }

      if (existingItem) {
        // Update quantity (add localStorage quantity to existing quantity)
        const itemId = existingItem.id
        const newQuantity = (existingItem.quantity || 0) + quantity
        
        await db
          .update(cart)
          .set({ 
            quantity: newQuantity,
            updatedAt: new Date()
          })
          .where(eq(cart.id, itemId))

        syncedItems.push({ ...existingItem, quantity: newQuantity })
      } else {
        // Add new item
        const insertResult = await db.insert(cart).values({
          userId: userId,
          serviceId: serviceIdNum,
          serviceType,
          serviceName,
          quantity,
          price: price.toString(),
          serviceData: finalServiceData,
        })

        // Get the created item
        let newItem
        if (serviceType === 'DOMAIN' && finalServiceData?.domainName) {
          const allItems = await db
            .select()
            .from(cart)
            .where(
              and(
                eq(cart.userId, userId),
                eq(cart.serviceType, serviceType)
              )
            )
            .orderBy(desc(cart.createdAt))
          
          newItem = allItems.find(dbItem => {
            if (!dbItem.serviceData) return false
            const data = typeof dbItem.serviceData === 'string' 
              ? JSON.parse(dbItem.serviceData) 
              : dbItem.serviceData
            return data.domainName === finalServiceData.domainName
          })
        } else {
          const items = await db
            .select()
            .from(cart)
            .where(
              and(
                eq(cart.userId, userId),
                eq(cart.serviceType, serviceType),
                eq(cart.serviceId, serviceIdNum)
              )
            )
            .orderBy(desc(cart.createdAt))
            .limit(1)
          newItem = items[0]
        }

        if (newItem) {
          syncedItems.push(newItem)
        }
      }
    }

    return createSuccessResponse({
      synced: syncedItems.length,
      skipped: skippedItems.length,
      items: syncedItems,
      skippedItems
    }, `Đã đồng bộ ${syncedItems.length} sản phẩm vào giỏ hàng`)
  } catch (error: any) {
    console.error('Error syncing cart:', error)
    return createErrorResponse('Failed to sync cart', 500)
  }
}

