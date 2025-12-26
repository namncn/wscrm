import { format } from 'date-fns'
import { eq } from 'drizzle-orm'
import { generateInvoicePdf } from '@/lib/invoices/pdf-builder'
import { sendEmail } from '@/lib/email'
import { formatCurrency } from '@/lib/utils'
import { db } from '@/lib/database'
import { settings } from '@/lib/schema'

type SendOptions = {
  cc?: string[]
}

type MailResult = {
  email: string
  invoiceNumber: string
}

function buildInvoiceItemsHtml(
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; taxLabel: string | null }>,
  currency: string
) {
  return items
    .map(
      (item, index) => `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${index + 1}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${item.description}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(
            item.unitPrice,
            currency
          )}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">${
            item.taxLabel === 'KCT' ? 'KCT' : `${item.taxRate}%`
          }</td>
        </tr>
      `
    )
    .join('')
}

function buildReminderItemsHtml(
  items: Array<{ description: string; quantity: number; unitPrice: number }>,
  currency: string
) {
  return items
    .map(
      (item, index) => `
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${index + 1}</td>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${item.description}</td>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">${item.quantity}</td>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(
            item.unitPrice,
            currency
          )}</td>
        </tr>
      `
    )
    .join('')
}

function buildInvoiceNotesBlock(note: string | null | undefined) {
  if (!note || note.trim().length === 0) {
    return ''
  }

  return `
    <div style="margin-top: 20px; padding: 16px; border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 8px;">
      <p style="font-size: 14px; margin: 0 0 8px; font-weight: 600; color: #1d4ed8;">Ghi chú từ hoá đơn</p>
      <p style="font-size: 14px; margin: 0; color: #1e293b; white-space: pre-wrap;">${note}</p>
    </div>
  `
}

function buildReminderNotesBlock(note: string | null | undefined) {
  if (!note || note.trim().length === 0) {
    return ''
  }

  return `
    <div style="margin-top: 18px; padding: 14px; border-left: 4px solid #f97316; background: #fff7ed; border-radius: 8px;">
      <p style="font-size: 13px; margin: 0 0 6px; font-weight: 600; color: #c2410c;">Ghi chú từ hoá đơn</p>
      <p style="font-size: 13px; margin: 0; color: #92400e; white-space: pre-wrap;">${note}</p>
    </div>
  `
}

export async function sendInvoiceEmailNow(invoiceId: number, options: SendOptions = {}): Promise<MailResult> {
  const pdfResult = await generateInvoicePdf(invoiceId)
  if (!pdfResult) {
    throw new Error('Không thể tìm thấy hoá đơn để gửi email')
  }

  const { invoice, items, pdfBuffer } = pdfResult

  if (!invoice.customerEmail) {
    throw new Error('Khách hàng chưa có email để gửi hoá đơn')
  }

  const issueDate = invoice.issueDate ? format(invoice.issueDate, 'dd/MM/yyyy') : '—'
  const dueDate = invoice.dueDate ? format(invoice.dueDate, 'dd/MM/yyyy') : '—'
  const currency = invoice.currency || 'VND'

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Hoá đơn ${invoice.invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
          <div style="padding: 24px; background: linear-gradient(135deg, #2563eb, #9333ea); color: white;">
            <h1 style="margin: 0; font-size: 24px;">Hoá đơn ${invoice.invoiceNumber}</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Ngày phát hành: ${issueDate} • Đến hạn: ${dueDate}</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; line-height: 1.6;">Xin chào ${invoice.customerName ?? 'Quý khách'},</p>
            <p style="font-size: 15px; line-height: 1.6;">Chúng tôi gửi tới bạn hoá đơn <strong>${invoice.invoiceNumber}</strong> với thông tin chi tiết như sau:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; color: #1e293b;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left;">
                  <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">#</th>
                  <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Mô tả</th>
                  <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Số lượng</th>
                  <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Đơn giá</th>
                  <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Thuế</th>
                </tr>
              </thead>
              <tbody>
                ${
                  buildInvoiceItemsHtml(items, currency) ||
                  `<tr><td colspan="5" style="padding: 12px; text-align: center;">Không có dòng sản phẩm</td></tr>`
                }
              </tbody>
            </table>

            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="font-size: 15px; margin: 0 0 8px;">
                Tạm tính: <strong style="color: #0f172a;">${formatCurrency(invoice.subtotal, currency)}</strong>
              </p>
              <p style="font-size: 15px; margin: 0 0 8px;">
                Thuế: <strong style="color: #0f172a;">${formatCurrency(invoice.tax, currency)}</strong>
              </p>
              <p style="font-size: 16px; margin: 4px 0 0;">
                Tổng thanh toán: <strong style="color: #2563eb;">${formatCurrency(invoice.total, currency)}</strong>
              </p>
            </div>

            ${buildInvoiceNotesBlock(invoice.notes)}

            <p style="font-size: 14px; color: #475569; margin-top: 24px;">Hoá đơn PDF được đính kèm trong email này. Vui lòng kiểm tra và phản hồi nếu bạn cần hỗ trợ thêm.</p>

            <p style="font-size: 14px; color: #475569;">Trân trọng,<br />Đội ngũ chăm sóc khách hàng</p>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: invoice.customerEmail,
    subject: `Hoá đơn ${invoice.invoiceNumber}`,
    cc: options.cc,
    html,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })

  return {
    email: invoice.customerEmail,
    invoiceNumber: invoice.invoiceNumber,
  }
}

