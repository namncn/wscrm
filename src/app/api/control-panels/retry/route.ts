import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RetryQueue } from '@/lib/control-panel-sync/retry-queue'
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
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể retry sync.', 403)
  }

  try {
    const body = await req.json()
    const { hostingId, limit } = body

    // If hostingId is provided, retry specific hosting
    if (hostingId) {
      const result = await RetryQueue.retryNow(parseInt(hostingId))
      if (result.success) {
        return createSuccessResponse(result, 'Retry sync thành công')
      } else {
        return createErrorResponse(result.error || 'Retry sync thất bại', 500)
      }
    }

    // Otherwise, process queue
    const processLimit = limit ? parseInt(limit) : 10
    const result = await RetryQueue.processQueue(processLimit)

    return createSuccessResponse(result, `Đã xử lý ${result.processed} hosting từ queue`)
  } catch (error: any) {
    console.error('Error retrying sync:', error)
    return createErrorResponse('Không thể retry sync')
  }
}

export async function GET(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền truy cập. Chỉ quản trị viên mới có thể xem retry queue stats.', 403)
  }

  try {
    const stats = await RetryQueue.getQueueStats()
    return createSuccessResponse(stats, 'Tải thống kê retry queue')
  } catch (error: any) {
    console.error('Error getting retry queue stats:', error)
    return createErrorResponse('Không thể tải thống kê retry queue')
  }
}

