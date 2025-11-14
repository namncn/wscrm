import { db } from '@/lib/database'
import { hosting, customers } from '@/lib/schema'
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
    
    // If id is provided, return single hosting
    if (id) {
      const hostingData = await db
        .select()
        .from(hosting)
        .where(eq(hosting.id, parseInt(id)))
        .limit(1)
      
      if (hostingData.length === 0) {
        return createErrorResponse('Không tìm thấy gói hosting', 404)
      }
      
      // Public access: allow viewing packages without customerId (public packages)
      if (!hostingData[0].customerId) {
        return createSuccessResponse(hostingData[0], 'Tải thông tin hosting')
      }
      
      // For private hosting (with customerId), require authentication
      if (!session?.user) {
        return createErrorResponse('Bạn cần đăng nhập để xem hosting này', 401)
      }
      
      // For customers, verify ownership
      if (isCustomer && hostingData[0].customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || hostingData[0].customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem hosting này', 403)
        }
      }
      
      // Admin and User can view all hostings
      if (isAdmin || isUser) {
        return createSuccessResponse(hostingData[0], 'Tải thông tin hosting')
      }
      
      return createSuccessResponse(hostingData[0], 'Tải thông tin hosting')
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
    
    let hostingData
    
    // If not authenticated, only return public packages (customerId = null)
    if (!session?.user) {
      hostingData = await db
        .select()
        .from(hosting)
        .where(isNull(hosting.customerId)) // Only packages without customerId
        .orderBy(desc(hosting.createdAt))
    } else if (finalCustomerId !== null) {
      // Get hosting plans for specific customer (their registered hosting)
      hostingData = await db
        .select()
        .from(hosting)
        .where(eq(hosting.customerId, finalCustomerId))
        .orderBy(desc(hosting.createdAt))
    } else if (purchased === 'all') {
      // Admin view: all purchased hostings (assigned to any customer)
      if (!isAdmin && !isUser) {
        return createErrorResponse('Chỉ quản trị viên và nhân viên mới có thể xem tất cả hosting đã mua', 403)
      }
      hostingData = await db
        .select()
        .from(hosting)
        .where(isNotNull(hosting.customerId))
        .orderBy(desc(hosting.createdAt))
    } else {
      // Get all hosting plans (packages available for purchase)
      hostingData = await db
        .select()
        .from(hosting)
        .where(isNull(hosting.customerId)) // Only packages without customerId
        .orderBy(desc(hosting.createdAt))
    }

    return createSuccessResponse(hostingData, 'Tải danh sách hosting')
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
      planName, domain, storage, bandwidth, price, status, customerId, expiryDate, createdAt, serverLocation,
      addonDomain, subDomain, ftpAccounts, databases, hostingType, operatingSystem
    } = body

    // Validate required fields - only planName is required
    if (!planName) {
      return createErrorResponse('Tên gói là bắt buộc', 400)
    }

    // Validate data types - allow undefined/null, but if provided must be numbers
    if (storage !== undefined && storage !== null && typeof storage !== 'number') {
      return createErrorResponse('Dung lượng phải là số', 400)
    }
    if (bandwidth !== undefined && bandwidth !== null && typeof bandwidth !== 'number') {
      return createErrorResponse('Băng thông phải là số', 400)
    }
    if (price !== undefined && price !== null && typeof price !== 'number') {
      return createErrorResponse('Giá phải là số', 400)
    }

    // Create hosting plan
    await db
      .insert(hosting)
      .values({
        planName,
        domain: domain || null,
        storage: storage !== undefined && storage !== null ? storage : 0,
        bandwidth: bandwidth !== undefined && bandwidth !== null ? bandwidth : 0,
        price: price !== undefined && price !== null ? price.toString() : '0',
        status: status || 'ACTIVE',
        customerId: customerId || null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        createdAt: createdAt ? new Date(createdAt.split('T')[0]) : new Date(),
        serverLocation: serverLocation || null,
        addonDomain: addonDomain || 'Unlimited',
        subDomain: subDomain || 'Unlimited',
        ftpAccounts: ftpAccounts || 'Unlimited',
        databases: databases || 'Unlimited',
        hostingType: hostingType || 'VPS Hosting',
        operatingSystem: operatingSystem || 'Linux',
      })

    // Get the created hosting plan
    const createdHosting = await db
      .select()
      .from(hosting)
      .where(eq(hosting.planName, planName))
      .limit(1)

    return createCreatedResponse(createdHosting[0], 'Tạo gói hosting thành công')
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
      id, planName, domain, storage, bandwidth, price, status, customerId, expiryDate, createdAt, serverLocation,
      addonDomain, subDomain, ftpAccounts, databases, hostingType, operatingSystem
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

    // Update hosting plan
    await db
      .update(hosting)
      .set({
        planName: planName || existingHosting[0].planName,
        domain: domain !== undefined ? (domain || null) : existingHosting[0].domain,
        storage: storage !== undefined ? storage : existingHosting[0].storage,
        bandwidth: bandwidth !== undefined ? bandwidth : existingHosting[0].bandwidth,
        price: price ? price.toString() : existingHosting[0].price,
        status: status || existingHosting[0].status,
        customerId: customerId !== undefined ? (customerId || null) : existingHosting[0].customerId,
        expiryDate: expiryDate !== undefined ? (expiryDate ? expiryDate.split('T')[0] : null) : existingHosting[0].expiryDate,
        createdAt: createdAt !== undefined ? (createdAt ? new Date(createdAt.split('T')[0]) : existingHosting[0].createdAt) : existingHosting[0].createdAt,
        serverLocation: serverLocation !== undefined ? (serverLocation || null) : existingHosting[0].serverLocation,
        addonDomain: addonDomain !== undefined ? addonDomain : existingHosting[0].addonDomain,
        subDomain: subDomain !== undefined ? subDomain : existingHosting[0].subDomain,
        ftpAccounts: ftpAccounts !== undefined ? ftpAccounts : existingHosting[0].ftpAccounts,
        databases: databases !== undefined ? databases : existingHosting[0].databases,
        hostingType: hostingType !== undefined ? hostingType : existingHosting[0].hostingType,
        operatingSystem: operatingSystem !== undefined ? operatingSystem : existingHosting[0].operatingSystem,
        updatedAt: new Date(),
      })
      .where(eq(hosting.id, id))

    // Get the updated hosting plan
    const updatedHosting = await db
      .select()
      .from(hosting)
      .where(eq(hosting.id, id))
      .limit(1)

    return createSuccessResponse(updatedHosting[0], 'Cập nhật gói hosting thành công')
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

    // Delete hosting plan
    await db
      .delete(hosting)
      .where(eq(hosting.id, id))

    return createSuccessResponse(null, 'Xóa gói hosting thành công')
  } catch (error) {
    console.error('Error deleting hosting:', error)
    return createErrorResponse('Không thể xóa gói hosting')
  }
}
