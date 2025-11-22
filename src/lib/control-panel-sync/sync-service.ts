/**
 * Control Panel Sync Service
 * Handles syncing hosting accounts với control panels
 */

import { ControlPanelFactory } from '../control-panels/factory'
import { db } from '@/lib/database'
import {
  hosting,
  controlPanels,
  controlPanelPlans,
  customers,
  hostingPackages,
} from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface SyncResult {
  success: boolean
  error?: string
  externalAccountId?: string
  externalWebsiteId?: string
}

export class ControlPanelSyncService {
  /**
   * Sync hosting với control panel khi order completed
   */
  static async syncHostingToControlPanel(
    hostingId: number,
    controlPanelId?: number
  ): Promise<SyncResult> {
    try {
      console.log(`[ControlPanelSync] Starting sync for hosting ID: ${hostingId}`)

      // 1. Lấy hosting info từ DB
      const hostingData = await db.select()
        .from(hosting)
        .where(eq(hosting.id, hostingId))
        .limit(1)

      if (!hostingData[0]) {
        return { success: false, error: 'Hosting not found' }
      }

      const hostingRecord = hostingData[0]

      // 2. Kiểm tra nếu đã sync thành công rồi
      if (hostingRecord.syncStatus === 'SYNCED' && hostingRecord.externalWebsiteId) {
        console.log(`[ControlPanelSync] Hosting ${hostingId} already synced`)
        return {
          success: true,
          externalAccountId: hostingRecord.externalAccountId || undefined,
          externalWebsiteId: hostingRecord.externalWebsiteId || undefined,
        }
      }

      // 3. Update sync status to SYNCING
      await db.update(hosting)
        .set({
          syncStatus: 'SYNCING',
          lastSyncedAt: new Date(),
        })
        .where(eq(hosting.id, hostingId))

      // 4. Lấy control panel (default hoặc specified)
      let cpId = controlPanelId || hostingRecord.controlPanelId
      if (!cpId) {
        const defaultCp = await ControlPanelFactory.getDefault()
        if (!defaultCp) {
          await db.update(hosting)
            .set({
              syncStatus: 'FAILED',
              syncError: 'No control panel configured',
              lastSyncedAt: new Date(),
            })
            .where(eq(hosting.id, hostingId))
          return { success: false, error: 'No control panel configured' }
        }
        // Get default CP ID from DB (Enhance được ưu tiên)
        const defaultCpRecord = await db.select()
          .from(controlPanels)
          .where(eq(controlPanels.enabled, 'YES'))
          .orderBy(controlPanels.type) // ENHANCE sẽ đứng đầu
          .limit(1)
        if (defaultCpRecord[0]) {
          cpId = defaultCpRecord[0].id
        }
      }

      if (!cpId) {
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: 'Control panel ID not found',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))
        return { success: false, error: 'Control panel ID not found' }
      }

