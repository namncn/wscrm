import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhanceClient } from '@/lib/control-panels/enhance/enhance-client'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { db } from '@/lib/database'
import { controlPanels } from '@/lib/schema'
import { eq } from 'drizzle-orm'

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
    return createErrorResponse('Bạn không có quyền truy cập. Chỉ quản trị viên mới có thể xem Enhance plans.', 403)
  }

  try {
    // Get config from database first, fallback to env
    let enhanceConfig: { apiKey: string; baseUrl: string; orgId?: string } | null = null

    // Try to get from database
    try {
      const enhancePanel = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.type, 'ENHANCE'))
        .limit(1)

      if (enhancePanel[0] && enhancePanel[0].enabled === 'YES') {
        const dbConfig = typeof enhancePanel[0].config === 'string' 
          ? JSON.parse(enhancePanel[0].config) 
          : enhancePanel[0].config as any

        if (dbConfig?.apiKey && dbConfig?.baseUrl) {
          enhanceConfig = {
            apiKey: dbConfig.apiKey,
            baseUrl: dbConfig.baseUrl || 'https://api.enhance.com',
            orgId: dbConfig.orgId,
          }
        }
      }
    } catch (dbError) {
      console.error('[Enhance Plans API] Error loading from database:', dbError)
    }

    // Fallback to environment variables
    if (!enhanceConfig) {
      const envApiKey = process.env.ENHANCE_API_KEY
      const envBaseUrl = process.env.ENHANCE_BASE_URL || 'https://api.enhance.com'
      const envOrgId = process.env.ENHANCE_ORG_ID

      if (envApiKey) {
        enhanceConfig = {
          apiKey: envApiKey,
          baseUrl: envBaseUrl,
          orgId: envOrgId,
        }
      }
    }

    if (!enhanceConfig || !enhanceConfig.apiKey || !enhanceConfig.baseUrl) {
      return createErrorResponse('Thiếu thông tin cấu hình Enhance API. Vui lòng cấu hình trong Control Panels settings.', 400)
    }

    // Create Enhance client
    const client = new EnhanceClient({
      apiKey: enhanceConfig.apiKey,
      baseUrl: enhanceConfig.baseUrl,
      orgId: enhanceConfig.orgId,
    })

    // Get plans from Enhance API
    const result = await client.getPlans()

    if (result.success && result.data) {
      const plans = Array.isArray(result.data) ? result.data : []
      return createSuccessResponse(plans, 'Tải danh sách plans từ Enhance thành công')
    } else {
      return createErrorResponse(result.error || 'Không thể tải danh sách plans từ Enhance API', 500)
    }
  } catch (error: any) {
    console.error('[Enhance Plans API] Error:', error)
    return createErrorResponse(`Có lỗi xảy ra: ${error.message || 'Unknown error'}`)
  }
}

