import { desc, like } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { db } from '@/lib/database'
import { invoices } from '@/lib/schema'

type DbClient = MySql2Database<typeof import('@/lib/schema')>

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID'] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type InvoiceItemCalculationInput = {
  quantity: number
  unitPrice: number
  taxRate: number
  taxLabel?: string | null
}

export function toDecimalString(value: number): string {
  return value.toFixed(2)
}

export function calculateInvoiceTotals(items: InvoiceItemCalculationInput[]) {
  return items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const amount = quantity * unitPrice
      const effectiveTaxRate = item.taxLabel === 'KCT' ? 0 : Number(item.taxRate) || 0
      const taxValue = (amount * effectiveTaxRate) / 100

      acc.subtotal += amount
      acc.tax += taxValue
      acc.total += amount + taxValue

      return acc
    },
    { subtotal: 0, tax: 0, total: 0 }
  )
}

export async function generateInvoiceNumber(client: DbClient | typeof db = db) {
  const now = new Date()
  const prefix = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`

  const [lastInvoice] = await client
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}-%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1)

  const lastSequence = lastInvoice?.invoiceNumber
    ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10)
    : 0

  const nextSequence = (Number.isNaN(lastSequence) ? 0 : lastSequence) + 1

  return `${prefix}-${nextSequence.toString().padStart(3, '0')}`
}

