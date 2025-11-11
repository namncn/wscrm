import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { invoiceSchedules, invoices, settings } from '@/lib/schema'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'

type SchedulePayload = {
  invoiceId: number
  enabled: boolean
  frequency: string
  intervalDays?: number | null
  sendTime?: string | null
  startDate?: string | null
  daysBeforeDue?: number | null
  ccAccountingTeam?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SchedulePayload

    if (!payload?.invoiceId) {
      return createErrorResponse('Thiếu thông tin hoá đơn', 400)
    }

    const invoiceExists = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.id, payload.invoiceId))
      .limit(1)

    if (!invoiceExists[0]) {
      return createErrorResponse('Hoá đơn không tồn tại', 404)
    }

    const [settingsRecord] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'general'))
      .limit(1)

    let accountingEmail = ''
    if (settingsRecord) {
      try {
        const value =
          typeof settingsRecord.value === 'string'
            ? JSON.parse(settingsRecord.value)
            : (settingsRecord.value as Record<string, any>)
        accountingEmail = value?.companyAccountingEmail || ''
      } catch (error) {
        console.error('Error parsing settings for accounting email:', error)
      }
    }

    const existingSchedule = await db
      .select({ id: invoiceSchedules.id })
      .from(invoiceSchedules)
      .where(eq(invoiceSchedules.invoiceId, payload.invoiceId))
      .limit(1)

    const enabled = payload.enabled ?? true
    const ccAccountingTeam = enabled && !!accountingEmail ? payload.ccAccountingTeam ?? false : false
    const scheduleData = {
      invoiceId: payload.invoiceId,
      enabled,
      frequency: payload.frequency || 'monthly',
      intervalDays: payload.frequency === 'custom' ? payload.intervalDays ?? null : null,
      sendTime: payload.sendTime ?? null,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      daysBeforeDue: payload.daysBeforeDue ?? null,
      ccAccountingTeam,
    }

    if (existingSchedule[0]) {
      await db
        .update(invoiceSchedules)
        .set(scheduleData)
        .where(eq(invoiceSchedules.id, existingSchedule[0].id))
    } else {
      await db.insert(invoiceSchedules).values(scheduleData)
    }

    return createSuccessResponse({ invoiceId: payload.invoiceId }, 'Đã lưu cấu hình gửi hoá đơn tự động')
  } catch (error) {
    console.error('Error saving invoice schedule:', error)
    return createErrorResponse('Không thể lưu cấu hình gửi hoá đơn', 500)
  }
}

