import { NextRequest } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/database'
import {
  customers,
  invoiceItems,
  invoicePayments,
  invoiceSchedules,
  invoices,
} from '@/lib/schema'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { calculateInvoiceTotals, toDecimalString, type InvoiceStatus } from '@/lib/invoices/utils'

type RouteContext = {
  params: Promise<{
    id: string | string[]
  }>
}

export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN

    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const [invoiceRecord] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        currency: invoices.currency,
        paymentMethod: invoices.paymentMethod,
        paymentTerms: invoices.paymentTerms,
        notes: invoices.notes,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        paid: invoices.paid,
        balance: invoices.balance,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerCompany: customers.company,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        customerTaxCode: customers.taxCode,
      })
      .from(invoices)
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(eq(invoices.id, invoiceId))
      .limit(1)

    if (!invoiceRecord) {
      return createErrorResponse('Không tìm thấy hoá đơn', 404)
    }

    const items = await db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        taxRate: invoiceItems.taxRate,
        taxLabel: invoiceItems.taxLabel,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))

    const [scheduleRecord] = await db
      .select({
        enabled: invoiceSchedules.enabled,
        frequency: invoiceSchedules.frequency,
        intervalDays: invoiceSchedules.intervalDays,
        sendTime: invoiceSchedules.sendTime,
        startDate: invoiceSchedules.startDate,
        daysBeforeDue: invoiceSchedules.daysBeforeDue,
        ccAccountingTeam: invoiceSchedules.ccAccountingTeam,
        lastSentAt: invoiceSchedules.lastSentAt,
      })
      .from(invoiceSchedules)
      .where(eq(invoiceSchedules.invoiceId, invoiceId))
      .limit(1)

    const payments = await db
      .select({
        id: invoicePayments.id,
        amount: invoicePayments.amount,
        method: invoicePayments.method,
        note: invoicePayments.note,
        paidAt: invoicePayments.paidAt,
      })
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))

    return createSuccessResponse({
      id: invoiceRecord.id,
      invoiceNumber: invoiceRecord.invoiceNumber,
      status: invoiceRecord.status,
      issueDate: invoiceRecord.issueDate?.toISOString() ?? new Date().toISOString(),
      dueDate: invoiceRecord.dueDate?.toISOString() ?? new Date().toISOString(),
      currency: invoiceRecord.currency,
      paymentTerms: invoiceRecord.paymentTerms ?? null,
      paymentMethod: invoiceRecord.paymentMethod ?? null,
      notes: invoiceRecord.notes ?? null,
      customer: {
        id: invoiceRecord.customerId,
        name: invoiceRecord.customerName ?? 'Không xác định',
        email: invoiceRecord.customerEmail ?? null,
        company: invoiceRecord.customerCompany ?? null,
        phone: invoiceRecord.customerPhone ?? null,
        address: invoiceRecord.customerAddress ?? null,
        taxCode: invoiceRecord.customerTaxCode ?? null,
      },
      totals: {
        subtotal: Number(invoiceRecord.subtotal) || 0,
        tax: Number(invoiceRecord.tax) || 0,
        total: Number(invoiceRecord.total) || 0,
        paid: Number(invoiceRecord.paid) || 0,
        balance: Number(invoiceRecord.balance) || 0,
      },
      items: items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: item.taxLabel === 'KCT' ? 0 : Number(item.taxRate) || 0,
        taxLabel: item.taxLabel ?? null,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount) || 0,
        method: payment.method || 'Không xác định',
        note: payment.note ?? null,
        paidAt: payment.paidAt?.toISOString() ?? new Date().toISOString(),
      })),
      schedule: scheduleRecord
        ? {
            enabled: Boolean(scheduleRecord.enabled),
            frequency: scheduleRecord.frequency,
            intervalDays: scheduleRecord.intervalDays ?? undefined,
            sendTime: scheduleRecord.sendTime ?? '',
            startDate: scheduleRecord.startDate?.toISOString() ?? '',
            daysBeforeDue: scheduleRecord.daysBeforeDue ?? undefined,
            ccAccountingTeam: Boolean(scheduleRecord.ccAccountingTeam),
            lastSentAt: scheduleRecord.lastSentAt?.toISOString() ?? undefined,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching invoice detail:', error)
    return createErrorResponse('Không thể tải chi tiết hoá đơn', 500)
  }
}

type InvoiceItemInput = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxLabel?: string | null
}

