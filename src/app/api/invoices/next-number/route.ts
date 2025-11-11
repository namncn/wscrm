import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { generateInvoiceNumber } from '@/lib/invoices/utils'

export async function GET() {
  try {
    const invoiceNumber = await generateInvoiceNumber()
    return createSuccessResponse({ invoiceNumber })
  } catch (error) {
    console.error('Error generating next invoice number:', error)
    return createErrorResponse('Không thể gợi ý số hoá đơn tiếp theo', 500)
  }
}

