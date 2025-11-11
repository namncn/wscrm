'use server'

import { db } from '@/lib/database'
import { contracts, customers, orders, users, contractDomains, contractHostings, contractVpss } from '@/lib/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const customerIdParam = searchParams.get('customerId')

    let finalCustomerId: number | null = null
    if (isCustomer) {
      if (!session.user.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }

      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)

      if (!customer || customer.length === 0) {
        return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
      }

      finalCustomerId = customer[0].id
    } else if (customerIdParam) {
      finalCustomerId = Number.parseInt(customerIdParam, 10)
    }

    let query = db
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
        userName: users.name,
        orderNumberRaw: orders.id,
      })
      .from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(orders, eq(contracts.orderId, orders.id))
      .leftJoin(users, eq(contracts.userId, users.id))

    const contractsWithDetails = finalCustomerId
      ? await query.where(eq(contracts.customerId, finalCustomerId)).orderBy(desc(contracts.createdAt))
      : await query.orderBy(desc(contracts.createdAt))

    const contractIds = contractsWithDetails.map((c: any) => c.id)

    const domainRelationsMap: Record<number, number[]> = {}
    const hostingRelationsMap: Record<number, number[]> = {}
    const vpsRelationsMap: Record<number, number[]> = {}

    if (contractIds.length > 0) {
      const domainRelations = await db
        .select({ contractId: contractDomains.contractId, domainId: contractDomains.domainId })
        .from(contractDomains)
        .where(inArray(contractDomains.contractId, contractIds))

      domainRelations.forEach((relation) => {
        domainRelationsMap[relation.contractId] ??= []
        domainRelationsMap[relation.contractId].push(relation.domainId)
      })

      const hostingRelations = await db
        .select({ contractId: contractHostings.contractId, hostingId: contractHostings.hostingId })
        .from(contractHostings)
        .where(inArray(contractHostings.contractId, contractIds))

      hostingRelations.forEach((relation) => {
        hostingRelationsMap[relation.contractId] ??= []
        hostingRelationsMap[relation.contractId].push(relation.hostingId)
      })

      const vpsRelations = await db
        .select({ contractId: contractVpss.contractId, vpsId: contractVpss.vpsId })
        .from(contractVpss)
        .where(inArray(contractVpss.contractId, contractIds))

      vpsRelations.forEach((relation) => {
        vpsRelationsMap[relation.contractId] ??= []
        vpsRelationsMap[relation.contractId].push(relation.vpsId)
      })
    }

    const formattedContracts = contractsWithDetails.map((contract: any) => ({
      ...contract,
      orderNumber: contract.orderNumberRaw ? `ORD-${contract.orderNumberRaw}` : null,
      orderNumberRaw: undefined,
      domainIds: domainRelationsMap[contract.id] || [],
      hostingIds: hostingRelationsMap[contract.id] || [],
      vpsIds: vpsRelationsMap[contract.id] || [],
    }))

    return createSuccessResponse(formattedContracts, 'Tải danh sách hợp đồng')
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return createErrorResponse('Không thể tải danh sách hợp đồng')
  }
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse(
      'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo hợp đồng.',
      403
    )
  }

  try {
    const { orderId, startDate, endDate, totalValue, domainIds, hostingIds, vpsIds } = await req.json()

    const orderDetails = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        userId: orders.userId,
        totalAmount: orders.totalAmount,
        status: orders.status,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!orderDetails[0]) {
      return createErrorResponse('Không tìm thấy đơn hàng', 404)
    }

    const firstUser = await db.select({ id: users.id }).from(users).limit(1)
    if (!firstUser[0]) {
      return createErrorResponse('Không tìm thấy user trong database', 400)
    }

    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const datePrefix = `${year}${month}${day}`

    await db.insert(contracts).values({
      contractNumber: '',
      orderId,
      customerId: orderDetails[0].customerId,
      userId: firstUser[0].id,
      startDate,
      endDate,
      totalValue: Math.round(totalValue),
      status: 'ACTIVE',
    })

    const lastContract = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.orderId, orderId))
      .orderBy(desc(contracts.createdAt))
      .limit(1)

    if (!lastContract[0]) {
      return createErrorResponse('Không thể tạo hợp đồng', 500)
    }

    const contractId = lastContract[0].id
    const contractNumber = `HD-${datePrefix}-${contractId}`

    await db.update(contracts).set({ contractNumber }).where(eq(contracts.id, contractId))

    const contract = await db
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
        userName: users.name,
        orderNumberRaw: orders.id,
      })
      .from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(orders, eq(contracts.orderId, orders.id))
      .leftJoin(users, eq(contracts.userId, users.id))
      .where(eq(contracts.id, contractId))
      .limit(1)

    const domainRelations = await db
      .select({ domainId: contractDomains.domainId })
      .from(contractDomains)
      .where(eq(contractDomains.contractId, contractId))
    const domainIdsArray = domainRelations.map((relation) => relation.domainId)

    const hostingRelations = await db
      .select({ hostingId: contractHostings.hostingId })
      .from(contractHostings)
      .where(eq(contractHostings.contractId, contractId))
    const hostingIdsArray = hostingRelations.map((relation) => relation.hostingId)

    const vpsRelations = await db
      .select({ vpsId: contractVpss.vpsId })
      .from(contractVpss)
      .where(eq(contractVpss.contractId, contractId))
    const vpsIdsArray = vpsRelations.map((relation) => relation.vpsId)

    const formattedContract = {
      ...contract[0],
      orderNumber: (contract[0] as any).orderNumberRaw ? `ORD-${(contract[0] as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined,
      domainIds: domainIdsArray,
      hostingIds: hostingIdsArray,
      vpsIds: vpsIdsArray,
    }

    return createCreatedResponse(formattedContract, 'Tạo hợp đồng')
  } catch (error) {
    console.error('Error creating contract:', error)
    return createErrorResponse('Không thể tạo hợp đồng')
  }
}

export async function PUT(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse(
      'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật hợp đồng.',
      403
    )
  }

  try {
    const body = await req.json()
    const { id, startDate, endDate, totalValue, status, customerId, orderId, domainIds, hostingIds, vpsIds } = body

    if (!id) {
      return createErrorResponse('ID hợp đồng là bắt buộc', 400)
    }

    const existingContract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1)

    if (existingContract.length === 0) {
      return createErrorResponse('Không tìm thấy hợp đồng', 404)
    }

    await db
      .update(contracts)
      .set({
        startDate: startDate ? startDate.split('T')[0] : existingContract[0].startDate,
        endDate: endDate ? endDate.split('T')[0] : existingContract[0].endDate,
        totalValue: totalValue !== undefined ? Math.round(totalValue) : existingContract[0].totalValue,
        status: status || existingContract[0].status,
        customerId: customerId ?? existingContract[0].customerId,
        orderId: orderId ?? existingContract[0].orderId,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, id))

    const contractId = Number.parseInt(id)

    if (domainIds !== undefined) {
      await db.delete(contractDomains).where(eq(contractDomains.contractId, contractId))
      if (Array.isArray(domainIds) && domainIds.length > 0) {
        await db.insert(contractDomains).values(
          domainIds.map((domainId: number) => ({
            contractId,
            domainId,
          }))
        )
      }
    }

    if (hostingIds !== undefined) {
      await db.delete(contractHostings).where(eq(contractHostings.contractId, contractId))
      if (Array.isArray(hostingIds) && hostingIds.length > 0) {
        await db.insert(contractHostings).values(
          hostingIds.map((hostingId: number) => ({
            contractId,
            hostingId,
          }))
        )
      }
    }

    if (vpsIds !== undefined) {
      await db.delete(contractVpss).where(eq(contractVpss.contractId, contractId))
      if (Array.isArray(vpsIds) && vpsIds.length > 0) {
        await db.insert(contractVpss).values(
          vpsIds.map((vpsId: number) => ({
            contractId,
            vpsId,
          }))
        )
      }
    }

    const updatedContract = await db
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
        userName: users.name,
        orderNumberRaw: orders.id,
      })
      .from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(orders, eq(contracts.orderId, orders.id))
      .leftJoin(users, eq(contracts.userId, users.id))
      .where(eq(contracts.id, contractId))
      .limit(1)

    const domainRelations = await db
      .select({ domainId: contractDomains.domainId })
      .from(contractDomains)
      .where(eq(contractDomains.contractId, contractId))
    const finalDomainIds = domainRelations.map((relation) => relation.domainId)

    const hostingRelations = await db
      .select({ hostingId: contractHostings.hostingId })
      .from(contractHostings)
      .where(eq(contractHostings.contractId, contractId))
    const finalHostingIds = hostingRelations.map((relation) => relation.hostingId)

    const vpsRelations = await db
      .select({ vpsId: contractVpss.vpsId })
      .from(contractVpss)
      .where(eq(contractVpss.contractId, contractId))
    const finalVpsIds = vpsRelations.map((relation) => relation.vpsId)

    const formattedContract = {
      ...updatedContract[0],
      orderNumber: (updatedContract[0] as any).orderNumberRaw ? `ORD-${(updatedContract[0] as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined,
      domainIds: finalDomainIds,
      hostingIds: finalHostingIds,
      vpsIds: finalVpsIds,
    }

    return createSuccessResponse(formattedContract, 'Cập nhật hợp đồng thành công')
  } catch (error) {
    console.error('Error updating contract:', error)
    return createErrorResponse('Không thể cập nhật hợp đồng')
  }
}

export async function DELETE(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse(
      'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa hợp đồng.',
      403
    )
  }

  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return createErrorResponse('ID hợp đồng là bắt buộc', 400)
    }

    const existingContract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1)

    if (existingContract.length === 0) {
      return createErrorResponse('Không tìm thấy hợp đồng', 404)
    }

    await db.delete(contracts).where(eq(contracts.id, id))

    return createSuccessResponse(null, 'Xóa hợp đồng thành công')
  } catch (error) {
    console.error('Error deleting contract:', error)
    return createErrorResponse('Không thể xóa hợp đồng')
  }
}

