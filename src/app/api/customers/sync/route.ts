import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { ControlPanelSyncService } from '@/lib/control-panel-sync/sync-service'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể sync customers.', 403)
  }

  try {
    const body = await req.json()
    const { customerId, controlPanelId } = body

    if (!customerId) {
      return createErrorResponse('Customer ID là bắt buộc', 400)
    }

    // Get customer from database
    const customerRecords = await db.select()
      .from(customers)
      .where(eq(customers.id, parseInt(customerId)))
      .limit(1)

    if (customerRecords.length === 0) {
      return createErrorResponse('Không tìm thấy customer', 404)
    }

    const customer = customerRecords[0]

    // Use ControlPanelSyncService to sync customer
    const syncResult = await ControlPanelSyncService.syncCustomerToControlPanel(
      {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        company: customer.company || undefined,
      },
      controlPanelId
    )

    if (!syncResult.success) {
      return createErrorResponse(syncResult.error || 'Không thể sync customer với control panel', 500)
    }

    // Map action to Vietnamese message
    let message = 'Đồng bộ customer thành công'
    if (syncResult.action === 'created') {
      message = 'Đã tạo customer mới trên control panel thành công'
    } else if (syncResult.action === 'updated') {
      message = 'Đã cập nhật customer trên control panel thành công'
    } else if (syncResult.action === 'no_change') {
      message = 'Customer đã tồn tại và không có thay đổi cần cập nhật'
    }

    return createSuccessResponse({
      customerId: customer.id,
      externalAccountId: syncResult.externalAccountId,
      action: syncResult.action,
    }, message)
  } catch (error: any) {
    console.error('[Customer Sync API] Error:', error)
    return createErrorResponse(`Có lỗi xảy ra: ${error.message || 'Unknown error'}`)
  }
}

