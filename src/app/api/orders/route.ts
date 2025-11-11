import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { orders, customers, users, orderItems, hosting, vps, domain, contracts } from '@/lib/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { createServicesFromOrder } from '@/lib/order-service'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  // ADMIN and USER can view all orders, CUSTOMER can only view their own
  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const customerIdParam = searchParams.get('customerId')
    
    // For customers, automatically filter by their own customer ID
    let finalCustomerId: number | null = null
    if (isCustomer) {
      // Get customer ID from session email
      if (!session.user.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }
      
      const customer = await db.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)
      
      if (!customer || customer.length === 0) {
        return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
      }
      
      finalCustomerId = customer[0].id
    } else if (customerIdParam) {
      // For admin/user, use provided customerId if any
      finalCustomerId = parseInt(customerIdParam, 10)
    }
    
    let query = db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        userId: orders.userId,
        totalAmount: orders.totalAmount,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
        userName: users.name,
        contractId: contracts.id,
        contractNumber: contracts.contractNumber,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(contracts, eq(contracts.orderId, orders.id))
    
    // Filter by customerId if provided or if customer is viewing their own orders
    const ordersWithDetails = finalCustomerId 
      ? await query.where(eq(orders.customerId, finalCustomerId)).orderBy(desc(orders.createdAt))
      : await query.orderBy(desc(orders.createdAt))

    // Get order items for each order and add missing fields
    for (let order of ordersWithDetails) {
      const orderItemsData = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
      
      // Parse serviceData JSON and extract domainName, also lookup service name
      const parsedOrderItems = await Promise.all(orderItemsData.map(async item => {
        let parsedServiceData = null
        let domainName = undefined
        let serviceName = undefined
        try {
          if (item.serviceData) {
            parsedServiceData = typeof item.serviceData === 'string' ? JSON.parse(item.serviceData) : item.serviceData
            domainName = parsedServiceData?.domainName
          }
        } catch (e) {
          // Ignore parsing errors
        }
        
        // Lookup service name based on serviceType and serviceId
        try {
          if (item.serviceType === 'HOSTING') {
            const hostingData = await db.select({ planName: hosting.planName }).from(hosting).where(eq(hosting.id, item.serviceId)).limit(1)
            serviceName = hostingData[0]?.planName
          } else if (item.serviceType === 'VPS') {
            const vpsData = await db.select({ planName: vps.planName }).from(vps).where(eq(vps.id, item.serviceId)).limit(1)
            serviceName = vpsData[0]?.planName
          } else if (item.serviceType === 'DOMAIN') {
            const domainData = await db.select({ domainName: domain.domainName }).from(domain).where(eq(domain.id, item.serviceId)).limit(1)
            serviceName = domainData[0]?.domainName
          }
        } catch (e) {
          // Ignore lookup errors
        }
        
        return {
          ...item,
          serviceData: parsedServiceData,
          domainName: domainName,
          serviceName: serviceName
        }
      }))
      
      // Add missing fields that frontend expects
      ;(order as any).orderItems = parsedOrderItems
      ;(order as any).orderNumber = `ORD-${order.id}` // Generate unique order number
      ;(order as any).contractId = order.contractId ?? null
      ;(order as any).contractNumber = order.contractNumber ?? null
      ;(order as any).paidAmount = order.status === 'COMPLETED' ? order.totalAmount : 0
      ;(order as any).paymentStatus = order.status === 'COMPLETED' ? 'PAID' : 'PENDING'
      ;(order as any).notes = order.notes || ''
      
      // Add customer object structure
      ;(order as any).customer = {
        id: order.customerId,
        name: order.customerName,
        email: order.customerEmail
      }
    }

    return createSuccessResponse(ordersWithDetails, 'Tải danh sách đơn hàng')
  } catch (error) {
    return createErrorResponse('Không thể tải danh sách đơn hàng')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update orders
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật đơn hàng.', 403)
  }

  try {
    const body = await req.json()
    
    const { id, status, paymentMethod, paymentStatus, paidAmount, notes } = body

    if (!id) {
      return createErrorResponse('ID đơn hàng là bắt buộc', 400)
    }

    // Check if order exists and get old status
    const existingOrder = await db.execute(sql`SELECT id, status FROM orders WHERE id = ${id}`)

    if (!existingOrder[0] || !(existingOrder[0] as any)[0]) {
      return createErrorResponse('Không tìm thấy đơn hàng', 404)
    }

    const oldOrder = (existingOrder[0] as any)[0]
    const oldStatus = oldOrder.status

    // Determine final status - if paymentStatus is PAID, set status to COMPLETED
    let finalStatus = status !== undefined ? status : oldStatus
    
    // If paymentStatus is set to PAID, ensure status is COMPLETED
    if (paymentStatus === 'PAID' && finalStatus !== 'COMPLETED') {
      finalStatus = 'COMPLETED'
    }
    
    // Update order
    if (status !== undefined && paymentMethod !== undefined && notes !== undefined) {
      await db.execute(sql`UPDATE orders SET status = ${finalStatus}, paymentMethod = ${paymentMethod}, notes = ${notes}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (status !== undefined && paymentMethod !== undefined) {
      await db.execute(sql`UPDATE orders SET status = ${finalStatus}, paymentMethod = ${paymentMethod}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (status !== undefined && notes !== undefined) {
      await db.execute(sql`UPDATE orders SET status = ${finalStatus}, notes = ${notes}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (paymentMethod !== undefined && notes !== undefined) {
      await db.execute(sql`UPDATE orders SET paymentMethod = ${paymentMethod}, notes = ${notes}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (status !== undefined || paymentStatus === 'PAID') {
      await db.execute(sql`UPDATE orders SET status = ${finalStatus}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (paymentMethod !== undefined) {
      await db.execute(sql`UPDATE orders SET paymentMethod = ${paymentMethod}, updatedAt = NOW() WHERE id = ${id}`)
    } else if (notes !== undefined) {
      await db.execute(sql`UPDATE orders SET notes = ${notes}, updatedAt = NOW() WHERE id = ${id}`)
    }

    // Create service instances if status changed to COMPLETED (which means payment is PAID)
    const shouldCreateServices = finalStatus === 'COMPLETED' && oldStatus !== 'COMPLETED'
    
    if (shouldCreateServices) {
      try {
        await createServicesFromOrder(parseInt(id))
      } catch (serviceError) {
        // Don't fail the whole request if service creation fails
        console.error('[OrderService] Error creating services:', serviceError)
      }
    }

    // Get the updated order with related data
    const orderResult = await db.execute(sql`SELECT id, customerId, userId, totalAmount, status, paymentMethod, notes, createdAt, updatedAt FROM orders WHERE id = ${id}`)
    
    if (!orderResult[0] || !(orderResult[0] as any)[0]) {
      return createErrorResponse('Không thể cập nhật đơn hàng', 500)
    }
    
    const order = (orderResult[0] as any)[0]
    
    // Get customer info
    const customerResult = await db.execute(sql`SELECT name, email FROM customers WHERE id = ${order.customerId}`)
    
    // Get user info
    const userResult = await db.execute(sql`SELECT name FROM users WHERE id = ${order.userId}`)
    
    // Get order items
    const itemsResult = await db.execute(sql`SELECT * FROM order_items WHERE orderId = ${id}`)
    
    // Combine data
    const customer = (customerResult[0] as any) && (customerResult[0] as any)[0] ? (customerResult[0] as any)[0] : { name: 'Unknown', email: 'Unknown' }
    const user = (userResult[0] as any) && (userResult[0] as any)[0] ? (userResult[0] as any)[0] : { name: 'Unknown' }
    const items = (itemsResult[0] as any) || []
    
    const updatedOrder = {
      ...order,
      customerName: customer.name,
      customerEmail: customer.email,
      userName: user.name,
      orderItems: items,
      orderNumber: `ORD-${order.id}`,
      paidAmount: order.status === 'COMPLETED' ? order.totalAmount : 0,
      paymentStatus: order.status === 'COMPLETED' ? 'PAID' : 'PENDING',
      notes: order.notes || '',
      customer: {
        id: order.customerId,
        name: customer.name,
        email: customer.email
      }
    }

    return createSuccessResponse(updatedOrder, 'Cập nhật đơn hàng')
  } catch (error) {
    return createErrorResponse('Không thể cập nhật đơn hàng')
  }
}

export async function POST(req: Request) {
  // Both ADMIN and CUSTOMER can create orders
  // ADMIN creates orders for customers in admin panel
  // CUSTOMER creates orders for themselves in checkout
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }
  
  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isCustomer = userType === 'customer'
  
  if (!isAdmin && !isCustomer) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên hoặc khách hàng mới có thể tạo đơn hàng.', 403)
  }

  try {
    const body = await req.json()
    // Processing order creation request
    
    const { customerId, items, serviceType, serviceName, serviceId, quantity, price, notes, totalAmount, paymentMethod, customerInfo } = body

    // Support both new format (items array) and old format (single item)
    const isNewFormat = Array.isArray(items) && items.length > 0
    
    // Validate required fields
    if (!customerId) {
      return createErrorResponse('Thiếu thông tin khách hàng', 400)
    }

    if (isNewFormat) {
      // New format: items array from checkout
      if (items.length === 0) {
        return createErrorResponse('Giỏ hàng trống', 400)
      }
    } else {
      // Old format: single item (backward compatibility)
      if (!serviceType || !quantity || !price) {
        return createErrorResponse('Thiếu thông tin bắt buộc', 400)
      }
      if (typeof quantity !== 'number' || typeof price !== 'number') {
        return createErrorResponse('Dữ liệu không hợp lệ', 400)
      }
    }

    // Get logged-in user from session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    // Determine user type and get appropriate user data
    const userType = (session.user as any)?.userType
    const userRole = (session.user as any)?.role
    let loggedInUser: any
    let isAdmin = false

    // Check if admin by role first (more reliable)
    if (userRole === 'ADMIN') {
      const userResult = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, session.user.email)).limit(1)
      if (!userResult[0]) {
        return createErrorResponse('Không tìm thấy user trong database', 400)
      }
      loggedInUser = userResult[0]
      isAdmin = true
    } else if (userType === 'admin') {
      const userResult = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, session.user.email)).limit(1)
      if (!userResult[0]) {
        return createErrorResponse('Không tìm thấy user trong database', 400)
      }
      loggedInUser = userResult[0]
      isAdmin = loggedInUser.role === 'ADMIN'
    } else if (userType === 'customer') {
      const customerResult = await db.select({ id: customers.id, userId: customers.userId }).from(customers).where(eq(customers.email, session.user.email)).limit(1)
      if (!customerResult[0]) {
        return createErrorResponse('Không tìm thấy customer trong database', 400)
      }
      const sessionUserId = (session.user as any)?.userId
      let finalUserId = sessionUserId || customerResult[0].userId
      
      if (!finalUserId) {
        const firstUserResult = await db.select({ id: users.id }).from(users).limit(1)
        if (!firstUserResult[0]) {
          return createErrorResponse('Không tìm thấy user trong database', 400)
        }
        finalUserId = firstUserResult[0].id
      }
      
      loggedInUser = { id: finalUserId, role: 'CUSTOMER' }
      isAdmin = false
    } else {
      return createErrorResponse('Loại tài khoản không hợp lệ', 400)
    }

    // Resolve customer depending on role
    let customer
    if (isAdmin) {
      const isEmail = typeof customerId === 'string' && customerId.includes('@')
      customer = isEmail
        ? await db.select({ id: customers.id, name: customers.name, phone: customers.phone, address: customers.address, company: customers.company, userId: customers.userId }).from(customers).where(eq(customers.email, customerId)).limit(1)
        : await db.select({ id: customers.id, name: customers.name, phone: customers.phone, address: customers.address, company: customers.company, userId: customers.userId }).from(customers).where(eq(customers.id, customerId)).limit(1)

      if (!customer[0]) {
        return createErrorResponse('Khách hàng không tồn tại', 400)
      }
    } else {
      // Non-admin: Ensure customerId matches logged-in user's email
      if (customerId !== session.user.email) {
        return createErrorResponse('Không thể tạo đơn hàng cho email khác với tài khoản đang đăng nhập', 403)
      }

      // Check if customer exists for this user, if not create one
      // Find customer by both email AND userId to ensure it belongs to the logged-in user
      customer = await db.select({ 
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        company: customers.company,
        userId: customers.userId
      }).from(customers).where(
        and(
          eq(customers.email, customerId),
          eq(customers.userId, loggedInUser.id)
        )
      ).limit(1)
    
      if (!customer[0]) {
        // Before creating, check if customer with this email exists but belongs to another user
        const existingCustomerWithEmail = await db.select({ 
          id: customers.id,
          userId: customers.userId
        }).from(customers).where(eq(customers.email, customerId)).limit(1)
        
        if (existingCustomerWithEmail[0]) {
          if (existingCustomerWithEmail[0].userId !== loggedInUser.id) {
            // Customer exists but belongs to another user
            // Since the logged-in user is using their own email, we should update the customer to belong to them
            // This can happen if customer was created by admin or data migration
            
            // Update customer to belong to current user
            await db
              .update(customers)
              .set({
                userId: loggedInUser.id,
                updatedAt: new Date()
              })
              .where(eq(customers.id, existingCustomerWithEmail[0].id))
            
            // Get the updated customer
            customer = await db.select({ 
              id: customers.id,
              name: customers.name,
              phone: customers.phone,
              address: customers.address,
              company: customers.company,
              userId: customers.userId
            }).from(customers).where(eq(customers.id, existingCustomerWithEmail[0].id)).limit(1)
          } else {
            // Customer exists with same userId but query didn't find it - this shouldn't happen, but try to get it anyway
            customer = await db.select({ 
              id: customers.id,
              name: customers.name,
              phone: customers.phone,
              address: customers.address,
              company: customers.company,
              userId: customers.userId
            }).from(customers).where(eq(customers.id, existingCustomerWithEmail[0].id)).limit(1)
          }
        }
        
        // Only create new customer if it doesn't exist
        if (!customer[0]) {
          try {
            // Create new customer with info from checkout form, using logged-in user's userId
            await db.insert(customers).values({
              name: customerInfo?.name || session.user.name || customerId,
              email: customerId,
              password: 'AUTO_GENERATED',
              phone: customerInfo?.phone || null,
              address: customerInfo?.address || null,
              company: customerInfo?.company || null,
              userId: loggedInUser.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            
            // Get the created customer
            customer = await db.select({ 
              id: customers.id,
              name: customers.name,
              phone: customers.phone,
              address: customers.address,
              company: customers.company,
              userId: customers.userId
            }).from(customers).where(
              and(
                eq(customers.email, customerId),
                eq(customers.userId, loggedInUser.id)
              )
            ).limit(1)
          } catch (insertError: any) {
            // Handle duplicate entry error
            if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
              // Email already exists, try to get the existing customer
              const existingCustomer = await db.select({ 
                id: customers.id,
                name: customers.name,
                phone: customers.phone,
                address: customers.address,
                company: customers.company,
                userId: customers.userId
              }).from(customers).where(eq(customers.email, customerId)).limit(1)
              
              if (existingCustomer[0]) {
                // Since the logged-in user is using their own email, update customer to belong to them
                if (existingCustomer[0].userId !== loggedInUser.id) {
                  // Update customer to belong to current user
                  await db
                    .update(customers)
                    .set({
                      userId: loggedInUser.id,
                      updatedAt: new Date()
                    })
                    .where(eq(customers.id, existingCustomer[0].id))
                  
                  // Refresh customer data
                  customer = await db.select({ 
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                    address: customers.address,
                    company: customers.company,
                    userId: customers.userId
                  }).from(customers).where(eq(customers.id, existingCustomer[0].id)).limit(1)
                } else {
                  // It belongs to this user, use it
                  customer = existingCustomer
                }
              } else {
                return NextResponse.json(
                  { success: false, error: 'Không thể tạo khách hàng. Email đã tồn tại nhưng không thể truy vấn.' },
                  { status: 500, headers: { 'Content-Type': 'application/json' } }
                )
              }
            } else {
              // Other error, rethrow
              throw insertError
            }
          }
          
          if (!customer[0]) {
            return createErrorResponse('Không thể tạo khách hàng', 500)
          }
        }
      }
      
      // Customer exists and belongs to logged-in user - update info if provided
      if (customer[0] && customerInfo) {
        const updateData: any = {}
        
        // Update name if provided and different
        if (customerInfo.name && customerInfo.name !== customer[0].name) {
          updateData.name = customerInfo.name
        }
        
        // Update phone if provided and different from current (or if current is empty/null)
        if (customerInfo.phone && 
            (customerInfo.phone !== customer[0].phone) &&
            (!customer[0].phone || (typeof customer[0].phone === 'string' && customer[0].phone.trim() === ''))) {
          updateData.phone = customerInfo.phone
        }
        
        // Update address if provided and different from current (or if current is empty/null)
        if (customerInfo.address && 
            (customerInfo.address !== customer[0].address) &&
            (!customer[0].address || (typeof customer[0].address === 'string' && customer[0].address.trim() === ''))) {
          updateData.address = customerInfo.address
        }
        
        // Update company if provided and different from current (or if current is empty/null)
        if (customerInfo.company && 
            (customerInfo.company !== customer[0].company) &&
            (!customer[0].company || (typeof customer[0].company === 'string' && customer[0].company.trim() === ''))) {
          updateData.company = customerInfo.company
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date()
          await db
            .update(customers)
            .set(updateData)
            .where(eq(customers.id, customer[0].id))
          
          // Refresh customer data
          customer = await db.select({ 
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            address: customers.address,
            company: customers.company,
            userId: customers.userId
          }).from(customers).where(
            and(
              eq(customers.email, customerId),
              eq(customers.userId, loggedInUser.id)
            )
          ).limit(1)
        }
      }
    }

    // Calculate total amount
    let finalTotalAmount: number
    if (isNewFormat) {
      // New format: use provided totalAmount or calculate from items
      finalTotalAmount = totalAmount || items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    } else {
      // Old format: price is already the total
      finalTotalAmount = price
    }

    // Create order
    const insertResult = await db.insert(orders).values({
        customerId: customer[0].id,
        userId: loggedInUser.id,
      totalAmount: finalTotalAmount.toString(),
      status: 'PENDING',
      paymentMethod: paymentMethod || null,
      notes: notes || null,
    })

    // Get the latest order for this customer
    const latestOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.customerId, customer[0].id))
      .orderBy(desc(orders.createdAt))
      .limit(1)

    if (!latestOrder[0]) {
      return createErrorResponse('Không thể tạo đơn hàng', 500)
    }

    // Create order items
    if (isNewFormat) {
      // New format: create one order item for each cart item
      for (const item of items) {
        // For DOMAIN service type, serviceId is a string (domain type ID like 'com', 'vn')
        // For HOSTING/VPS, serviceId is a number (service ID from database)
        let serviceIdNum: number
        const serviceData: any = {}
        
        if (item.serviceType === 'DOMAIN') {
          // For domain, store the domain type ID in serviceData and use 0 as serviceId
          serviceIdNum = 0
          serviceData.domainTypeId = item.serviceId // Store the domain type ID (e.g., 'com', 'vn')
          serviceData.domainName = item.domainName || item.serviceName || ''
        } else {
          // For HOSTING/VPS, parse serviceId to number
          serviceIdNum = typeof item.serviceId === 'string' ? parseInt(item.serviceId, 10) : (item.serviceId || 0)
          if (isNaN(serviceIdNum)) {
            return createErrorResponse(`Invalid serviceId for ${item.serviceType}: ${item.serviceId}`, 400)
          }
          if (item.domainName) {
            serviceData.domainName = item.domainName
          }
        }
        
        await db.insert(orderItems).values({
          orderId: latestOrder[0].id,
          serviceId: serviceIdNum,
          serviceType: item.serviceType,
          quantity: item.quantity,
          price: (item.price * item.quantity).toString(), // Store total price for this item
          serviceData: Object.keys(serviceData).length > 0 ? serviceData : null,
        })
      }
    } else {
      // Old format: create single order item
      // For DOMAIN service type, serviceId is a string (domain type ID)
      // For HOSTING/VPS, serviceId is a number
      let serviceIdNum: number
      let serviceDataObj: any = null
      
      if (serviceType === 'DOMAIN') {
        // For domain, store the domain type ID in serviceData and use 0 as serviceId
        serviceIdNum = 0
        serviceDataObj = {
          domainTypeId: serviceId || serviceName || '',
          domainName: serviceName || ''
        }
      } else {
        // For HOSTING/VPS, parse serviceId to number
        serviceIdNum = typeof serviceId === 'string' ? parseInt(serviceId, 10) : (serviceId || 0)
        if (isNaN(serviceIdNum)) {
          return createErrorResponse(`Invalid serviceId for ${serviceType}: ${serviceId}`, 400)
        }
      }
      
      await db.insert(orderItems).values({
        orderId: latestOrder[0].id,
        serviceId: serviceIdNum,
        serviceType,
        quantity,
        price: price.toString(), // Already total price
        serviceData: serviceDataObj,
      })
    }

    // Get the created order with related data
    const order = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        userId: orders.userId,
        totalAmount: orders.totalAmount,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
        userName: users.name,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, latestOrder[0].id))
      .limit(1)

    if (!order[0]) {
      return createErrorResponse('Không thể tạo đơn hàng', 500)
    }

    // Get order items
    const orderItemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, latestOrder[0].id))
    
    // Add missing fields that frontend expects
    ;(order[0] as any).orderItems = orderItemsData
    ;(order[0] as any).orderNumber = `ORD-${order[0].id}`
    ;(order[0] as any).paidAmount = order[0].status === 'COMPLETED' ? order[0].totalAmount : 0
    ;(order[0] as any).paymentStatus = order[0].status === 'COMPLETED' ? 'PAID' : 'PENDING'
    ;(order[0] as any).notes = order[0].notes || ''
    
    // Add customer object structure
    ;(order[0] as any).customer = {
      id: order[0].customerId,
      name: order[0].customerName,
      email: order[0].customerEmail
    }

    return createCreatedResponse(order[0], 'Tạo đơn hàng')
  } catch (error: any) {
    const errorMessage = error?.message || 'Không thể tạo đơn hàng'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete orders
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa đơn hàng.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return createErrorResponse('ID đơn hàng là bắt buộc', 400)
    }

    const id = parseInt(idParam)
    if (isNaN(id)) {
      return createErrorResponse('ID đơn hàng không hợp lệ', 400)
    }

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1)

    if (!existingOrder[0]) {
      return createErrorResponse('Không tìm thấy đơn hàng', 404)
    }

    // Delete order items first (due to foreign key constraint)
    await db.delete(orderItems).where(eq(orderItems.orderId, id))

    // Delete order
    await db.delete(orders).where(eq(orders.id, id))

    return createSuccessResponse(null, 'Xóa đơn hàng thành công')
  } catch (error) {
    return createErrorResponse('Không thể xóa đơn hàng')
  }
}
