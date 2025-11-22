import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhanceClient } from '@/lib/control-panels/enhance/enhance-client'
import { EnhanceAdapter } from '@/lib/control-panels/enhance/enhance-adapter'
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

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể test Enhance API.', 403)
  }

  try {
    const body = await req.json()
    const { action, config, params } = body

    if (!action) {
      return createErrorResponse('Thiếu thông tin bắt buộc: action', 400)
    }

    // Get config from database first, fallback to provided config or env
    let enhanceConfig: { apiKey: string; baseUrl: string; orgId?: string } | null = null

    // Try to get from database
    try {
      const enhancePanel = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.type, 'ENHANCE'))
        .limit(1)

      if (enhancePanel[0] && enhancePanel[0].enabled === 'YES') {
        const dbConfig = enhancePanel[0].config as any
        if (dbConfig?.apiKey && dbConfig?.baseUrl) {
          enhanceConfig = {
            apiKey: dbConfig.apiKey,
            baseUrl: dbConfig.baseUrl || 'https://api.enhance.com',
            orgId: dbConfig.orgId,
          }
        }
      }
    } catch (dbError) {
      // Silently fallback to other config sources
    }

    // Fallback to provided config
    if (!enhanceConfig && config && config.apiKey && config.baseUrl) {
      enhanceConfig = {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        orgId: config.orgId,
      }
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
      return createErrorResponse('Thiếu thông tin cấu hình Enhance API. Vui lòng cấu hình trong Control Panels settings hoặc cung cấp config/apiKey và config/baseUrl.', 400)
    }

    // Create Enhance client
    const client = new EnhanceClient({
      apiKey: enhanceConfig.apiKey,
      baseUrl: enhanceConfig.baseUrl,
      orgId: enhanceConfig.orgId,
    })

    let result: any

    switch (action) {
      case 'version':
        result = await client.getVersion()
        break

      case 'health':
        result = await client.healthCheck()
        break

      case 'findCustomer':
        if (!params?.email) {
          return createErrorResponse('Email is required for findCustomer', 400)
        }
        result = await client.findCustomerByEmail(params.email)
        break

      case 'getCustomer':
        if (!params?.customerId) {
          return createErrorResponse('Customer ID is required for getCustomer', 400)
        }
        result = await client.getCustomer(params.customerId)
        break

      case 'createCustomer':
        if (!params?.name || !params?.email) {
          return createErrorResponse('Name and email are required for createCustomer', 400)
        }
        // Use EnhanceAdapter to create customer with login (like in sync API)
        const adapter = new EnhanceAdapter({
          apiKey: enhanceConfig.apiKey,
          baseUrl: enhanceConfig.baseUrl,
          orgId: enhanceConfig.orgId,
        })
        // findOrCreateCustomer will create organization + login automatically
        result = await adapter.findOrCreateCustomer({
          name: params.name,
          email: params.email,
          phone: params.phone,
          company: params.company,
        })
        break

      case 'updateCustomer':
        if (!params?.customerId) {
          return createErrorResponse('Customer ID is required for updateCustomer', 400)
        }
        result = await client.updateCustomer(params.customerId, {
          name: params.name,
          phone: params.phone,
          company: params.company,
        })
        break

      case 'deleteCustomer':
        if (!params?.customerId) {
          return createErrorResponse('Customer ID is required for deleteCustomer', 400)
        }
        result = await client.deleteCustomer(params.customerId)
        break

      case 'getPlans':
        result = await client.getPlans()
        break

      case 'getPlan':
        if (!params?.planId) {
          return createErrorResponse('Plan ID is required for getPlan', 400)
        }
        result = await client.getPlan(params.planId)
        break

      case 'createSubscription':
        if (!params?.customerId || !params?.planId) {
          return createErrorResponse('Customer ID and Plan ID are required for createSubscription', 400)
        }
        result = await client.createSubscription(params.customerId, params.planId)
        break

      case 'createWebsite':
        if (!params?.customerId) {
          return createErrorResponse('Customer ID is required for createWebsite', 400)
        }
        result = await client.createWebsite({
          customerId: params.customerId,
          planId: params.planId,
          subscriptionId: params.subscriptionId,
          domain: params.domain,
        })
        break

      case 'getWebsite':
        if (!params?.websiteId) {
          return createErrorResponse('Website ID is required for getWebsite', 400)
        }
        // Try to get website from parent org first, or from customer org if provided
        result = await client.getWebsite(params.websiteId, params.orgId || enhanceConfig.orgId)
        break

      case 'deleteWebsite':
        if (!params?.websiteId) {
          return createErrorResponse('Website ID is required for deleteWebsite', 400)
        }
        result = await client.deleteWebsite(params.websiteId)
        break

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400)
    }

    if (!result) {
      console.error('[Enhance Test API] Result is undefined for action:', action)
      return createErrorResponse(`No result returned for action: ${action}`, 500)
    }

    if (result.success) {
      return createSuccessResponse(result.data, `Enhance API ${action} thành công`)
    } else {
      // Return 200 OK with error in response body (not 404/500)
      // This is because the error is from Enhance API, not our route handler
      // The client should handle the error based on success: false in response
      return NextResponse.json({
        success: false,
        error: result.error || 'Enhance API call failed',
        statusCode: result.statusCode,
        data: null,
      }, { status: 200 })
    }
  } catch (error: any) {
    console.error('[Enhance Test API] Error:', error)
    console.error('[Enhance Test API] Error stack:', error.stack)
    return createErrorResponse(`Có lỗi xảy ra: ${error.message || 'Unknown error'}`)
  }
}

