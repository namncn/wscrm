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

// GET - Get cart items for current customer
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only customers can access cart
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Cart is only available for customers', 403)
    }

    // Find customer record by email
    const customer = await db
      .select({ id: customers.id, userId: customers.userId })
      .from(customers)
      .where(eq(customers.email, session.user.email))
      .limit(1)

    // For customer accounts, use customer's userId (from customer record) or customer id
    // Note: cart.userId can be either a user ID or customer ID depending on the system design
    let userId: number | null = customer[0]?.userId || customer[0]?.id || null

    if (!userId) {
      return createSuccessResponse([])
    }

    // Get cart items using the userId
    const cartItems = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, userId))
      .orderBy(desc(cart.createdAt))

    // Parse JSON fields from Buffer/string to object
    const parsedCartItems = cartItems.map(item => ({
      ...item,
      serviceData: item.serviceData ? (typeof item.serviceData === 'string' ? JSON.parse(item.serviceData) : item.serviceData) : null
    }))

    return createSuccessResponse(parsedCartItems)
  } catch (error: any) {
    console.error('Error fetching cart:', error)
    return createErrorResponse('Failed to fetch cart', 500)
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only customers can add items to cart
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Cart is only available for customers', 403)
    }

    const body = await request.json()
    const { serviceId, serviceType, serviceName, quantity = 1, price, domainName } = body

    // Validate required fields
    if (!serviceId || !serviceType || !serviceName || !price) {
      return createErrorResponse('Missing required fields')
    }

    // Find customer record
    const customer = await db
      .select({ id: customers.id, userId: customers.userId })
      .from(customers)
      .where(eq(customers.email, session.user.email))
      .limit(1)

    // Use customer's userId or customer id
    // Note: cart.userId can be either a user ID or customer ID depending on the system design
    const userId: number | null = customer[0]?.userId || customer[0]?.id || null
    
    if (!userId) {
      return createErrorResponse('Customer account not found', 404)
    }

    // For DOMAIN service type, serviceId is a string (domain type ID like 'com', 'vn')
    // For HOSTING/VPS, serviceId is a number (service ID from database)
    let serviceIdNum: number
    let serviceData: any = null

    if (serviceType === 'DOMAIN') {
      // For domain, store the domain type ID in serviceData and use 0 as serviceId
      // (or we could hash the domain type ID to a number, but 0 is simpler)
      serviceIdNum = 0
      serviceData = {
        domainTypeId: serviceId, // Store the domain type ID (e.g., 'com', 'vn')
        domainName: domainName || null
      }
    } else {
      // For HOSTING/VPS, parse serviceId to number
      serviceIdNum = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId
      if (isNaN(serviceIdNum)) {
        return createErrorResponse('Invalid serviceId')
      }
    }

    // Check if item already exists in cart
    // For DOMAIN, also check domainName to avoid duplicates
    let existingItem
    if (serviceType === 'DOMAIN' && domainName) {
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
      
      // Filter by domainName in serviceData
      existingItem = allCartItems.find(item => {
        if (!item.serviceData) return false
        const data = typeof item.serviceData === 'string' 
          ? JSON.parse(item.serviceData) 
          : item.serviceData
        return data.domainName === domainName
      })
    } else {
      // For HOSTING/VPS, check by userId and serviceId
      const items = await db
        .select()
        .from(cart)
        .where(
          and(
            eq(cart.userId, userId),
            eq(cart.serviceId, serviceIdNum)
          )
        )
        .limit(1)
      existingItem = items[0]
    }

    if (existingItem) {
      // Update quantity
      const itemId = existingItem.id || (Array.isArray(existingItem) ? existingItem[0]?.id : null)
      if (!itemId) {
        return createErrorResponse('Cannot find cart item ID', 500)
      }
      
      await db
        .update(cart)
        .set({ 
          quantity: (existingItem.quantity || 0) + quantity,
          updatedAt: new Date()
        })
        .where(eq(cart.id, itemId))

      // Get updated item
      const updatedItem = await db
        .select()
        .from(cart)
        .where(eq(cart.id, itemId))
        .limit(1)

      return createSuccessResponse(updatedItem[0], 'Item quantity updated')
    } else {
      // Add new item
      const insertResult = await db.insert(cart).values({
        userId: userId,
        serviceId: serviceIdNum,
        serviceType,
        serviceName,
        quantity,
        price: price.toString(),
        serviceData: serviceData,
      })

      // Get the created item
      // For DOMAIN, find by userId, serviceType, and domainName in serviceData
      // For HOSTING/VPS, find by userId and serviceId
      let newItem
      if (serviceType === 'DOMAIN' && domainName) {
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
        
        newItem = allItems.find(item => {
          if (!item.serviceData) return false
          const data = typeof item.serviceData === 'string' 
            ? JSON.parse(item.serviceData) 
            : item.serviceData
          return data.domainName === domainName
        })
      } else {
        const items = await db
          .select()
          .from(cart)
          .where(
            and(
              eq(cart.userId, userId),
              eq(cart.serviceId, serviceIdNum)
            )
          )
          .orderBy(desc(cart.createdAt))
          .limit(1)
        newItem = items[0]
      }

      return createSuccessResponse(newItem, 'Item added to cart')
    }
  } catch (error: any) {
    console.error('Error adding to cart:', error)
    return createErrorResponse('Failed to add item to cart', 500)
  }
}

// PUT - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only customers can update cart
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Cart is only available for customers', 403)
    }

    const body = await request.json()
    const { id, quantity } = body

    if (!id || quantity === undefined) {
      return createErrorResponse('Missing required fields')
    }

    if (quantity < 1) {
      return createErrorResponse('Quantity must be at least 1')
    }

    // Parse id to number (it might come as string from frontend)
    const cartItemId = typeof id === 'string' ? parseInt(id, 10) : id
    if (isNaN(cartItemId)) {
      return createErrorResponse('Invalid cart item ID')
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

    // Update cart item
    await db
      .update(cart)
      .set({ 
        quantity,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(cart.id, cartItemId),
          eq(cart.userId, userId)
        )
      )

    // Get updated item
    const updatedItem = await db
      .select()
      .from(cart)
      .where(eq(cart.id, cartItemId))
      .limit(1)

    return createSuccessResponse(updatedItem[0], 'Cart item updated')
  } catch (error: any) {
    console.error('Error updating cart:', error)
    return createErrorResponse('Failed to update cart item', 500)
  }
}

// DELETE - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only customers can delete cart items
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Cart is only available for customers', 403)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

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

    // Delete cart item(s)
    if (id) {
      // Parse id to number
      const cartItemId = parseInt(id, 10)
      if (isNaN(cartItemId)) {
        return createErrorResponse('Invalid cart item ID', 400)
      }
      
      // Delete specific item
      await db
        .delete(cart)
        .where(
          and(
            eq(cart.id, cartItemId),
            eq(cart.userId, userId)
          )
        )
      return createSuccessResponse(null, 'Item removed from cart')
    } else {
      // Delete all items in cart
      await db
        .delete(cart)
        .where(eq(cart.userId, userId))
      return createSuccessResponse(null, 'All items removed from cart')
    }
  } catch (error: any) {
    console.error('Error removing from cart:', error)
    return createErrorResponse('Failed to remove item from cart', 500)
  }
}