export async function sendInvoiceReminderEmail(invoiceId: number, options: SendOptions = {}): Promise<MailResult> {
  const pdfResult = await generateInvoicePdf(invoiceId)
  if (!pdfResult) {
    throw new Error('Không thể tìm thấy hoá đơn để gửi email nhắc nhở')
  }

  const { invoice, items, pdfBuffer } = pdfResult

  if (!invoice.customerEmail) {
    throw new Error('Khách hàng chưa có email để gửi nhắc nhở')
  }

  const issueDate = invoice.issueDate ? format(invoice.issueDate, 'dd/MM/yyyy') : '—'
  const dueDate = invoice.dueDate ? format(invoice.dueDate, 'dd/MM/yyyy') : '—'
  const currency = invoice.currency || 'VND'

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nhắc nhở thanh toán hoá đơn ${invoice.invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);">
          <div style="padding: 20px; background: linear-gradient(135deg, #f97316, #f43f5e); color: white;">
            <h1 style="margin: 0; font-size: 22px;">Nhắc nhở thanh toán hoá đơn</h1>
            <p style="margin: 6px 0 0; font-size: 13px;">Hoá đơn ${invoice.invoiceNumber} • Đến hạn: ${dueDate}</p>
          </div>
          <div style="padding: 22px;">
            <p style="font-size: 14px; line-height: 1.6;">Xin chào ${invoice.customerName ?? 'Quý khách'},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Đây là email nhắc nhở thanh toán cho hoá đơn <strong>${invoice.invoiceNumber}</strong> được phát hành ngày <strong>${issueDate}</strong>.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; color: #1e293b;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left;">
                  <th style="padding: 6px 10px; border: 1px solid #e2e8f0;">#</th>
                  <th style="padding: 6px 10px; border: 1px solid #e2e8f0;">Mô tả</th>
                  <th style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">Số lượng</th>
                  <th style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                ${
                  buildReminderItemsHtml(items, currency) ||
                  `<tr><td colspan="4" style="padding: 12px; text-align: center;">Không có dòng sản phẩm</td></tr>`
                }
              </tbody>
            </table>

            <div style="margin-top: 20px; padding: 14px; background: #fff7ed; border-radius: 8px; border: 1px solid #fed7aa;">
              <p style="font-size: 14px; margin: 0;">
                Số tiền cần thanh toán: <strong style="color: #ea580c;">${formatCurrency(invoice.total, currency)}</strong>
              </p>
            </div>

            ${buildReminderNotesBlock(invoice.notes)}

            <p style="font-size: 13px; color: #475569; margin-top: 20px;">
              Rất mong quý khách hoàn tất thanh toán trong thời gian sớm nhất. Hoá đơn chi tiết được đính kèm dưới dạng PDF.
            </p>

            <p style="font-size: 13px; color: #475569;">Xin cảm ơn và chúc quý khách một ngày tốt lành.</p>
            <p style="font-size: 13px; color: #475569;">Trân trọng,<br />Đội ngũ chăm sóc khách hàng</p>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: invoice.customerEmail,
    subject: `Nhắc nhở thanh toán hoá đơn ${invoice.invoiceNumber}`,
    cc: options.cc,
    html,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })

  return {
    email: invoice.customerEmail,
    invoiceNumber: invoice.invoiceNumber,
  }
}

export async function getAccountingEmail(): Promise<string> {
  const [settingsRecord] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'general'))
    .limit(1)

  if (!settingsRecord) {
    return ''
  }

  try {
    const parsed =
      typeof settingsRecord.value === 'string'
        ? JSON.parse(settingsRecord.value)
        : (settingsRecord.value as Record<string, any>)
    return parsed?.companyAccountingEmail || ''
  } catch (error) {
    console.error('Error parsing accounting email from settings:', error)
    return ''
  }
}

