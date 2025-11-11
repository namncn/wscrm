import { NextRequest } from 'next/server'
import { addDays, addMonths, isAfter, isSameDay, startOfDay } from 'date-fns'
import { eq } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { db } from '@/lib/database'
import { invoiceSchedules, invoices } from '@/lib/schema'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { getAccountingEmail, sendInvoiceReminderEmail } from '@/lib/invoices/mailer'

const TIME_WINDOW_MINUTES = 10

interface ScheduleRecord {
  scheduleId: number
  invoiceId: number
  frequency: string
  intervalDays: number | null
  sendTime: string | null
  startDate: Date | null
  daysBeforeDue: number | null
  ccAccountingTeam: boolean
  lastSentAt: Date | null
  dueDate: Date
  issueDate: Date
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'OVERDUE' | 'PAID'
  balance: number
}

type InvoiceScheduleRow = InferSelectModel<typeof invoiceSchedules>
type InvoiceRow = InferSelectModel<typeof invoices>

type ScheduleQueryRow = {
  scheduleId: InvoiceScheduleRow['id']
  invoiceId: InvoiceScheduleRow['invoiceId']
  frequency: InvoiceScheduleRow['frequency']
  intervalDays: InvoiceScheduleRow['intervalDays']
  sendTime: InvoiceScheduleRow['sendTime']
  startDate: InvoiceScheduleRow['startDate']
  daysBeforeDue: InvoiceScheduleRow['daysBeforeDue']
  ccAccountingTeam: InvoiceScheduleRow['ccAccountingTeam']
  lastSentAt: InvoiceScheduleRow['lastSentAt']
  dueDate: InvoiceRow['dueDate']
  issueDate: InvoiceRow['issueDate']
  status: InvoiceRow['status']
  balance: InvoiceRow['balance']
}

function parseSendTime(sendTime: string | null): { hour: number; minute: number } | null {
  if (!sendTime || !sendTime.includes(':')) {
    return null
  }
  const [hourStr, minuteStr] = sendTime.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return { hour, minute }
}

function isWithinSendWindow(sendTime: string | null, now: Date): boolean {
  const parsed = parseSendTime(sendTime)
  if (!parsed) {
    return true
  }
  const target = new Date(now)
  target.setHours(parsed.hour, parsed.minute, 0, 0)
  const diff = Math.abs(now.getTime() - target.getTime())
  return diff <= TIME_WINDOW_MINUTES * 60 * 1000
}

function matchesRecurringDays(base: Date, target: Date, interval: number): boolean {
  if (interval <= 0) {
    return false
  }
  let cursor = startOfDay(base)
  const end = startOfDay(target)
  if (isAfter(cursor, end)) {
    return false
  }
  while (cursor <= end) {
    if (isSameDay(cursor, end)) {
      return true
    }
    cursor = addDays(cursor, interval)
  }
  return false
}

function matchesRecurringMonths(base: Date, target: Date, monthInterval: number): boolean {
  if (monthInterval <= 0) {
    return false
  }
  let cursor = startOfDay(base)
  const end = startOfDay(target)
  if (isAfter(cursor, end)) {
    return false
  }
  while (cursor <= end) {
    if (isSameDay(cursor, end)) {
      return true
    }
    cursor = addMonths(cursor, monthInterval)
  }
  return false
}

