import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateOrderPdf } from '@/lib/orders/pdf-generator'

async function resolveParams(context: { params: Promise<{ id: string | string[] }> }) {
  const resolved = await context.params
  return Array.isArray(resolved.id) ? resolved.id[0] : resolved.id
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string | string[] }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Chưa đăng nhập' }), { status: 401 })
  }

  const role = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = role === 'ADMIN'
  const isStaff = role === 'USER'
  const isCustomer = userType === 'customer'

  if (!isAdmin && !isStaff && !isCustomer) {
    return new Response(JSON.stringify({ error: 'Không có quyền truy cập' }), { status: 403 })
  }

  const idParam = await resolveParams(context)
  const orderId = Number.parseInt(idParam ?? '', 10)

  if (Number.isNaN(orderId)) {
    return new Response(JSON.stringify({ error: 'ID đơn hàng không hợp lệ' }), { status: 400 })
  }

  try {
    const { pdfBuffer, orderNumber } = await generateOrderPdf(orderId)
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer

    return new Response(pdfArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="order-${orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error generating order PDF:', error)
    return new Response(JSON.stringify({ error: 'Không thể tạo file PDF đơn hàng' }), { status: 500 })
  }
}
