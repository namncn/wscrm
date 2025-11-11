import { db } from '@/lib/database'
import { payments } from '@/lib/schema'
import { eq, sql } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { createServicesFromOrder } from '@/lib/order-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  // ADMIN and USER can view all payments, customer can only view their own
  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    let paymentsData

    if (isCustomer) {
      // Customer can only view their own payments
      if (!session.user?.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }

      // Get customer ID from email
      const customerResult = await db.execute(sql`
        SELECT id FROM customers WHERE email = ${session.user.email} LIMIT 1
      `)
      
      if (!customerResult[0] || !(customerResult[0] as any)[0]) {
        return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
      }

      const customerId = (customerResult[0] as any)[0].id

      // Get payments for this customer only
      paymentsData = await db.execute(sql`
        SELECT 
          p.*,
          o.id as orderId,
          o.totalAmount as orderAmount,
          c.name as customerName,
          c.email as customerEmail
        FROM payments p
        LEFT JOIN orders o ON p.orderId = o.id
        LEFT JOIN customers c ON p.customerId = c.id
        WHERE p.customerId = ${customerId}
        ORDER BY p.createdAt DESC
      `)
    } else {
      // ADMIN and USER can view all payments
      paymentsData = await db.execute(sql`
        SELECT 
          p.*,
          o.id as orderId,
          o.totalAmount as orderAmount,
          c.name as customerName,
          c.email as customerEmail
        FROM payments p
        LEFT JOIN orders o ON p.orderId = o.id
        LEFT JOIN customers c ON p.customerId = c.id
        ORDER BY p.createdAt DESC
      `)
    }

    // Process the data to match frontend expectations
    const processedData = (paymentsData[0] as any).map((payment: any) => ({
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: `ORD-${payment.orderId}`,
      customerId: payment.customerId,
      customerName: payment.customerName || 'Unknown',
      customerEmail: payment.customerEmail || 'Unknown',
      amount: parseFloat(payment.amount) || 0,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      paymentData: payment.paymentData,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }))

    return createSuccessResponse(processedData, 'Tải danh sách thanh toán')
  } catch (error) {
    console.error('Error fetching payments:', error)
    return createErrorResponse('Không thể tải danh sách thanh toán')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create payments
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo thanh toán.', 403)
  }

  try {
    const body = await req.json()
    const { orderId, customerId, amount, paymentMethod, transactionId, paymentData } = body

    // Validate required fields
    if (!orderId || !customerId || !amount) {
      return createErrorResponse('ID đơn hàng, ID khách hàng và số tiền là bắt buộc', 400)
    }

    // Validate data types
    if (typeof amount !== 'number') {
      return createErrorResponse('Số tiền phải là số', 400)
    }

    // Check if order exists
    const existingOrder = await db.execute(sql`SELECT id FROM orders WHERE id = ${orderId}`)
    if (!existingOrder[0] || !(existingOrder[0] as any)[0]) {
      return createErrorResponse('Không tìm thấy đơn hàng', 404)
    }

    // Check if customer exists
    const existingCustomer = await db.execute(sql`SELECT id FROM customers WHERE id = ${customerId}`)
    if (!existingCustomer[0] || !(existingCustomer[0] as any)[0]) {
      return createErrorResponse('Không tìm thấy khách hàng', 404)
    }

    // Create payment
    await db
      .insert(payments)
      .values({
        orderId,
        customerId,
        amount: amount.toString(),
        paymentMethod: paymentMethod || null,
        transactionId: transactionId || null,
        paymentData: paymentData || null,
      })

    // Get the created payment with related data
    const createdPayment = await db.execute(sql`
      SELECT 
        p.*,
        o.id as orderId,
        o.totalAmount as orderAmount,
        c.name as customerName,
        c.email as customerEmail
      FROM payments p
      LEFT JOIN orders o ON p.orderId = o.id
      LEFT JOIN customers c ON p.customerId = c.id
      WHERE p.orderId = ${orderId}
      ORDER BY p.createdAt DESC
      LIMIT 1
    `)

    const payment = (createdPayment[0] as any)[0]
    const processedPayment = {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: `ORD-${payment.orderId}`,
      customerId: payment.customerId,
      customerName: payment.customerName || 'Unknown',
      customerEmail: payment.customerEmail || 'Unknown',
      amount: parseFloat(payment.amount) || 0,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      paymentData: payment.paymentData,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }

    return createCreatedResponse(processedPayment, 'Tạo thanh toán thành công')
  } catch (error) {
    console.error('Error creating payment:', error)
    return createErrorResponse('Không thể tạo thanh toán')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update payments
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật thanh toán.', 403)
  }

  try {
    const body = await req.json()
    const { id, status, transactionId, paymentData } = body

    if (!id) {
      return createErrorResponse('ID thanh toán là bắt buộc', 400)
    }

    const paymentId = typeof id === 'string' ? parseInt(id) : id

    // Check if payment exists
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1)

    if (existingPayment.length === 0) {
      return createErrorResponse('Không tìm thấy thanh toán', 404)
    }

    const oldStatus = existingPayment[0].status
    const newStatus = status || oldStatus

    // Update payment
    await db
      .update(payments)
      .set({
        status: newStatus,
        transactionId: transactionId !== undefined ? transactionId : existingPayment[0].transactionId,
        paymentData: paymentData !== undefined ? paymentData : existingPayment[0].paymentData,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))

    // If payment status changed to COMPLETED, create service instances
    if (oldStatus !== 'COMPLETED' && newStatus === 'COMPLETED') {
      await createServicesFromOrder(existingPayment[0].orderId)
    }

    // Get the updated payment with related data
    const updatedPayment = await db.execute(sql`
      SELECT 
        p.*,
        o.id as orderId,
        o.totalAmount as orderAmount,
        c.name as customerName,
        c.email as customerEmail
      FROM payments p
      LEFT JOIN orders o ON p.orderId = o.id
      LEFT JOIN customers c ON p.customerId = c.id
      WHERE p.id = ${paymentId}
      LIMIT 1
    `)

    const payment = (updatedPayment[0] as any)[0]
    const processedPayment = {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: `ORD-${payment.orderId}`,
      customerId: payment.customerId,
      customerName: payment.customerName || 'Unknown',
      customerEmail: payment.customerEmail || 'Unknown',
      amount: parseFloat(payment.amount) || 0,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      paymentData: payment.paymentData,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }

    return createSuccessResponse(processedPayment, 'Cập nhật thanh toán thành công')
  } catch (error) {
    console.error('Error updating payment:', error)
    return createErrorResponse('Không thể cập nhật thanh toán')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete payments
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa thanh toán.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('ID thanh toán là bắt buộc', 400)
    }

    const paymentId = parseInt(id)

    // Check if payment exists
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1)

    if (existingPayment.length === 0) {
      return createErrorResponse('Không tìm thấy thanh toán', 404)
    }
    // Delete payment
    await db
      .delete(payments)
      .where(eq(payments.id, paymentId))

    return createSuccessResponse(null, 'Xóa thanh toán thành công')
  } catch (error) {
    console.error('Error deleting payment:', error)
    return createErrorResponse('Không thể xóa thanh toán')
  }
}
