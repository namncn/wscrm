import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { orders, customers, users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { getBrandName } from '@/lib/utils'
import { generateOrderPdf } from '@/lib/orders/pdf-generator'

async function resolveParams(context: { params: Promise<{ id: string | string[] }> }) {
  const resolved = await context.params
  return Array.isArray(resolved.id) ? resolved.id[0] : resolved.id
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string | string[] }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 })
  }

  const role = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = role === 'ADMIN'
  const isStaff = role === 'USER'
  const isCustomer = userType === 'customer'

  if (!isAdmin && !isStaff && !isCustomer) {
    return NextResponse.json({ success: false, message: 'Không có quyền truy cập' }, { status: 403 })
  }

  const idParam = await resolveParams(context)
  const orderId = Number.parseInt(idParam ?? '', 10)

  if (Number.isNaN(orderId)) {
    return NextResponse.json({ success: false, message: 'ID đơn hàng không hợp lệ' }, { status: 400 })
  }

  try {
    const orderResult = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        customerName: customers.name,
        customerEmail: customers.email,
        customerCompany: customers.company,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        userName: users.name,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, orderId))
      .limit(1)

    if (orderResult.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    const order = orderResult[0]

    if (!order.customerEmail) {
      return NextResponse.json({ success: false, message: 'Khách hàng không có email' }, { status: 400 })
    }

    const { pdfBuffer, orderNumber } = await generateOrderPdf(orderId)

    const paymentStatusLabel = order.status === 'COMPLETED' ? 'PAID' : 'PENDING'

    const formattedTotal = order.totalAmount !== null && order.totalAmount !== undefined
      ? Number(order.totalAmount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
      : 'N/A'

    const createdDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Thông báo đơn hàng</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Thông Báo Đơn Hàng</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Xin chào <strong>${order.customerName ?? 'Quý khách'}</strong>,</p>
            <p>Đơn hàng <strong>${orderNumber}</strong> đã được tạo tại ${getBrandName()}.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h2 style="margin-top: 0; color: #2563eb;">Thông Tin Đơn Hàng</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Mã đơn hàng:</td>
                  <td style="padding: 8px 0;">${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Ngày tạo:</td>
                  <td style="padding: 8px 0;">${createdDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Trạng thái đơn hàng:</td>
                  <td style="padding: 8px 0;">${order.status ?? 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Trạng thái thanh toán:</td>
                  <td style="padding: 8px 0;">${paymentStatusLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Tổng giá trị:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #2563eb;">${formattedTotal}</td>
                </tr>
              </table>
            </div>
            <p>Vui lòng xem chi tiết đơn hàng trong file PDF đính kèm.</p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Lưu ý:</strong> Nếu bạn cần hỗ trợ, vui lòng phản hồi email này hoặc liên hệ với chúng tôi.</p>
            </div>
            <p style="margin-top: 30px;">Trân trọng,<br /><strong>Đội ngũ ${getBrandName()}</strong></p>
          </div>
          <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
            <p style="font-size: 12px; color: #999; margin: 0;">Email này được gửi tự động. Vui lòng không trả lời email này.</p>
          </div>
        </body>
      </html>
    `

    await sendEmail({
      to: order.customerEmail,
      subject: `Thông báo đơn hàng mới - ${orderNumber} - ${getBrandName()}`,
      html,
      attachments: [
        {
          filename: `${orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({ success: true, message: 'Đã gửi email đơn hàng kèm PDF' })
  } catch (error) {
    console.error('Error sending order email:', error)
    return NextResponse.json({ success: false, message: 'Không thể gửi email đơn hàng' }, { status: 500 })
  }
}
