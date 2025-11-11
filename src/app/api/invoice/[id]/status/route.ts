import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { customers, invoicePayments, invoices } from '@/lib/schema'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { generateInvoicePdf } from '@/lib/invoices/pdf-builder'
import { sendEmail } from '@/lib/email'
import { formatCurrency } from '@/lib/utils'
import { toDecimalString } from '@/lib/invoices/utils'

function buildReceiptEmail({
  invoiceNumber,
  customerName,
  paidAmount,
  total,
  currency,
  isPartial,
}: {
  invoiceNumber: string
  customerName: string
  paidAmount: number
  total: number
  currency: string
  isPartial: boolean
}) {
  const statusText = isPartial ? 'Thanh toán một phần' : 'Đã thanh toán đầy đủ'
  const remaining = Math.max(total - paidAmount, 0)
  const remainingText = isPartial ? `<p>Còn lại: <strong>${formatCurrency(remaining, currency)}</strong></p>` : ''

  const totalFormatted = formatCurrency(total, currency)
  const paidFormatted = formatCurrency(paidAmount, currency)

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Xác nhận thanh toán hoá đơn ${invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);">
          <div style="padding: 20px; background: #0f172a; color: white;">
            <h1 style="margin: 0; font-size: 22px;">Xác nhận thanh toán hoá đơn</h1>
            <p style="margin: 6px 0 0; font-size: 13px;">Hoá đơn ${invoiceNumber}</p>
          </div>
          <div style="padding: 22px;">
            <p style="font-size: 14px; line-height: 1.6;">Xin chào ${customerName || 'Quý khách'},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Chúng tôi đã ghi nhận trạng thái <strong>${statusText}</strong> cho hoá đơn <strong>${invoiceNumber}</strong>.
            </p>

            <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin: 20px 0;">
              <p style="margin: 0; padding: 16px; background: #f8fafc; font-size: 14px;">
                Tổng hoá đơn: <strong>${totalFormatted}</strong>
              </p>
              <p style="margin: 0; padding: 16px; font-size: 14px;">
                Số tiền đã thanh toán: <strong>${paidFormatted}</strong>
              </p>
              ${remainingText
                ? `<p style="margin: 0; padding: 16px; font-size: 14px;">
                    Còn lại: <strong style="color: #ea580c;">${formatCurrency(remaining, currency)}</strong>
                  </p>`
                : ''}
            </div>

            <p style="font-size: 13px; color: #475569;">
              Nếu có bất kỳ sai sót hoặc cần điều chỉnh, vui lòng phản hồi email này hoặc liên hệ với chúng tôi qua kênh hỗ trợ.
            </p>
            <p style="font-size: 13px; color: #475569;">Xin cảm ơn và chúc quý khách một ngày tốt lành.</p>
            <p style="font-size: 13px; color: #475569;">Trân trọng,<br />Đội ngũ chăm sóc khách hàng</p>
          </div>
        </div>
      </body>
    </html>
  `

  return {
    subject: `Xác nhận thanh toán hoá đơn ${invoiceNumber}`,
    html,
  }
}

type RouteContext = {
  params: Promise<{
    id: string | string[]
  }>
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN
    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const body = (await request.json()) as {
      status?: 'PARTIAL' | 'PAID'
      paidAmount?: number
      sendEmail?: boolean
      paymentMethod?: 'CASH' | 'BANK_TRANSFER'
    }
    if (!body?.status) {
      return createErrorResponse('Trạng thái mới không hợp lệ', 400)
    }

    const [invoiceRecord] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerEmail: customers.email,
        customerName: customers.name,
        total: invoices.total,
        paid: invoices.paid,
        currency: invoices.currency,
        paymentMethod: invoices.paymentMethod,
      })
      .from(invoices)
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(eq(invoices.id, invoiceId))
      .limit(1)

    if (!invoiceRecord) {
      return createErrorResponse('Không tìm thấy hoá đơn', 404)
    }

    const totalAmount = Number(invoiceRecord.total) || 0
    const currentPaidAmount = Number(invoiceRecord.paid) || 0
    const outstandingAmount = Math.max(totalAmount - currentPaidAmount, 0)
    const requestedAmount = typeof body.paidAmount === 'number' ? body.paidAmount : outstandingAmount
    const normalizedRequestedAmount = Math.max(requestedAmount, 0)
    const appliedAmount =
      outstandingAmount > 0 ? Math.min(normalizedRequestedAmount, outstandingAmount) : 0

    if (appliedAmount <= 0 && outstandingAmount > 0) {
      return createErrorResponse('Số tiền thanh toán không hợp lệ', 400)
    }

    const newPaidTotal = Math.min(currentPaidAmount + appliedAmount, totalAmount)
    const newBalance = Math.max(totalAmount - newPaidTotal, 0)
    const nextStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL'

    const allowedPaymentMethods = new Set<'CASH' | 'BANK_TRANSFER'>(['CASH', 'BANK_TRANSFER'])
    const chosenPaymentMethod = body.paymentMethod && allowedPaymentMethods.has(body.paymentMethod)
      ? body.paymentMethod
      : (invoiceRecord.paymentMethod && allowedPaymentMethods.has(invoiceRecord.paymentMethod as any)
          ? (invoiceRecord.paymentMethod as 'CASH' | 'BANK_TRANSFER')
          : 'BANK_TRANSFER')

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          status: nextStatus,
          paid: toDecimalString(newPaidTotal),
          balance: toDecimalString(newBalance),
          paymentMethod: chosenPaymentMethod,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))

      if (appliedAmount > 0) {
        await tx.insert(invoicePayments).values({
          invoiceId,
          amount: toDecimalString(appliedAmount),
          method: chosenPaymentMethod,
          note: null,
        })
      }
    })

    if (body.sendEmail && invoiceRecord.customerEmail) {
      const pdfResult = await generateInvoicePdf(invoiceId)
      if (pdfResult) {
        const { subject, html } = buildReceiptEmail({
          invoiceNumber: invoiceRecord.invoiceNumber,
          customerName: invoiceRecord.customerName ?? 'Quý khách',
          paidAmount: newPaidTotal,
          total: totalAmount,
          currency: invoiceRecord.currency || 'VND',
          isPartial: nextStatus === 'PARTIAL',
        })

        await sendEmail({
          to: invoiceRecord.customerEmail,
          subject,
          html,
          attachments: [
            {
              filename: `${invoiceRecord.invoiceNumber}.pdf`,
              content: pdfResult.pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        })
      }
    }

    return createSuccessResponse(
      {
        invoiceId,
        status: nextStatus,
        paidAmount: newPaidTotal,
        appliedAmount,
        balance: newBalance,
        paymentMethod: chosenPaymentMethod,
      },
      'Cập nhật trạng thái hoá đơn thành công'
    )
  } catch (error) {
    console.error('Error updating invoice status:', error)
    return createErrorResponse('Không thể cập nhật trạng thái hoá đơn', 500)
  }
}

