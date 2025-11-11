import { db } from '@/lib/database'
import {
  contracts,
  customers,
  orders,
  contractDomains,
  contractHostings,
  contractVpss,
  domain,
  hosting,
  vps,
  settings,
  users,
} from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { loadRobotoBoldFont, loadRobotoRegularFont } from '@/lib/fonts/roboto'

export type GeneratedContractPdf = {
  pdfBuffer: Buffer
  contractNumber: string
}

type CompanyInfo = {
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  companyTaxCode: string
}

function getDefaultCompanyInfo(): CompanyInfo {
  return {
    companyName: process.env.NEXT_PUBLIC_BRAND_NAME || 'CRM Portal',
    companyEmail: 'support@crmportal.com',
    companyPhone: '1900 1234',
    companyAddress: '123 Nguyễn Huệ, Q1, TP.HCM',
    companyTaxCode: '',
  }
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return 'N/A'
  }
  const resolvedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(resolvedDate.getTime()) ? 'N/A' : resolvedDate.toLocaleDateString('vi-VN')
}

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A'
  }
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    return 'N/A'
  }
  return `${numeric.toLocaleString('vi-VN')} VND`
}

function formatBadge(value: unknown) {
  if (value === null || value === undefined) {
    return undefined
  }
  const text = String(value).trim()
  return text.length > 0 ? text.toUpperCase() : undefined
}

async function fetchCompanyInfo(): Promise<CompanyInfo> {
  const fallback = getDefaultCompanyInfo()
  try {
    const result = await db.select().from(settings).where(eq(settings.key, 'general')).limit(1)
    if (result.length === 0) {
      return fallback
    }

    const rawValue = result[0].value
    let parsedValue: Record<string, unknown> = {}

    if (typeof rawValue === 'string') {
      try {
        parsedValue = JSON.parse(rawValue)
      } catch (error) {
        console.error('Error parsing settings value: ', error)
        parsedValue = {}
      }
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue as Record<string, unknown>
    }

    return {
      companyName: typeof parsedValue.companyName === 'string' ? parsedValue.companyName : fallback.companyName,
      companyEmail: typeof parsedValue.companyEmail === 'string' ? parsedValue.companyEmail : fallback.companyEmail,
      companyPhone: typeof parsedValue.companyPhone === 'string' ? parsedValue.companyPhone : fallback.companyPhone,
      companyAddress: typeof parsedValue.companyAddress === 'string' ? parsedValue.companyAddress : fallback.companyAddress,
      companyTaxCode: typeof parsedValue.companyTaxCode === 'string' ? parsedValue.companyTaxCode : fallback.companyTaxCode,
    }
  } catch (error) {
    console.error('Error fetching company info:', error)
    return fallback
  }
}

