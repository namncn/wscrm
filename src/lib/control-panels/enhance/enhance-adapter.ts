/**
 * Enhance Control Panel Adapter
 * Implements IControlPanel interface for Enhance
 */

import { BaseControlPanel } from '../base/control-panel.base'
import { IControlPanel } from '../base/control-panel.interface'
import {
  ControlPanelType,
  ControlPanelResponse,
  CreateCustomerParams,
  UpdateCustomerParams,
  CustomerAccount,
  Plan,
  CreateHostingParams,
  UpdateHostingParams,
  HostingAccount,
  HealthStatus,
} from '../base/types'
import { EnhanceClient } from './enhance-client'
import { EnhanceConfig } from './enhance-config'

export class EnhanceAdapter extends BaseControlPanel implements IControlPanel {
  private client: EnhanceClient

  constructor(config: EnhanceConfig) {
    super(config)
    this.client = new EnhanceClient(config)
  }

  getName(): string {
    return 'Enhance Control Panel'
  }

  getType(): ControlPanelType {
    return ControlPanelType.ENHANCE
  }

  async findCustomerByEmail(email: string): Promise<ControlPanelResponse<CustomerAccount | null>> {
    try {
      if (!email || !email.trim()) {
        return this.createErrorResponse('Email is required')
      }

      const searchResult = await this.client.findCustomerByEmail(email)
      
      if (searchResult.success && searchResult.data) {
        const customerData = this.parseCustomerResponse(searchResult.data)
        
        if (customerData) {
          // Verify that the returned customer's email actually matches
          const normalizedInputEmail = email.trim().toLowerCase()
          const normalizedCustomerEmail = customerData.email?.trim().toLowerCase()
          
          if (normalizedCustomerEmail && normalizedCustomerEmail !== normalizedInputEmail) {
            this.logger.warn(`Email mismatch: requested ${email}, but got customer with email ${customerData.email}`)
            return this.createSuccessResponse(null)
          }
          
          // Nếu customerData.email là null/undefined nhưng đã tìm thấy trong API, vẫn trả về
          // vì có thể email được lưu ở field khác
          return this.createSuccessResponse(customerData)
        }
      }
      return this.createSuccessResponse(null)
    } catch (error: any) {
      this.logger.error('Error in findCustomerByEmail:', error)
      return this.createErrorResponse(error.message)
    }
  }

  async findOrCreateCustomer(params: CreateCustomerParams): Promise<ControlPanelResponse<CustomerAccount>> {
    try {
      // Tìm customer theo email
      const findResult = await this.findCustomerByEmail(params.email)
      if (findResult.success && findResult.data) {
        // Customer đã tồn tại
        return this.createSuccessResponse(findResult.data)
      }

      // Tạo customer mới (organization)
      const createResult = await this.client.createCustomer({
        name: params.name,
        email: params.email,
        phone: params.phone,
        company: params.company,
      })

      if (createResult.success && createResult.data) {
        const customerOrgId = createResult.data.id
        
        // Nếu có email, tạo login cho customer để set email và tên cá nhân
        if (params.email) {
          try {
            // Generate a random password if API requires it
            // Enhance API may require password, so we generate one
            const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!'
            
            const loginResult = await this.client.createLoginForCustomer(customerOrgId, {
              email: params.email,
              name: params.name,
              password: randomPassword, // Generate password for API requirement
            })
            
            if (loginResult.success && loginResult.data?.id) {
              // Logic trong createLoginForCustomer đã:
              // 1. Tạo login trong customer org context: POST /orgs/{customer_org_id}/logins
              // 2. Tạo member với OWNER role: POST /orgs/{customer_org_id}/members với { loginId, roles: ["Owner"] }
              // Đợi một chút để đảm bảo owner được set hoàn toàn
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else {
              this.logger.error('Failed to create login for customer:', {
                customerOrgId,
                error: loginResult.error,
                statusCode: loginResult.statusCode,
              })
              // Tiếp tục dù không tạo được login - organization đã được tạo
            }
          } catch (loginError: any) {
            this.logger.error('Error creating login for customer:', {
              customerOrgId,
              error: loginError.message,
            })
            // Tiếp tục dù không tạo được login - organization đã được tạo
          }
        }
        
        // Lấy thông tin đầy đủ của customer vừa tạo
        // Đợi một chút để đảm bảo owner được set (nếu login đã được tạo)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const customerResult = await this.client.getCustomer(customerOrgId)
        if (customerResult.success && customerResult.data) {
          const customerData = this.parseCustomerResponse(customerResult.data)
          if (customerData) {
            return this.createSuccessResponse(customerData)
          }
        }
        // Fallback: return với data từ create response
        return this.createSuccessResponse({
          id: customerOrgId,
          email: params.email,
          name: params.name,
        })
      }

      return this.createErrorResponse(createResult.error || 'Failed to create customer')
    } catch (error: any) {
      this.logger.error('Error in findOrCreateCustomer:', error)
      return this.createErrorResponse(error.message)
    }
  }

  async getCustomer(customerId: string): Promise<ControlPanelResponse<CustomerAccount>> {
    return this.handleRequest(async () => {
      const result = await this.client.getCustomer(customerId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Customer not found')
      }
      const customerData = this.parseCustomerResponse(result.data)
      if (!customerData) {
        throw new Error('Invalid customer data format')
      }
      return customerData
    }, 'Failed to get customer')
  }

  async updateCustomer(
    customerId: string,
    params: UpdateCustomerParams
  ): Promise<ControlPanelResponse<CustomerAccount>> {
    return this.handleRequest(async () => {
      const result = await this.client.updateCustomer(customerId, params)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update customer')
      }
      const customerData = this.parseCustomerResponse(result.data)
      if (!customerData) {
        throw new Error('Invalid customer data format')
      }
      return customerData
    }, 'Failed to update customer')
  }

