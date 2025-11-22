import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { controlPanels } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
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
    return createErrorResponse('Bạn không có quyền truy cập. Chỉ quản trị viên mới có thể xem control panels.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    // If id is provided, return single control panel
    if (id) {
      const cp = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.id, parseInt(id)))
        .limit(1)

      if (cp.length === 0) {
        return createErrorResponse('Không tìm thấy control panel', 404)
      }

      return createSuccessResponse(cp[0], 'Tải thông tin control panel')
    }

    // Get all control panels (or filter by type)
    let cps
    if (type) {
      cps = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.type, type as any))
        .orderBy(controlPanels.type)
    } else {
      cps = await db.select()
        .from(controlPanels)
        .orderBy(controlPanels.type)
    }

    return createSuccessResponse(cps, 'Tải danh sách control panels')
  } catch (error: any) {
    console.error('Error fetching control panels:', error)
    return createErrorResponse('Không thể tải danh sách control panels')
  }
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo control panel.', 403)
  }

  try {
    const body = await req.json()
    const {
      type,
      enabled,
      config,
    } = body

    // Validate required fields
    if (!type || !config) {
      return createErrorResponse('Thiếu thông tin bắt buộc: type, config', 400)
    }

    // Validate type
    const validTypes = ['ENHANCE', 'CPANEL', 'PLESK', 'DIRECTADMIN']
    if (!validTypes.includes(type)) {
      return createErrorResponse(`Type không hợp lệ. Phải là một trong: ${validTypes.join(', ')}`, 400)
    }

    // Check if control panel with this type already exists
    const existing = await db.select()
      .from(controlPanels)
      .where(eq(controlPanels.type, type as any))
      .limit(1)

    if (existing.length > 0) {
      return createErrorResponse(`Control panel với type ${type} đã tồn tại. Sử dụng PUT để cập nhật.`, 400)
    }

    // Create control panel
    await db.insert(controlPanels).values({
      type: type as any,
      enabled: (enabled === 'YES' || enabled === true || enabled === undefined ? 'YES' : 'NO') as any,
      config: typeof config === 'string' ? JSON.parse(config) : config,
    })

    // Get the created control panel
    const created = await db.select()
      .from(controlPanels)
      .where(eq(controlPanels.type, type as any))
      .limit(1)

    return createCreatedResponse(created[0], 'Tạo control panel thành công')
  } catch (error: any) {
    console.error('Error creating control panel:', error)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return createErrorResponse('Tên control panel đã tồn tại', 400)
    }
    return createErrorResponse('Không thể tạo control panel')
  }
}

export async function PUT(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật control panel.', 403)
  }

  try {
    const body = await req.json()
    const {
      id,
      type,
      enabled,
      config,
    } = body

    // Can update by id or type
    if (!id && !type) {
      return createErrorResponse('ID hoặc type control panel là bắt buộc', 400)
    }

    // Check if control panel exists
    let existing
    if (id) {
      existing = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.id, id))
        .limit(1)
    } else {
      existing = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.type, type as any))
        .limit(1)
    }

    if (existing.length === 0) {
      return createErrorResponse('Không tìm thấy control panel', 404)
    }

    const cpId = existing[0].id

    // Update control panel
    const updateData: any = {}
    if (enabled !== undefined) {
      updateData.enabled = enabled === 'YES' || enabled === true ? 'YES' : 'NO'
    }
    if (config !== undefined) {
      updateData.config = typeof config === 'string' ? JSON.parse(config) : config
    }

    await db.update(controlPanels)
      .set(updateData)
      .where(eq(controlPanels.id, cpId))

    // Get the updated control panel
    const updated = await db.select()
      .from(controlPanels)
      .where(eq(controlPanels.id, cpId))
      .limit(1)

    return createSuccessResponse(updated[0], 'Cập nhật control panel thành công')
  } catch (error: any) {
    console.error('Error updating control panel:', error)
    return createErrorResponse('Không thể cập nhật control panel')
  }
}

export async function DELETE(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa control panel.', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return createErrorResponse('ID control panel là bắt buộc', 400)
    }

    const id = parseInt(idParam)
    if (isNaN(id)) {
      return createErrorResponse('ID control panel không hợp lệ', 400)
    }

    // Check if control panel exists
    const existing = await db.select()
      .from(controlPanels)
      .where(eq(controlPanels.id, id))
      .limit(1)

    if (existing.length === 0) {
      return createErrorResponse('Không tìm thấy control panel', 404)
    }

    // Delete control panel
    await db.delete(controlPanels).where(eq(controlPanels.id, id))

    return createSuccessResponse(null, 'Xóa control panel thành công')
  } catch (error: any) {
    console.error('Error deleting control panel:', error)
    return createErrorResponse('Không thể xóa control panel')
  }
}

