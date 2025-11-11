import { db } from '@/lib/database'
import { websites, domain, hosting, vps, contracts, orders, customers } from '@/lib/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  // ADMIN and USER can view all websites, CUSTOMER can only view their own
  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const customerIdParam = searchParams.get('customerId')

    // For customers, automatically filter by their own customer ID
    let finalCustomerId: number | null = null
    if (isCustomer) {
      // Get customer ID from session email
      if (!session.user.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }
      
      const customer = await db.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)
      
      if (!customer || customer.length === 0) {
        return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
      }
      
      finalCustomerId = customer[0].id
    } else if (customerIdParam) {
      // For admin/user, use provided customerId if any
      finalCustomerId = parseInt(customerIdParam, 10)
    }

    const conditions = []
    if (finalCustomerId) {
      conditions.push(eq(websites.customerId, finalCustomerId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const websitesWithDetails = await db
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
      .where(whereClause)
      .orderBy(desc(websites.createdAt))

    // Format orderNumber
    const formattedWebsites = websitesWithDetails.map(website => ({
      ...website,
      orderNumber: (website as any).orderNumberRaw ? `ORD-${(website as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined
    }))

    return createSuccessResponse(formattedWebsites, 'Tải danh sách websites thành công')
  } catch (error) {
    console.error('Error fetching websites:', error)
    return createErrorResponse('Không thể tải danh sách websites')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create websites
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo website.', 403)
  }

  try {
    const body = await req.json()
    const { name, domainId, hostingId, vpsId, contractId, orderId, customerId, status, description, notes } = body

    if (!name || !customerId) {
      return createErrorResponse('Tên website và khách hàng là bắt buộc', 400)
    }

    // Create website
    await db.insert(websites).values({
      name,
      domainId: domainId || null,
      hostingId: hostingId || null,
      vpsId: vpsId || null,
      contractId: contractId || null,
      orderId: orderId || null,
      customerId,
      status: status || 'LIVE',
      description: description || null,
      notes: notes || null,
    })

    // Get the created website with related data
    const createdWebsite = await db
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
      .where(eq(websites.name, name))
      .limit(1)

    // Format orderNumber
    const formattedWebsite = {
      ...createdWebsite[0],
      orderNumber: (createdWebsite[0] as any).orderNumberRaw ? `ORD-${(createdWebsite[0] as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined
    }

    return createCreatedResponse(formattedWebsite, 'Tạo website thành công')
  } catch (error) {
    console.error('Error creating website:', error)
    return createErrorResponse('Không thể tạo website')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update websites
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật website.', 403)
  }

  try {
    const body = await req.json()
    const { id, name, domainId, hostingId, vpsId, contractId, orderId, customerId, status, description, notes } = body

    if (!id) {
      return createErrorResponse('ID website là bắt buộc', 400)
    }

    // Check if website exists
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1)

    if (existingWebsite.length === 0) {
      return createErrorResponse('Không tìm thấy website', 404)
    }

    // Update website
    await db
      .update(websites)
      .set({
        name: name || existingWebsite[0].name,
        domainId: domainId !== undefined ? domainId : existingWebsite[0].domainId,
        hostingId: hostingId !== undefined ? hostingId : existingWebsite[0].hostingId,
        vpsId: vpsId !== undefined ? vpsId : existingWebsite[0].vpsId,
        contractId: contractId !== undefined ? contractId : existingWebsite[0].contractId,
        orderId: orderId !== undefined ? orderId : existingWebsite[0].orderId,
        customerId: customerId || existingWebsite[0].customerId,
        status: status || existingWebsite[0].status,
        description: description !== undefined ? description : existingWebsite[0].description,
        notes: notes !== undefined ? notes : existingWebsite[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id))

    // Get the updated website with related data
    const updatedWebsite = await db
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
      .where(eq(websites.id, id))
      .limit(1)

    // Format orderNumber
    const formattedWebsite = {
      ...updatedWebsite[0],
      orderNumber: (updatedWebsite[0] as any).orderNumberRaw ? `ORD-${(updatedWebsite[0] as any).orderNumberRaw}` : null,
      orderNumberRaw: undefined
    }

    return createSuccessResponse(formattedWebsite, 'Cập nhật website thành công')
  } catch (error) {
    console.error('Error updating website:', error)
    return createErrorResponse('Không thể cập nhật website')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete websites
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa website.', 403)
  }

  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return createErrorResponse('ID website là bắt buộc', 400)
    }

    // Check if website exists
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1)

    if (existingWebsite.length === 0) {
      return createErrorResponse('Không tìm thấy website', 404)
    }

    // Delete website
    await db
      .delete(websites)
      .where(eq(websites.id, id))

    return createSuccessResponse(null, 'Xóa website thành công')
  } catch (error) {
    console.error('Error deleting website:', error)
    return createErrorResponse('Không thể xóa website')
  }
}

