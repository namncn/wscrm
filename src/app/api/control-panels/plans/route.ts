import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { controlPanelPlans } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'

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
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền truy cập. Chỉ quản trị viên mới có thể xem plan mappings.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const controlPanelId = searchParams.get('controlPanelId')
    const localPlanType = searchParams.get('localPlanType')
    const localPlanId = searchParams.get('localPlanId')

    // Build conditions array
    const conditions = []
    if (controlPanelId) {
      conditions.push(eq(controlPanelPlans.controlPanelId, parseInt(controlPanelId)))
    }
    if (localPlanType) {
      conditions.push(eq(controlPanelPlans.localPlanType, localPlanType as any))
    }
    if (localPlanId) {
      conditions.push(eq(controlPanelPlans.localPlanId, parseInt(localPlanId)))
    }

    // Build query with conditions
    const baseQuery = db.select().from(controlPanelPlans)
    const plans = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(controlPanelPlans.createdAt))
      : await baseQuery.orderBy(desc(controlPanelPlans.createdAt))

    return createSuccessResponse(plans, 'Tải danh sách plan mappings')
  } catch (error: any) {
    console.error('Error fetching plan mappings:', error)
    return createErrorResponse('Không thể tải danh sách plan mappings')
  }
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo plan mapping.', 403)
  }

  try {
    const body = await req.json()
    const {
      controlPanelId,
      localPlanType,
      localPlanId,
      externalPlanId,
      externalPlanName,
      isActive,
      mappingConfig,
    } = body

    // Validate required fields
    if (!controlPanelId || !localPlanType || localPlanId === undefined || !externalPlanId) {
      return createErrorResponse('Thiếu thông tin bắt buộc: controlPanelId, localPlanType, localPlanId, externalPlanId', 400)
    }

    // Validate localPlanType
    if (!['HOSTING', 'VPS'].includes(localPlanType)) {
      return createErrorResponse('localPlanType phải là HOSTING hoặc VPS', 400)
    }

    // Create plan mapping
    await db.insert(controlPanelPlans).values({
      controlPanelId: parseInt(controlPanelId),
      localPlanType: localPlanType as any,
      localPlanId: parseInt(localPlanId),
      externalPlanId,
      externalPlanName: externalPlanName || null,
      isActive: (isActive === 'YES' || isActive === true ? 'YES' : 'NO') as any,
      mappingConfig: mappingConfig ? (typeof mappingConfig === 'string' ? JSON.parse(mappingConfig) : mappingConfig) : null,
    })

    // Get the created plan mapping
    const created = await db.select()
      .from(controlPanelPlans)
      .where(
        and(
          eq(controlPanelPlans.controlPanelId, parseInt(controlPanelId)),
          eq(controlPanelPlans.localPlanType, localPlanType as any),
          eq(controlPanelPlans.localPlanId, parseInt(localPlanId))
        )
      )
      .limit(1)

    return createCreatedResponse(created[0], 'Tạo plan mapping thành công')
  } catch (error: any) {
    console.error('Error creating plan mapping:', error)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return createErrorResponse('Plan mapping đã tồn tại', 400)
    }
    return createErrorResponse('Không thể tạo plan mapping')
  }
}

export async function PUT(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật plan mapping.', 403)
  }

  try {
    const body = await req.json()
    const {
      id,
      externalPlanId,
      externalPlanName,
      isActive,
      mappingConfig,
    } = body

    if (!id) {
      return createErrorResponse('ID plan mapping là bắt buộc', 400)
    }

    // Check if plan mapping exists
    const existing = await db.select()
      .from(controlPanelPlans)
      .where(eq(controlPanelPlans.id, id))
      .limit(1)

    if (existing.length === 0) {
      return createErrorResponse('Không tìm thấy plan mapping', 404)
    }

    // Update plan mapping
    const updateData: any = {}
    if (externalPlanId !== undefined) updateData.externalPlanId = externalPlanId
    if (externalPlanName !== undefined) updateData.externalPlanName = externalPlanName
    if (isActive !== undefined) updateData.isActive = isActive === 'YES' || isActive === true ? 'YES' : 'NO'
    if (mappingConfig !== undefined) updateData.mappingConfig = mappingConfig ? (typeof mappingConfig === 'string' ? JSON.parse(mappingConfig) : mappingConfig) : null

    await db.update(controlPanelPlans)
      .set(updateData)
      .where(eq(controlPanelPlans.id, id))

    // Get the updated plan mapping
    const updated = await db.select()
      .from(controlPanelPlans)
      .where(eq(controlPanelPlans.id, id))
      .limit(1)

    return createSuccessResponse(updated[0], 'Cập nhật plan mapping thành công')
  } catch (error: any) {
    console.error('Error updating plan mapping:', error)
    return createErrorResponse('Không thể cập nhật plan mapping')
  }
}

export async function DELETE(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa plan mapping.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return createErrorResponse('ID plan mapping là bắt buộc', 400)
    }

    const id = parseInt(idParam)
    if (isNaN(id)) {
      return createErrorResponse('ID plan mapping không hợp lệ', 400)
    }

    // Delete plan mapping
    await db.delete(controlPanelPlans).where(eq(controlPanelPlans.id, id))

    return createSuccessResponse(null, 'Xóa plan mapping thành công')
  } catch (error: any) {
    console.error('Error deleting plan mapping:', error)
    return createErrorResponse('Không thể xóa plan mapping')
  }
}