function shouldSendSchedule(record: ScheduleRecord, now: Date): boolean {
  if (record.status === 'PAID' || record.balance <= 0) {
    return false
  }

  if (!isWithinSendWindow(record.sendTime, now)) {
    return false
  }

  const today = startOfDay(now)

  if (record.lastSentAt && isSameDay(record.lastSentAt, today)) {
    return false
  }

  // Check daysBeforeDue condition first
  let matches = false
  if (record.daysBeforeDue !== null && record.daysBeforeDue !== undefined) {
    const targetDate = startOfDay(addDays(record.dueDate, -record.daysBeforeDue))
    if (isSameDay(targetDate, today)) {
      matches = true
    }
  }

  if (!matches) {
    const baseDate = startOfDay(record.startDate ?? record.issueDate)
    if (isAfter(baseDate, today)) {
      return false
    }

    switch (record.frequency) {
      case 'weekly':
        matches = matchesRecurringDays(baseDate, today, 7)
        break
      case 'biweekly':
        matches = matchesRecurringDays(baseDate, today, 14)
        break
      case 'monthly':
        matches = matchesRecurringMonths(baseDate, today, 1)
        break
      case 'quarterly':
        matches = matchesRecurringMonths(baseDate, today, 3)
        break
      case 'yearly':
        matches = matchesRecurringMonths(baseDate, today, 12)
        break
      case 'custom':
        matches = matchesRecurringDays(baseDate, today, record.intervalDays ?? 0)
        break
      default:
        matches = false
    }
  }

  return matches
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams
    const token = searchParams.get('token')
    if (!token || token !== process.env.EMAIL_CRON_SECRET) {
      return createErrorResponse('Unauthorized', 401)
    }

    const schedules = await db
      .select({
        scheduleId: invoiceSchedules.id,
        invoiceId: invoiceSchedules.invoiceId,
        frequency: invoiceSchedules.frequency,
        intervalDays: invoiceSchedules.intervalDays,
        sendTime: invoiceSchedules.sendTime,
        startDate: invoiceSchedules.startDate,
        daysBeforeDue: invoiceSchedules.daysBeforeDue,
        ccAccountingTeam: invoiceSchedules.ccAccountingTeam,
        lastSentAt: invoiceSchedules.lastSentAt,
        dueDate: invoices.dueDate,
        issueDate: invoices.issueDate,
        status: invoices.status,
        balance: invoices.balance,
      })
      .from(invoiceSchedules)
      .innerJoin(invoices, eq(invoices.id, invoiceSchedules.invoiceId))
      .where(eq(invoiceSchedules.enabled, true)) as ScheduleQueryRow[]

    const now = new Date()
    const accountingEmail = await getAccountingEmail()

    let processed = 0
    let sent = 0
    const errors: Array<{ invoiceId: number; message: string }> = []

    for (const schedule of schedules) {
      processed += 1

      const record: ScheduleRecord = {
        scheduleId: schedule.scheduleId,
        invoiceId: schedule.invoiceId,
        frequency: schedule.frequency,
        intervalDays: schedule.intervalDays,
        sendTime: schedule.sendTime,
        startDate: schedule.startDate,
        daysBeforeDue: schedule.daysBeforeDue,
        ccAccountingTeam: Boolean(schedule.ccAccountingTeam),
        lastSentAt: schedule.lastSentAt ? new Date(schedule.lastSentAt) : null,
        dueDate: schedule.dueDate ? new Date(schedule.dueDate) : new Date(),
        issueDate: schedule.issueDate ? new Date(schedule.issueDate) : new Date(),
        status: (schedule.status ?? 'DRAFT') as ScheduleRecord['status'],
        balance: Number(schedule.balance ?? 0) || 0,
      }

      try {
        if (!shouldSendSchedule(record, now)) {
          continue
        }

        const ccRecipients =
          record.ccAccountingTeam && accountingEmail ? [accountingEmail].filter(Boolean) : undefined

        await sendInvoiceReminderEmail(record.invoiceId, { cc: ccRecipients })

        await db
          .update(invoiceSchedules)
          .set({
            lastSentAt: now,
            updatedAt: new Date(),
          })
          .where(eq(invoiceSchedules.id, record.scheduleId))

        sent += 1
      } catch (error: any) {
        console.error('Cron invoice reminder error:', error)
        errors.push({ invoiceId: record.invoiceId, message: error?.message ?? 'Unknown error' })
      }
    }

    return createSuccessResponse(
      {
        processed,
        sent,
        errors,
      },
      'Đã xử lý cron nhắc hoá đơn'
    )
  } catch (error) {
    console.error('Cron invoice reminder fatal error:', error)
    return createErrorResponse('Không thể chạy cron hoá đơn', 500)
  }
}
