import { db } from '@/lib/database'
import { domain, customers } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
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
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  // ADMIN and USER can view all domains, CUSTOMER can only view their own
  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const customerIdParam = searchParams.get('customerId')
    const id = searchParams.get('id')
    
    // If id is provided, return single domain
    if (id) {
      const domainData = await db
        .select({
          id: domain.id,
          domainName: domain.domainName,
          registrar: domain.registrar,
          registrationDate: domain.registrationDate,
          expiryDate: domain.expiryDate,
          status: domain.status,
          price: domain.price,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
          customerId: domain.customerId,
          customerName: customers.name,
          customerEmail: customers.email,
        })
        .from(domain)
        .leftJoin(customers, eq(domain.customerId, customers.id))
        .where(eq(domain.id, parseInt(id)))
        .limit(1)
      
      if (domainData.length === 0) {
        return createErrorResponse('Không tìm thấy tên miền', 404)
      }
      
      // For customers, verify ownership
      if (isCustomer && domainData[0].customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || domainData[0].customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem tên miền này', 403)
        }
      }
      
      return createSuccessResponse(domainData[0], 'Tải thông tin tên miền')
    }
    
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
    
    const query = db
      .select({
        id: domain.id,
        domainName: domain.domainName,
        registrar: domain.registrar,
        registrationDate: domain.registrationDate,
        expiryDate: domain.expiryDate,
        status: domain.status,
        price: domain.price,
        createdAt: domain.createdAt,
        updatedAt: domain.updatedAt,
        customerId: domain.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(domain)
      .leftJoin(customers, eq(domain.customerId, customers.id))
    
    // Filter by customerId if provided or if customer is viewing their own domains
    const rows = finalCustomerId 
      ? await query.where(eq(domain.customerId, finalCustomerId)).orderBy(desc(domain.createdAt))
      : await query.orderBy(desc(domain.createdAt))

    return createSuccessResponse(rows, 'Tải danh sách tên miền')
  } catch (error) {
    console.error('Error fetching domain:', error)
    return createErrorResponse('Không thể tải danh sách tên miền')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create domains
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo tên miền.', 403)
  }

  try {
    const body = await req.json()
    const { domainName, registrar, registrationDate, expiryDate, price, customerId } = body

    // Validate required fields
    if (!domainName) {
      return createErrorResponse('Tên miền là bắt buộc', 400)
    }

    // Check if domain already exists
    const existingDomain = await db
      .select()
      .from(domain)
      .where(eq(domain.domainName, domainName))
      .limit(1)

    if (existingDomain.length > 0) {
      return createErrorResponse('Tên miền đã tồn tại', 400)
    }

    // Create domain
    await db
      .insert(domain)
      .values({
        domainName,
        registrar: registrar || null,
        registrationDate: registrationDate ? registrationDate.split('T')[0] : null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        price: price ? price.toString() : null,
        customerId: customerId || null,
      })

    // Get the created domain
    const createdDomain = await db
      .select()
      .from(domain)
      .where(eq(domain.domainName, domainName))
      .limit(1)

    return createCreatedResponse(createdDomain[0], 'Tạo tên miền thành công')
  } catch (error) {
    console.error('Error creating domain:', error)
    return createErrorResponse('Không thể tạo tên miền')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update domains
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật tên miền.', 403)
  }

  try {
    const body = await req.json()
    const { id, domainName, registrar, registrationDate, expiryDate, price, status, customerId } = body

    if (!id) {
      return createErrorResponse('ID tên miền là bắt buộc', 400)
    }

    const domainId = typeof id === 'string' ? parseInt(id) : id

    // Check if domain exists
    const existingDomain = await db
      .select()
      .from(domain)
      .where(eq(domain.id, domainId))
      .limit(1)

    if (existingDomain.length === 0) {
      return createErrorResponse('Không tìm thấy tên miền', 404)
    }

    // Update domain
    await db
      .update(domain)
      .set({
        domainName: domainName || existingDomain[0].domainName,
        registrar: registrar || existingDomain[0].registrar,
        registrationDate: registrationDate ? registrationDate.split('T')[0] : existingDomain[0].registrationDate,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : existingDomain[0].expiryDate,
        price: price ? price.toString() : existingDomain[0].price,
        status: status || existingDomain[0].status,
        customerId: typeof customerId !== 'undefined' ? (customerId || null) : existingDomain[0].customerId,
        updatedAt: new Date(),
      })
      .where(eq(domain.id, domainId))

    // Get the updated domain
    const updatedDomain = await db
      .select()
      .from(domain)
      .where(eq(domain.id, domainId))
      .limit(1)

    return createSuccessResponse(updatedDomain[0], 'Cập nhật tên miền thành công')
  } catch (error) {
    console.error('Error updating domain:', error)
    return createErrorResponse('Không thể cập nhật tên miền')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete domains
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa tên miền.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('ID tên miền là bắt buộc', 400)
    }

    const domainId = parseInt(id)

    // Check if domain exists
    const existingDomain = await db
      .select()
      .from(domain)
      .where(eq(domain.id, domainId))
      .limit(1)

    if (existingDomain.length === 0) {
      return createErrorResponse('Không tìm thấy tên miền', 404)
    }

    // Delete domain
    await db
      .delete(domain)
      .where(eq(domain.id, domainId))

    return createSuccessResponse(null, 'Xóa tên miền thành công')
  } catch (error) {
    console.error('Error deleting domain:', error)
    return createErrorResponse('Không thể xóa tên miền')
  }
}
