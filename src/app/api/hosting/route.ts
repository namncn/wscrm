import { db } from '@/lib/database'
import { hosting, customers, hostingPackages, controlPanels } from '@/lib/schema'
import { eq, desc, isNotNull, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  
  // Allow public access to view hosting packages (customerId = null)
  // Authenticated users have additional access
  const userRole = session?.user ? (session.user as any)?.role : null
  const userType = session?.user ? (session.user as any)?.userType : null
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  try {
    const { searchParams } = new URL(req.url)
    const customerIdParam = searchParams.get('customerId')
    const purchased = searchParams.get('purchased')
    const id = searchParams.get('id')
    
    // If id is provided, return single hosting (customer-registered only)
    if (id) {
      const hostingData = await db
        .select({
          hosting: hosting,
          package: hostingPackages,
        })
        .from(hosting)
        .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
        .where(eq(hosting.id, parseInt(id)))
        .limit(1)
      
      if (hostingData.length === 0 || !hostingData[0].hosting) {
        return createErrorResponse('Không tìm thấy gói hosting', 404)
      }
      
      // Require authentication for customer-registered hosting
      if (!session?.user) {
        return createErrorResponse('Bạn cần đăng nhập để xem hosting này', 401)
      }
      
      const hostingRecord = hostingData[0].hosting
      const packageData = hostingData[0].package
      
      // For customers, verify ownership
      if (isCustomer && hostingRecord.customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || hostingRecord.customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem hosting này', 403)
        }
      }
      
      // Combine hosting and package data
      const result = {
        ...hostingRecord,
        ...(packageData ? {
          planName: packageData.planName,
          storage: packageData.storage,
          bandwidth: packageData.bandwidth,
          price: packageData.price,
          serverLocation: packageData.serverLocation,
          addonDomain: packageData.addonDomain,
          subDomain: packageData.subDomain,
          ftpAccounts: packageData.ftpAccounts,
          databases: packageData.databases,
          hostingType: packageData.hostingType,
          operatingSystem: packageData.operatingSystem,
        } : {}),
      }
      
      // Admin and User can view all hostings
      if (isAdmin || isUser) {
        return createSuccessResponse(result, 'Tải thông tin hosting')
      }
      
      return createSuccessResponse(result, 'Tải thông tin hosting')
    }
    
  // Determine if request should filter by customer ownership
  const wantsCustomerOwnedData =
    Boolean(customerIdParam) ||
    purchased === 'mine' ||
    searchParams.get('owned') === 'true'

  // For customers, only fetch their owned hosting packages when explicitly requested
  let finalCustomerId: number | null = null
  if (isCustomer && wantsCustomerOwnedData && session?.user) {
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

    if (customerIdParam) {
      const requestedCustomerId = parseInt(customerIdParam, 10)
      if (!Number.isNaN(requestedCustomerId) && requestedCustomerId !== finalCustomerId) {
        return createErrorResponse('Bạn không có quyền xem hosting của khách hàng này', 403)
      }
    }
  } else if ((isAdmin || isUser) && customerIdParam) {
    const parsedCustomerId = parseInt(customerIdParam, 10)
    if (!Number.isNaN(parsedCustomerId)) {
      finalCustomerId = parsedCustomerId
    }
    }
    
    // Require authentication for customer-registered hosting
    if (!session?.user) {
      return createErrorResponse('Bạn cần đăng nhập để xem hosting đã đăng ký', 401)
    }
    
    let hostingDataRaw
    if (finalCustomerId !== null) {
      // Get hosting plans for specific customer (their registered hosting)
      hostingDataRaw = await db
        .select({
          hosting: hosting,
          package: hostingPackages,
        })
        .from(hosting)
        .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
        .where(eq(hosting.customerId, finalCustomerId))
        .orderBy(desc(hosting.createdAt))
    } else if (purchased === 'all') {
      // Admin view: all purchased hostings (assigned to any customer)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Chỉ quản trị viên và nhân viên mới có thể xem tất cả hosting đã mua', 403)
      }
      hostingDataRaw = await db
        .select({
          hosting: hosting,
          package: hostingPackages,
        })
        .from(hosting)
        .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
        .where(isNotNull(hosting.customerId))
        .orderBy(desc(hosting.createdAt))
    } else {
      // Default: return all customer-registered hostings (for admin/user)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Bạn cần chỉ định customerId hoặc purchased=all', 400)
      }
      hostingDataRaw = await db
        .select({
          hosting: hosting,
          package: hostingPackages,
        })
        .from(hosting)
        .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
        .where(isNotNull(hosting.customerId))
        .orderBy(desc(hosting.createdAt))
    }
    
    // Combine hosting and package data
    const hostingDataResult = hostingDataRaw.map(item => ({
      ...item.hosting,
      ...(item.package ? {
        planName: item.package.planName,
        storage: item.package.storage,
        bandwidth: item.package.bandwidth,
        price: item.package.price,
        serverLocation: item.package.serverLocation,
        addonDomain: item.package.addonDomain,
        subDomain: item.package.subDomain,
        ftpAccounts: item.package.ftpAccounts,
        databases: item.package.databases,
        hostingType: item.package.hostingType,
        operatingSystem: item.package.operatingSystem,
      } : {}),
    }))

    return createSuccessResponse(hostingDataResult, 'Tải danh sách hosting')
  } catch (error) {
    console.error('Error fetching hosting:', error)
    return createErrorResponse('Không thể tải danh sách hosting')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create hosting
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo hosting.', 403)
  }

  try {
    const body = await req.json()
    const { 
      hostingTypeId, customerId, status, ipAddress, expiryDate, createdAt
    } = body

    // Validate required fields
    if (!hostingTypeId) {
      return createErrorResponse('hostingTypeId là bắt buộc', 400)
    }
    if (!customerId) {
      return createErrorResponse('customerId là bắt buộc cho hosting đã đăng ký', 400)
    }

    // Create hosting registration
    await db
      .insert(hosting)
      .values({
        hostingTypeId: hostingTypeId,
        customerId: customerId,
        status: status || 'ACTIVE',
        ipAddress: ipAddress || null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        createdAt: createdAt ? new Date(createdAt.split('T')[0]) : new Date(),
      })

    // Get the created hosting with package data
    const createdHostingRaw = await db
      .select({
        hosting: hosting,
        package: hostingPackages,
      })
      .from(hosting)
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .orderBy(desc(hosting.id))
      .limit(1)

    if (createdHostingRaw.length === 0) {
      return createErrorResponse('Không thể tạo hosting', 500)
    }

    const result = {
      ...createdHostingRaw[0].hosting,
      ...(createdHostingRaw[0].package ? {
        planName: createdHostingRaw[0].package.planName,
        storage: createdHostingRaw[0].package.storage,
        bandwidth: createdHostingRaw[0].package.bandwidth,
        price: createdHostingRaw[0].package.price,
        serverLocation: createdHostingRaw[0].package.serverLocation,
        addonDomain: createdHostingRaw[0].package.addonDomain,
        subDomain: createdHostingRaw[0].package.subDomain,
        ftpAccounts: createdHostingRaw[0].package.ftpAccounts,
        databases: createdHostingRaw[0].package.databases,
        hostingType: createdHostingRaw[0].package.hostingType,
        operatingSystem: createdHostingRaw[0].package.operatingSystem,
      } : {}),
    }

    return createCreatedResponse(result, 'Tạo gói hosting thành công')
  } catch (error) {
    console.error('Error creating hosting:', error)
    return createErrorResponse('Không thể tạo gói hosting')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update hosting
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật hosting.', 403)
  }

  try {
    const body = await req.json()
    const { 
      id, hostingTypeId, customerId, status, ipAddress, expiryDate, createdAt
    } = body

    if (!id) {
      return createErrorResponse('ID gói hosting là bắt buộc', 400)
    }

    // Check if hosting plan exists
    const existingHosting = await db
      .select()
      .from(hosting)
      .where(eq(hosting.id, id))
      .limit(1)

    if (existingHosting.length === 0) {
      return createErrorResponse('Không tìm thấy gói hosting', 404)
    }

    // Update hosting registration - only update provided fields
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (hostingTypeId !== undefined) updateData.hostingTypeId = hostingTypeId
    if (customerId !== undefined) updateData.customerId = customerId
    if (status !== undefined) updateData.status = status
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress || null
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? expiryDate.split('T')[0] : null
    if (createdAt !== undefined) updateData.createdAt = createdAt ? new Date(createdAt.split('T')[0]) : existingHosting[0].createdAt

    await db
      .update(hosting)
      .set(updateData)
      .where(eq(hosting.id, id))

    // Get the updated hosting with package data
    const updatedHostingRaw = await db
      .select({
        hosting: hosting,
        package: hostingPackages,
      })
      .from(hosting)
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .where(eq(hosting.id, id))
      .limit(1)

    if (updatedHostingRaw.length === 0) {
      return createErrorResponse('Không tìm thấy gói hosting sau khi cập nhật', 404)
    }

    const result = {
      ...updatedHostingRaw[0].hosting,
      ...(updatedHostingRaw[0].package ? {
        planName: updatedHostingRaw[0].package.planName,
        storage: updatedHostingRaw[0].package.storage,
        bandwidth: updatedHostingRaw[0].package.bandwidth,
        price: updatedHostingRaw[0].package.price,
        serverLocation: updatedHostingRaw[0].package.serverLocation,
        addonDomain: updatedHostingRaw[0].package.addonDomain,
        subDomain: updatedHostingRaw[0].package.subDomain,
        ftpAccounts: updatedHostingRaw[0].package.ftpAccounts,
        databases: updatedHostingRaw[0].package.databases,
        hostingType: updatedHostingRaw[0].package.hostingType,
        operatingSystem: updatedHostingRaw[0].package.operatingSystem,
      } : {}),
    }

    return createSuccessResponse(result, 'Cập nhật gói hosting thành công')
  } catch (error) {
    console.error('Error updating hosting:', error)
    return createErrorResponse('Không thể cập nhật gói hosting')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete hosting
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa hosting.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return createErrorResponse('ID gói hosting là bắt buộc', 400)
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return createErrorResponse('ID gói hosting không hợp lệ', 400)
    }

    // Check if hosting plan exists
    const existingHosting = await db
      .select()
      .from(hosting)
      .where(eq(hosting.id, id))
      .limit(1)

    if (existingHosting.length === 0) {
      return createErrorResponse('Không tìm thấy gói hosting', 404)
    }

    const hostingRecord = existingHosting[0]

    // Nếu hosting đã được sync và có subscription ID, xóa subscription trên Control Panel trước
    let warning: string | undefined
    if (hostingRecord.syncMetadata && hostingRecord.externalAccountId) {
      try {
        const metadata = typeof hostingRecord.syncMetadata === 'string' 
          ? JSON.parse(hostingRecord.syncMetadata) 
          : hostingRecord.syncMetadata
        const subscriptionId = metadata.subscriptionId || metadata.externalSubscriptionId

        if (subscriptionId) {
          // Lấy control panel config
          const controlPanel = await db.select()
            .from(controlPanels)
            .where(and(
              eq(controlPanels.enabled, 'YES'),
              eq(controlPanels.type, 'ENHANCE')
            ))
            .limit(1)

          if (controlPanel.length > 0) {
            let config: any = controlPanel[0].config
            if (typeof config === 'string') {
              try {
                config = JSON.parse(config)
              } catch (parseError) {
                config = {}
              }
            }

            if (!config.orgId && process.env.ENHANCE_ORG_ID) {
              config.orgId = process.env.ENHANCE_ORG_ID
            }

            if (config.orgId) {
              const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
              const enhanceAdapter = controlPanelInstance as any
              const enhanceClient = (enhanceAdapter as any).client

              if (enhanceClient) {
                const deleteResult = await enhanceClient.deleteSubscription(
                  hostingRecord.externalAccountId,
                  subscriptionId
                )

                if (!deleteResult.success) {
                  warning = `Không thể xóa subscription trên Control Panel: ${deleteResult.error || 'Unknown error'}. Hosting đã được xóa trong database.`
                  console.error('[DeleteHosting] Failed to delete subscription:', deleteResult.error)
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error('[DeleteHosting] Error deleting subscription from control panel:', error)
        warning = `Lỗi khi xóa subscription trên Control Panel: ${error.message || 'Unknown error'}. Hosting đã được xóa trong database.`
      }
    }

    // Delete hosting plan
    await db
      .delete(hosting)
      .where(eq(hosting.id, id))

    // Tạo response message dựa trên kết quả xóa subscription
    let message: string
    let subscriptionDeleted = false
    
    // Kiểm tra xem có subscription đã được xóa thành công không
    if (hostingRecord.syncMetadata && hostingRecord.externalAccountId) {
      try {
        const metadata = typeof hostingRecord.syncMetadata === 'string' 
          ? JSON.parse(hostingRecord.syncMetadata) 
          : hostingRecord.syncMetadata
        const subscriptionId = metadata.subscriptionId || metadata.externalSubscriptionId

        if (subscriptionId) {
          // Đã thử xóa subscription
          if (warning) {
            // Xóa subscription thất bại
            message = `Xóa gói hosting thành công. Lưu ý: ${warning}`
          } else {
            // Xóa subscription thành công
            subscriptionDeleted = true
            message = `Xóa gói hosting thành công. Đã xóa subscription (ID: ${subscriptionId}) trên Control Panel.`
          }
        } else {
          // Không có subscription để xóa
          message = 'Xóa gói hosting thành công.'
        }
      } catch (e) {
        message = warning ? `Xóa gói hosting thành công. Lưu ý: ${warning}` : 'Xóa gói hosting thành công.'
      }
    } else {
      // Không có subscription để xóa
      message = 'Xóa gói hosting thành công.'
    }

    if (warning) {
      return createSuccessResponse(
        { warning, subscriptionDeleted },
        message
      )
    }

    return createSuccessResponse(
      { subscriptionDeleted },
      message
    )
  } catch (error) {
    console.error('Error deleting hosting:', error)
    return createErrorResponse('Không thể xóa gói hosting')
  }
}
