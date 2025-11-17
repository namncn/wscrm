import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import {
  contracts,
  customers,
  users,
  orders,
  contractDomains,
  contractHostings,
  contractVpss,
  domain,
  hosting,
  vps,
  hostingPackages,
  vpsPackages,
  domainPackages,
} from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string | string[] }> }) {
  const resolvedParams = await context.params
  const paramValue = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const contractId = Number.parseInt(paramValue ?? '', 10)
  if (Number.isNaN(contractId)) {
    return createErrorResponse('ID hợp đồng không hợp lệ', 400)
  }

  const role = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = role === 'ADMIN'
  const isStaff = role === 'USER'
  const isCustomer = userType === 'customer'

  if (!isAdmin && !isStaff && !isCustomer) {
    return createErrorResponse('Không có quyền truy cập', 403)
  }

  try {
    let customerIdForCustomer: number | null = null

    if (isCustomer) {
      const customerEmail = session.user.email
      if (!customerEmail) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }

      const customerRecord = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, customerEmail))
        .limit(1)

      if (customerRecord.length === 0) {
        return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
      }

      customerIdForCustomer = customerRecord[0].id
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
      return createErrorResponse('Không tìm thấy hợp đồng', 404)
    }

    const contract = contractResult[0]

    if (isCustomer && customerIdForCustomer !== contract.customerId) {
      return createErrorResponse('Bạn không có quyền xem hợp đồng này', 403)
    }

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
              price: domainPackages.price,
              packageName: domainPackages.name,
            })
            .from(domain)
            .leftJoin(domainPackages, eq(domain.domainTypeId, domainPackages.id))
            .where(inArray(domain.id, domainIds))
        : [],
      hostingIds.length
        ? db
            .select({
              id: hosting.id,
              planName: hostingPackages.planName,
              storage: hostingPackages.storage,
              bandwidth: hostingPackages.bandwidth,
              price: hostingPackages.price,
              status: hosting.status,
              expiryDate: hosting.expiryDate,
              serverLocation: hostingPackages.serverLocation,
              ipAddress: hosting.ipAddress,
            })
            .from(hosting)
            .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
            .where(inArray(hosting.id, hostingIds))
        : [],
      vpsIds.length
        ? db
            .select({
              id: vps.id,
              planName: vpsPackages.planName,
              cpu: vpsPackages.cpu,
              ram: vpsPackages.ram,
              storage: vpsPackages.storage,
              bandwidth: vpsPackages.bandwidth,
              price: vpsPackages.price,
              status: vps.status,
              expiryDate: vps.expiryDate,
              os: vpsPackages.os,
              ipAddress: vps.ipAddress,
            })
            .from(vps)
            .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
            .where(inArray(vps.id, vpsIds))
        : [],
    ])

    const formattedContract = {
      ...contract,
      orderNumber: contract.orderNumberRaw ? `ORD-${contract.orderNumberRaw}` : null,
      orderNumberRaw: undefined,
      domainIds,
      hostingIds,
      vpsIds,
      domains: domainsData,
      hostings: hostingsData,
      vpss: vpsData,
    }

    return createSuccessResponse(formattedContract, 'Lấy thông tin hợp đồng')
  } catch (error) {
    console.error('Error fetching contract detail:', error)
    return createErrorResponse('Không thể tải thông tin hợp đồng')
  }
}

