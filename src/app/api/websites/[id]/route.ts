import { db } from '@/lib/database'
import { websites, domain, hosting, vps, contracts, orders, customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return createErrorResponse('ID website là bắt buộc', 400)
    }

    const websiteId = parseInt(id)
    if (isNaN(websiteId)) {
      return createErrorResponse('ID website không hợp lệ', 400)
    }

    const website = await db
      .select({
        id: websites.id,
        name: websites.name,
        domainId: websites.domainId,
        hostingId: websites.hostingId,
        vpsId: websites.vpsId,
        contractId: websites.contractId,
        orderId: websites.orderId,
        customerId: websites.customerId,
        status: websites.status,
        description: websites.description,
        notes: websites.notes,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
        domainName: domain.domainName,
        hostingPlanName: hosting.planName,
        vpsPlanName: vps.planName,
        contractNumber: contracts.contractNumber,
        orderNumberRaw: orders.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(websites)
      .leftJoin(domain, eq(websites.domainId, domain.id))
      .leftJoin(hosting, eq(websites.hostingId, hosting.id))
      .leftJoin(vps, eq(websites.vpsId, vps.id))
      .leftJoin(contracts, eq(websites.contractId, contracts.id))
      .leftJoin(orders, eq(websites.orderId, orders.id))
      .leftJoin(customers, eq(websites.customerId, customers.id))
      .where(eq(websites.id, websiteId))
      .limit(1)

    if (website.length === 0) {
      return createErrorResponse('Không tìm thấy website', 404)
    }

    // Format orderNumber
    const formattedWebsite = {
      ...website[0],
      orderNumber: (website[0] as any).orderNumberRaw ? `ORD-${(website[0] as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined
    }

    return createSuccessResponse(formattedWebsite, 'Tải website thành công')
  } catch (error) {
    console.error('Error fetching website:', error)
    return createErrorResponse('Không thể tải website')
  }
}

