import { db } from '@/lib/database'
import { vps, customers, vpsPackages } from '@/lib/schema'
import { eq, desc, isNotNull } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  
  // Allow public access to view VPS packages (customerId = null)
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
    
    // If id is provided, return single VPS (customer-registered only)
    if (id) {
      const vpsData = await db
        .select({
          vps: vps,
          package: vpsPackages,
        })
        .from(vps)
        .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
        .where(eq(vps.id, parseInt(id)))
        .limit(1)
      
      if (vpsData.length === 0 || !vpsData[0].vps) {
        return createErrorResponse('Không tìm thấy gói VPS', 404)
      }
      
      // Require authentication for customer-registered VPS
      if (!session?.user) {
        return createErrorResponse('Bạn cần đăng nhập để xem VPS này', 401)
      }
      
      const vpsRecord = vpsData[0].vps
      const packageData = vpsData[0].package
      
      // For customers, verify ownership
      if (isCustomer && vpsRecord.customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || vpsRecord.customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem VPS này', 403)
        }
      }
      
      // Combine VPS and package data
      const result = {
        ...vpsRecord,
        ...(packageData ? {
          planName: packageData.planName,
          cpu: packageData.cpu,
          ram: packageData.ram,
          storage: packageData.storage,
          bandwidth: packageData.bandwidth,
          price: packageData.price,
          os: packageData.os,
          serverLocation: packageData.serverLocation,
        } : {}),
      }
      
      // Admin and User can view all VPS
      if (isAdmin || isUser) {
        return createSuccessResponse(result, 'Tải thông tin VPS')
      }
      
      return createSuccessResponse(result, 'Tải thông tin VPS')
    }
    
    // Determine if request should filter by customer ownership
    const wantsCustomerOwnedData =
      Boolean(customerIdParam) ||
      purchased === 'mine' ||
      searchParams.get('owned') === 'true'

    // For customers, only fetch their owned VPS packages when explicitly requested
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
          return createErrorResponse('Bạn không có quyền xem VPS của khách hàng này', 403)
        }
      }
    } else if ((isAdmin || isUser) && customerIdParam) {
      const parsedCustomerId = parseInt(customerIdParam, 10)
      if (!Number.isNaN(parsedCustomerId)) {
        finalCustomerId = parsedCustomerId
      }
    }
    
    // Require authentication for customer-registered VPS
    if (!session?.user) {
      return createErrorResponse('Bạn cần đăng nhập để xem VPS đã đăng ký', 401)
    }
    
    let vpsDataRaw
    if (finalCustomerId !== null) {
      // Get VPS plans for specific customer (their registered VPS)
      vpsDataRaw = await db
        .select({
          vps: vps,
          package: vpsPackages,
        })
        .from(vps)
        .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
        .where(eq(vps.customerId, finalCustomerId))
        .orderBy(desc(vps.createdAt))
    } else if (purchased === 'all') {
      // Admin view: all purchased VPS (assigned to any customer)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Chỉ quản trị viên và nhân viên mới có thể xem tất cả VPS đã mua', 403)
      }
      vpsDataRaw = await db
        .select({
          vps: vps,
          package: vpsPackages,
        })
        .from(vps)
        .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
        .where(isNotNull(vps.customerId))
        .orderBy(desc(vps.createdAt))
    } else {
      // Default: return all customer-registered VPS (for admin/user)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Bạn cần chỉ định customerId hoặc purchased=all', 400)
      }
      vpsDataRaw = await db
        .select({
          vps: vps,
          package: vpsPackages,
        })
        .from(vps)
        .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
        .where(isNotNull(vps.customerId))
        .orderBy(desc(vps.createdAt))
    }
    
    // Combine VPS and package data
    const vpsDataResult = vpsDataRaw.map(item => ({
      ...item.vps,
      ...(item.package ? {
        planName: item.package.planName,
        cpu: item.package.cpu,
        ram: item.package.ram,
        storage: item.package.storage,
        bandwidth: item.package.bandwidth,
        price: item.package.price,
        os: item.package.os,
        serverLocation: item.package.serverLocation,
      } : {}),
    }))

    return createSuccessResponse(vpsDataResult, 'Tải danh sách VPS')
  } catch (error) {
    console.error('Error fetching VPS:', error)
    return createErrorResponse('Không thể tải danh sách VPS')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create VPS
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo VPS.', 403)
  }

  try {
    const body = await req.json()
    const { vpsTypeId, customerId, status, ipAddress, expiryDate, createdAt } = body

    // Validate required fields
    if (!vpsTypeId) {
      return createErrorResponse('vpsTypeId là bắt buộc', 400)
    }
    if (!customerId) {
      return createErrorResponse('customerId là bắt buộc cho VPS đã đăng ký', 400)
    }

    // Create VPS registration
    await db
      .insert(vps)
      .values({
        vpsTypeId: vpsTypeId,
        customerId: customerId,
        status: status || 'ACTIVE',
        ipAddress: ipAddress || null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        createdAt: createdAt ? new Date(createdAt.split('T')[0]) : new Date(),
      })

    // Get the created VPS with package data
    const createdVpsRaw = await db
      .select({
        vps: vps,
        package: vpsPackages,
      })
      .from(vps)
      .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
      .orderBy(desc(vps.id))
      .limit(1)

    if (createdVpsRaw.length === 0) {
      return createErrorResponse('Không thể tạo VPS', 500)
    }

    const result = {
      ...createdVpsRaw[0].vps,
      ...(createdVpsRaw[0].package ? {
        planName: createdVpsRaw[0].package.planName,
        cpu: createdVpsRaw[0].package.cpu,
        ram: createdVpsRaw[0].package.ram,
        storage: createdVpsRaw[0].package.storage,
        bandwidth: createdVpsRaw[0].package.bandwidth,
        price: createdVpsRaw[0].package.price,
        os: createdVpsRaw[0].package.os,
        serverLocation: createdVpsRaw[0].package.serverLocation,
      } : {}),
    }

    return createCreatedResponse(result, 'Tạo gói VPS thành công')
  } catch (error) {
    console.error('Error creating VPS:', error)
    return createErrorResponse('Không thể tạo gói VPS')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update VPS
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật VPS.', 403)
  }

  try {
    const body = await req.json()
    const { id, vpsTypeId, customerId, status, ipAddress, expiryDate, createdAt } = body

    if (!id) {
      return createErrorResponse('ID gói VPS là bắt buộc', 400)
    }

    // Check if VPS plan exists
    const existingVps = await db
      .select()
      .from(vps)
      .where(eq(vps.id, id))
      .limit(1)

    if (existingVps.length === 0) {
      return createErrorResponse('Không tìm thấy gói VPS', 404)
    }

    // Update VPS registration - only update provided fields
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (vpsTypeId !== undefined) updateData.vpsTypeId = vpsTypeId
    if (customerId !== undefined) updateData.customerId = customerId
    if (status !== undefined) updateData.status = status
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress || null
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? expiryDate.split('T')[0] : null
    if (createdAt !== undefined) updateData.createdAt = createdAt ? new Date(createdAt.split('T')[0]) : existingVps[0].createdAt

    await db
      .update(vps)
      .set(updateData)
      .where(eq(vps.id, id))

    // Get the updated VPS with package data
    const updatedVpsRaw = await db
      .select({
        vps: vps,
        package: vpsPackages,
      })
      .from(vps)
      .leftJoin(vpsPackages, eq(vps.vpsTypeId, vpsPackages.id))
      .where(eq(vps.id, id))
      .limit(1)

    if (updatedVpsRaw.length === 0) {
      return createErrorResponse('Không tìm thấy gói VPS sau khi cập nhật', 404)
    }

    const result = {
      ...updatedVpsRaw[0].vps,
      ...(updatedVpsRaw[0].package ? {
        planName: updatedVpsRaw[0].package.planName,
        cpu: updatedVpsRaw[0].package.cpu,
        ram: updatedVpsRaw[0].package.ram,
        storage: updatedVpsRaw[0].package.storage,
        bandwidth: updatedVpsRaw[0].package.bandwidth,
        price: updatedVpsRaw[0].package.price,
        os: updatedVpsRaw[0].package.os,
        serverLocation: updatedVpsRaw[0].package.serverLocation,
      } : {}),
    }

    return createSuccessResponse(result, 'Cập nhật gói VPS thành công')
  } catch (error) {
    console.error('Error updating VPS:', error)
    return createErrorResponse('Không thể cập nhật gói VPS')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete VPS
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa VPS.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return createErrorResponse('ID gói VPS là bắt buộc', 400)
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return createErrorResponse('ID gói VPS không hợp lệ', 400)
    }

    // Check if VPS plan exists
    const existingVps = await db
      .select()
      .from(vps)
      .where(eq(vps.id, id))
      .limit(1)

    if (existingVps.length === 0) {
      return createErrorResponse('Không tìm thấy gói VPS', 404)
    }

    // Delete VPS plan
    await db
      .delete(vps)
      .where(eq(vps.id, id))

    return createSuccessResponse(null, 'Xóa gói VPS thành công')
  } catch (error) {
    console.error('Error deleting VPS:', error)
    return createErrorResponse('Không thể xóa gói VPS')
  }
}