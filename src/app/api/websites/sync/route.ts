import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { websites, customers, domain, hosting, controlPanels, hostingPackages, controlPanelPlans } from '@/lib/schema'
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
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể sync website.', 403)
  }

  try {
    const body = await req.json()
    const { websiteId } = body

    if (!websiteId) {
      return createErrorResponse('websiteId là bắt buộc', 400)
    }

    // 1. Lấy website record với các thông tin liên quan
    const websiteData = await db
      .select({
        website: websites,
        customer: customers,
        domain: domain,
        hosting: hosting,
      })
      .from(websites)
      .leftJoin(customers, eq(websites.customerId, customers.id))
      .leftJoin(domain, eq(websites.domainId, domain.id))
      .leftJoin(hosting, eq(websites.hostingId, hosting.id))
      .where(eq(websites.id, websiteId))
      .limit(1)

    if (websiteData.length === 0 || !websiteData[0].website) {
      return createErrorResponse('Không tìm thấy website', 404)
    }

    const websiteRecord = websiteData[0].website
    const customerData = websiteData[0].customer
    const domainData = websiteData[0].domain
    const hostingData = websiteData[0].hosting

    if (!customerData) {
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
    }

    if (!domainData || !domainData.domainName) {
      return createErrorResponse('Website phải có tên miền để sync lên Control Panel', 400)
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
      return createErrorResponse('Không tìm thấy control panel được kích hoạt', 404)
    }

    const cpId = controlPanel[0].id

    // Parse config và đảm bảo có orgId
    let config: any = controlPanel[0].config
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (parseError) {
        console.error('[SyncWebsite] Error parsing config JSON:', parseError)
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

    // 3. Lấy externalAccountId từ customer (không còn ở hosting nữa)
    let customerExternalId: string | undefined = customerData.externalAccountId || undefined
    
    // Nếu customer chưa có externalAccountId, sync customer trước
    if (!customerExternalId) {
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
          `Không thể sync customer lên Control Panel: ${syncResult.error || 'Unknown error'}`,
          500
        )
      }

      customerExternalId = syncResult.externalAccountId
      
      // Lưu externalAccountId vào customer
      await db.update(customers)
        .set({
          externalAccountId: customerExternalId,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerData.id))
    }

    // 4. Kiểm tra xem website đã được sync chưa (có syncWebsiteId)
    let existingExternalWebsiteId: string | undefined = websiteRecord.syncWebsiteId || undefined
    
    // Fallback: Nếu chưa có syncWebsiteId, thử lấy từ notes (backward compatibility)
    if (!existingExternalWebsiteId && websiteRecord.notes) {
      const syncMatch = websiteRecord.notes.match(/External Website ID:\s*([a-f0-9-]+)/i)
      if (syncMatch && syncMatch[1]) {
        existingExternalWebsiteId = syncMatch[1]
        // Migrate từ notes sang syncWebsiteId
        await db.update(websites)
          .set({ syncWebsiteId: existingExternalWebsiteId })
          .where(eq(websites.id, websiteId))
      }
    }

    // 5. Tạo control panel instance
    const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
    const enhanceAdapter = controlPanelInstance as any

    // Sử dụng enhance client trực tiếp
    const enhanceClient = (enhanceAdapter as any).client
    if (!enhanceClient) {
      return createErrorResponse('Không thể truy cập Enhance client', 500)
    }

    // Helper function to sync website data from Enhance to database
    const syncWebsiteFromEnhance = async (enhanceWebsiteId: string, orgId: string) => {
      const websiteResult = await enhanceClient.getWebsite(enhanceWebsiteId, orgId)
      if (!websiteResult.success || !websiteResult.data) {
        return { success: false, error: websiteResult.error || 'Không thể lấy thông tin website từ Enhance' }
      }

      const enhanceData = websiteResult.data

      // Extract primary domain
      let primaryDomain = enhanceData.domain || enhanceData.primaryDomain || ''
      if (typeof primaryDomain !== 'string') {
        if (Array.isArray(primaryDomain) && primaryDomain.length > 0) {
          primaryDomain = primaryDomain[0].domain || primaryDomain[0].name || primaryDomain[0]
        } else if (primaryDomain.domain) {
          primaryDomain = primaryDomain.domain
        } else if (primaryDomain.name) {
          primaryDomain = primaryDomain.name
        } else {
          primaryDomain = String(primaryDomain)
        }
      }

      // Find or create domain record for primary domain
      let domainId: number | null = null
      if (primaryDomain) {
        let domainRecord = await db.select()
          .from(domain)
          .where(eq(domain.domainName, primaryDomain))
          .limit(1)

        if (domainRecord.length === 0) {
          // Create new domain record if not exists
          await db.insert(domain).values({
            domainName: primaryDomain,
            customerId: customerData.id,
            domainTypeId: 1, // Default domain type, adjust as needed
            status: 'ACTIVE',
          })
          // Get the inserted domain
          const newDomainRecord = await db.select()
            .from(domain)
            .where(eq(domain.domainName, primaryDomain))
            .limit(1)
          domainId = newDomainRecord[0].id
        } else {
          domainId = domainRecord[0].id
        }
      }

      // Extract subscription ID
      const subscriptionId = enhanceData.subscriptionId || enhanceData.subscription?.id

      // Extract status
      let status: 'LIVE' | 'DOWN' | 'MAINTENANCE' = 'LIVE'
      if (enhanceData.status) {
        const enhanceStatus = String(enhanceData.status).toUpperCase()
        if (enhanceStatus === 'DOWN' || enhanceStatus === 'MAINTENANCE') {
          status = enhanceStatus as 'LIVE' | 'DOWN' | 'MAINTENANCE'
        }
      }

      // Find hosting by subscriptionId if available
      let hostingId: number | null = null
      if (subscriptionId) {
        const hostingRecords = await db.select()
          .from(hosting)
          .where(eq(hosting.subscriptionId, subscriptionId))
          .limit(1)
        if (hostingRecords.length > 0) {
          hostingId = hostingRecords[0].id
        }
      }

      // Update website record
      await db.update(websites)
        .set({
          syncWebsiteId: enhanceWebsiteId,
          domainId: domainId || websiteRecord.domainId,
          hostingId: hostingId || websiteRecord.hostingId,
          status: status,
          updatedAt: new Date(),
        })
        .where(eq(websites.id, websiteId))

      return {
        success: true,
        data: {
          primaryDomain,
          subscriptionId,
          status,
          hostingId,
          domainId,
        },
      }
    }

    // 6. Nếu đã có syncWebsiteId, sync data từ Enhance
    if (existingExternalWebsiteId) {
      const syncResult = await syncWebsiteFromEnhance(existingExternalWebsiteId, customerExternalId)
      if (syncResult.success) {
        return createSuccessResponse(
          {
            websiteId: websiteId,
            externalWebsiteId: existingExternalWebsiteId,
            customerExternalId: customerExternalId,
            ...syncResult.data,
          },
          'Đã đồng bộ thông tin website từ Control Panel thành công'
        )
      } else {
        return createErrorResponse(
          `Không thể đồng bộ website từ Control Panel: ${syncResult.error || 'Unknown error'}`,
          500
        )
      }
    }

    // 7. Nếu chưa có syncWebsiteId, tìm website trên Control Panel bằng domain
    const listResult = await enhanceClient.listWebsites(customerExternalId)
    if (listResult.success && listResult.data) {
      const normalizedDomain = domainData.domainName.trim().toLowerCase()
      const existingWebsite = listResult.data.find((w: any) => {
        let websiteDomain = w.domain || w.primaryDomain || ''
        // Convert to string if it's not already
        if (typeof websiteDomain !== 'string') {
          if (Array.isArray(websiteDomain) && websiteDomain.length > 0) {
            websiteDomain = websiteDomain[0].domain || websiteDomain[0].name || websiteDomain[0]
          } else if (websiteDomain && typeof websiteDomain === 'object') {
            websiteDomain = websiteDomain.domain || websiteDomain.name || String(websiteDomain)
          } else {
            websiteDomain = String(websiteDomain)
          }
        }
        return String(websiteDomain).trim().toLowerCase() === normalizedDomain
      })

      if (existingWebsite && existingWebsite.id) {
        existingExternalWebsiteId = String(existingWebsite.id)
        // Sync data từ Enhance
        const syncResult = await syncWebsiteFromEnhance(existingExternalWebsiteId, customerExternalId)
        if (syncResult.success) {
          return createSuccessResponse(
            {
              websiteId: websiteId,
              externalWebsiteId: existingExternalWebsiteId,
              customerExternalId: customerExternalId,
              ...syncResult.data,
              alreadyExists: true,
            },
            `Website đã tồn tại trên Control Panel và đã được đồng bộ`
          )
        } else {
          return createErrorResponse(
            `Không thể đồng bộ website từ Control Panel: ${syncResult.error || 'Unknown error'}`,
            500
          )
        }
      }
    }

    // 8. Nếu không tìm thấy website trên Control Panel, trả về lỗi
    return createErrorResponse(
      'Không tìm thấy website trên Control Panel. Vui lòng tạo website trên Control Panel trước khi sync.',
      404
    )
  } catch (error: any) {
    console.error('Error syncing website:', error)
    return createErrorResponse(
      `Lỗi khi sync website: ${error.message || 'Unknown error'}`,
      500
    )
  }
}

