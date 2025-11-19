import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ControlPanelSyncService } from '@/lib/control-panel-sync/sync-service'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

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
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể sync hosting.', 403)
  }

  try {
    const body = await req.json()
    const { hostingId, controlPanelId } = body

    if (!hostingId) {
      return createErrorResponse('hostingId là bắt buộc', 400)
    }

    const result = await ControlPanelSyncService.syncHostingToControlPanel(
      parseInt(hostingId),
      controlPanelId ? parseInt(controlPanelId) : undefined
    )

    if (result.success) {
      return createSuccessResponse(result, 'Sync hosting thành công')
    } else {
      return createErrorResponse(result.error || 'Sync hosting thất bại', 500)
    }
  } catch (error: any) {
    console.error('Error syncing hosting:', error)
    return createErrorResponse('Không thể sync hosting')
  }
}

