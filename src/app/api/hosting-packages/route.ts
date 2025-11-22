import { db } from '@/lib/database'
import { hostingPackages } from '@/lib/schema'
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
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    // If id is provided, return single package
    if (id) {
      const packageData = await db
        .select()
        .from(hostingPackages)
        .where(eq(hostingPackages.id, parseInt(id)))
        .limit(1)
      
      if (packageData.length === 0) {
        return createErrorResponse('Không tìm thấy gói hosting', 404)
      }
      
      // Convert id to string for frontend compatibility
      const formattedPackage = {
        ...packageData[0],
        id: String(packageData[0].id)
      }
      
      return createSuccessResponse(formattedPackage, 'Tải thông tin gói hosting')
    }
    
    // Get all hosting packages
    const packagesData = await db
      .select()
      .from(hostingPackages)
      .orderBy(desc(hostingPackages.createdAt))

    // Convert id to string for frontend compatibility
    const formattedPackages = packagesData.map(pkg => ({
      ...pkg,
      id: String(pkg.id)
    }))

    return createSuccessResponse(formattedPackages, 'Tải danh sách gói hosting')
  } catch (error) {
    console.error('Error fetching hosting packages:', error)
    return createErrorResponse('Không thể tải danh sách gói hosting')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create hosting packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo gói hosting.', 403)
  }

  try {
    const body = await req.json()
    const { 
      planName, storage, bandwidth, price, status, serverLocation,
      addonDomain, subDomain, ftpAccounts, databases, hostingType, operatingSystem
    } = body

    // Validate required fields
    if (!planName) {
      return createErrorResponse('Tên gói là bắt buộc', 400)
    }

    // Validate data types
    if (storage !== undefined && storage !== null && typeof storage !== 'number') {
      return createErrorResponse('Dung lượng phải là số', 400)
    }
    if (bandwidth !== undefined && bandwidth !== null && typeof bandwidth !== 'number') {
      return createErrorResponse('Băng thông phải là số', 400)
    }
    if (price !== undefined && price !== null && typeof price !== 'number') {
      return createErrorResponse('Giá phải là số', 400)
    }

    // Create hosting package
    await db
      .insert(hostingPackages)
      .values({
        planName,
        storage: storage !== undefined && storage !== null ? storage : 0,
        bandwidth: bandwidth !== undefined && bandwidth !== null ? bandwidth : 0,
        price: price !== undefined && price !== null ? price.toString() : '0',
        status: status || 'ACTIVE',
        serverLocation: serverLocation || null,
        addonDomain: addonDomain || 'Unlimited',
        subDomain: subDomain || 'Unlimited',
        ftpAccounts: ftpAccounts || 'Unlimited',
        databases: databases || 'Unlimited',
        hostingType: hostingType || 'VPS Hosting',
        operatingSystem: operatingSystem || 'Linux',
      })

    // Get the created hosting package
    const createdPackage = await db
      .select()
      .from(hostingPackages)
      .where(eq(hostingPackages.planName, planName))
      .limit(1)

    return createCreatedResponse(createdPackage[0], 'Tạo gói hosting thành công')
  } catch (error) {
    console.error('Error creating hosting package:', error)
    return createErrorResponse('Không thể tạo gói hosting')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update hosting packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật gói hosting.', 403)
  }

  try {
    const body = await req.json()
    const { 
      id, planName, storage, bandwidth, price, status, serverLocation,
      addonDomain, subDomain, ftpAccounts, databases, hostingType, operatingSystem
    } = body

    if (!id) {
      return createErrorResponse('ID gói hosting là bắt buộc', 400)
    }

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(hostingPackages)
      .where(eq(hostingPackages.id, id))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói hosting', 404)
    }

    // Update hosting package
    await db
      .update(hostingPackages)
      .set({
        planName: planName || existingPackage[0].planName,
        storage: storage !== undefined ? storage : existingPackage[0].storage,
        bandwidth: bandwidth !== undefined ? bandwidth : existingPackage[0].bandwidth,
        price: price ? price.toString() : existingPackage[0].price,
        status: status || existingPackage[0].status,
        serverLocation: serverLocation !== undefined ? (serverLocation || null) : existingPackage[0].serverLocation,
        addonDomain: addonDomain !== undefined ? addonDomain : existingPackage[0].addonDomain,
        subDomain: subDomain !== undefined ? subDomain : existingPackage[0].subDomain,
        ftpAccounts: ftpAccounts !== undefined ? ftpAccounts : existingPackage[0].ftpAccounts,
        databases: databases !== undefined ? databases : existingPackage[0].databases,
        hostingType: hostingType !== undefined ? hostingType : existingPackage[0].hostingType,
        operatingSystem: operatingSystem !== undefined ? operatingSystem : existingPackage[0].operatingSystem,
        updatedAt: new Date(),
      })
      .where(eq(hostingPackages.id, id))

    // Get the updated package
    const updatedPackage = await db
      .select()
      .from(hostingPackages)
      .where(eq(hostingPackages.id, id))
      .limit(1)

    return createSuccessResponse(updatedPackage[0], 'Cập nhật gói hosting thành công')
  } catch (error) {
    console.error('Error updating hosting package:', error)
    return createErrorResponse('Không thể cập nhật gói hosting')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete hosting packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa gói hosting.', 403)
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

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(hostingPackages)
      .where(eq(hostingPackages.id, id))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói hosting', 404)
    }

    // Delete hosting package
    await db
      .delete(hostingPackages)
      .where(eq(hostingPackages.id, id))

    return createSuccessResponse(null, 'Xóa gói hosting thành công')
  } catch (error) {
    console.error('Error deleting hosting package:', error)
    return createErrorResponse('Không thể xóa gói hosting')
  }
}

