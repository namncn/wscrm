import { eq } from 'drizzle-orm'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import { format } from 'date-fns'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { db } from '@/lib/database'
import { customers, invoiceItems, invoices, settings as settingsTable } from '@/lib/schema'
import { loadRobotoBoldFont, loadRobotoRegularFont } from '@/lib/fonts/roboto'
import { formatCurrency, getBrandName } from '@/lib/utils'

export type InvoiceRecordForPdf = {
  id: number
  invoiceNumber: string
  status: string
  issueDate: Date | null
  dueDate: Date | null
  subtotal: number
  tax: number
  total: number
  paid: number
  balance: number
  paymentMethod: string | null
  notes: string | null
  currency: string
  customerName: string | null
  customerEmail: string | null
  customerCompany: string | null
  customerAddress: string | null
  customerPhone: string | null
  customerTaxCode: string | null
}

export type InvoiceItemForPdf = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxLabel: string | null
}

export type InvoicePdfResult = {
  invoice: InvoiceRecordForPdf
  items: InvoiceItemForPdf[]
  pdfBuffer: Buffer
}

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')

type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  taxCode: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  bankBranch: string
  accountingEmail: string
  website?: string
}

const SETTINGS_KEY = 'general'

const defaultCompanyInfo: CompanyInfo = {
  name: getBrandName(),
  address: '123 Business Avenue, Hà Nội',
  phone: '0123 456 789',
  email: 'contact@example.com',
  taxCode: '0100000000',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankBranch: '',
  accountingEmail: '',
  website: process.env.NEXTAUTH_URL || 'https://example.com',
}

async function loadCompanyInfo(): Promise<CompanyInfo> {
  try {
    const result = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SETTINGS_KEY))
      .limit(1)

    if (result.length === 0) {
      return defaultCompanyInfo
    }

    let settingsValue = result[0].value
    if (typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch (error) {
        console.error('Error parsing settings value:', error)
        settingsValue = {}
      }
    }

    const generalSettings = (settingsValue as Record<string, any>) || {}
    const nextUrl = process.env.NEXTAUTH_URL || defaultCompanyInfo.website

    return {
      name: generalSettings.companyName || defaultCompanyInfo.name,
      address: generalSettings.companyAddress || defaultCompanyInfo.address,
      phone: generalSettings.companyPhone || defaultCompanyInfo.phone,
      email: generalSettings.companyEmail || defaultCompanyInfo.email,
      taxCode: generalSettings.companyTaxCode || defaultCompanyInfo.taxCode,
      bankName: generalSettings.companyBankName || defaultCompanyInfo.bankName,
      bankAccountNumber: generalSettings.companyBankAccount || defaultCompanyInfo.bankAccountNumber,
      bankAccountName: generalSettings.companyBankAccountName || defaultCompanyInfo.bankAccountName || getBrandName(),
      bankBranch: generalSettings.companyBankBranch || defaultCompanyInfo.bankBranch,
      accountingEmail: generalSettings.companyAccountingEmail || defaultCompanyInfo.accountingEmail,
      website: nextUrl,
    }
  } catch (error) {
    console.error('Error loading company info:', error)
    return defaultCompanyInfo
  }
}

