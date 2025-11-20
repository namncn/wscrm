import { db } from '@/lib/database'
import { websites, domain, hosting, vps, contracts, orders, customers, hostingPackages, vpsPackages, controlPanels } from '@/lib/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ControlPanelFactory } from '@/lib/control-panels/factory'
import { ControlPanelType } from '@/lib/control-panels/base/types'

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
        hostingPlanName: hostingPackages.planName,
        vpsPlanName: vpsPackages.planName,
        contractNumber: contracts.contractNumber,
        orderNumberRaw: orders.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(websites)
      .leftJoin(domain, eq(websites.domainId, domain.id))
      .leftJoin(hosting, eq(websites.hostingId, hosting.id))
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .leftJoin(vps, eq(websites.vpsId, vps.id))
      .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
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
        hostingPlanName: hostingPackages.planName,
        vpsPlanName: vpsPackages.planName,
        contractNumber: contracts.contractNumber,
        orderNumberRaw: orders.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(websites)
      .leftJoin(domain, eq(websites.domainId, domain.id))
      .leftJoin(hosting, eq(websites.hostingId, hosting.id))
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .leftJoin(vps, eq(websites.vpsId, vps.id))
      .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
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
        hostingPlanName: hostingPackages.planName,
        vpsPlanName: vpsPackages.planName,
        contractNumber: contracts.contractNumber,
        orderNumberRaw: orders.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(websites)
      .leftJoin(domain, eq(websites.domainId, domain.id))
      .leftJoin(hosting, eq(websites.hostingId, hosting.id))
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .leftJoin(vps, eq(websites.vpsId, vps.id))
      .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
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

    const website = existingWebsite[0]

    // Try to delete website from control panel first
    let cpDeleteError: string | null = null
    let externalWebsiteId: string | undefined

    // Parse externalWebsiteId from notes
    if (website.notes) {
      const syncMatch = website.notes.match(/External Website ID:\s*([a-f0-9-]+)/i)
      if (syncMatch && syncMatch[1]) {
        externalWebsiteId = syncMatch[1]
      }
    }

    // If website has been synced to control panel, delete it first
    if (externalWebsiteId) {
      try {
        // Get control panel (Enhance)
        const controlPanel = await db.select()
          .from(controlPanels)
          .where(and(
            eq(controlPanels.enabled, 'YES'),
            eq(controlPanels.type, 'ENHANCE')
          ))
          .limit(1)

        if (controlPanel.length > 0) {
          // Parse config và đảm bảo có orgId
          let config: any = controlPanel[0].config
          if (typeof config === 'string') {
            try {
              config = JSON.parse(config)
            } catch (parseError) {
              console.error('[Website Delete] Error parsing config JSON:', parseError)
              config = {}
            }
          }

          // Thêm fallback cho orgId từ environment variables nếu chưa có
          if (!config.orgId && process.env.ENHANCE_ORG_ID) {
            config.orgId = process.env.ENHANCE_ORG_ID
          }

          if (config.orgId) {
            // Create control panel instance
            const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
            const enhanceAdapter = controlPanelInstance as any

            // Use enhance client directly
            const enhanceClient = (enhanceAdapter as any).client
            if (enhanceClient) {
              // Get customer external ID from hosting if available
              let customerExternalId: string | undefined
              if (website.hostingId) {
                const hostingData = await db
                  .select()
                  .from(hosting)
                  .where(eq(hosting.id, website.hostingId))
                  .limit(1)

                if (hostingData.length > 0 && hostingData[0].externalAccountId) {
                  customerExternalId = hostingData[0].externalAccountId
                }
              }

              // If no customer external ID from hosting, try to find customer on control panel
              if (!customerExternalId && website.customerId) {
                const customerData = await db
                  .select()
                  .from(customers)
                  .where(eq(customers.id, website.customerId))
                  .limit(1)

                if (customerData.length > 0 && customerData[0].email) {
                  const findResult = await controlPanelInstance.findCustomerByEmail(customerData[0].email)
                  
                  if (findResult.success && findResult.data) {
                    customerExternalId = findResult.data.id
                  }
                }
              }

              // Try to delete website from control panel
              // Use customerExternalId as orgId if available (website was created in customer org context)
              // Otherwise use parent orgId (config.orgId)
              const targetOrgId = customerExternalId || config.orgId
              const deleteResult = await enhanceClient.deleteWebsite(
                externalWebsiteId,
                false, // soft delete, not force
                targetOrgId
              )

              if (!deleteResult.success) {
                cpDeleteError = deleteResult.error || 'Không thể xóa website trên control panel'
                console.error('[Website Delete] Failed to delete website from control panel:', cpDeleteError)
              }
            }
          }
        }
      } catch (cpError: any) {
        cpDeleteError = cpError.message || 'Lỗi khi xóa website trên control panel'
        console.error('[Website Delete] Error deleting website from control panel:', cpError)
      }
    }

    // Delete website from local database
    await db
      .delete(websites)
      .where(eq(websites.id, id))

    // If there was an error deleting from control panel, return success with warning
    if (cpDeleteError) {
      return createSuccessResponse(
        { warning: cpDeleteError },
        `Đã xóa website trong database, nhưng có lỗi khi xóa trên control panel: ${cpDeleteError}`
      )
    }

    return createSuccessResponse(null, 'Xóa website thành công')
  } catch (error) {
    console.error('Error deleting website:', error)
    return createErrorResponse('Không thể xóa website')
  }
}

