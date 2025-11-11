import { db } from '@/lib/database'
import {
  orders,
  customers,
  users,
  orderItems,
  domain,
  hosting,
  vps,
} from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { loadRobotoBoldFont, loadRobotoRegularFont } from '@/lib/fonts/roboto'

type PdfColor = ReturnType<typeof rgb>

export type GeneratedOrderPdf = {
  pdfBuffer: Buffer
  orderNumber: string
}

type OrderItemWithDetails = {
  id: number
  serviceType: string
  serviceId: number
  quantity: number
  price: number
  domainName?: string | null
  serviceName?: string | null
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

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return 'N/A'
  }
  const resolved = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(resolved.getTime())) {
    return 'N/A'
  }
  return resolved.toLocaleDateString('vi-VN')
}

function getServiceLabel(serviceType: string) {
  switch (serviceType) {
    case 'DOMAIN':
      return 'Tên miền'
    case 'HOSTING':
      return 'Gói Hosting'
    case 'VPS':
      return 'Gói VPS'
    default:
      return serviceType
  }
}

export async function generateOrderPdf(orderId: number): Promise<GeneratedOrderPdf> {
  if (Number.isNaN(orderId)) {
    throw new Error('ID đơn hàng không hợp lệ')
  }

  const orderResult = await db
    .select({
      id: orders.id,
      customerId: orders.customerId,
      userId: orders.userId,
      totalAmount: orders.totalAmount,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      companyName: customers.company,
      companyTaxCode: customers.companyTaxCode,
      companyEmail: customers.companyEmail,
      companyPhone: customers.companyPhone,
      companyAddress: customers.companyAddress,
      userName: users.name,
      userEmail: users.email,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1)

  if (orderResult.length === 0) {
    throw new Error('Không tìm thấy đơn hàng')
  }

  const order = orderResult[0]

  const orderItemsResult = await db
    .select({
      id: orderItems.id,
      serviceType: orderItems.serviceType,
      serviceId: orderItems.serviceId,
      quantity: orderItems.quantity,
      price: orderItems.price,
      serviceData: orderItems.serviceData,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const hostingIds: number[] = []
  const vpsIds: number[] = []
  const domainIds: number[] = []

  const parsedItems: OrderItemWithDetails[] = orderItemsResult.map((item) => {
    if (item.serviceType === 'HOSTING') {
      hostingIds.push(item.serviceId)
    } else if (item.serviceType === 'VPS') {
      vpsIds.push(item.serviceId)
    } else if (item.serviceType === 'DOMAIN') {
      domainIds.push(item.serviceId)
    }

    let domainName: string | undefined
    if (item.serviceType === 'DOMAIN' && item.serviceData) {
      try {
        const parsed = typeof item.serviceData === 'string' ? JSON.parse(item.serviceData) : item.serviceData
        if (parsed && typeof parsed === 'object' && 'domainName' in parsed) {
          domainName = String((parsed as any).domainName)
        }
      } catch (error) {
        // ignore parsing errors
      }
    }

    return {
      id: Number(item.id),
      serviceType: item.serviceType,
      serviceId: Number(item.serviceId),
      quantity: Number(item.quantity),
      price: Number(item.price),
      domainName,
    }
  })

  const [domainData, hostingData, vpsData] = await Promise.all([
    domainIds.length
      ? db
          .select({ id: domain.id, domainName: domain.domainName })
          .from(domain)
          .where(inArray(domain.id, domainIds))
      : [],
    hostingIds.length
      ? db
          .select({ id: hosting.id, planName: hosting.planName })
          .from(hosting)
          .where(inArray(hosting.id, hostingIds))
      : [],
    vpsIds.length
      ? db
          .select({ id: vps.id, planName: vps.planName })
          .from(vps)
          .where(inArray(vps.id, vpsIds))
      : [],
  ])

  const domainMap = new Map(domainData.map((item) => [item.id, item.domainName]))
  const hostingMap = new Map(hostingData.map((item) => [item.id, item.planName]))
  const vpsMap = new Map(vpsData.map((item) => [item.id, item.planName]))

  const itemsWithLabels: OrderItemWithDetails[] = parsedItems.map((item) => {
    let serviceName: string | null = null
    if (item.serviceType === 'DOMAIN') {
      serviceName = item.domainName ?? domainMap.get(item.serviceId) ?? null
    } else if (item.serviceType === 'HOSTING') {
      serviceName = hostingMap.get(item.serviceId) ?? null
    } else if (item.serviceType === 'VPS') {
      serviceName = vpsMap.get(item.serviceId) ?? null
    }

    return {
      ...item,
      serviceName,
    }
  })

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const [regularFontBytes, boldFontBytes] = await Promise.all([loadRobotoRegularFont(), loadRobotoBoldFont()])
  const font = await pdfDoc.embedFont(regularFontBytes, { subset: true })
  const fontBold = await pdfDoc.embedFont(boldFontBytes, { subset: true })

  let page = pdfDoc.addPage()
  let { width: pageWidth, height: pageHeight } = page.getSize()
  const marginTop = 64
  const marginBottom = 64
  const marginX = 56
  const contentWidth = pageWidth - marginX * 2
  const bodyFontSize = 11

  const textColor = rgb(0, 0, 0)
  const subtleStroke = rgb(200 / 255, 200 / 255, 200 / 255)
  const mutedText = rgb(90 / 255, 90 / 255, 90 / 255)

  let cursorY = pageHeight - marginTop

  const addNewPage = () => {
    page = pdfDoc.addPage()
    const size = page.getSize()
    pageWidth = size.width
    pageHeight = size.height
    cursorY = pageHeight - marginTop
  }

  const ensureHeight = (heightNeeded: number) => {
    if (cursorY - heightNeeded <= marginBottom) {
      addNewPage()
    }
  }

  const wrapText = (text: string, size: number, maxWidth: number, fontToUse = font) => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let current = ''
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word
      const width = fontToUse.widthOfTextAtSize(candidate, size)
      if (width <= maxWidth) {
        current = candidate
      } else {
        if (current) {
          lines.push(current)
        }
        const wordWidth = fontToUse.widthOfTextAtSize(word, size)
        if (wordWidth > maxWidth) {
          let fragment = ''
          word.split('').forEach((char) => {
            const next = fragment + char
            if (fontToUse.widthOfTextAtSize(next, size) <= maxWidth) {
              fragment = next
            } else {
              if (fragment) {
                lines.push(fragment)
              }
              fragment = char
            }
          })
          current = fragment
        } else {
          current = word
        }
      }
    })
    if (current) {
      lines.push(current)
    }
    return lines.length ? lines : ['']
  }

  const drawHeading = (title: string, subtitle?: string) => {
    ensureHeight(40)
    cursorY -= 6
    page.drawText(title, {
      x: marginX,
      y: cursorY,
      size: 14,
      font: fontBold,
      color: textColor,
    })
    cursorY -= 18
    if (subtitle) {
      const wrapped = wrapText(subtitle, 11, contentWidth)
      wrapped.forEach((line) => {
        page.drawText(line, {
          x: marginX,
          y: cursorY,
          size: 11,
          font,
          color: mutedText,
        })
        cursorY -= 14
      })
    }
    cursorY -= 12
  }

  type ColumnLine =
    | {
        label: string
        value: string
        valueColor?: PdfColor
      }
    | {
        value: string
      }

  const drawInfoColumns = (
    left: { title: string; lines: ColumnLine[] },
    right: { title: string; lines: ColumnLine[] }
  ) => {
    const columnGap = 32
    const columnWidth = (contentWidth - columnGap) / 2

    const normalizeValue = (value: string | null | undefined, fallback = 'Chưa cập nhật') => {
      if (value === null || value === undefined) {
        return fallback
      }
      const trimmed = value.toString().trim()
      return trimmed.length ? trimmed : fallback
    }

    const prepareColumn = (column: { title: string; lines: ColumnLine[] }) => {
      const sourceLines = column.lines.length
        ? column.lines
        : [
            {
              value: 'Chưa cập nhật',
            } as ColumnLine,
          ]

      const preparedLines = sourceLines.map((line) => {
        if ('label' in line) {
          const valueText = normalizeValue(line.value)
          const labelText = `${line.label.trim().length ? line.label.trim() : 'Thông tin'}:`
          const labelWidth = fontBold.widthOfTextAtSize(labelText, bodyFontSize) + 6
          const availableWidth = Math.max(columnWidth - labelWidth, columnWidth * 0.4)
          const valueLines = wrapText(valueText, bodyFontSize, availableWidth, font)
          const height = Math.max(bodyFontSize + 3, valueLines.length * (bodyFontSize + 3)) + 6
          return {
            type: 'labelValue' as const,
            labelText,
            labelWidth,
            valueLines,
            valueColor: line.valueColor,
            height,
          }
        }

        const valueText = normalizeValue(line.value)
        const wrapped = wrapText(valueText, bodyFontSize, columnWidth, font)
        const height = wrapped.length * (bodyFontSize + 3) + 6
        return {
          type: 'text' as const,
          lines: wrapped,
          height,
        }
      })

      const titleHeight = column.title ? 18 : 0
      const rowsHeight = preparedLines.reduce((total, line) => total + line.height, 0)
      const totalHeight = titleHeight + rowsHeight

      return { preparedLines, totalHeight }
    }

    const leftPrepared = prepareColumn(left)
    const rightPrepared = prepareColumn(right)
    const sectionHeight = Math.max(leftPrepared.totalHeight, rightPrepared.totalHeight)

    ensureHeight(sectionHeight)
    const startY = cursorY

    const drawColumn = (
      column: { title: string },
      prepared: {
        preparedLines: Array<
          | {
              type: 'labelValue'
              labelText: string
              valueLines: string[]
              valueColor?: PdfColor
              labelWidth: number
              height: number
            }
          | {
              type: 'text'
              lines: string[]
              height: number
            }
        >
      },
      x: number
    ) => {
      let y = startY
      if (column.title) {
        page.drawText(column.title, {
          x,
          y,
          size: 12,
          font: fontBold,
          color: textColor,
        })
        y -= 18
      }

      prepared.preparedLines.forEach((line) => {
        if (line.type === 'text') {
          line.lines.forEach((lineText) => {
            page.drawText(lineText, {
              x,
              y,
              size: bodyFontSize,
              font,
              color: textColor,
            })
            y -= bodyFontSize + 3
          })
          y -= 6
        } else {
          page.drawText(line.labelText, {
            x,
            y,
            size: bodyFontSize,
            font,
            color: textColor,
          })

          let valueY = y
          line.valueLines.forEach((valueLine) => {
            page.drawText(valueLine, {
              x: x + line.labelWidth,
              y: valueY,
              size: bodyFontSize,
              font,
              color: line.valueColor ?? textColor,
            })
            valueY -= bodyFontSize + 3
          })

          y = valueY - 6
        }
      })
    }

    drawColumn(left, leftPrepared, marginX)
    drawColumn(right, rightPrepared, marginX + columnWidth + columnGap)

    cursorY = startY - sectionHeight
    cursorY -= 18
  }

  const drawItemsTable = (items: OrderItemWithDetails[]) => {
    if (items.length === 0) {
      ensureHeight(40)
      page.drawText('Không có dịch vụ nào trong đơn hàng này.', {
        x: marginX,
        y: cursorY,
        size: 11,
        font,
        color: mutedText,
      })
      cursorY -= 24
      return
    }

    const headers = ['Dịch vụ', 'Số lượng', 'Đơn giá', 'Thành tiền']
    const columnWidths = [contentWidth * 0.46, contentWidth * 0.16, contentWidth * 0.18, contentWidth * 0.2]
    const rowHeight = 22
    const headerHeight = 24

    const renderRow = (cells: string[], isHeader = false) => {
      const fontToUse = isHeader ? fontBold : font
      const size = isHeader ? 11 : 10.5
      const baseHeight = isHeader ? headerHeight : rowHeight

      const wrappedCells = cells.map((cell, index) => {
        const maxWidth = columnWidths[index] - 16
        return wrapText(cell, size, maxWidth, fontToUse)
      })

      const contentHeight = Math.max(
        baseHeight,
        ...wrappedCells.map((lines) => lines.length * (size + 4) + 10)
      )

      ensureHeight(contentHeight + 6)
      const topY = cursorY
      page.drawRectangle({
        x: marginX,
        y: topY - contentHeight,
        width: contentWidth,
        height: contentHeight,
        borderColor: subtleStroke,
        borderWidth: 1,
      })

      let xPos = marginX
      wrappedCells.forEach((lines, index) => {
        const textBlockHeight = lines.length * size + (lines.length - 1) * 4
        const paddingTop = Math.max(6, (contentHeight - textBlockHeight) / 2)
        let currentY = topY - paddingTop

        lines.forEach((line) => {
          page.drawText(line, {
            x: xPos + 8,
            y: currentY - size,
            size,
            font: fontToUse,
            color: textColor,
          })
          currentY -= size + 4
        })
        xPos += columnWidths[index]
      })

      cursorY -= contentHeight
      if (!isHeader) {
        cursorY -= 2
      }
    }

    renderRow(headers, true)

    items.forEach((item) => {
      const subtotal = item.price * item.quantity
      const primaryName = item.serviceName || item.domainName || `Mã dịch vụ: ${item.serviceId}`
      const serviceLabel = getServiceLabel(item.serviceType)
      const serviceDescription =
        item.serviceType === 'DOMAIN' && item.domainName
          ? `${serviceLabel}: ${item.domainName}`
          : `${serviceLabel}: ${primaryName}`

      const quantity = `${item.quantity}`
      const unitPrice = formatCurrency(item.price)
      const total = formatCurrency(subtotal)
      renderRow([serviceDescription, quantity, unitPrice, total])
    })
  }

  const orderNumber = `ORD-${order.id}`

  drawHeading('HÓA ĐƠN/ĐƠN HÀNG DỊCH VỤ', `Mã đơn hàng: ${orderNumber}`)
  const paymentStatusLabel = order.status === 'COMPLETED' ? 'PAID' : 'PENDING'

  const normalize = (value: string | null | undefined, fallback = 'Chưa cập nhật') => {
    if (!value) {
      return fallback
    }
    const trimmed = value.toString().trim()
    return trimmed.length ? trimmed : fallback
  }

  const statusColor =
    order.status === 'COMPLETED'
      ? rgb(34 / 255, 139 / 255, 34 / 255)
      : order.status === 'CANCELLED'
        ? rgb(220 / 255, 38 / 255, 38 / 255)
        : rgb(37 / 255, 99 / 255, 235 / 255)

  const orderInfoLines: ColumnLine[] = [
    { label: 'Trạng thái đơn hàng', value: normalize(order.status, 'Chưa cập nhật'), valueColor: statusColor },
    { label: 'Trạng thái thanh toán', value: paymentStatusLabel },
    { label: 'Phương thức thanh toán', value: normalize(order.paymentMethod, 'Chưa cập nhật') },
    { label: 'Ngày tạo', value: formatDate(order.createdAt) },
    { label: 'Cập nhật cuối', value: formatDate(order.updatedAt) },
    { label: 'Tổng tiền', value: formatCurrency(order.totalAmount) },
  ]

  const hasCompanyInfo = [order.companyName, order.companyTaxCode, order.companyEmail, order.companyPhone, order.companyAddress].some(
    (value) => value && value.toString().trim().length
  )

  const companyLines: ColumnLine[] = [
    { value: normalize(order.companyName, 'Chưa có tên công ty') },
    { value: order.companyTaxCode ? `Mã số thuế: ${order.companyTaxCode}` : 'Mã số thuế chưa cập nhật' },
    { value: order.companyEmail ? `Email: ${order.companyEmail}` : 'Email chưa cập nhật' },
    { value: order.companyPhone ? `Số điện thoại: ${order.companyPhone}` : 'Số điện thoại chưa cập nhật' },
    { value: normalize(order.companyAddress, 'Địa chỉ công ty chưa cập nhật') },
  ]

  const personalLines: ColumnLine[] = [
    { value: normalize(order.customerName, 'Chưa có tên khách hàng') },
    { value: order.customerEmail ? `Email: ${order.customerEmail}` : 'Email chưa cập nhật' },
    { value: order.customerPhone ? `Số điện thoại: ${order.customerPhone}` : 'Số điện thoại chưa cập nhật' },
    { value: normalize(order.customerAddress, 'Địa chỉ chưa cập nhật') },
  ]

  const customerInfoLines = hasCompanyInfo ? companyLines : personalLines

  drawInfoColumns(
    {
      title: 'Thông tin đơn hàng',
      lines: orderInfoLines,
    },
    {
      title: 'Thông tin khách hàng',
      lines: customerInfoLines,
    }
  )

  if (order.notes) {
    drawHeading('Ghi chú của đơn hàng')
    const notesLines = wrapText(order.notes, bodyFontSize, contentWidth)
    notesLines.forEach((line) => {
      ensureHeight(bodyFontSize + 6)
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size: bodyFontSize,
        font,
        color: textColor,
      })
      cursorY -= bodyFontSize + 6
    })
    cursorY -= 10
  }

  drawHeading('Danh sách dịch vụ đã đặt')
  cursorY += 6
  drawItemsTable(itemsWithLabels)

  if (order.userName) {
    ensureHeight(80)
    cursorY -= 28
    page.drawText(`Nhân viên phụ trách: ${order.userName}${order.userEmail ? ` (${order.userEmail})` : ''}`, {
      x: marginX,
      y: cursorY,
      size: 11,
      font,
      color: mutedText,
    })
    cursorY -= 24
  }

  const pdfBytes = await pdfDoc.save()
  return {
    pdfBuffer: Buffer.from(pdfBytes),
    orderNumber,
  }
}
