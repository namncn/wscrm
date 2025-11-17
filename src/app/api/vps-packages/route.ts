import { db } from '@/lib/database'
import { vpsPackages } from '@/lib/schema'
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
        .from(vpsPackages)
        .where(eq(vpsPackages.id, parseInt(id)))
        .limit(1)
      
      if (packageData.length === 0) {
        return createErrorResponse('Không tìm thấy gói VPS', 404)
      }
      
      // Convert id to string for frontend compatibility
      const formattedPackage = {
        ...packageData[0],
        id: String(packageData[0].id)
      }
      
      return createSuccessResponse(formattedPackage, 'Tải thông tin gói VPS')
    }
    
    // Get all VPS packages
    const packagesData = await db
      .select()
      .from(vpsPackages)
      .orderBy(desc(vpsPackages.createdAt))

    // Convert id to string for frontend compatibility
    const formattedPackages = packagesData.map(pkg => ({
      ...pkg,
      id: String(pkg.id)
    }))

    return createSuccessResponse(formattedPackages, 'Tải danh sách gói VPS')
  } catch (error) {
    console.error('Error fetching VPS packages:', error)
    return createErrorResponse('Không thể tải danh sách gói VPS')
  }
}

export async function POST(req: Request) {
  // Only ADMIN can create VPS packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo gói VPS.', 403)
  }

  try {
    const body = await req.json()
    const { planName, cpu, ram, storage, bandwidth, price, status, os, serverLocation } = body

    // Validate required fields
    if (!planName || !cpu || !ram || !storage || !bandwidth || !price) {
      return createErrorResponse('Tên gói, CPU, RAM, dung lượng, băng thông và giá là bắt buộc', 400)
    }

    // Validate data types
    if (typeof cpu !== 'number' || typeof ram !== 'number' || typeof storage !== 'number' || typeof bandwidth !== 'number' || typeof price !== 'number') {
      return createErrorResponse('CPU, RAM, dung lượng, băng thông và giá phải là số', 400)
    }

    // Create VPS package
    await db
      .insert(vpsPackages)
      .values({
        planName,
        cpu,
        ram,
        storage,
        bandwidth,
        price: price.toString(),
        status: status || 'ACTIVE',
        os: os || null,
        serverLocation: serverLocation || null,
      })

    // Get the created VPS package
    const createdPackage = await db
      .select()
      .from(vpsPackages)
      .where(eq(vpsPackages.planName, planName))
      .limit(1)

    return createCreatedResponse(createdPackage[0], 'Tạo gói VPS thành công')
  } catch (error) {
    console.error('Error creating VPS package:', error)
    return createErrorResponse('Không thể tạo gói VPS')
  }
}

export async function PUT(req: Request) {
  // Only ADMIN can update VPS packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật gói VPS.', 403)
  }

  try {
    const body = await req.json()
    const { id, planName, cpu, ram, storage, bandwidth, price, status, os, serverLocation } = body

    if (!id) {
      return createErrorResponse('ID gói VPS là bắt buộc', 400)
    }

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(vpsPackages)
      .where(eq(vpsPackages.id, id))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói VPS', 404)
    }

    // Update VPS package
    await db
      .update(vpsPackages)
      .set({
        planName: planName || existingPackage[0].planName,
        cpu: cpu || existingPackage[0].cpu,
        ram: ram || existingPackage[0].ram,
        storage: storage || existingPackage[0].storage,
        bandwidth: bandwidth || existingPackage[0].bandwidth,
        price: price ? price.toString() : existingPackage[0].price,
        status: status || existingPackage[0].status,
        os: os !== undefined ? (os || null) : existingPackage[0].os,
        serverLocation: serverLocation !== undefined ? (serverLocation || null) : existingPackage[0].serverLocation,
        updatedAt: new Date(),
      })
      .where(eq(vpsPackages.id, id))

    // Get the updated package
    const updatedPackage = await db
      .select()
      .from(vpsPackages)
      .where(eq(vpsPackages.id, id))
      .limit(1)

    return createSuccessResponse(updatedPackage[0], 'Cập nhật gói VPS thành công')
  } catch (error) {
    console.error('Error updating VPS package:', error)
    return createErrorResponse('Không thể cập nhật gói VPS')
  }
}

export async function DELETE(req: Request) {
  // Only ADMIN can delete VPS packages
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa gói VPS.', 403)
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

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(vpsPackages)
      .where(eq(vpsPackages.id, id))
      .limit(1)

    if (existingPackage.length === 0) {
      return createErrorResponse('Không tìm thấy gói VPS', 404)
    }

    // Delete VPS package
    await db
      .delete(vpsPackages)
      .where(eq(vpsPackages.id, id))

    return createSuccessResponse(null, 'Xóa gói VPS thành công')
  } catch (error) {
    console.error('Error deleting VPS package:', error)
    return createErrorResponse('Không thể xóa gói VPS')
  }
}

