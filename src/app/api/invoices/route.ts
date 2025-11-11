import { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { customers, invoiceItems, invoices } from '@/lib/schema'
import { createCreatedResponse, createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  toDecimalString,
  type InvoiceStatus,
} from '@/lib/invoices/utils'

type CreateInvoiceRequest = {
  invoiceNumber?: string
  customerId: number
  issueDate: string
  dueDate: string
  currency?: string
  paymentTerms?: string
  notes?: string
  status?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    taxLabel?: string | null
  }>
}

export async function GET() {
  try {
    const results = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        customerId: invoices.customerId,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        paid: invoices.paid,
        balance: invoices.balance,
        currency: invoices.currency,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(invoices)
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))

    const data = results.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      issueDate: row.issueDate?.toISOString() ?? null,
      dueDate: row.dueDate?.toISOString() ?? null,
      customerId: row.customerId,
      customerName: row.customerName ?? 'Không xác định',
      customerEmail: row.customerEmail ?? null,
      subtotal: Number(row.subtotal) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      paid: Number(row.paid) || 0,
      balance: Number(row.balance) || 0,
      currency: row.currency,
    }))

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return createErrorResponse('Không thể tải danh sách hoá đơn', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreateInvoiceRequest

    if (!payload?.customerId) {
      return createErrorResponse('Vui lòng chọn khách hàng', 400)
    }

    if (!payload.issueDate || !payload.dueDate) {
      return createErrorResponse('Vui lòng chọn ngày phát hành và ngày đến hạn', 400)
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return createErrorResponse('Hoá đơn cần ít nhất một dòng sản phẩm/dịch vụ', 400)
    }

    const invoiceItemsInput = payload.items.map((item) => ({
      description: item.description?.trim() || '',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 0,
      taxLabel: item.taxLabel ?? null,
    }))

    if (invoiceItemsInput.some((item) => !item.description)) {
      return createErrorResponse('Mỗi dòng cần có mô tả sản phẩm/dịch vụ', 400)
    }

    const totals = calculateInvoiceTotals(invoiceItemsInput)
    const currency = payload.currency || 'VND'
    const allowedStatuses = new Set<InvoiceStatus>(['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID'])
    const status: InvoiceStatus = allowedStatuses.has(payload.status as InvoiceStatus)
      ? (payload.status as InvoiceStatus)
      : 'DRAFT'

    const result = await db.transaction(async (tx) => {
      const customerExists = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, payload.customerId))
        .limit(1)

      if (!customerExists[0]) {
        throw new Error('Khách hàng không tồn tại')
      }

      const invoiceNumber =
        payload.invoiceNumber?.trim() && payload.invoiceNumber.trim().length > 0
          ? payload.invoiceNumber.trim()
          : await generateInvoiceNumber(tx)

      const existingInvoiceNumber = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1)

      if (existingInvoiceNumber[0]) {
        throw new Error('Số hoá đơn đã tồn tại, vui lòng chọn số khác')
      }

      await tx.insert(invoices).values({
        invoiceNumber,
        customerId: payload.customerId,
        status,
        issueDate: new Date(payload.issueDate),
        dueDate: new Date(payload.dueDate),
        currency,
        paymentTerms: payload.paymentTerms ?? null,
        notes: payload.notes ?? null,
        subtotal: toDecimalString(totals.subtotal),
        tax: toDecimalString(totals.tax),
        total: toDecimalString(totals.total),
        paid: toDecimalString(0),
        balance: toDecimalString(totals.total),
      })

      const [invoiceRecord] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1)

      if (!invoiceRecord) {
        throw new Error('Không thể tạo hoá đơn mới')
      }

      if (invoiceItemsInput.length > 0) {
        await tx.insert(invoiceItems).values(
          invoiceItemsInput.map((item) => ({
            invoiceId: invoiceRecord.id,
            description: item.description,
            quantity: toDecimalString(item.quantity),
            unitPrice: toDecimalString(item.unitPrice),
            taxRate: toDecimalString(item.taxLabel === 'KCT' ? 0 : item.taxRate),
            taxLabel: item.taxLabel ?? null,
          }))
        )
      }

      return {
        id: invoiceRecord.id,
        invoiceNumber,
      }
    })

    return createCreatedResponse(
      {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
      },
      'Tạo hoá đơn thành công'
    )
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return createErrorResponse(error?.message || 'Không thể tạo hoá đơn mới', 500)
  }
}

