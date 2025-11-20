import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { hosting, customers, hostingPackages, controlPanelPlans, controlPanels } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ControlPanelFactory } from '@/lib/control-panels/factory'
import { ControlPanelSyncService } from '@/lib/control-panel-sync/sync-service'
import { ControlPanelType } from '@/lib/control-panels/base/types'

async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể sync subscription.', 403)
  }

  try {
    const body = await req.json()
    const { hostingId } = body

    if (!hostingId) {
      return createErrorResponse('hostingId là bắt buộc', 400)
    }

    // 1. Lấy hosting record
    const hostingData = await db
      .select({
        hosting: hosting,
        package: hostingPackages,
        customer: customers,
      })
      .from(hosting)
      .leftJoin(hostingPackages, eq(hosting.hostingTypeId, hostingPackages.id))
      .leftJoin(customers, eq(hosting.customerId, customers.id))
      .where(eq(hosting.id, hostingId))
      .limit(1)

    if (hostingData.length === 0 || !hostingData[0].hosting) {
      return createErrorResponse('Không tìm thấy hosting', 404)
    }

    const hostingRecord = hostingData[0].hosting
    const packageData = hostingData[0].package
    const customerData = hostingData[0].customer

    if (!customerData) {
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
    }

    if (!packageData) {
      return createErrorResponse('Không tìm thấy thông tin gói hosting', 404)
    }

    // 2. Lấy control panel (Enhance)
    const controlPanel = await db.select()
      .from(controlPanels)
      .where(and(
        eq(controlPanels.enabled, 'YES'),
        eq(controlPanels.type, 'ENHANCE')
      ))
      .limit(1)

    if (controlPanel.length === 0) {
      return createErrorResponse('Không tìm thấy control panel Enhance được kích hoạt', 404)
    }

    const cpId = controlPanel[0].id

    // Parse config và đảm bảo có orgId
    let config: any = controlPanel[0].config
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (parseError) {
        console.error('[SyncSubscription] Error parsing config JSON:', parseError)
        config = {}
      }
    }

    // Thêm fallback cho orgId từ environment variables nếu chưa có
    if (!config.orgId && process.env.ENHANCE_ORG_ID) {
      config.orgId = process.env.ENHANCE_ORG_ID
    }

    if (!config.orgId) {
      return createErrorResponse('orgId là bắt buộc. Vui lòng cấu hình orgId trong Control Panels settings hoặc ENHANCE_ORG_ID environment variable.', 400)
    }

    // 3. Sync customer to Enhance nếu chưa có externalAccountId
    let customerExternalId: string | undefined
    if (!hostingRecord.externalAccountId) {
      const syncResult = await ControlPanelSyncService.syncCustomerToControlPanel(
        {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone || null,
          company: customerData.company || null,
        },
        cpId
      )

      if (!syncResult.success || !syncResult.externalAccountId) {
        return createErrorResponse(
          `Không thể sync customer lên Enhance: ${syncResult.error || 'Unknown error'}`,
          500
        )
      }

      customerExternalId = syncResult.externalAccountId
    } else {
      customerExternalId = hostingRecord.externalAccountId
    }

    // 4. Lấy plan mapping
    const planMapping = await db.select()
      .from(controlPanelPlans)
      .where(and(
        eq(controlPanelPlans.controlPanelId, cpId),
        eq(controlPanelPlans.localPlanType, 'HOSTING'),
        eq(controlPanelPlans.localPlanId, hostingRecord.hostingTypeId),
        eq(controlPanelPlans.isActive, 'YES')
      ))
      .limit(1)

    if (planMapping.length === 0) {
      return createErrorResponse(
        `Không tìm thấy plan mapping cho gói hosting ${packageData.planName}. Vui lòng tạo mapping trong Control Panels > Plans.`,
        404
      )
    }

    const enhancePlanId = planMapping[0].externalPlanId

    // 5. Tạo subscription trên Enhance
    const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
    const enhanceAdapter = controlPanelInstance as any

    // Sử dụng enhance client trực tiếp để tạo subscription
    const enhanceClient = (enhanceAdapter as any).client
    if (!enhanceClient) {
      return createErrorResponse('Không thể truy cập Enhance client', 500)
    }

    const subscriptionResult = await enhanceClient.createSubscription(
      customerExternalId,
      enhancePlanId
    )

    if (!subscriptionResult.success || !subscriptionResult.data) {
      return createErrorResponse(
        `Không thể tạo subscription trên Enhance: ${subscriptionResult.error || 'Unknown error'}`,
        500
      )
    }

    const subscriptionId = subscriptionResult.data.id

    // 6. Update hosting record với subscription info
    const currentMetadata = hostingRecord.syncMetadata ? JSON.parse(JSON.stringify(hostingRecord.syncMetadata)) : {}
    const updatedMetadata = {
      ...currentMetadata,
      subscriptionId: subscriptionId,
      subscriptionSyncedAt: new Date().toISOString(),
    }

    await db.update(hosting)
      .set({
        externalAccountId: customerExternalId,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
        syncMetadata: updatedMetadata,
      })
      .where(eq(hosting.id, hostingId))

    return createSuccessResponse(
      {
        hostingId: hostingId,
        subscriptionId: subscriptionId,
        customerExternalId: customerExternalId,
        planId: enhancePlanId,
      },
      'Tạo subscription trên Enhance thành công'
    )
  } catch (error: any) {
    console.error('Error syncing subscription:', error)
    return createErrorResponse(
      `Lỗi khi sync subscription: ${error.message || 'Unknown error'}`,
      500
    )
  }
}

