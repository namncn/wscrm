import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContractPdf } from '@/lib/contracts/pdf-generator'

async function resolveParams(context: { params: Promise<{ id: string | string[] }> }) {
  const resolved = await context.params
  const value = resolved.id
  return Array.isArray(value) ? value[0] : value
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string | string[] }> }) {
  const contractIdParam = await resolveParams(context)
  const contractId = Number.parseInt(contractIdParam ?? '', 10)

  if (Number.isNaN(contractId)) {
    return new Response(JSON.stringify({ error: 'ID hợp đồng không hợp lệ' }), { status: 400 })
  }

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

  try {
    const { pdfBuffer, contractNumber } = await generateContractPdf(contractId)
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer

    return new Response(pdfArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${contractNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response(JSON.stringify({ error: 'Không thể tạo file hợp đồng' }), { status: 500 })
  }
}

