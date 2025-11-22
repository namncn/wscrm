/**
 * Abstract base class cho tất cả control panels
 * Cung cấp common functionality và logging
 */

import { IControlPanel } from './control-panel.interface'
import { ControlPanelResponse, ControlPanelType } from './types'

export abstract class BaseControlPanel implements IControlPanel {
  protected config: any
  protected logger: {
    info: (msg: string, ...args: any[]) => void
    error: (msg: string, ...args: any[]) => void
    warn: (msg: string, ...args: any[]) => void
  }

  constructor(config: any) {
    this.config = config
    this.logger = {
      info: (msg: string, ...args: any[]) => console.log(`[${this.getName()}]`, msg, ...args),
      error: (msg: string, ...args: any[]) => console.error(`[${this.getName()}]`, msg, ...args),
      warn: (msg: string, ...args: any[]) => console.warn(`[${this.getName()}]`, msg, ...args),
    }
  }

  abstract getName(): string
  abstract getType(): ControlPanelType

  // Abstract methods - mỗi CP phải implement
  abstract findCustomerByEmail(email: string): Promise<ControlPanelResponse<any>>
  abstract findOrCreateCustomer(params: any): Promise<ControlPanelResponse<any>>
  abstract getCustomer(customerId: string): Promise<ControlPanelResponse<any>>
  abstract updateCustomer(customerId: string, params: any): Promise<ControlPanelResponse<any>>
  abstract deleteCustomer(customerId: string): Promise<ControlPanelResponse<void>>
  abstract getPlans(): Promise<ControlPanelResponse<any[]>>
  abstract getPlan(planId: string): Promise<ControlPanelResponse<any>>
  abstract createHosting(params: any): Promise<ControlPanelResponse<any>>
  abstract getHosting(hostingId: string): Promise<ControlPanelResponse<any>>
  abstract updateHosting(hostingId: string, params: any): Promise<ControlPanelResponse<any>>
  abstract suspendHosting(hostingId: string): Promise<ControlPanelResponse<void>>
  abstract unsuspendHosting(hostingId: string): Promise<ControlPanelResponse<void>>
  abstract deleteHosting(hostingId: string): Promise<ControlPanelResponse<void>>
  abstract addDomain(hostingId: string, domain: string): Promise<ControlPanelResponse<void>>
  abstract removeDomain(hostingId: string, domain: string): Promise<ControlPanelResponse<void>>
  abstract healthCheck(): Promise<ControlPanelResponse<any>>

  // Common helper methods
  protected createErrorResponse(error: string, statusCode?: number): ControlPanelResponse<any> {
    return {
      success: false,
      error,
      statusCode,
    }
  }

  protected createSuccessResponse<T>(data: T, statusCode?: number): ControlPanelResponse<T> {
    return {
      success: true,
      data,
      statusCode,
    }
  }

  protected async handleRequest<T>(
    requestFn: () => Promise<T>,
    errorMessage: string = 'Request failed'
  ): Promise<ControlPanelResponse<T>> {
    try {
      const data = await requestFn()
      return this.createSuccessResponse(data)
    } catch (error: any) {
      this.logger.error(errorMessage, error)
      return this.createErrorResponse(error.message || errorMessage)
    }
  }
}

