import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { payments, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ID thanh toán' },
        { status: 400 }
      )
    }

    // Convert string id to number
    const paymentId = parseInt(id, 10)
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { success: false, error: 'ID thanh toán không hợp lệ' },
        { status: 400 }
      )
    }

    // Get payment from database
    const paymentList = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1)

    if (!paymentList || paymentList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thanh toán' },
        { status: 404 }
      )
    }

    const payment = paymentList[0]

    // Get order status to check if already paid
    const orderData = await db.select({
      id: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, payment.orderId))
    .limit(1)

    const order = orderData && orderData.length > 0 ? orderData[0] : null
    const isOrderPaid = order?.status === 'COMPLETED'

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        orderId: payment.orderId,
        customerId: payment.customerId,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      status: payment.status,
      orderStatus: order?.status || null,
      isOrderPaid: isOrderPaid,
      message: 'Lấy thông tin thanh toán thành công'
    })
  } catch (error: any) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể lấy thông tin thanh toán' },
      { status: 500 }
    )
  }
}

