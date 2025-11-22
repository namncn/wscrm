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

    const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
    const enhanceAdapter = controlPanelInstance as any

    // Sử dụng enhance client trực tiếp để tạo hoặc cập nhật subscription
    const enhanceClient = (enhanceAdapter as any).client
    if (!enhanceClient) {
      return createErrorResponse('Không thể truy cập Enhance client', 500)
    }

    // 5. Kiểm tra xem hosting đã có subscription ID trong syncMetadata chưa
    let existingSubscriptionId: number | undefined
    if (hostingRecord.syncMetadata) {
      try {
        const metadata = typeof hostingRecord.syncMetadata === 'string' 
          ? JSON.parse(hostingRecord.syncMetadata) 
          : hostingRecord.syncMetadata
        const subscriptionIdValue = metadata.subscriptionId || metadata.externalSubscriptionId
        if (subscriptionIdValue) {
          existingSubscriptionId = typeof subscriptionIdValue === 'string' 
            ? parseInt(subscriptionIdValue, 10) 
            : subscriptionIdValue
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // 6. Nếu không có subscription ID trong syncMetadata, tạo subscription mới
    // Không tìm subscription đã có để gán vào - mỗi hosting cần subscription riêng
    if (!existingSubscriptionId) {
      console.log(`[SyncSubscription] Hosting ${hostingId} chưa có subscription ID trong syncMetadata, sẽ tạo subscription mới trên Enhance...`)
    } else {
      console.log(`[SyncSubscription] Hosting ${hostingId} đã có subscription ID ${existingSubscriptionId} trong syncMetadata`)
    }

    let subscriptionId: number
    let action: 'created' | 'updated' | 'recreated' | 'upgrade' | 'downgrade' = 'created'
    let oldPlanId: number | undefined
    let oldPlanName: string | undefined

    if (existingSubscriptionId) {
      // Nếu đã có subscription ID, kiểm tra subscription có tồn tại và planId có thay đổi không
      console.log(`[SyncSubscription] Hosting ${hostingId} đã có subscription ${existingSubscriptionId}, đang kiểm tra...`)
      
      // Thay vì dùng getSubscription (có thể trả về 404), dùng listSubscriptions để tìm subscription
      const listResult = await enhanceClient.listSubscriptions(customerExternalId)
      
      if (!listResult.success) {
        return createErrorResponse(
          `Không thể kiểm tra subscriptions trên Enhance: ${listResult.error || 'Unknown error'}`,
          500
        )
      }

      // Tìm subscription với ID tương ứng
      // Log để debug subscription structure
      console.log(`[SyncSubscription] Danh sách subscriptions:`, listResult.data?.map((sub: any) => ({
        id: sub.id,
        subscriptionId: sub.subscriptionId,
        planId: sub.planId || sub.plan_id,
        allKeys: Object.keys(sub),
      })))
      
      const foundSubscription = listResult.data?.find((sub: any) => {
        const subId = sub.id || sub.subscriptionId
        const match = subId === existingSubscriptionId
        if (!match) {
          console.log(`[SyncSubscription] Subscription ${subId} không khớp với ${existingSubscriptionId}`)
        }
        return match
      })

      if (!foundSubscription) {
        // Subscription không tồn tại trong danh sách, có thể đã bị xóa
        console.log(`[SyncSubscription] Subscription ${existingSubscriptionId} không tìm thấy trong danh sách subscriptions, đang tạo mới...`)
        const createResult = await enhanceClient.createSubscription(
          customerExternalId,
          enhancePlanId
        )

        if (!createResult.success || !createResult.data) {
          return createErrorResponse(
            `Subscription cũ không tồn tại và không thể tạo mới: ${createResult.error || 'Unknown error'}`,
            500
          )
        }

        subscriptionId = createResult.data.id
        action = 'recreated'
      } else {
        // Subscription tồn tại, kiểm tra planId có thay đổi không
        const currentPlanId = foundSubscription.planId || foundSubscription.plan_id
        const newPlanIdInt = typeof enhancePlanId === 'string' ? parseInt(enhancePlanId, 10) : enhancePlanId
        
        // Lưu thông tin plan cũ
        oldPlanId = currentPlanId
        oldPlanName = foundSubscription.planName || foundSubscription.friendlyName || `Plan ${currentPlanId}`
        
        console.log(`[SyncSubscription] Tìm thấy subscription ${existingSubscriptionId} với planId ${currentPlanId} (${oldPlanName}), planId mới: ${newPlanIdInt} (${packageData.planName})`)
        
        if (currentPlanId === newPlanIdInt) {
          // PlanId không thay đổi, không cần cập nhật
          console.log(`[SyncSubscription] Subscription ${existingSubscriptionId} đã tồn tại với planId ${currentPlanId}, không cần cập nhật`)
          subscriptionId = existingSubscriptionId
          action = 'updated' // Dùng 'updated' nhưng thực tế không cập nhật
        } else {
          // PlanId đã thay đổi, cần cập nhật
          // Xác định upgrade hay downgrade
          const isUpgrade = newPlanIdInt > currentPlanId
          const actionType = isUpgrade ? 'upgrade' : 'downgrade'
          console.log(`[SyncSubscription] Subscription ${existingSubscriptionId} có planId ${currentPlanId}, đang ${actionType} sang ${newPlanIdInt}...`)
          
          // Thử update subscription
          // Note: customerExternalId được truyền vào nhưng không dùng trong endpoint
          // Endpoint đúng là /orgs/{org_id}/subscriptions/{subscription_id} với orgId từ config
          const updateResult = await enhanceClient.updateSubscription(
            customerExternalId,
            existingSubscriptionId,
            enhancePlanId
          )

          if (!updateResult.success) {
            console.error(`[SyncSubscription] Lỗi khi cập nhật subscription:`, {
              subscriptionId: existingSubscriptionId,
              customerId: customerExternalId,
              planId: enhancePlanId,
              error: updateResult.error,
              statusCode: updateResult.statusCode,
              foundSubscription: foundSubscription, // Log subscription object để debug
            })
            return createErrorResponse(
              `Không thể cập nhật subscription trên Enhance: ${updateResult.error || 'Unknown error'}${updateResult.statusCode ? ` (HTTP ${updateResult.statusCode})` : ''}. Vui lòng kiểm tra lại Enhance API documentation hoặc liên hệ support.`,
              updateResult.statusCode || 500
            )
          }

          // Update thành công
          // API trả về void (empty response body), nên dùng existingSubscriptionId
          subscriptionId = existingSubscriptionId
          action = actionType as 'created' | 'updated' | 'recreated' | 'upgrade' | 'downgrade'
          console.log(`[SyncSubscription] ✓ Đã ${actionType} subscription ${subscriptionId} thành công từ planId ${currentPlanId} sang ${newPlanIdInt}`)
        }
      }
    } else {
      // Nếu chưa có subscription ID, tạo mới
      console.log(`[SyncSubscription] Hosting ${hostingId} chưa có subscription, đang tạo mới...`)
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

      subscriptionId = subscriptionResult.data.id
    }

    // 6. Update hosting record với subscription info
    let currentMetadata: any = {}
    try {
      if (hostingRecord.syncMetadata) {
        if (typeof hostingRecord.syncMetadata === 'string') {
          currentMetadata = JSON.parse(hostingRecord.syncMetadata)
        } else {
          currentMetadata = hostingRecord.syncMetadata
        }
      }
    } catch (e) {
      console.error('[SyncSubscription] Error parsing syncMetadata:', e)
      currentMetadata = {}
    }

    const updatedMetadata = {
      ...currentMetadata,
      subscriptionId: subscriptionId,
      externalSubscriptionId: subscriptionId,
      subscriptionSyncedAt: new Date().toISOString(),
    }

    try {
      await db.update(hosting)
        .set({
          externalAccountId: customerExternalId,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncMetadata: updatedMetadata,
        })
        .where(eq(hosting.id, hostingId))
    } catch (dbError: any) {
      console.error('[SyncSubscription] Error updating hosting record:', dbError)
      // Nếu lỗi database nhưng subscription đã được tạo/cập nhật trên Enhance, vẫn trả về success
      // nhưng có warning
      if (dbError.code === 'ECONNRESET' || dbError.code === 'ETIMEDOUT') {
        console.warn('[SyncSubscription] Database connection error, but subscription was synced to Enhance')
        // Vẫn trả về success vì subscription đã được sync trên Enhance
      } else {
        throw dbError
      }
    }

    let message: string
    if (action === 'created') {
      message = `Tạo subscription trên Control Panel thành công cho gói "${packageData.planName}"`
    } else if (action === 'upgrade') {
      message = `Nâng cấp subscription thành công từ "${oldPlanName || `Plan ${oldPlanId}`}" lên "${packageData.planName}"`
    } else if (action === 'downgrade') {
      message = `Hạ cấp subscription thành công từ "${oldPlanName || `Plan ${oldPlanId}`}" xuống "${packageData.planName}"`
    } else if (action === 'updated') {
      // Kiểm tra xem có thực sự cập nhật không (planId có thay đổi)
      if (existingSubscriptionId && subscriptionId === existingSubscriptionId) {
        // Không cập nhật vì planId giống nhau
        message = `Subscription đã tồn tại trên Control Panel (ID: ${subscriptionId}) với gói "${packageData.planName}" và không cần cập nhật`
      } else {
        message = `Cập nhật subscription trên Control Panel thành công cho gói "${packageData.planName}"`
      }
    } else {
      // recreated
      message = `Subscription cũ không tồn tại trên Control Panel, đã tạo subscription mới (ID: ${subscriptionId}) cho gói "${packageData.planName}"`
    }

    return createSuccessResponse(
      {
        hostingId: hostingId,
        subscriptionId: subscriptionId,
        customerExternalId: customerExternalId,
        planId: enhancePlanId,
        action: action,
      },
      message
    )
  } catch (error: any) {
    console.error('Error syncing subscription:', error)
    return createErrorResponse(
      `Lỗi khi sync subscription: ${error.message || 'Unknown error'}`,
      500
    )
  }
}

