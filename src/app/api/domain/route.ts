import { db } from '@/lib/database'
import { domain, domainPackages, customers } from '@/lib/schema'
import { eq, desc, isNotNull, and } from 'drizzle-orm'
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
    
    // If id is provided, return single domain (customer-registered only)
    if (id) {
      const domainData = await db
        .select({
          domain: domain,
          package: domainPackages,
          customer: customers,
        })
        .from(domain)
        .leftJoin(domainPackages, eq(domain.domainTypeId, domainPackages.id))
        .leftJoin(customers, eq(domain.customerId, customers.id))
        .where(eq(domain.id, parseInt(id)))
        .limit(1)
      
      if (domainData.length === 0 || !domainData[0].domain) {
        return createErrorResponse('Không tìm thấy tên miền', 404)
      }
      
      const domainRecord = domainData[0].domain
      const packageData = domainData[0].package
      const customerData = domainData[0].customer
      
      // For customers, verify ownership
      if (isCustomer && domainRecord.customerId) {
        if (!session.user.email) {
          return createErrorResponse('Không tìm thấy thông tin email', 400)
        }
        
        const customer = await db.select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)
        
        if (!customer || customer.length === 0 || domainRecord.customerId !== customer[0].id) {
          return createErrorResponse('Bạn không có quyền xem tên miền này', 403)
        }
      }
      
      // Combine domain and package data
      const result = {
        ...domainRecord,
        domainTypeId: domainRecord.domainTypeId ? String(domainRecord.domainTypeId) : null,
        ...(packageData ? {
          packageName: packageData.name,
          price: packageData.price ? String(packageData.price) : null,
          description: packageData.description,
          features: packageData.features,
          category: packageData.category,
        } : {}),
        ...(customerData ? {
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerId: customerData.id ? String(customerData.id) : null,
        } : {}),
      }
      
      return createSuccessResponse(result, 'Tải thông tin tên miền')
    }
    
    // Only return customer-registered domains (where customerId is NOT NULL)
    const purchased = searchParams.get('purchased')
    
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
    
    // Build query to get customer-registered domains with package data
    const whereConditions = [isNotNull(domain.customerId)]
    if (finalCustomerId) {
      whereConditions.push(eq(domain.customerId, finalCustomerId))
    }
    
    const rows = await db
      .select({
        domain: domain,
        package: domainPackages,
        customer: customers,
      })
      .from(domain)
      .leftJoin(domainPackages, eq(domain.domainTypeId, domainPackages.id))
      .leftJoin(customers, eq(domain.customerId, customers.id))
      .where(and(...whereConditions))
      .orderBy(desc(domain.createdAt))
    
    // Combine domain and package data
    const result = rows.map((row: any) => ({
      ...row.domain,
      domainTypeId: row.domain.domainTypeId ? String(row.domain.domainTypeId) : null,
      ...(row.package ? {
        packageName: row.package.name,
        price: row.package.price ? String(row.package.price) : null,
        description: row.package.description,
        features: row.package.features,
        category: row.package.category,
      } : {}),
      ...(row.customer ? {
        customerName: row.customer.name,
        customerEmail: row.customer.email,
        customerId: row.customer.id ? String(row.customer.id) : null,
      } : {}),
    }))

    return createSuccessResponse(result, 'Tải danh sách tên miền')
  } catch (error) {
    console.error('Error fetching domain:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return createErrorResponse(`Không thể tải danh sách tên miền: ${errorMessage}`, 500)
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
    const { domainName, domainTypeId, customerId, status, registrar, ipAddress, registrationDate, expiryDate, createdAt } = body

    // Validate required fields
    if (!domainName) {
      return createErrorResponse('Tên miền là bắt buộc', 400)
    }
    if (!domainTypeId) {
      return createErrorResponse('domainTypeId là bắt buộc', 400)
    }
    if (!customerId) {
      return createErrorResponse('customerId là bắt buộc cho tên miền đã đăng ký', 400)
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

    // Create domain registration
    await db
      .insert(domain)
      .values({
        domainName,
        domainTypeId: typeof domainTypeId === 'string' ? parseInt(domainTypeId, 10) : domainTypeId,
        customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
        status: status || 'ACTIVE',
        registrar: registrar || null,
        ipAddress: ipAddress || null,
        registrationDate: registrationDate ? registrationDate.split('T')[0] : null,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        createdAt: createdAt ? new Date(createdAt.split('T')[0]) : new Date(),
      })

    // Get the created domain with package data
    const createdDomainRaw = await db
      .select({
        domain: domain,
        package: domainPackages,
      })
      .from(domain)
      .leftJoin(domainPackages, eq(domain.domainTypeId, domainPackages.id))
      .where(eq(domain.domainName, domainName))
      .limit(1)

    if (createdDomainRaw.length === 0 || !createdDomainRaw[0].domain) {
      return createErrorResponse('Không thể tạo tên miền', 500)
    }

    // Combine domain and package data
    const result = {
      ...createdDomainRaw[0].domain,
      domainTypeId: createdDomainRaw[0].domain.domainTypeId ? String(createdDomainRaw[0].domain.domainTypeId) : null,
      ...(createdDomainRaw[0].package ? {
        packageName: createdDomainRaw[0].package.name,
        price: createdDomainRaw[0].package.price ? String(createdDomainRaw[0].package.price) : null,
        description: createdDomainRaw[0].package.description,
        features: createdDomainRaw[0].package.features,
        category: createdDomainRaw[0].package.category,
      } : {}),
    }

    return createCreatedResponse(result, 'Tạo tên miền thành công')
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
    const { id, domainName, domainTypeId, customerId, status, registrar, ipAddress, registrationDate, expiryDate, createdAt } = body

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

    // Update domain registration - only update provided fields
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (domainName !== undefined) updateData.domainName = domainName
    if (domainTypeId !== undefined) updateData.domainTypeId = typeof domainTypeId === 'string' ? parseInt(domainTypeId, 10) : domainTypeId
    if (customerId !== undefined) updateData.customerId = typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
    if (status !== undefined) updateData.status = status
    if (registrar !== undefined) updateData.registrar = registrar || null
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress || null
    if (registrationDate !== undefined) updateData.registrationDate = registrationDate ? registrationDate.split('T')[0] : null
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? expiryDate.split('T')[0] : null
    if (createdAt !== undefined) updateData.createdAt = createdAt ? new Date(createdAt.split('T')[0]) : existingDomain[0].createdAt

    await db
      .update(domain)
      .set(updateData)
      .where(eq(domain.id, domainId))

    // Get the updated domain with package data
    const updatedDomainRaw = await db
      .select({
        domain: domain,
        package: domainPackages,
      })
      .from(domain)
      .leftJoin(domainPackages, eq(domain.domainTypeId, domainPackages.id))
      .where(eq(domain.id, domainId))
      .limit(1)

    if (updatedDomainRaw.length === 0 || !updatedDomainRaw[0].domain) {
      return createErrorResponse('Không thể cập nhật tên miền', 500)
    }

    // Combine domain and package data
    const result = {
      ...updatedDomainRaw[0].domain,
      domainTypeId: updatedDomainRaw[0].domain.domainTypeId ? String(updatedDomainRaw[0].domain.domainTypeId) : null,
      ...(updatedDomainRaw[0].package ? {
        packageName: updatedDomainRaw[0].package.name,
        price: updatedDomainRaw[0].package.price ? String(updatedDomainRaw[0].package.price) : null,
        description: updatedDomainRaw[0].package.description,
        features: updatedDomainRaw[0].package.features,
        category: updatedDomainRaw[0].package.category,
      } : {}),
    }

    return createSuccessResponse(result, 'Cập nhật tên miền thành công')
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