      const controlPanel = await ControlPanelFactory.createFromDb(cpId)
      if (!controlPanel) {
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: 'Control panel not found or inactive',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))
        return { success: false, error: 'Control panel not found or inactive' }
      }

      // 5. Lấy customer info
      const customer = await db.select()
        .from(customers)
        .where(eq(customers.id, hostingRecord.customerId))
        .limit(1)

      if (!customer[0]) {
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: 'Customer not found',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))
        return { success: false, error: 'Customer not found' }
      }

      // 6. Lấy hosting package để map plan
      const hostingPackage = await db.select()
        .from(hostingPackages)
        .where(eq(hostingPackages.id, hostingRecord.hostingTypeId))
        .limit(1)

      if (!hostingPackage[0]) {
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: 'Hosting package not found',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))
        return { success: false, error: 'Hosting package not found' }
      }

      // 7. Map plan từ local → control panel
      const planMapping = await this.getPlanMapping(
        cpId,
        'HOSTING',
        hostingRecord.hostingTypeId
      )

      if (!planMapping) {
        console.warn(`[ControlPanelSync] Plan mapping not found for hosting package ${hostingRecord.hostingTypeId}`)
        // Có thể tiếp tục mà không có plan mapping, tùy vào control panel
      }

      // 8. Tạo hosting trên control panel
      const result = await controlPanel.createHosting({
        customerId: customer[0].id.toString(), // Tạm thời dùng local ID
        planId: planMapping?.externalPlanId || '',
        email: customer[0].email,
        // domain có thể lấy từ hosting record hoặc từ order item
      })

      if (!result.success || !result.data) {
        // Update sync status to FAILED
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: result.error || 'Failed to create hosting on control panel',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))

        return { success: false, error: result.error }
      }

      const hostingAccount = result.data

      // 9. Update hosting record với sync info
      await db.update(hosting)
        .set({
          controlPanelId: cpId,
          externalAccountId: hostingAccount.customerId,
          externalWebsiteId: hostingAccount.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncMetadata: hostingAccount.metadata || {},
        })
        .where(eq(hosting.id, hostingId))

      console.log(`[ControlPanelSync] Successfully synced hosting ${hostingId} to control panel`)

      return {
        success: true,
        externalAccountId: hostingAccount.customerId,
        externalWebsiteId: hostingAccount.id,
      }
    } catch (error: any) {
      console.error(`[ControlPanelSync] Error syncing hosting ${hostingId}:`, error)

      // Update sync status to FAILED
      try {
        await db.update(hosting)
          .set({
            syncStatus: 'FAILED',
            syncError: error.message || 'Unknown error',
            lastSyncedAt: new Date(),
          })
          .where(eq(hosting.id, hostingId))
      } catch (updateError) {
        console.error('[ControlPanelSync] Failed to update sync status:', updateError)
      }

      return { success: false, error: error.message || 'Unknown error' }
    }
  }

  /**
   * Get plan mapping từ local plan sang control panel plan
   */
  private static async getPlanMapping(
    controlPanelId: number,
    planType: 'HOSTING' | 'VPS',
    localPlanId: number
  ): Promise<{ externalPlanId: string; externalPlanName?: string } | null> {
    try {
      const mapping = await db.select()
        .from(controlPanelPlans)
        .where(
          and(
            eq(controlPanelPlans.controlPanelId, controlPanelId),
            eq(controlPanelPlans.localPlanType, planType),
            eq(controlPanelPlans.localPlanId, localPlanId),
            eq(controlPanelPlans.isActive, 'YES')
          )
        )
        .limit(1)

      if (!mapping[0]) {
        return null
      }

      return {
        externalPlanId: mapping[0].externalPlanId,
        externalPlanName: mapping[0].externalPlanName || undefined,
      }
    } catch (error) {
      console.error('[ControlPanelSync] Error getting plan mapping:', error)
      return null
    }
  }

  /**
   * Retry sync cho các hosting đã fail
   */
  static async retryFailedSyncs(limit: number = 10): Promise<number> {
    try {
      const failedHostings = await db.select()
        .from(hosting)
        .where(eq(hosting.syncStatus, 'FAILED'))
        .limit(limit)

      let successCount = 0
      for (const hostingRecord of failedHostings) {
        const result = await this.syncHostingToControlPanel(hostingRecord.id)
        if (result.success) {
          successCount++
        }
      }

      return successCount
    } catch (error) {
      console.error('[ControlPanelSync] Error retrying failed syncs:', error)
      return 0
    }
  }

  /**
   * Sync customer to control panel (find or create, update if needed)
   * Tương tự như logic trong /api/customers/sync nhưng được tách ra để tái sử dụng
   * @param customer - Customer object với name, email, phone, company
   * @param controlPanelId - Optional: ID của control panel, nếu không có sẽ dùng default
   * @returns Object với success, action ('created' | 'updated' | 'no_change'), error, và externalAccountId
   */
  static async syncCustomerToControlPanel(
    customer: {
      name: string
      email: string
      phone?: string | null
      company?: string | null
    },
    controlPanelId?: number
  ): Promise<{
    success: boolean
    action?: 'created' | 'updated' | 'no_change'
    error?: string
    externalAccountId?: string
  }> {
    try {
      if (!customer.email || !customer.email.trim()) {
        return {
          success: false,
          error: 'Customer email is required',
        }
      }

      // Get control panel (default or specified)
      let cpId = controlPanelId
      if (!cpId) {
        // Get default enabled control panel (prioritize Enhance)
        const defaultCp = await db.select()
          .from(controlPanels)
          .where(eq(controlPanels.enabled, 'YES'))
          .orderBy(controlPanels.type) // ENHANCE will be first
          .limit(1)

        if (defaultCp.length === 0) {
          return {
            success: false,
            error: 'No control panel configured',
          }
        }

        cpId = defaultCp[0].id
      }

      if (!cpId) {
        return {
          success: false,
          error: 'Control panel ID not found',
        }
      }

      // Get control panel instance
      const controlPanel = await ControlPanelFactory.createFromDb(cpId)
      if (!controlPanel) {
        return {
          success: false,
          error: 'Control panel not found or inactive',
        }
      }

      // Step 1: Tìm customer theo email
      const findResult = await controlPanel.findCustomerByEmail(customer.email)

      if (!findResult.success) {
        return {
          success: false,
          error: findResult.error || 'Không thể tìm customer trên control panel',
        }
      }

      // Step 2: Nếu tìm thấy customer → kiểm tra khác biệt và cập nhật nếu cần, nếu không → tạo mới
      if (findResult.data) {
        // Customer đã tồn tại → so sánh xem có khác biệt không
        const existingCustomer = findResult.data

        // So sánh các field có thể update
        // Note: According to Enhance API spec, PATCH /orgs/{org_id} only supports:
        // name, status, isSuspended, locale, slackNotificationWebhookUrl
        // email, phone, company cannot be updated via this endpoint
        const nameChanged = existingCustomer.name?.trim() !== customer.name?.trim()

        // Nếu không có khác biệt, không cần update
        if (!nameChanged) {
          return {
            success: true,
            action: 'no_change',
            externalAccountId: existingCustomer.id,
          }
        }

        // Có khác biệt → cập nhật thông tin
        try {
          const updateResult = await controlPanel.updateCustomer(existingCustomer.id, {
            name: customer.name,
            // Note: phone and company are not supported by OrgUpdate schema
            // They would need to be updated via login/member endpoints if needed
          })

          if (updateResult.success && updateResult.data) {
            return {
              success: true,
              action: 'updated',
              externalAccountId: updateResult.data.id,
            }
          } else {
            return {
              success: false,
              error: updateResult.error || 'Không thể cập nhật customer',
            }
          }
        } catch (updateError: any) {
          console.error('[ControlPanelSync] Update failed:', updateError)
          return {
            success: false,
            error: `Không thể cập nhật customer: ${updateError.message || 'Unknown error'}`,
          }
        }
      } else {
        // Customer chưa tồn tại → tạo mới
        const createResult = await controlPanel.findOrCreateCustomer({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || undefined,
          company: customer.company || undefined,
        })

        if (createResult.success && createResult.data) {
          return {
            success: true,
            action: 'created',
            externalAccountId: createResult.data.id,
          }
        } else {
          return {
            success: false,
            error: createResult.error || 'Không thể tạo customer mới',
          }
        }
      }
    } catch (error: any) {
      console.error('[ControlPanelSync] Error syncing customer to control panel:', error)
      return {
        success: false,
        error: error.message || 'Unknown error',
      }
    }
  }

  /**
   * Delete customer from control panel
   * Tìm customer trên control panel bằng email và xóa nếu tìm thấy
   * @param customerEmail - Email của customer cần xóa
   * @param controlPanelId - Optional: ID của control panel, nếu không có sẽ dùng default
   * @returns Object với success, error (nếu có), và externalCustomerId (nếu tìm thấy)
   */
  static async deleteCustomerFromControlPanel(
    customerEmail: string,
    controlPanelId?: number
  ): Promise<{
    success: boolean
    error?: string
    externalCustomerId?: string
  }> {
    try {
      if (!customerEmail || !customerEmail.trim()) {
        return {
          success: false,
          error: 'Customer email is required',
        }
      }

      // Get control panel (default or specified)
      let cpId = controlPanelId
      if (!cpId) {
        // Get default enabled control panel (prioritize Enhance)
        const defaultCp = await db.select()
          .from(controlPanels)
          .where(eq(controlPanels.enabled, 'YES'))
          .orderBy(controlPanels.type) // ENHANCE will be first
          .limit(1)

        if (defaultCp.length === 0) {
          return {
            success: false,
            error: 'No control panel configured',
          }
        }

        cpId = defaultCp[0].id
      }

      if (!cpId) {
        return {
          success: false,
          error: 'Control panel ID not found',
        }
      }

      // Get control panel instance
      const controlPanel = await ControlPanelFactory.createFromDb(cpId)
      if (!controlPanel) {
        return {
          success: false,
          error: 'Control panel not found or inactive',
        }
      }

      // Find customer on control panel by email
      const findResult = await controlPanel.findCustomerByEmail(customerEmail)

      if (!findResult.success) {
        // Customer not found on control panel - that's okay, return success
        return {
          success: true,
        }
      }

      if (!findResult.data) {
        // Customer not found on control panel - that's okay, return success
        return {
          success: true,
        }
      }

      // Customer exists on control panel, delete it
      const deleteResult = await controlPanel.deleteCustomer(findResult.data.id)

      if (!deleteResult.success) {
        return {
          success: false,
          error: deleteResult.error || 'Failed to delete customer from control panel',
          externalCustomerId: findResult.data.id,
        }
      }

      return {
        success: true,
        externalCustomerId: findResult.data.id,
      }
    } catch (error: any) {
      console.error('[ControlPanelSync] Error deleting customer from control panel:', error)
      return {
        success: false,
        error: error.message || 'Unknown error',
      }
    }
  }
}