  async deleteCustomer(customerId: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      const result = await this.client.deleteCustomer(customerId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete customer')
      }
    }, 'Failed to delete customer')
  }

  async getPlans(): Promise<ControlPanelResponse<Plan[]>> {
    return this.handleRequest(async () => {
      const result = await this.client.getPlans()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get plans')
      }
      // Parse plans từ Enhance format sang Plan format
      return result.data.map((plan: any) => ({
        id: plan.id || plan.uuid || String(plan.id),
        name: plan.name || plan.planName || '',
        description: plan.description,
        features: plan.features,
        metadata: plan,
      }))
    }, 'Failed to get plans')
  }

  async getPlan(planId: string): Promise<ControlPanelResponse<Plan>> {
    return this.handleRequest(async () => {
      const result = await this.client.getPlan(planId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Plan not found')
      }
      const plan = result.data
      return {
        id: plan.id || plan.uuid || planId,
        name: plan.name || plan.planName || '',
        description: plan.description,
        features: plan.features,
        metadata: plan,
      }
    }, 'Failed to get plan')
  }

  async createHosting(params: CreateHostingParams): Promise<ControlPanelResponse<HostingAccount>> {
    try {
      this.logger.info('Creating hosting:', params)

      // 1. Tìm hoặc tạo customer
      if (!params.email) {
        return this.createErrorResponse('Email is required to create hosting')
      }

      const customerResult = await this.findOrCreateCustomer({
        email: params.email,
        name: params.customerId, // Tạm thời dùng customerId làm name, sẽ được update sau
      })

      if (!customerResult.success || !customerResult.data) {
        return this.createErrorResponse('Failed to get/create customer')
      }

      const customerId = customerResult.data.id

      // 2. Tạo subscription nếu có planId
      let subscriptionId: string | undefined
      if (params.planId) {
        this.logger.info('Creating subscription for plan:', params.planId)
        const subscriptionResult = await this.client.createSubscription(customerId, params.planId)
        if (subscriptionResult.success && subscriptionResult.data) {
          // Subscription ID is returned as integer, convert to string
          subscriptionId = String(subscriptionResult.data.id)
          this.logger.info('Subscription created:', subscriptionId)
        } else {
          this.logger.warn('Failed to create subscription:', subscriptionResult.error)
          // Tiếp tục mà không có subscription, có thể API không yêu cầu
        }
      }

      // 3. Tạo website/hosting
      const websiteResult = await this.client.createWebsite({
        customerId,
        planId: params.planId,
        subscriptionId,
        domain: params.domain,
      })

      if (!websiteResult.success || !websiteResult.data) {
        return this.createErrorResponse(websiteResult.error || 'Failed to create hosting')
      }

      // 4. Lấy thông tin đầy đủ của website vừa tạo
      // Website was created in customer org context, so get it from there
      const websiteInfo = await this.client.getWebsite(websiteResult.data.id, customerId)
      const websiteData = websiteInfo.data || {}

      return this.createSuccessResponse({
        id: websiteResult.data.id,
        customerId,
        planId: params.planId || '',
        domain: params.domain,
        status: websiteData.status || 'ACTIVE',
        ipAddress: websiteData.ipAddress,
        createdAt: websiteData.createdAt,
        metadata: websiteData,
      })
    } catch (error: any) {
      this.logger.error('Error in createHosting:', error)
      return this.createErrorResponse(error.message)
    }
  }

  async getHosting(hostingId: string): Promise<ControlPanelResponse<HostingAccount>> {
    return this.handleRequest(async () => {
      // Try to get website from parent org first
      let result = await this.client.getWebsite(hostingId)
      
      // If failed and we have customerId in metadata, try from customer org context
      if (!result.success && result.error?.includes('404')) {
        // Could try from customer org, but we don't have that info here
        // For now, just return the error
      }
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Hosting not found')
      }
      const website = result.data
      return {
        id: website.id || website.uuid || hostingId,
        customerId: website.customerId || website.orgId || '',
        planId: website.planId || website.subscriptionId || '',
        domain: website.domain || website.domainName,
        status: website.status || 'ACTIVE',
        ipAddress: website.ipAddress,
        createdAt: website.createdAt,
        metadata: website,
      }
    }, 'Failed to get hosting')
  }

  async updateHosting(
    hostingId: string,
    params: UpdateHostingParams
  ): Promise<ControlPanelResponse<HostingAccount>> {
    return this.handleRequest(async () => {
      const result = await this.client.updateWebsite(hostingId, params)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update hosting')
      }
      const website = result.data
      return {
        id: website.id || hostingId,
        customerId: website.customerId || '',
        planId: website.planId || '',
        domain: website.domain,
        status: website.status || 'ACTIVE',
        ipAddress: website.ipAddress,
        metadata: website,
      }
    }, 'Failed to update hosting')
  }

  async suspendHosting(hostingId: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      // Enhance có thể không có endpoint suspend riêng, có thể dùng update
      const result = await this.client.updateWebsite(hostingId, { status: 'SUSPENDED' })
      if (!result.success) {
        throw new Error(result.error || 'Failed to suspend hosting')
      }
    }, 'Failed to suspend hosting')
  }

  async unsuspendHosting(hostingId: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      const result = await this.client.updateWebsite(hostingId, { status: 'ACTIVE' })
      if (!result.success) {
        throw new Error(result.error || 'Failed to unsuspend hosting')
      }
    }, 'Failed to unsuspend hosting')
  }

  async deleteHosting(hostingId: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      const result = await this.client.deleteWebsite(hostingId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete hosting')
      }
    }, 'Failed to delete hosting')
  }

  async addDomain(hostingId: string, domain: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      const result = await this.client.addDomain(hostingId, domain)
      if (!result.success) {
        throw new Error(result.error || 'Failed to add domain')
      }
    }, 'Failed to add domain')
  }

  async removeDomain(hostingId: string, domainId: string): Promise<ControlPanelResponse<void>> {
    return this.handleRequest(async () => {
      const result = await this.client.removeDomain(hostingId, domainId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove domain')
      }
    }, 'Failed to remove domain')
  }

  async healthCheck(): Promise<ControlPanelResponse<HealthStatus>> {
    return this.handleRequest(async () => {
      const result = await this.client.healthCheck()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Health check failed')
      }
      return {
        status: result.data.status === 'healthy' ? 'healthy' : 'down',
        message: (result.data as any).message,
      }
    }, 'Health check failed')
  }

  /**
   * Parse customer response từ Enhance API format sang CustomerAccount format
   */
  private parseCustomerResponse(data: any): CustomerAccount | null {
    if (!data) return null

    // Enhance trả về customer (Org) với schema:
    // - id: UUID string
    // - name: string
    // - ownerEmail: email string
    // - status: Status enum
    // - ownerId, owner, etc.
    const customer = Array.isArray(data) ? data[0] : data
    if (!customer) return null

    return {
      id: customer.id || customer.uuid || String(customer.id),
      username: customer.username || customer.owner,
      email: customer.ownerEmail || customer.email || customer.emailAddress,
      name: customer.name || customer.displayName || customer.ownerEmail,
      status: customer.status,
      metadata: customer,
    }
  }
}

