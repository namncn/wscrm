import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { invoiceSchedules, invoices } from '@/lib/schema'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { getAccountingEmail, sendInvoiceReminderEmail } from '@/lib/invoices/mailer'

type RouteContext = {
  params: Promise<{
    id: string | string[]
  }>
}

export async function POST(_: NextRequest, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN

    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const [scheduleRecord] = await db
      .select({ ccAccountingTeam: invoiceSchedules.ccAccountingTeam })
      .from(invoiceSchedules)
      .where(eq(invoiceSchedules.invoiceId, invoiceId))
      .limit(1)

    const accountingEmail = await getAccountingEmail()
    const ccRecipients =
      scheduleRecord?.ccAccountingTeam && accountingEmail ? [accountingEmail].filter(Boolean) : undefined

    const mailResult = await sendInvoiceReminderEmail(invoiceId, { cc: ccRecipients })

    await db
      .update(invoices)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))

    return createSuccessResponse(
      { invoiceId, email: mailResult.email },
      'Đã gửi email nhắc nhở thanh toán thành công'
    )
  } catch (error) {
    console.error('Error sending invoice reminder:', error)
    return createErrorResponse('Không thể gửi email nhắc nhở', 500)
  }
}

