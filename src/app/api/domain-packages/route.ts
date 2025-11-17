import { db } from '@/lib/database'
import { domainPackages } from '@/lib/schema'
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
  // Allow public access to view domain packages
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    // If id is provided, return single package
    if (id) {
      const packageData = await db
        .select()
        .from(domainPackages)
        .where(eq(domainPackages.id, parseInt(id)))
        .limit(1)
      
      if (packageData.length === 0) {
        return createErrorResponse('Không tìm thấy gói tên miền', 404)
      }
      
      // Convert id to string and ensure features is an array
      const pkg = packageData[0]
      let featuresArray: any[] = []
      if (pkg.features) {
        if (typeof pkg.features === 'string') {
          try {
            const parsed = JSON.parse(pkg.features)
            featuresArray = Array.isArray(parsed) ? parsed : []
          } catch {
            featuresArray = []
          }
        } else if (Array.isArray(pkg.features)) {
          featuresArray = pkg.features
        } else if (typeof pkg.features === 'object') {
          featuresArray = Object.values(pkg.features)
        }
      }
      
      const formattedPackage = {
        ...pkg,
        id: String(pkg.id),
        features: featuresArray
      }
      
      return createSuccessResponse(formattedPackage, 'Tải thông tin gói tên miền')
    }
    
    // Return all packages (public access)
    const packages = await db
      .select()
      .from(domainPackages)
      .orderBy(desc(domainPackages.id))
    
    // Convert id to string and ensure features is an array
    const formattedPackages = packages.map(pkg => {
      // Parse features JSON if it's a string, or ensure it's an array
      let featuresArray: any[] = []
      if (pkg.features) {
        if (typeof pkg.features === 'string') {
          try {
            const parsed = JSON.parse(pkg.features)
            featuresArray = Array.isArray(parsed) ? parsed : []
          } catch {
            featuresArray = []
          }
        } else if (Array.isArray(pkg.features)) {
          featuresArray = pkg.features
        } else if (typeof pkg.features === 'object') {
          featuresArray = Object.values(pkg.features)
        }
      }
      
      return {
        ...pkg,
        id: String(pkg.id),
        features: featuresArray
      }
    })
    
    return createSuccessResponse(formattedPackages, 'Tải danh sách gói tên miền')
  } catch (error: any) {
    console.error('Error fetching domain packages:', error)
    return createErrorResponse('Không thể tải danh sách gói tên miền', 500)
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo gói tên miền.', 403)
  }

  try {
    const body = await req.json()
    const { name, price, description, features, popular, category, status } = body

    // Validate required fields
    if (!name) {
      return createErrorResponse('Tên gói tên miền là bắt buộc', 400)
    }
    if (price === undefined || price === null) {
      return createErrorResponse('Giá là bắt buộc', 400)
    }

    // Create domain package
    const result = await db
      .insert(domainPackages)
      .values({
        name: name,
        price: price,
        description: description || null,
        features: features || null,
        popular: popular || 'NO',
        category: category || null,
        status: status || 'ACTIVE',
      })

    // Get the created package
    const createdPackage = await db
      .select()
      .from(domainPackages)
      .orderBy(desc(domainPackages.id))
      .limit(1)

    if (createdPackage.length === 0) {
      return createErrorResponse('Không thể tạo gói tên miền', 500)
    }

    // Convert id to string for frontend compatibility
    const formattedPackage = {
      ...createdPackage[0],
      id: String(createdPackage[0].id)
    }

    return createCreatedResponse(formattedPackage, 'Tạo gói tên miền thành công')
  } catch (error: any) {
    console.error('Error creating domain package:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return createErrorResponse('Gói tên miền đã tồn tại', 409)
    }
    return createErrorResponse('Không thể tạo gói tên miền', 500)
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật gói tên miền.', 403)
  }

  try {
    const body = await req.json()
    const { id, name, price, description, features, popular, category, status } = body

    if (!id) {
      return createErrorResponse('ID gói tên miền là bắt buộc', 400)
    }

    // Check if package exists
    const packageId = typeof id === 'string' ? parseInt(id, 10) : id
    const existingPackage = await db
      .select()
      .from(domainPackages)
      .where(eq(domainPackages.id, packageId))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói tên miền', 404)
    }

    // Update package - only update provided fields
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (name !== undefined) updateData.name = name
    if (price !== undefined) updateData.price = price
    if (description !== undefined) updateData.description = description
    if (features !== undefined) updateData.features = features
    if (popular !== undefined) updateData.popular = popular
    if (category !== undefined) updateData.category = category
    if (status !== undefined) updateData.status = status

    await db
      .update(domainPackages)
      .set(updateData)
      .where(eq(domainPackages.id, packageId))

    // Get the updated package
    const updatedPackage = await db
      .select()
      .from(domainPackages)
      .where(eq(domainPackages.id, packageId))
      .limit(1)

    if (updatedPackage.length === 0) {
      return createErrorResponse('Không thể cập nhật gói tên miền', 500)
    }

    // Convert id to string for frontend compatibility
    const formattedPackage = {
      ...updatedPackage[0],
      id: String(updatedPackage[0].id)
    }

    return createSuccessResponse(formattedPackage, 'Cập nhật gói tên miền thành công')
  } catch (error: any) {
    console.error('Error updating domain package:', error)
    return createErrorResponse('Không thể cập nhật gói tên miền', 500)
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa gói tên miền.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('ID gói tên miền là bắt buộc', 400)
    }

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(domainPackages)
      .where(eq(domainPackages.id, parseInt(id)))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói tên miền', 404)
    }

    // Delete package
    await db
      .delete(domainPackages)
      .where(eq(domainPackages.id, parseInt(id)))

    return createSuccessResponse(null, 'Xóa gói tên miền thành công')
  } catch (error: any) {
    console.error('Error deleting domain package:', error)
    return createErrorResponse('Không thể xóa gói tên miền', 500)
  }
}

