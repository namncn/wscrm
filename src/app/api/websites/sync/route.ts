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

    // 3. Sync customer to Control Panel nếu chưa có externalAccountId
    let customerExternalId: string | undefined
    if (!hostingData?.externalAccountId) {
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
    } else {
      customerExternalId = hostingData.externalAccountId
    }

    // 4. Kiểm tra xem website đã được sync chưa (có externalWebsiteId trong notes)
    let existingExternalWebsiteId: string | undefined
    if (websiteRecord.notes) {
      const syncMatch = websiteRecord.notes.match(/External Website ID:\s*([a-f0-9-]+)/i)
      if (syncMatch && syncMatch[1]) {
        existingExternalWebsiteId = syncMatch[1]
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

    // 6. Nếu đã có externalWebsiteId, kiểm tra xem website còn tồn tại trên Control Panel không
    if (existingExternalWebsiteId) {
      const checkResult = await enhanceClient.getWebsite(existingExternalWebsiteId, customerExternalId)
      if (checkResult.success && checkResult.data) {
        const existingWebsiteData = checkResult.data
        // Lấy domain hiện tại - có thể là string hoặc object/array
        let existingDomainValue = existingWebsiteData.domain || existingWebsiteData.primaryDomain
        // Nếu là object hoặc array, lấy giá trị đầu tiên hoặc thuộc tính name/domain
        if (existingDomainValue && typeof existingDomainValue !== 'string') {
          if (Array.isArray(existingDomainValue) && existingDomainValue.length > 0) {
            existingDomainValue = existingDomainValue[0].domain || existingDomainValue[0].name || existingDomainValue[0]
          } else if (existingDomainValue.domain) {
            existingDomainValue = existingDomainValue.domain
          } else if (existingDomainValue.name) {
            existingDomainValue = existingDomainValue.name
          } else {
            existingDomainValue = String(existingDomainValue)
          }
        }
        const existingDomain = (existingDomainValue || '').toString().trim().toLowerCase()
        const newDomain = domainData.domainName.trim().toLowerCase()

        // Kiểm tra xem domain có thay đổi không
        const domainChanged = existingDomain && existingDomain !== newDomain

        // Nếu có thay đổi domain, cần update
        if (domainChanged) {
          const updateParams: any = {}
          let updateSuccess = true
          let updateErrors: string[] = []
          
          // Update domain nếu có thay đổi
          // Thử add domain mới (Enhance có thể hỗ trợ multiple domains)
          const addDomainResult = await enhanceClient.addDomain(existingExternalWebsiteId, domainData.domainName, customerExternalId)
          
          if (!addDomainResult.success) {
            // Nếu add domain thất bại, thử update domain chính
            updateParams.domain = domainData.domainName
          }

          // Update website với các thay đổi
          if (Object.keys(updateParams).length > 0) {
            // Kiểm tra lại website có tồn tại không trước khi update
            const verifyResult = await enhanceClient.getWebsite(existingExternalWebsiteId, customerExternalId)
            
            if (!verifyResult.success || !verifyResult.data) {
              updateSuccess = false
              updateErrors.push(`Website không tồn tại trên Control Panel (${verifyResult.statusCode || 'Unknown'})`)
            } else {
              const updateResult = await enhanceClient.updateWebsite(existingExternalWebsiteId, updateParams, customerExternalId)

              if (!updateResult.success) {
                updateSuccess = false
                const errorMsg = updateResult.error || 'Không thể cập nhật website'
                const statusCode = updateResult.statusCode ? ` (HTTP ${updateResult.statusCode})` : ''
                updateErrors.push(`${errorMsg}${statusCode}`)
                
                // Log chi tiết để debug
                console.error('[Website Sync] Update website failed:', {
                  websiteId: existingExternalWebsiteId,
                  orgId: customerExternalId,
                  params: updateParams,
                  error: updateResult.error,
                  statusCode: updateResult.statusCode,
                })
              }
            }
          }

          // Cập nhật notes với thông tin mới
          const syncInfo = `[SYNC] External Website ID: ${existingExternalWebsiteId}, Customer External ID: ${customerExternalId}, Domain: ${domainData.domainName}, Updated at: ${new Date().toISOString()}`
          const updatedNotes = websiteRecord.notes 
            ? `${websiteRecord.notes}\n\n${syncInfo}`
            : syncInfo

          await db.update(websites)
            .set({
              notes: updatedNotes,
            })
            .where(eq(websites.id, websiteId))

          // Tạo response message
          const responseMessage = `Website đã tồn tại trên Control Panel. Domain đã được cập nhật từ "${existingDomain}" sang "${domainData.domainName}".`

          if (!updateSuccess) {
            return createSuccessResponse(
              {
                websiteId: websiteId,
                externalWebsiteId: existingExternalWebsiteId,
                customerExternalId: customerExternalId,
                domain: domainData.domainName,
                alreadyExists: true,
                updateWarning: updateErrors.join('; '),
              },
              responseMessage
            )
          }

          return createSuccessResponse(
            {
              websiteId: websiteId,
              externalWebsiteId: existingExternalWebsiteId,
              customerExternalId: customerExternalId,
              domain: domainData.domainName,
              alreadyExists: true,
              domainUpdated: true,
            },
            responseMessage
          )
        }

        // Domain không thay đổi, chỉ trả về thông tin
        return createSuccessResponse(
          {
            websiteId: websiteId,
            externalWebsiteId: existingExternalWebsiteId,
            customerExternalId: customerExternalId,
            domain: domainData.domainName,
            alreadyExists: true,
          },
          `Website đã tồn tại trên Control Panel với ID: ${existingExternalWebsiteId}`
        )
      }
      // Nếu không tìm thấy, có thể website đã bị xóa, tiếp tục tạo mới
    }

    // 7. Kiểm tra xem website đã tồn tại trên Control Panel chưa bằng cách list websites của customer
    const listResult = await enhanceClient.listWebsites(customerExternalId)
    if (listResult.success && listResult.data) {
      const normalizedDomain = domainData.domainName.trim().toLowerCase()
      const existingWebsite = listResult.data.find((w: any) => {
        const websiteDomain = (w.domain || w.primaryDomain || '').trim().toLowerCase()
        return websiteDomain === normalizedDomain
      })

      if (existingWebsite) {
        const foundWebsiteId = existingWebsite.id
        // Lưu externalWebsiteId vào notes
        const syncInfo = `[SYNC] External Website ID: ${foundWebsiteId}, Customer External ID: ${customerExternalId}, Synced at: ${new Date().toISOString()}`
        const updatedNotes = websiteRecord.notes 
          ? `${websiteRecord.notes}\n\n${syncInfo}`
          : syncInfo

        await db.update(websites)
          .set({
            notes: updatedNotes,
          })
          .where(eq(websites.id, websiteId))

        return createSuccessResponse(
          {
            websiteId: websiteId,
            externalWebsiteId: foundWebsiteId,
            customerExternalId: customerExternalId,
            domain: domainData.domainName,
            alreadyExists: true,
          },
          `Website đã tồn tại trên Control Panel với domain "${domainData.domainName}" và ID: ${foundWebsiteId}`
        )
      }
    }

    // 8. Lấy subscription ID từ hosting nếu có
    let subscriptionId: number | undefined
    if (hostingData && hostingData.syncMetadata) {
      try {
        const metadata = typeof hostingData.syncMetadata === 'string' 
          ? JSON.parse(hostingData.syncMetadata) 
          : hostingData.syncMetadata
        if (metadata.subscriptionId) {
          subscriptionId = typeof metadata.subscriptionId === 'string' 
            ? parseInt(metadata.subscriptionId, 10) 
            : metadata.subscriptionId
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // 9. Tạo website mới trên Control Panel
    const websiteResult = await enhanceClient.createWebsite({
      customerId: customerExternalId,
      domain: domainData.domainName,
      subscriptionId: subscriptionId,
    })

    if (!websiteResult.success || !websiteResult.data) {
      // Kiểm tra xem có phải lỗi do website đã tồn tại không
      if (websiteResult.statusCode === 409 || websiteResult.error?.toLowerCase().includes('already exists') || websiteResult.error?.toLowerCase().includes('duplicate')) {
        // Thử list lại để tìm website
        const retryListResult = await enhanceClient.listWebsites(customerExternalId)
        if (retryListResult.success && retryListResult.data) {
          const normalizedDomain = domainData.domainName.trim().toLowerCase()
          const existingWebsite = retryListResult.data.find((w: any) => {
            const websiteDomain = (w.domain || w.primaryDomain || '').trim().toLowerCase()
            return websiteDomain === normalizedDomain
          })

          if (existingWebsite) {
            const foundWebsiteId = existingWebsite.id
            const syncInfo = `[SYNC] External Website ID: ${foundWebsiteId}, Customer External ID: ${customerExternalId}, Synced at: ${new Date().toISOString()}`
            const updatedNotes = websiteRecord.notes 
              ? `${websiteRecord.notes}\n\n${syncInfo}`
              : syncInfo

            await db.update(websites)
              .set({
                notes: updatedNotes,
              })
              .where(eq(websites.id, websiteId))

            return createSuccessResponse(
              {
                websiteId: websiteId,
                externalWebsiteId: foundWebsiteId,
                customerExternalId: customerExternalId,
                domain: domainData.domainName,
                alreadyExists: true,
              },
              `Website đã tồn tại trên Control Panel với domain "${domainData.domainName}" và ID: ${foundWebsiteId}`
            )
          }
        }
      }

      return createErrorResponse(
        `Không thể tạo website trên Control Panel: ${websiteResult.error || 'Unknown error'}`,
        500
      )
    }

    const externalWebsiteId = websiteResult.data.id

    // 6. Update website record với sync info (lưu vào notes nếu có)
    const syncInfo = `[SYNC] External Website ID: ${externalWebsiteId}, Customer External ID: ${customerExternalId}, Synced at: ${new Date().toISOString()}`
    const updatedNotes = websiteRecord.notes 
      ? `${websiteRecord.notes}\n\n${syncInfo}`
      : syncInfo

    await db.update(websites)
      .set({
        notes: updatedNotes,
      })
      .where(eq(websites.id, websiteId))

    return createSuccessResponse(
      {
        websiteId: websiteId,
        externalWebsiteId: externalWebsiteId,
        customerExternalId: customerExternalId,
        domain: domainData.domainName,
      },
      'Tạo website trên Control Panel thành công'
    )
  } catch (error: any) {
    console.error('Error syncing website:', error)
    return createErrorResponse(
      `Lỗi khi sync website: ${error.message || 'Unknown error'}`,
      500
    )
  }
}