export async function generateInvoicePdf(invoiceId: number): Promise<InvoicePdfResult | null> {
  const [invoiceRecord] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      paid: invoices.paid,
      balance: invoices.balance,
      paymentMethod: invoices.paymentMethod,
      notes: invoices.notes,
      currency: invoices.currency,
      customerName: customers.name,
      customerEmail: customers.email,
      customerCompany: customers.company,
      customerAddress: customers.address,
      customerPhone: customers.phone,
      customerTaxCode: customers.taxCode,
    })
    .from(invoices)
    .leftJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoiceRecord) {
    return null
  }

  const items = await db
    .select({
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      taxRate: invoiceItems.taxRate,
      taxLabel: invoiceItems.taxLabel,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const page = pdfDoc.addPage([595.28, 841.89]) // A4 portrait
  const { width, height } = page.getSize()
  const [regularFontData, boldFontData] = await Promise.all([loadRobotoRegularFont(), loadRobotoBoldFont()])
  const font = await pdfDoc.embedFont(regularFontData, { subset: true })
  const boldFont = await pdfDoc.embedFont(boldFontData, { subset: true })

  let logoImage = null
  try {
    const logoBytes = await fs.readFile(LOGO_PATH)
    const extension = path.extname(LOGO_PATH).toLowerCase()
    if (extension === '.png') {
      logoImage = await pdfDoc.embedPng(logoBytes)
    } else if (extension === '.jpg' || extension === '.jpeg') {
      logoImage = await pdfDoc.embedJpg(logoBytes)
    }
  } catch (error) {
    logoImage = null
  }

  const companyInfo = await loadCompanyInfo()

  const statusLabels: Record<string, string> = {
    DRAFT: 'Nháp',
    SENT: 'Đã gửi',
    PARTIAL: 'Thanh toán một phần',
    OVERDUE: 'Quá hạn',
    PAID: 'Đã thanh toán',
  }

  const statusColors: Record<string, ReturnType<typeof rgb>> = {
    DRAFT: rgb(0.4, 0.4, 0.4),
    SENT: rgb(0.12, 0.3, 0.6),
    PARTIAL: rgb(0.65, 0.42, 0.05),
    OVERDUE: rgb(0.75, 0.1, 0.1),
    PAID: rgb(0.12, 0.5, 0.2),
  }

  const statusKey = invoiceRecord.status ?? 'UNKNOWN'
  const statusLabel = statusLabels[statusKey] ?? statusKey
  const statusColor = statusColors[statusKey] ?? rgb(0.2, 0.2, 0.2)

  const margin = 48
  const contentWidth = width - margin * 2
  let cursorY = height - margin

  const drawAbsoluteText = (
    text: string,
    x: number,
    y: number,
    options?: {
      fontSize?: number
      font?: typeof font | typeof boldFont
      align?: 'left' | 'right' | 'center'
      color?: ReturnType<typeof rgb>
    }
  ) => {
    const fontSize = options?.fontSize ?? 12
    const textFont = options?.font ?? font
    const color = options?.color ?? rgb(0.15, 0.2, 0.33)
    const textWidth = textFont.widthOfTextAtSize(text, fontSize)
    let drawX = x
    if (options?.align === 'right') {
      drawX = x - textWidth
    } else if (options?.align === 'center') {
      drawX = x - textWidth / 2
    }
    page.drawText(text, { x: drawX, y, size: fontSize, font: textFont, color })
  }

  const drawText = (
    text: string,
    options?: {
      fontSize?: number
      font?: typeof font | typeof boldFont
      x?: number
      align?: 'left' | 'right' | 'center'
      color?: ReturnType<typeof rgb>
    }
  ) => {
    drawAbsoluteText(text, options?.x ?? margin, cursorY, options)
  }

  // Header section
  const headerHeight = 95
  const headerY = cursorY - headerHeight

  const sectionPadding = 0
  const leftX = margin + sectionPadding
  const rightX = margin + contentWidth - sectionPadding
  const brandY = headerY + headerHeight - 24

  if (logoImage) {
    const logoHeight = 40
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight
    page.drawImage(logoImage, {
      x: leftX,
      y: brandY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
  } else {
    drawAbsoluteText(getBrandName(), leftX, brandY - 16, {
      font: boldFont,
      fontSize: 20,
      color: rgb(0, 0, 0),
    })
  }

  drawAbsoluteText('HOÁ ĐƠN', rightX, brandY - 4, {
    font: boldFont,
    fontSize: 22,
    align: 'right',
  })
  drawAbsoluteText(`Mã hoá đơn: ${invoiceRecord.invoiceNumber}`, rightX, brandY - 26, {
    fontSize: 12,
    align: 'right',
  })
  drawAbsoluteText(`Trạng thái: ${statusLabel}`, rightX, brandY - 44, {
    fontSize: 12,
    color: statusColor,
    align: 'right',
  })

  cursorY = headerY - 10

  // Company & customer info
  const infoSectionHeight = 120
  const infoSectionY = cursorY - infoSectionHeight
  cursorY -= 20
  const infoHeaderY = cursorY - 4
  drawAbsoluteText('Thông tin công ty', margin + sectionPadding, infoHeaderY, {
    font: boldFont,
    fontSize: 12,
  })
  let infoLeftY = infoHeaderY - 18
  const companyLines = [
    companyInfo.name,
    companyInfo.address,
    `${companyInfo.phone}`,
    `${companyInfo.email}`,
    `${companyInfo.taxCode}`,
  ]
  companyLines.forEach((line) => {
    drawAbsoluteText(line, margin + sectionPadding, infoLeftY, { fontSize: 11 })
    infoLeftY -= 15
  })

  const recipientHeaderY = infoHeaderY
  drawAbsoluteText('Thông tin khách hàng', margin + contentWidth - sectionPadding, recipientHeaderY, {
    font: boldFont,
    fontSize: 12,
    align: 'right',
  })

  const recipientName = invoiceRecord.customerCompany || invoiceRecord.customerName || 'Khách hàng'
  const recipientAddress =
    invoiceRecord.customerCompany && invoiceRecord.customerAddress
      ? invoiceRecord.customerAddress
      : invoiceRecord.customerAddress || 'Chưa cập nhật'
  const recipientPhone =
    invoiceRecord.customerCompany && invoiceRecord.customerPhone
      ? invoiceRecord.customerPhone
      : invoiceRecord.customerPhone || 'Chưa cập nhật'
  const recipientTax =
    invoiceRecord.customerCompany && invoiceRecord.customerTaxCode
      ? invoiceRecord.customerTaxCode
      : invoiceRecord.customerTaxCode || 'Chưa cập nhật'

  const customerLines = [
    recipientName,
    recipientAddress,
    `${recipientPhone}`,
    `${invoiceRecord.customerEmail || 'Chưa cập nhật'}`,
  ]
  if (recipientTax && recipientTax !== 'Chưa cập nhật') {
    customerLines.push(`${recipientTax}`)
  }

  let infoRightY = recipientHeaderY - 18
  customerLines.forEach((line) => {
    drawAbsoluteText(line, margin + contentWidth - sectionPadding, infoRightY, { fontSize: 11, align: 'right' })
    infoRightY -= 15
  })

  cursorY = infoSectionY - 35

  // Items table
  drawText('Chi tiết sản phẩm/dịch vụ', { font: boldFont, fontSize: 13 })
  cursorY -= 16

  type ColumnKey = 'index' | 'description' | 'quantity' | 'unitPrice' | 'tax' | 'amount'
  type ColumnDefinition = { key: ColumnKey; label: string; ratio: number; align?: 'center' | 'right' }

  const columnDefinitions: ColumnDefinition[] = [
    { key: 'index', label: '#', ratio: 0.06, align: 'center' },
    { key: 'description', label: 'Mô tả', ratio: 0.42 },
    { key: 'quantity', label: 'Số lượng', ratio: 0.12, align: 'right' },
    { key: 'unitPrice', label: 'Đơn giá', ratio: 0.16, align: 'right' },
    { key: 'tax', label: 'Thuế', ratio: 0.10, align: 'right' },
    { key: 'amount', label: 'Thành tiền', ratio: 0.14, align: 'right' },
  ]

  let accumulatedWidth = 0
  const columns = columnDefinitions.map((definition, idx) => {
    const width =
      idx === columnDefinitions.length - 1
        ? contentWidth - accumulatedWidth
        : Math.round(contentWidth * definition.ratio)
    accumulatedWidth += width
    return { ...definition, width }
  })

  const itemsHeaderHeight = 22
  let currentX = margin
  columns.forEach((column) => {
    page.drawRectangle({
      x: currentX,
      y: cursorY - itemsHeaderHeight,
      width: column.width,
      height: itemsHeaderHeight,
      color: rgb(0.9, 0.9, 0.9),
    })
    const textX =
      column.align === 'right'
        ? currentX + column.width - 6
        : column.align === 'center'
          ? currentX + column.width / 2
          : currentX + 6
    drawAbsoluteText(column.label, textX, cursorY - itemsHeaderHeight + 6, {
      font: boldFont,
      fontSize: 11,
      align: column.align ?? 'left',
    })
    currentX += column.width
  })
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)
  cursorY -= itemsHeaderHeight + 2

  items.forEach((item, index) => {
    currentX = margin
    const rowHeight = 20
    const quantityValue = Number(item.quantity) || 0
    const unitPriceValue = Number(item.unitPrice) || 0
    columns.forEach((column) => {
      let value = ''
      switch (column.key) {
        case 'index':
          value = String(index + 1)
          break
        case 'description':
          value = item.description
          break
        case 'quantity':
          value = String(quantityValue)
          break
        case 'unitPrice':
          value = formatCurrency(unitPriceValue, invoiceRecord.currency || 'VND')
          break
        case 'tax':
          value = item.taxLabel === 'KCT' ? 'KCT' : `${Number(item.taxRate) || 0}%`
          break
        case 'amount':
          value = formatCurrency(unitPriceValue * quantityValue, invoiceRecord.currency || 'VND')
          break
      }
      const textX =
        column.align === 'right'
          ? currentX + column.width - 6
          : column.align === 'center'
            ? currentX + column.width / 2
            : currentX + 6
      drawAbsoluteText(value, textX, cursorY - rowHeight + 6, {
        fontSize: 10.5,
        align: column.align ?? 'left',
      })
      currentX += column.width
    })
    cursorY -= rowHeight
    if (cursorY > margin) {
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: margin + tableWidth, y: cursorY },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75),
      })
    }
  })

  cursorY -= 35

  // Summary & totals
  drawText('Tổng kết & thanh toán', { font: boldFont, fontSize: 13 })
  cursorY -= 5

  const summaryWidth = contentWidth * 0.42
  const summaryX = margin + contentWidth - summaryWidth

  const currency = invoiceRecord.currency || 'VND'

  const summaryLines: Array<{ label: string; value: string; bold?: boolean }> = [
    {
      label: 'Tạm tính',
      value: formatCurrency(Number(invoiceRecord.subtotal) || 0, currency),
    },
    {
      label: 'Thuế',
      value: formatCurrency(Number(invoiceRecord.tax) || 0, currency),
    },
    {
      label: 'Tổng thanh toán',
      value: formatCurrency(Number(invoiceRecord.total) || 0, currency),
      bold: true,
    },
  ]

  const paidAmount = Number(invoiceRecord.paid) || 0
  const balanceCandidate = Number(invoiceRecord.balance)
  const balanceAmount = Number.isFinite(balanceCandidate)
    ? balanceCandidate
    : Math.max((Number(invoiceRecord.total) || 0) - paidAmount, 0)

  if (statusKey === 'PARTIAL' && paidAmount > 0) {
    summaryLines.push({
      label: 'Đã thanh toán',
      value: formatCurrency(paidAmount, currency),
    })
    summaryLines.push({
      label: 'Còn lại',
      value: formatCurrency(balanceAmount, currency),
    })
  }

  let summaryY = cursorY - 20
  summaryLines.forEach((line) => {
    drawAbsoluteText(`${line.label}:`, summaryX + 14, summaryY, {
      font: line.bold ? boldFont : font,
      fontSize: 12,
    })
    drawAbsoluteText(line.value, summaryX + summaryWidth, summaryY, {
      font: line.bold ? boldFont : font,
      fontSize: 12,
      align: 'right',
    })
    summaryY -= 18
  })

  const paymentInfoLines = [
    `Ngày phát hành: ${format(invoiceRecord.issueDate ?? new Date(), 'dd/MM/yyyy')}`,
    `Ngày đến hạn: ${format(invoiceRecord.dueDate ?? new Date(), 'dd/MM/yyyy')}`,
    `Trạng thái: ${statusLabel}`,
  ]
  const paymentMethodLabelMap: Record<string, string> = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  }
  let paymentInfoY = cursorY - 20
  paymentInfoLines.forEach((line) => {
    drawAbsoluteText(line, margin, paymentInfoY, {
      fontSize: 12,
    })
    paymentInfoY -= 18
  })

  cursorY -= 120
  cursorY -= 16

  // Payment methods
  drawText('Hình thức thanh toán', { font: boldFont, fontSize: 13 })
  cursorY -= 18

  const paymentMethod = invoiceRecord.paymentMethod || 'BANK_TRANSFER'
  let paymentDetails: string[]
  if (paymentMethod === 'CASH') {
    paymentDetails = [
      'Hình thức thanh toán: Tiền mặt',
      'Vui lòng thanh toán trực tiếp tại văn phòng hoặc liên hệ phòng kế toán để được hỗ trợ xác nhận.',
      `Mã hoá đơn: ${invoiceRecord.invoiceNumber}`,
    ]
  } else {
    paymentDetails = [
      'Hình thức thanh toán: Chuyển khoản ngân hàng',
      `Ngân hàng: ${companyInfo.bankName}`,
      `Chi nhánh: ${companyInfo.bankBranch}`,
      `Số tài khoản: ${companyInfo.bankAccountNumber}`,
      `Chủ tài khoản: ${companyInfo.bankAccountName}`,
    ]
  }

  paymentDetails.forEach((line) => {
    drawText(line, { fontSize: 12 })
    cursorY -= 18
  })

  const pdfBytes = await pdfDoc.save()

  return {
    invoice: {
      id: invoiceRecord.id,
      invoiceNumber: invoiceRecord.invoiceNumber,
      status: invoiceRecord.status ?? 'UNKNOWN',
      issueDate: invoiceRecord.issueDate,
      dueDate: invoiceRecord.dueDate,
      subtotal: Number(invoiceRecord.subtotal) || 0,
      tax: Number(invoiceRecord.tax) || 0,
      total: Number(invoiceRecord.total) || 0,
      paid: paidAmount,
      balance: balanceAmount,
      paymentMethod: invoiceRecord.paymentMethod ?? null,
      notes: invoiceRecord.notes ?? null,
      currency,
      customerName: invoiceRecord.customerName ?? null,
      customerEmail: invoiceRecord.customerEmail ?? null,
      customerCompany: invoiceRecord.customerCompany ?? null,
      customerAddress: invoiceRecord.customerAddress ?? null,
      customerPhone: invoiceRecord.customerPhone ?? null,
      customerTaxCode: invoiceRecord.customerTaxCode ?? null,
    },
    items: items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      taxRate: item.taxLabel === 'KCT' ? 0 : Number(item.taxRate) || 0,
      taxLabel: item.taxLabel ?? null,
    })),
    pdfBuffer: Buffer.from(pdfBytes),
  }
}

