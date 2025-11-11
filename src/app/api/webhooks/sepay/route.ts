import { NextRequest, NextResponse } from 'next/server'
import sepay from '@/lib/sepay'
import { db } from '@/lib/database'
import { payments, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createServicesFromOrder } from '@/lib/order-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Sepay Webhook] Received webhook:', JSON.stringify(body, null, 2))

    // Get API key from Authorization header (format: "Apikey {api_key}")
    const authorization = request.headers.get('authorization')
    console.log('[Sepay Webhook] Authorization header:', authorization)
    
    let apiKey: string | null = null

    if (authorization) {
      const parts = authorization.split(' ')
      if (parts.length === 2 && parts[0] === 'Apikey') {
        apiKey = parts[1]
      }
    }

    console.log('[Sepay Webhook] Extracted API key:', apiKey)

    // Validate API key exists and alphanumeric
    if (!apiKey || !/^[a-zA-Z0-9]+$/.test(apiKey)) {
      console.error('[Sepay Webhook] Invalid API key format')
      return NextResponse.json(
        { success: false, message: 'Invalid API Key format' },
        { status: 401 }
      )
    }

    // Validate against stored API key (for now use mock, replace with DB config later)
    const webhookApiKey = process.env.SEPAY_API_KEY || 'mock-webhook-api-key'
    console.log('[Sepay Webhook] Expected API key:', webhookApiKey.substring(0, 10) + '...')
    
    if (apiKey !== webhookApiKey) {
      console.error('[Sepay Webhook] Invalid API key. Received:', apiKey.substring(0, 10) + '...')
      return NextResponse.json(
        { success: false, message: 'Invalid API Key' },
        { status: 401 }
      )
    }

    // Validate required parameters (based on WordPress plugin)
    const { accountNumber, gateway, code, transferType, transferAmount, transactionDate, content, referenceCode } = body

    if (!accountNumber || !gateway || !code || !transferType || !transferAmount) {
      console.error('[Sepay Webhook] Missing required parameters')
      return NextResponse.json(
        { success: false, message: 'Not enough required parameters' },
        { status: 400 }
      )
    }

    // Validate transferType must be 'in'
    if (transferType !== 'in') {
      console.error('[Sepay Webhook] Invalid transfer type:', transferType)
      return NextResponse.json(
        { success: false, message: 'transferType must be in' },
        { status: 400 }
      )
    }

    // Extract order ID from payment code
    const payCodePrefix = process.env.SEPAY_PAYMENT_CODE_PREFIX || 'DH'
    const orderIdStr = sepay.extractOrderIdFromCode(code, payCodePrefix)

    if (!orderIdStr) {
      console.error('[Sepay Webhook] Could not extract order ID from code:', code)
      return NextResponse.json(
        { success: false, message: `Order ID not found from pay code ${code}` },
        { status: 400 }
      )
    }

    console.log('[Sepay Webhook] Searching payment with code:', code)
    console.log('[Sepay Webhook] Extracted short code:', orderIdStr)

    // Find payment by payment code (stored in paymentData.remark)
    const allPayments = await db.select()
      .from(payments)
      .where(eq(payments.status, 'PENDING'))
    
    console.log('[Sepay Webhook] Searching through', allPayments.length, 'pending payments')
    
    // Calculate transfer amount for matching
    const transferAmountNum = parseFloat(transferAmount)
    
    // Debug: log all payment codes
    allPayments.forEach((p, index) => {
      let paymentData: any
      try {
        paymentData = typeof p.paymentData === 'string' ? JSON.parse(p.paymentData) : p.paymentData
      } catch (e) {
        paymentData = p.paymentData
      }
      console.log(`[Sepay Webhook] Payment[${index}]`, p.id, '- code:', JSON.stringify(paymentData?.paymentCode), '- remark:', JSON.stringify(paymentData?.remark))
    })
    
    // Find payment by payment code
    const payment = allPayments.find(p => {
      let paymentData: any
      try {
        paymentData = typeof p.paymentData === 'string' ? JSON.parse(p.paymentData) : p.paymentData
      } catch (e) {
        paymentData = p.paymentData
      }
      return paymentData?.paymentCode === code || paymentData?.remark === code
    })

    if (!payment) {
      console.error('[Sepay Webhook] Payment not found with code:', code)
      return NextResponse.json(
        { success: false, message: `Payment not found with code ${code}` },
        { status: 404 }
      )
    }

    console.log('[Sepay Webhook] Found payment:', payment.id)

    // Find order by payment orderId
    const orderList = await db.select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1)

    if (!orderList || orderList.length === 0) {
      console.error('[Sepay Webhook] Order not found for payment:', payment.orderId)
      return NextResponse.json(
        { success: false, message: `Order not found for payment` },
        { status: 404 }
      )
    }

    const order = orderList[0]
    console.log('[Sepay Webhook] Found order:', order.id)

    // Check if order is already completed
    if (order.status === 'COMPLETED' || order.status === 'CONFIRMED') {
      console.warn('[Sepay Webhook] Order already completed:', order.id)
      return NextResponse.json(
        { success: false, message: 'This order has already been completed before!' },
        { status: 400 }
      )
    }

    // Validate order total
    const orderTotal = parseFloat(order.totalAmount.toString())
    if (!orderTotal || orderTotal <= 0) {
      console.error('[Sepay Webhook] Invalid order total:', orderTotal)
      return NextResponse.json(
        { success: false, message: 'order_total is <= 0' },
        { status: 400 }
      )
    }

    // transferAmountNum already calculated above
    
    // Create note message
    const transferAmountStr = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(transferAmountNum)

    let noteMessage = `SePay: Đã nhận thanh toán ${transferAmountStr} vào tài khoản ${accountNumber} tại ngân hàng ${gateway}`
    if (transactionDate) {
      noteMessage += ` vào lúc ${transactionDate}`
    }

    // Update payment status and order based on amount
    let newOrderStatus: string = order.status || 'PENDING'

    if (orderTotal === transferAmountNum) {
      // Full payment - mark as completed
      newOrderStatus = 'COMPLETED'
      noteMessage += `. Trạng thái đơn hàng được chuyển từ ${order.status} sang ${newOrderStatus}`
    } else if (orderTotal > transferAmountNum) {
      // Under payment
      const underAmount = orderTotal - transferAmountNum
      const underAmountStr = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(underAmount)
      noteMessage += `. Khách hàng thanh toán THIẾU: ${underAmountStr}`
      newOrderStatus = 'CONFIRMED' // Partially paid
    } else if (orderTotal < transferAmountNum) {
      // Over payment
      const overAmount = transferAmountNum - orderTotal
      const overAmountStr = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(overAmount)
      noteMessage += `. Khách hàng thanh toán THỪA: ${overAmountStr}`
      newOrderStatus = 'COMPLETED' // Still mark as completed
    }

    // Update payment status
    const paymentStatus = orderTotal <= transferAmountNum ? 'COMPLETED' : 'PENDING'
    await db.update(payments)
      .set({
        status: paymentStatus,
        transactionId: code,
        paymentData: {
          ...((payment.paymentData as any) || {}),
          webhookData: {
            accountNumber,
            gateway,
            transferAmount: transferAmountNum,
            transactionDate
          }
        },
        updatedAt: new Date()
      })
      .where(eq(payments.id, payment.id))

    // Update order status if payment is completed
    if (paymentStatus === 'COMPLETED') {
      await db.update(orders)
        .set({
          status: newOrderStatus as any,
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Create service records (hosting/domain/vps) from order items
      // This is payment-method agnostic and will work for any payment provider
      await createServicesFromOrder(payment.orderId)
    }

    console.log('[Sepay Webhook] Payment updated successfully:', payment.id)

    return NextResponse.json({
      success: true,
      message: noteMessage
    })
  } catch (error: any) {
    console.error('[Sepay Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

