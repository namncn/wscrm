import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/api-response'
import { generateInvoicePdf } from '@/lib/invoices/pdf-builder'

type RouteContext = {
  params: Promise<{
    id: string | string[]
  }>
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN
    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const pdfResult = await generateInvoicePdf(invoiceId)
    if (!pdfResult) {
      return createErrorResponse('Không tìm thấy hoá đơn', 404)
    }

    return new NextResponse(pdfResult.pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfResult.invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice pdf:', error)
    return createErrorResponse('Không thể tạo PDF hoá đơn', 500)
  }
}