export async function generateContractPdf(contractId: number): Promise<GeneratedContractPdf> {
  if (Number.isNaN(contractId)) {
    throw new Error('ID hợp đồng không hợp lệ')
  }

  const contractResult = await db
    .select({
      id: contracts.id,
      contractNumber: contracts.contractNumber,
      orderId: contracts.orderId,
      customerId: contracts.customerId,
      userId: contracts.userId,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      totalValue: contracts.totalValue,
      status: contracts.status,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerCompany: customers.company,
      customerTaxCode: customers.taxCode,
      customerAddress: customers.address,
      companyEmail: customers.companyEmail,
      companyPhone: customers.companyPhone,
      companyAddress: customers.companyAddress,
      companyTaxCode: customers.companyTaxCode,
      assignedUserName: users.name,
      assignedUserEmail: users.email,
      orderNumberRaw: orders.id,
      orderTotalAmount: orders.totalAmount,
      orderStatus: orders.status,
    })
    .from(contracts)
    .leftJoin(customers, eq(contracts.customerId, customers.id))
    .leftJoin(orders, eq(contracts.orderId, orders.id))
    .leftJoin(users, eq(contracts.userId, users.id))
    .where(eq(contracts.id, contractId))
    .limit(1)

  if (contractResult.length === 0) {
    throw new Error('Không tìm thấy hợp đồng')
  }

  const contract = contractResult[0]

  const [domainRelations, hostingRelations, vpsRelations] = await Promise.all([
    db
      .select({
        domainId: contractDomains.domainId,
      })
      .from(contractDomains)
      .where(eq(contractDomains.contractId, contractId)),
    db
      .select({
        hostingId: contractHostings.hostingId,
      })
      .from(contractHostings)
      .where(eq(contractHostings.contractId, contractId)),
    db
      .select({
        vpsId: contractVpss.vpsId,
      })
      .from(contractVpss)
      .where(eq(contractVpss.contractId, contractId)),
  ])

  const domainIds = domainRelations.map((relation) => relation.domainId)
  const hostingIds = hostingRelations.map((relation) => relation.hostingId)
  const vpsIds = vpsRelations.map((relation) => relation.vpsId)

  const [domainsData, hostingsData, vpsData] = await Promise.all([
    domainIds.length
      ? db
          .select({
            id: domain.id,
            domainName: domain.domainName,
            registrar: domain.registrar,
            registrationDate: domain.registrationDate,
            expiryDate: domain.expiryDate,
            status: domain.status,
            price: domain.price,
          })
          .from(domain)
          .where(inArray(domain.id, domainIds))
      : [],
    hostingIds.length
      ? db
          .select({
            id: hosting.id,
            planName: hosting.planName,
            storage: hosting.storage,
            bandwidth: hosting.bandwidth,
            price: hosting.price,
            status: hosting.status,
            expiryDate: hosting.expiryDate,
            serverLocation: hosting.serverLocation,
          })
          .from(hosting)
          .where(inArray(hosting.id, hostingIds))
      : [],
    vpsIds.length
      ? db
          .select({
            id: vps.id,
            planName: vps.planName,
            cpu: vps.cpu,
            ram: vps.ram,
            storage: vps.storage,
            bandwidth: vps.bandwidth,
            price: vps.price,
            status: vps.status,
            expiryDate: vps.expiryDate,
            os: vps.os,
            ipAddress: vps.ipAddress,
          })
          .from(vps)
          .where(inArray(vps.id, vpsIds))
      : [],
  ])

  const formattedContract = {
    ...contract,
    orderNumber: contract.orderNumberRaw ? `ORD-${contract.orderNumberRaw}` : null,
    domainIds,
    hostingIds,
    vpsIds,
    domains: domainsData,
    hostings: hostingsData,
    vpss: vpsData,
  }

  const companyInfo = await fetchCompanyInfo()

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const [regularFontBytes, boldFontBytes] = await Promise.all([loadRobotoRegularFont(), loadRobotoBoldFont()])
  const font = await pdfDoc.embedFont(regularFontBytes, { subset: true })
  const fontBold = await pdfDoc.embedFont(boldFontBytes, { subset: true })

  let page = pdfDoc.addPage()
  let { width: pageWidth, height: pageHeight } = page.getSize()
  const marginTop = 72
  const marginBottom = 72
  const marginX = 56
  const contentWidth = pageWidth - marginX * 2
  const bodyFontSize = 11
  const labelFontSize = 9.5
  const headingFontSize = 13

  const accentColor = rgb(64 / 255, 87 / 255, 141 / 255)
  const subtleStroke = rgb(214 / 255, 222 / 255, 241 / 255)
  const cardBackground = rgb(246 / 255, 249 / 255, 255 / 255)
  const mutedTextColor = rgb(96 / 255, 102 / 255, 112 / 255)
  const titleTextColor = rgb(34 / 255, 40 / 255, 49 / 255)

  let cursorY = pageHeight - marginTop

  const addNewPage = (carryHeading?: string) => {
    page = pdfDoc.addPage()
    const size = page.getSize()
    pageWidth = size.width
    pageHeight = size.height
    cursorY = pageHeight - marginTop
    if (carryHeading) {
      drawSectionHeading(carryHeading)
    }
  }

  const ensureHeight = (heightNeeded: number, carryHeading?: string) => {
    if (cursorY - heightNeeded <= marginBottom) {
      addNewPage(carryHeading)
    }
  }

  const wrapText = (text: string, textFont: typeof font, size: number, maxWidth: number) => {
    if (!text) return ['']
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''
    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      const candidateWidth = textFont.widthOfTextAtSize(candidate, size)
      if (candidateWidth <= maxWidth) {
        currentLine = candidate
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        const forcedWidth = textFont.widthOfTextAtSize(word, size)
        if (forcedWidth > maxWidth) {
          let chunk = ''
          word.split('').forEach((char) => {
            const chunkCandidate = chunk + char
            if (textFont.widthOfTextAtSize(chunkCandidate, size) <= maxWidth) {
              chunk = chunkCandidate
            } else {
              if (chunk) {
                lines.push(chunk)
              }
              chunk = char
            }
          })
          currentLine = chunk
        } else {
          currentLine = word
        }
      }
    })
    if (currentLine) {
      lines.push(currentLine)
    }
    return lines.length > 0 ? lines : ['']
  }

  const drawDivider = () => {
    ensureHeight(14)
    page.drawLine({
      start: { x: marginX, y: cursorY },
      end: { x: marginX + contentWidth, y: cursorY },
      thickness: 1,
      color: subtleStroke,
    })
    cursorY -= 18
  }

  const drawParagraph = (
    text: string,
    options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineGap?: number; indent?: number } = {}
  ) => {
    const size = options.size ?? bodyFontSize
    const textFont = options.bold ? fontBold : font
    const maxWidth = contentWidth - (options.indent ?? 0)
    const lines = wrapText(text, textFont, size, maxWidth)
    const lineGap = options.lineGap ?? 4
    const totalHeight = lines.length * (size + lineGap)
    ensureHeight(totalHeight)
    lines.forEach((line, index) => {
      const y = cursorY - index * (size + lineGap)
      page.drawText(line, {
        x: marginX + (options.indent ?? 0),
        y,
        size,
        font: textFont,
        color: options.color ?? titleTextColor,
      })
    })
    cursorY -= totalHeight + 4
  }

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureHeight(40)
    cursorY -= 4
    page.drawText(title.toUpperCase(), {
      x: marginX,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: accentColor,
    })
    cursorY -= 12
    drawDivider()
    if (subtitle) {
      drawParagraph(subtitle, { size: 10.5, color: mutedTextColor })
    }
  }

  const drawInfoCard = (config: { title: string; rows: Array<{ label: string; value: string }> }) => {
    const paddingX = 18
    const paddingY = 16
    const valueLineGap = 3
    const innerWidth = contentWidth - paddingX * 2

    let cardHeight = paddingY * 2 + headingFontSize + 6
    config.rows.forEach((row) => {
      const valueLines = wrapText(row.value || 'N/A', font, bodyFontSize, innerWidth)
      cardHeight += labelFontSize + 2
      cardHeight += valueLines.length * (bodyFontSize + valueLineGap)
      cardHeight += 8
    })

    ensureHeight(cardHeight + 8)
    const cardTop = cursorY

    page.drawRectangle({
      x: marginX,
      y: cardTop - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: cardBackground,
      borderColor: subtleStroke,
      borderWidth: 1,
      opacity: 1,
    })

    let textCursorY = cardTop - paddingY - headingFontSize
    page.drawText(config.title, {
      x: marginX + paddingX,
      y: textCursorY,
      size: headingFontSize,
      font: fontBold,
      color: accentColor,
    })

    textCursorY -= headingFontSize + 6

    config.rows.forEach((row) => {
      page.drawText(row.label.toUpperCase(), {
        x: marginX + paddingX,
        y: textCursorY,
        size: labelFontSize,
        font: fontBold,
        color: mutedTextColor,
      })
      textCursorY -= labelFontSize + 2

      const valueLines = wrapText(row.value || 'N/A', font, bodyFontSize, innerWidth)
      valueLines.forEach((line) => {
        page.drawText(line, {
          x: marginX + paddingX,
          y: textCursorY,
          size: bodyFontSize,
          font,
          color: titleTextColor,
        })
        textCursorY -= bodyFontSize + valueLineGap
      })
      textCursorY -= 6
    })

    cursorY = cardTop - cardHeight - 24
  }

  const drawServiceCard = (
    card: {
      title: string
      tag?: string
      tagColor?: ReturnType<typeof rgb>
      lines: string[]
    },
    options: { accent?: ReturnType<typeof rgb> } = {}
  ) => {
    const cardPaddingX = 16
    const cardPaddingY = 14
    const innerWidth = contentWidth - cardPaddingX * 2
    const tagHeight = card.tag ? 18 : 0
    let cardHeight = cardPaddingY * 2 + headingFontSize + (card.tag ? tagHeight + 6 : 0)
    card.lines.forEach((line) => {
      const wrapped = wrapText(line, font, bodyFontSize, innerWidth)
      cardHeight += wrapped.length * (bodyFontSize + 3)
      cardHeight += 3
    })

    ensureHeight(cardHeight + 12)
    const topY = cursorY

    page.drawRectangle({
      x: marginX,
      y: topY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      opacity: 0,
      borderColor: options.accent ?? accentColor,
      borderWidth: 1,
    })

    page.drawRectangle({
      x: marginX,
      y: topY - cardHeight,
      width: 4,
      height: cardHeight,
      color: options.accent ?? accentColor,
      opacity: 1,
    })

    let textY = topY - cardPaddingY - headingFontSize
    page.drawText(card.title, {
      x: marginX + cardPaddingX,
      y: textY,
      size: headingFontSize,
      font: fontBold,
      color: titleTextColor,
    })
    textY -= headingFontSize + 4

    if (card.tag) {
      const tagWidth = font.widthOfTextAtSize(card.tag, 9) + 14
      page.drawRectangle({
        x: marginX + cardPaddingX,
        y: textY - tagHeight + 4,
        width: tagWidth,
        height: tagHeight,
        color: card.tagColor ?? options.accent ?? accentColor,
        opacity: 0.1,
        borderColor: card.tagColor ?? options.accent ?? accentColor,
        borderWidth: 1,
      })
      page.drawText(card.tag, {
        x: marginX + cardPaddingX + 7,
        y: textY - tagHeight / 2 + 6,
        size: 9,
        font: fontBold,
        color: card.tagColor ?? options.accent ?? accentColor,
      })
      textY -= tagHeight + 6
    }

    card.lines.forEach((line) => {
      const wrapped = wrapText(line, font, bodyFontSize, innerWidth)
      wrapped.forEach((wrappedLine) => {
        page.drawText(wrappedLine, {
          x: marginX + cardPaddingX,
          y: textY,
          size: bodyFontSize,
          font,
          color: titleTextColor,
        })
        textY -= bodyFontSize + 3
      })
      textY -= 4
    })

    cursorY = topY - cardHeight - 20
  }

  const drawSignatureBlock = () => {
    ensureHeight(120)
    const blockWidth = (contentWidth - 40) / 2
    const blockHeight = 90
    const labels = [
      { title: 'Đại diện công ty', hint: '(Ký, ghi rõ họ tên)' },
      { title: 'Đại diện khách hàng', hint: '(Ký, ghi rõ họ tên)' },
    ]

    labels.forEach((label, index) => {
      const offsetX = marginX + index * (blockWidth + 40)
      const topY = cursorY
      page.drawRectangle({
        x: offsetX,
        y: topY - blockHeight,
        width: blockWidth,
        height: blockHeight,
        borderColor: subtleStroke,
        borderWidth: 1,
        opacity: 0,
      })
      page.drawText(label.title, {
        x: offsetX + 16,
        y: topY - 20,
        size: 11,
        font: fontBold,
        color: accentColor,
      })
      page.drawText(label.hint, {
        x: offsetX + 16,
        y: topY - blockHeight + 16,
        size: 10,
        font,
        color: mutedTextColor,
      })
      page.drawLine({
        start: { x: offsetX + 16, y: topY - blockHeight + 36 },
        end: { x: offsetX + blockWidth - 16, y: topY - blockHeight + 36 },
        thickness: 1,
        color: subtleStroke,
      })
    })

    cursorY -= blockHeight + 12
  }

  const summaryRows = [
    { label: 'MÃ HỢP ĐỒNG', value: formattedContract.contractNumber || `HD-${formattedContract.id}` },
    { label: 'Ngày tạo', value: formatDate(formattedContract.createdAt) },
    { label: 'Ngày hiệu lực', value: `${formatDate(formattedContract.startDate)} - ${formatDate(formattedContract.endDate)}` },
    { label: 'Giá trị hợp đồng', value: formatCurrency(formattedContract.totalValue) },
    { label: 'Trạng thái hợp đồng', value: formattedContract.status ?? 'N/A' },
    { label: 'Trạng thái đơn hàng', value: formattedContract.orderStatus ?? 'N/A' },
  ]

  const companyRows = [
    { label: 'Tên công ty', value: formattedContract.customerCompany ?? 'Chưa cập nhật' },
    { label: 'Mã số thuế', value: formattedContract.companyTaxCode ?? 'Chưa cập nhật' },
    { label: 'Email', value: formattedContract.companyEmail ?? 'Chưa cập nhật' },
    { label: 'Điện thoại', value: formattedContract.companyPhone ?? 'Chưa cập nhật' },
    { label: 'Địa chỉ', value: formattedContract.companyAddress ?? 'Chưa cập nhật' },
  ]

  const customerRows = [
    { label: 'Khách hàng', value: formattedContract.customerName ?? 'Chưa cập nhật' },
    { label: 'Email', value: formattedContract.customerEmail ?? 'Chưa cập nhật' },
    { label: 'Số điện thoại', value: formattedContract.customerPhone ?? 'Chưa cập nhật' },
    { label: 'Mã số thuế cá nhân', value: formattedContract.customerTaxCode ?? 'Chưa cập nhật' },
    { label: 'Địa chỉ', value: formattedContract.customerAddress ?? 'Chưa cập nhật' },
    {
      label: 'Nhân viên phụ trách',
      value: formattedContract.assignedUserName
        ? `${formattedContract.assignedUserName}${formattedContract.assignedUserEmail ? ` (${formattedContract.assignedUserEmail})` : ''}`
        : 'Chưa cập nhật',
    },
  ]

  drawInfoCard({ title: '1. Thông tin hợp đồng', rows: summaryRows })
  drawInfoCard({ title: '2. Thông tin công ty', rows: companyRows })
  drawInfoCard({ title: '3. Thông tin khách hàng', rows: customerRows })

  const domainCards = formattedContract.domains.map((item) => ({
    title: item.domainName,
    tag: formatBadge(item.status),
    lines: [
      `Registrar: ${item.registrar ?? 'N/A'}`,
      `Hiệu lực: ${formatDate(item.registrationDate)} - ${formatDate(item.expiryDate)}`,
      `Giá: ${formatCurrency(item.price)}`,
    ],
  }))

  const hostingCards = formattedContract.hostings.map((item) => ({
    title: item.planName,
    tag: formatBadge(item.status),
    lines: [
      `Cấu hình: ${item.storage ? `${item.storage} GB` : 'N/A'} lưu trữ • ${item.bandwidth ? `${item.bandwidth} GB` : 'N/A'} băng thông`,
      `Ngày hết hạn: ${formatDate(item.expiryDate)}`,
      `Giá: ${formatCurrency(item.price)}`,
    ],
  }))

  const vpsCards = formattedContract.vpss.map((item) => ({
    title: item.planName,
    tag: formatBadge(item.status),
    lines: [
      `CPU ${item.cpu ?? 'N/A'} • RAM ${item.ram ?? 'N/A'} GB • Storage ${item.storage ?? 'N/A'} GB • Băng thông ${item.bandwidth ?? 'N/A'} GB`,
      `OS: ${item.os ?? 'N/A'} • IP: ${item.ipAddress ?? 'N/A'}`,
      `Ngày hết hạn: ${formatDate(item.expiryDate)}`,
      `Giá: ${formatCurrency(item.price)}`,
    ],
  }))

  const drawServiceSection = (
    heading: string,
    cards: typeof domainCards,
    options: { accent?: ReturnType<typeof rgb>; emptyMessage: string }
  ) => {
    if (!cards.length) {
      drawSectionHeading(heading)
      drawParagraph(options.emptyMessage, { color: mutedTextColor, size: 11 })
      return
    }

    drawSectionHeading(heading)
    cards.forEach((card) => {
      drawServiceCard(card, options)
    })
  }

  drawServiceSection('4. Tên miền đã đăng ký', domainCards, {
    accent: rgb(82 / 255, 136 / 255, 248 / 255),
    emptyMessage: 'Không có tên miền nào thuộc hợp đồng này.',
  })

  drawServiceSection('5. Hosting', hostingCards, {
    accent: rgb(37 / 255, 188 / 255, 134 / 255),
    emptyMessage: 'Không có gói hosting nào thuộc hợp đồng này.',
  })

  drawServiceSection('6. VPS', vpsCards, {
    accent: rgb(128 / 255, 90 / 255, 213 / 255),
    emptyMessage: 'Không có gói VPS nào thuộc hợp đồng này.',
  })

  drawSectionHeading('7. Chữ ký xác nhận')
  drawSignatureBlock()

  const pdfBytes = await pdfDoc.save()
  const pdfBuffer = Buffer.from(pdfBytes)

  return {
    pdfBuffer,
    contractNumber: formattedContract.contractNumber || `hop-dong-${contractId}`,
  }
}
