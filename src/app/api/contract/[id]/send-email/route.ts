import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { contracts, customers, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { getBrandName } from '@/lib/utils'
import { generateContractPdf } from '@/lib/contracts/pdf-generator'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { id } = await params
    const contractId = Number.parseInt(id, 10)

    if (Number.isNaN(contractId)) {
      return NextResponse.json({ success: false, message: 'ID hợp đồng không hợp lệ' }, { status: 400 })
    }

    const contractData = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        customerId: contracts.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        orderId: contracts.orderId,
        orderNumber: orders.id,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        totalValue: contracts.totalValue,
        status: contracts.status,
      })
      .from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(orders, eq(contracts.orderId, orders.id))
      .where(eq(contracts.id, contractId))
      .limit(1)

    if (!contractData || contractData.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng' }, { status: 404 })
    }

    const contract = contractData[0]

    if (!contract.customerEmail) {
      return NextResponse.json({ success: false, message: 'Khách hàng không có email' }, { status: 400 })
    }

    const startDate = contract.startDate
      ? new Date(contract.startDate).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'

    const endDate = contract.endDate
      ? new Date(contract.endDate).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'

    const totalValue = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(contract.totalValue)

    const orderNumber = contract.orderNumber ? `ORD-${contract.orderNumber}` : 'N/A'

    const statusLabels: Record<string, string> = {
      ACTIVE: 'Đang hoạt động',
      EXPIRED: 'Hết hạn',
      CANCELLED: 'Đã hủy',
    }
    const statusLabel = contract.status ? statusLabels[contract.status] ?? contract.status : 'N/A'

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const contractManagementUrl = `${appUrl}/contract-management`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thông báo hợp đồng mới</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Thông Báo Hợp Đồng Mới</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Xin chào <strong>${contract.customerName}</strong>,</p>
            <p>Chúng tôi xin thông báo rằng một hợp đồng mới đã được tạo cho bạn tại ${getBrandName()}.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Thông Tin Hợp Đồng</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Số hợp đồng:</td>
                  <td style="padding: 8px 0;">${contract.contractNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Số đơn hàng:</td>
                  <td style="padding: 8px 0;">${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Ngày bắt đầu:</td>
                  <td style="padding: 8px 0;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Ngày kết thúc:</td>
                  <td style="padding: 8px 0;">${endDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Giá trị hợp đồng:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #667eea;">${totalValue}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Trạng thái:</td>
                  <td style="padding: 8px 0;">${statusLabel}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractManagementUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xem Chi Tiết Hợp Đồng</a>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Lưu ý:</strong> Vui lòng kiểm tra và xác nhận thông tin hợp đồng. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666;">
              Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi qua email hoặc hệ thống hỗ trợ trong portal.
            </p>
            
            <p style="margin-top: 30px;">
              Trân trọng,<br>
              <strong>Đội ngũ ${getBrandName()}</strong>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              Email này được gửi tự động. Vui lòng không trả lời email này.
            </p>
          </div>
        </body>
      </html>
    `

    const { pdfBuffer, contractNumber } = await generateContractPdf(contractId)

    await sendEmail({
      to: contract.customerEmail,
      subject: `Thông báo hợp đồng mới - ${contract.contractNumber} - ${getBrandName()}`,
      html,
      attachments: [
        {
          filename: `contract-${contractNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({
      success: true,
      message: 'Email đã được gửi thành công',
    })
  } catch (error) {
    console.error('Error sending contract email:', error)
    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra khi gửi email' }, { status: 500 })
  }
}

