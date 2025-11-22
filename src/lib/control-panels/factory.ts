/**
 * Factory để tạo control panel instances
 */

import { IControlPanel } from './base/control-panel.interface'
import { ControlPanelType } from './base/types'
import { EnhanceAdapter } from './enhance/enhance-adapter'
import { EnhanceConfig } from './enhance/enhance-config'
import { db } from '@/lib/database'
import { controlPanels } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export class ControlPanelFactory {
  private static instances: Map<string, IControlPanel> = new Map()

  /**
   * Tạo control panel instance từ database config
   */
  static async createFromDb(controlPanelId: number): Promise<IControlPanel | null> {
    try {
      const cp = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.id, controlPanelId))
        .limit(1)

      if (!cp[0] || cp[0].enabled !== 'YES') {
        return null
      }

      // Parse config if it's a string
      let config: any = cp[0].config
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config)
        } catch (parseError) {
          console.error('[ControlPanelFactory] Error parsing config JSON:', parseError)
          config = {}
        }
      }

      // For Enhance, add fallback to environment variables if config is missing fields
      if (cp[0].type === 'ENHANCE') {
        if (!config.apiKey && process.env.ENHANCE_API_KEY) {
          config.apiKey = process.env.ENHANCE_API_KEY
        }
        if (!config.baseUrl && process.env.ENHANCE_BASE_URL) {
          config.baseUrl = process.env.ENHANCE_BASE_URL
        } else if (!config.baseUrl) {
          config.baseUrl = 'https://api.enhance.com'
        }
        if (!config.orgId && process.env.ENHANCE_ORG_ID) {
          config.orgId = process.env.ENHANCE_ORG_ID
        }
      }

      return this.create(cp[0].type as ControlPanelType, config)
    } catch (error) {
      console.error('[ControlPanelFactory] Error creating from DB:', error)
      return null
    }
  }

  /**
   * Tạo control panel instance từ type và config
   */
  static create(type: ControlPanelType, config: any): IControlPanel {
    const cacheKey = `${type}-${JSON.stringify(config)}`

    // Return cached instance nếu có
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!
    }

    let instance: IControlPanel

    switch (type) {
      case ControlPanelType.ENHANCE:
        instance = new EnhanceAdapter({
          apiKey: config.apiKey || config.token,
          baseUrl: config.baseUrl || config.url || 'https://api.enhance.com',
          orgId: config.orgId,
          timeout: config.timeout || 30000,
        } as EnhanceConfig)
        break

      case ControlPanelType.CPANEL:
        // TODO: Implement cPanel adapter
        throw new Error('cPanel adapter not yet implemented')

      case ControlPanelType.PLESK:
        // TODO: Implement Plesk adapter
        throw new Error('Plesk adapter not yet implemented')

      case ControlPanelType.DIRECTADMIN:
        // TODO: Implement DirectAdmin adapter
        throw new Error('DirectAdmin adapter not yet implemented')

      default:
        throw new Error(`Unknown control panel type: ${type}`)
    }

    this.instances.set(cacheKey, instance)
    return instance
  }

  /**
   * Lấy default control panel (Enhance được ưu tiên)
   */
  static async getDefault(): Promise<IControlPanel | null> {
    try {
      // Priority: Enhance > cPanel > Plesk > DirectAdmin
      // Lấy CP đầu tiên có enabled = YES, ưu tiên Enhance
      const enabledCp = await db.select()
        .from(controlPanels)
        .where(eq(controlPanels.enabled, 'YES'))
        .orderBy(controlPanels.type) // ENHANCE sẽ đứng đầu
        .limit(1)

      if (!enabledCp[0]) {
        return null
      }

      return this.createFromDb(enabledCp[0].id)
    } catch (error) {
      console.error('[ControlPanelFactory] Error getting default:', error)
      return null
    }
  }

  /**
   * Clear cache (useful for testing hoặc khi config thay đổi)
   */
  static clearCache(): void {
    this.instances.clear()
  }

  /**
   * Get cached instance count
   */
  static getCacheSize(): number {
    return this.instances.size
  }
}

