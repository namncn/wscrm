import { db } from '@/lib/database'
import { vps, customers } from '@/lib/schema'
import { eq, desc, isNull, isNotNull } from 'drizzle-orm'
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
    
    // If id is provided, return single VPS
    if (id) {
      const vpsData = await db
        .select()
        .from(vps)
        .where(eq(vps.id, parseInt(id)))
        .limit(1)
      
      if (vpsData.length === 0) {
        return createErrorResponse('Không tìm thấy gói VPS', 404)
      }
      
      // Public access: allow viewing packages without customerId (public packages)
      if (!vpsData[0].customerId) {
        return createSuccessResponse(vpsData[0], 'Tải thông tin VPS')
      }
      
      // For private VPS (with customerId), require authentication
      if (!session?.user) {
        return createErrorResponse('Bạn cần đăng nhập để xem VPS này', 401)
      }
      
      // For customers, verify ownership
      if (isCustomer && vpsData[0].customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || vpsData[0].customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem VPS này', 403)
        }
      }
      
      // Admin and User can view all VPS
      if (isAdmin || isUser) {
        return createSuccessResponse(vpsData[0], 'Tải thông tin VPS')
      }
      
      return createSuccessResponse(vpsData[0], 'Tải thông tin VPS')
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
    
    let vpsData
    
    // If not authenticated, only return public packages (customerId = null)
    if (!session?.user) {
      vpsData = await db
        .select()
        .from(vps)
        .where(isNull(vps.customerId)) // Only packages without customerId
        .orderBy(desc(vps.createdAt))
    } else if (finalCustomerId !== null) {
      // Get VPS plans for specific customer (their registered VPS)
      vpsData = await db
        .select()
        .from(vps)
        .where(eq(vps.customerId, finalCustomerId))
        .orderBy(desc(vps.createdAt))
    } else if (purchased === 'all') {
      // Admin view: all purchased VPS (assigned to any customer)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Chỉ quản trị viên và nhân viên mới có thể xem tất cả VPS đã mua', 403)
      }
      vpsData = await db
        .select()
        .from(vps)
        .where(isNotNull(vps.customerId))
        .orderBy(desc(vps.createdAt))
    } else {
      // Get all VPS plans (packages available for purchase)
      vpsData = await db
        .select()
        .from(vps)
        .where(isNull(vps.customerId)) // Only packages without customerId
        .orderBy(desc(vps.createdAt))
    }

    return createSuccessResponse(vpsData, 'Tải danh sách VPS')
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
    const { planName, ipAddress, cpu, ram, storage, bandwidth, price, status, customerId, expiryDate, os, createdAt, serverLocation } = body

    // Validate required fields
    if (!planName || !cpu || !ram || !storage || !bandwidth || !price) {
      return createErrorResponse('Tên gói, CPU, RAM, dung lượng, băng thông và giá là bắt buộc', 400)
    }

    // Validate data types
    if (typeof cpu !== 'number' || typeof ram !== 'number' || typeof storage !== 'number' || typeof bandwidth !== 'number' || typeof price !== 'number') {
      return createErrorResponse('CPU, RAM, dung lượng, băng thông và giá phải là số', 400)
    }

    // Create VPS plan
    await db
      .insert(vps)
      .values({
        planName,
        ipAddress: ipAddress || null,
        cpu,
        ram,
        storage,
        bandwidth,
        price: price.toString(),
        status: status || 'ACTIVE',
        customerId: customerId || null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        os: os || null,
        serverLocation: serverLocation || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      })

    // Get the created VPS plan
    const createdVps = await db
      .select()
      .from(vps)
      .where(eq(vps.planName, planName))
      .limit(1)

    return createCreatedResponse(createdVps[0], 'Tạo gói VPS thành công')
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
    const { id, planName, ipAddress, cpu, ram, storage, bandwidth, price, status, customerId, expiryDate, os, createdAt, serverLocation } = body

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

    // Update VPS plan
    await db
      .update(vps)
      .set({
        planName: planName || existingVps[0].planName,
        ipAddress: ipAddress !== undefined ? (ipAddress || null) : existingVps[0].ipAddress,
        cpu: cpu || existingVps[0].cpu,
        ram: ram || existingVps[0].ram,
        storage: storage || existingVps[0].storage,
        bandwidth: bandwidth || existingVps[0].bandwidth,
        price: price ? price.toString() : existingVps[0].price,
        status: status || existingVps[0].status,
        customerId: customerId !== undefined ? (customerId || null) : existingVps[0].customerId,
        expiryDate: expiryDate !== undefined ? (expiryDate ? expiryDate.split('T')[0] : null) : existingVps[0].expiryDate,
        os: os !== undefined ? (os || null) : existingVps[0].os,
        serverLocation: serverLocation !== undefined ? (serverLocation || null) : existingVps[0].serverLocation,
        createdAt: createdAt !== undefined ? (createdAt ? new Date(createdAt) : existingVps[0].createdAt) : existingVps[0].createdAt,
        updatedAt: new Date(),
      })
      .where(eq(vps.id, id))

    // Get the updated VPS plan
    const updatedVps = await db
      .select()
      .from(vps)
      .where(eq(vps.id, id))
      .limit(1)

    return createSuccessResponse(updatedVps[0], 'Cập nhật gói VPS thành công')
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