type UpdateInvoicePayload = {
  invoiceNumber?: string
  customerId: number
  issueDate: string
  dueDate: string
  currency?: string
  paymentTerms?: string | null
  notes?: string | null
  status?: InvoiceStatus
  items: InvoiceItemInput[]
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN

    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const body = (await request.json()) as UpdateInvoicePayload

    if (!body || typeof body !== 'object') {
      return createErrorResponse('Dữ liệu không hợp lệ', 400)
    }

    if (!body.customerId) {
      return createErrorResponse('Vui lòng chọn khách hàng', 400)
    }

    if (!body.issueDate || !body.dueDate) {
      return createErrorResponse('Vui lòng cung cấp ngày phát hành và ngày đến hạn', 400)
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return createErrorResponse('Hoá đơn cần ít nhất một dòng sản phẩm/dịch vụ', 400)
    }

    const sanitizedItems = body.items
      .map((item) => ({
        description: (item.description || '').trim(),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        taxLabel: item.taxLabel ?? null,
      }))
      .filter((item) => item.description.length > 0)

    if (sanitizedItems.length === 0) {
      return createErrorResponse('Mỗi dòng cần có mô tả sản phẩm/dịch vụ', 400)
    }

    const issueDate = new Date(body.issueDate)
    const dueDate = new Date(body.dueDate)

    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      return createErrorResponse('Ngày phát hành hoặc ngày đến hạn không hợp lệ', 400)
    }

    const [existingInvoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        status: invoices.status,
        currency: invoices.currency,
        paymentTerms: invoices.paymentTerms,
        paid: invoices.paid,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1)

    if (!existingInvoice) {
      return createErrorResponse('Không tìm thấy hoá đơn', 404)
    }

    const requestedInvoiceNumber = body.invoiceNumber?.trim()
    const invoiceNumber =
      requestedInvoiceNumber && requestedInvoiceNumber.length > 0
        ? requestedInvoiceNumber
        : existingInvoice.invoiceNumber

    if (invoiceNumber !== existingInvoice.invoiceNumber) {
      const [duplicate] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.invoiceNumber, invoiceNumber), ne(invoices.id, invoiceId)))
        .limit(1)

      if (duplicate) {
        return createErrorResponse('Số hoá đơn đã tồn tại, vui lòng chọn số khác', 400)
      }
    }

    const totals = calculateInvoiceTotals(
      sanitizedItems.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxLabel === 'KCT' ? 0 : item.taxRate,
        taxLabel: item.taxLabel,
      }))
    )

    const currency = body.currency || existingInvoice.currency || 'VND'
    const paymentTerms = body.paymentTerms ?? existingInvoice.paymentTerms ?? null
    const paidAmount = Number(existingInvoice.paid) || 0
    const newSubtotal = totals.subtotal
    const newTax = totals.tax
    const newTotal = totals.total
    const newBalance = Math.max(newTotal - paidAmount, 0)

    const allowedStatuses = new Set<InvoiceStatus>(['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID'])
    let nextStatus: InvoiceStatus = existingInvoice.status as InvoiceStatus
    if (body.status && allowedStatuses.has(body.status)) {
      nextStatus = body.status
    } else if (paidAmount >= newTotal) {
      nextStatus = 'PAID'
    } else if (paidAmount > 0 && paidAmount < newTotal) {
      nextStatus = 'PARTIAL'
    }

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          invoiceNumber,
          customerId: Number(body.customerId),
          status: nextStatus,
          issueDate,
          dueDate,
          currency,
          paymentTerms,
          notes: body.notes ?? null,
          subtotal: toDecimalString(newSubtotal),
          tax: toDecimalString(newTax),
          total: toDecimalString(newTotal),
          balance: toDecimalString(newBalance),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
      await tx.insert(invoiceItems).values(
        sanitizedItems.map((item) => ({
          invoiceId,
          description: item.description,
          quantity: toDecimalString(item.quantity),
          unitPrice: toDecimalString(item.unitPrice),
          taxRate: toDecimalString(item.taxLabel === 'KCT' ? 0 : item.taxRate),
          taxLabel: item.taxLabel ?? null,
        }))
      )
    })

    return createSuccessResponse(
      {
        invoiceId,
        invoiceNumber,
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        balance: newBalance,
        status: nextStatus,
      },
      'Cập nhật hoá đơn thành công'
    )
  } catch (error) {
    console.error('Error updating invoice:', error)
    return createErrorResponse('Không thể cập nhật hoá đơn', 500)
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    const resolvedParams = await params
    const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id
    const invoiceId = rawId ? Number.parseInt(rawId, 10) : Number.NaN

    if (!rawId || Number.isNaN(invoiceId) || invoiceId <= 0) {
      return createErrorResponse('Mã hoá đơn không hợp lệ', 404)
    }

    const [invoiceRecord] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1)

    if (!invoiceRecord) {
      return createErrorResponse('Không tìm thấy hoá đơn', 404)
    }

    await db.transaction(async (tx) => {
      await tx.delete(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId))
      await tx.delete(invoiceSchedules).where(eq(invoiceSchedules.invoiceId, invoiceId))
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
      await tx.delete(invoices).where(eq(invoices.id, invoiceId))
    })

    return createSuccessResponse(
      { invoiceId: invoiceRecord.id, invoiceNumber: invoiceRecord.invoiceNumber },
      'Đã xoá hoá đơn thành công'
    )
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return createErrorResponse('Không thể xoá hoá đơn', 500)
  }
}

