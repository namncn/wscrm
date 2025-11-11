import { NextRequest, NextResponse } from 'next/server'
import sepay from '@/lib/sepay'
import { db } from '@/lib/database'
import { payments, orders, customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Get bank info from environment variables
const getBankInfo = () => ({
  bankName: process.env.SEPAY_BANK_NAME || 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
  bankShortName: process.env.SEPAY_BANK_SHORT_NAME || 'VPBank',
  bankBin: process.env.SEPAY_BANK_BIN || '970432',
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '1234567890',
  accountHolderName: process.env.SEPAY_ACCOUNT_HOLDER_NAME || 'CÔNG TY TNHH ABC'
})

// Get payment code prefix from environment
const getPaymentCodePrefix = () => process.env.SEPAY_PAYMENT_CODE_PREFIX || 'DH'

export async function POST(request: NextRequest) {
  console.log('[Sepay QR API] POST request received at:', new Date().toISOString())
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[Sepay QR API] Request body parsed successfully')
    const { orderId, amount, description, customerId } = body

    if (!orderId || !amount || !customerId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    // Check if order exists and verify ownership
    const existingOrder = await db.select({ 
      id: orders.id,
      customerId: orders.customerId 
    })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!existingOrder || existingOrder.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      )
    }

    // Verify customer ownership (for non-admin users)
    const userRole = (session.user as any)?.role
    const isAdmin = userRole === 'ADMIN'
    
    if (!isAdmin) {
      // For customers, verify the order belongs to them
      if (!session.user.email) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy thông tin email' },
          { status: 400 }
        )
      }
      
      const customer = await db.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)
      
      if (!customer || customer.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy thông tin khách hàng' },
          { status: 404 }
        )
      }
      
      if (existingOrder[0].customerId !== customer[0].id) {
        return NextResponse.json(
          { success: false, error: 'Bạn không có quyền tạo thanh toán cho đơn hàng này' },
          { status: 403 }
        )
      }
    }

    // Check if payment already exists for this order
    const existingPayment = await db.select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1)

    if (existingPayment && existingPayment.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Thanh toán cho đơn hàng này đã tồn tại' },
        { status: 400 }
      )
    }

    // Generate QR code using order ID
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
    const prefix = getPaymentCodePrefix()
    const qrData = sepay.createQRCode(orderId.toString(), amountNum, getBankInfo(), prefix)

    // Create payment record
    await db.insert(payments).values({
      orderId: orderId,
      customerId: customerId,
      amount: amount.toString(),
      status: 'PENDING',
      paymentMethod: 'BANK_TRANSFER',
      paymentData: {
        qrCodeUrl: qrData.qrCodeUrl,
        bankInfo: qrData.bankInfo,
        remark: qrData.remark,
        paymentCode: qrData.remark  // Store the payment code for webhook lookup
      }
    })

    // Get the created payment to retrieve the ID
    const createdPayment = await db.select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(sql`${payments.createdAt} DESC`)
      .limit(1)

    if (!createdPayment || createdPayment.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không thể lấy ID thanh toán' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentId: createdPayment[0].id,
      qrCodeUrl: qrData.qrCodeUrl,
      bankInfo: qrData.bankInfo,
      remark: qrData.remark,
      amount: qrData.amount
    })
  } catch (error: any) {
    console.error('Error creating Sepay payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể tạo thanh toán' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve QR code for existing payment
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')
    const paymentId = searchParams.get('paymentId')

    if (!orderId && !paymentId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin orderId hoặc paymentId' },
        { status: 400 }
      )
    }

    // Get payment from database
    let payment
    if (paymentId) {
      const paymentIdNum = parseInt(paymentId, 10)
      if (isNaN(paymentIdNum)) {
        return NextResponse.json(
          { success: false, error: 'paymentId không hợp lệ' },
          { status: 400 }
        )
      }
      
      const paymentList = await db.select()
        .from(payments)
        .where(eq(payments.id, paymentIdNum))
        .limit(1)
      payment = paymentList && paymentList.length > 0 ? paymentList[0] : null
    } else if (orderId) {
      const orderIdNum = parseInt(orderId)
      if (isNaN(orderIdNum)) {
        return NextResponse.json(
          { success: false, error: 'orderId không hợp lệ' },
          { status: 400 }
        )
      }
      const paymentList = await db.select()
        .from(payments)
        .where(eq(payments.orderId, orderIdNum))
        .limit(1)
      payment = paymentList && paymentList.length > 0 ? paymentList[0] : null
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thanh toán' },
        { status: 404 }
      )
    }

    // Get order status to check if already paid
    const orderData = await db.select({
      id: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, payment.orderId))
    .limit(1)

    const order = orderData && orderData.length > 0 ? orderData[0] : null
    const isOrderCompleted = order?.status === 'COMPLETED'

    // Extract QR data from payment
    const paymentData = payment.paymentData as any
    if (paymentData && paymentData.qrCodeUrl) {
      return NextResponse.json({
        success: true,
        qrCodeUrl: paymentData.qrCodeUrl,
        bankInfo: paymentData.bankInfo,
        remark: paymentData.remark,
        amount: parseFloat(payment.amount.toString()),
        paymentId: payment.id,
        orderStatus: order?.status || null,
        isOrderPaid: isOrderCompleted
      })
    }

    // If QR data not found, regenerate it
    const amountNum = parseFloat(payment.amount.toString())
    const prefix = getPaymentCodePrefix()
    const qrData = sepay.createQRCode(payment.orderId.toString(), amountNum, getBankInfo(), prefix)

    return NextResponse.json({
      success: true,
      qrCodeUrl: qrData.qrCodeUrl,
      bankInfo: qrData.bankInfo,
      remark: qrData.remark,
      amount: qrData.amount,
      paymentId: payment.id,
      orderStatus: order?.status || null,
      isOrderPaid: isOrderCompleted
    })
  } catch (error: any) {
    console.error('Error retrieving Sepay payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể lấy thông tin thanh toán' },
      { status: 500 }
    )
  }
}

