/**
 * Enhance Control Panel API Client
 * Based on OpenAPI 3.0.3 spec: https://apidocs.enhance.com/spec/oas3-api.yaml
 */

import { EnhanceConfig, EnhanceApiResponse } from './enhance-config'

export class EnhanceClient {
  private apiKey: string
  private baseUrl: string
  private orgId?: string
  private timeout: number

  constructor(config: EnhanceConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.orgId = config.orgId
    this.timeout = config.timeout || 30000 // Default 30 seconds

    if (!this.orgId) {
      console.warn('[EnhanceClient] orgId is not set. Some endpoints may not work correctly.')
    }
  }

  /**
   * Get the org endpoint prefix
   */
  private getOrgPrefix(): string {
    if (!this.orgId) {
      throw new Error('orgId is required for this operation')
    }
    return `/orgs/${this.orgId}`
  }

  /**
   * Make HTTP request to Enhance API
   */
  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<EnhanceApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options?.headers,
      }

      const url = `${this.baseUrl}${endpoint}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type')
      let data: any

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        }
      }

      // Handle different response formats
      // Some APIs return { data: [...] } or { plans: [...] } instead of direct array
      let finalData = data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) {
          finalData = data.data
        } else if (Array.isArray(data.plans)) {
          finalData = data.plans
        } else if (Array.isArray(data.items)) {
          finalData = data.items
        }
      }

      return {
        success: true,
        data: finalData,
        statusCode: response.status,
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        }
      }
      console.error('[Enhance API] Request failed:', error)
      return {
        success: false,
        error: error.message || 'Unknown error',
      }
    }
  }

  /**
   * Health check - Get API version
   */
  async getVersion(): Promise<EnhanceApiResponse<string>> {
    return this.request<string>('/version', 'GET')
  }

  /**
   * Find customer by email
   * Endpoint: GET /orgs/{org_id}/customers
   * Note: This will return all customers, you need to filter by email in the response
   * Customer (Org) schema has ownerEmail field, not email directly
   */
  async findCustomerByEmail(email: string): Promise<EnhanceApiResponse<any>> {
    if (!email || !email.trim()) {
      return {
        success: false,
        error: 'Email is required',
        statusCode: 400,
      }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const result = await this.request<{ items: any[]; total: number }>(`${this.getOrgPrefix()}/customers`, 'GET')
    
    // Kiểm tra response format - có thể là { items: [...] } hoặc { data: { items: [...] } } hoặc chỉ là array
    let customers: any[] = []
    
    if (result.success && result.data) {
      const data = result.data as any
      
      // Case 1: result.data.items là array
      if (Array.isArray(data.items)) {
        customers = data.items
      }
      // Case 2: result.data là array trực tiếp
      else if (Array.isArray(data)) {
        customers = data
      }
      // Case 3: result.data có field khác chứa array (data, customers, etc.)
      else if (data.data && Array.isArray(data.data)) {
        customers = data.data
      }
      // Case 4: Kiểm tra các field khác
      else {
        // Thử tìm array trong các field khác
        for (const key in data) {
          if (Array.isArray(data[key])) {
            customers = data[key]
            break
          }
        }
      }
    }
    
    if (customers.length > 0) {
      // Tìm customer có email khớp chính xác
      const customer = customers.find((c: any) => {
        const ownerEmail = c.ownerEmail?.trim().toLowerCase()
        const customerEmail = c.email?.trim().toLowerCase()
        const loginEmail = c.login?.email?.trim().toLowerCase()
        
        return ownerEmail === normalizedEmail || 
               customerEmail === normalizedEmail || 
               loginEmail === normalizedEmail
      })
      
      if (customer) {
        return {
          success: true,
          data: customer,
        }
      }
      
      // Không tìm thấy customer với email khớp
      return {
        success: false,
        error: `Customer not found with email: ${email}`,
        statusCode: 404,
      }
    }
    
    // Nếu API không trả về items hoặc có lỗi
    if (!result.success) {
      console.error('[EnhanceClient.findCustomerByEmail] API error:', result.error)
      return result
    }
    
    // Nếu không có items hoặc items rỗng
    return {
      success: false,
      error: 'Customer not found - no customers in response',
      statusCode: 404,
    }
  }

  /**
   * Create customer (organization)
   * Endpoint: POST /orgs/{org_id}/customers
   * According to API spec, NewCustomer schema only requires 'name'
   * Note: email, phone, company are NOT supported in NewCustomer schema
   * These fields need to be set via login creation after organization is created
   * Response is NewResourceUuid with id as UUID string
   */
  async createCustomer(params: {
    name: string
    email?: string  // Will be set via login creation
    phone?: string  // Not supported in Enhance API
    company?: string  // Not supported in Enhance API
  }): Promise<EnhanceApiResponse<{ id: string }>> {
    // NewCustomer schema only supports 'name'
    // email, phone, company are not part of the schema and cannot be set during creation
    const result = await this.request<{ id: string }>(`${this.getOrgPrefix()}/customers`, 'POST', {
      name: params.name,
    })
    
    // Response format: { id: "uuid-string" }
    return result
  }

  /**
   * Create login and member with OWNER role for customer organization
   * Based on WHMCS module implementation:
   * 1. POST /orgs/{customer_org_id}/logins - Create login with email, name, password
   * 2. POST /orgs/{customer_org_id}/members - Create member with loginId and roles: ["OWNER"]
   */
  async createLoginForCustomer(
    customerOrgId: string,
    params: {
      email: string
      name: string
      password?: string  // Required by API - must be provided
    }
  ): Promise<EnhanceApiResponse<{ id: string; memberId?: string; loginId?: string }>> {
    // Password is REQUIRED by Enhance API
    if (!params.password) {
      return {
        success: false,
        error: 'Password is required for creating login',
        statusCode: 400,
      }
    }
    
    // Step 1: Create login in customer org context
    // Endpoint: POST /logins?orgId={customer_org_id}
    // According to WHMCS module: $api['loginsClient']->createLogin($org['id'], $new_login)
    // The org_id is passed as query parameter, not in path
    const loginData: any = {
      email: params.email,
      name: params.name,
      password: params.password,
    }
    
    const loginEndpoint = `/logins?orgId=${customerOrgId}`
    const loginResult = await this.request<{ id: string }>(loginEndpoint, 'POST', loginData)
    
    let loginId: string | undefined
    
    if (loginResult.success && loginResult.data?.id) {
      // Login created successfully
      loginId = loginResult.data.id
    } else if (loginResult.statusCode === 409 && loginResult.error?.includes('already exists')) {
      // Login already exists in the realm (parent org realm)
      // Need to find it by email in the parent org realm, not customer org
      // Try to get logins from parent org realm
      // Endpoint: GET /logins?realm_id={parent_org_id} or GET /orgs/{parent_org_id}/logins
      // According to API docs, realm_id maps to org_id, so we use parent org
      const parentOrgId = this.orgId
      if (!parentOrgId) {
        return {
          success: false,
          error: 'Cannot find existing login: orgId is not set',
          statusCode: 500,
        }
      }
      
      // Try GET /orgs/{parent_org_id}/logins first (more specific)
      const getLoginsEndpoint = `/orgs/${parentOrgId}/logins`
      const loginsResult = await this.request<{ items?: Array<{ id: string; email?: string }> } | Array<{ id: string; email?: string }>>(getLoginsEndpoint, 'GET')
      
      if (loginsResult.success && loginsResult.data) {
        const logins = Array.isArray(loginsResult.data) 
          ? loginsResult.data 
          : (loginsResult.data.items || [])
        
        const normalizedEmail = params.email.trim().toLowerCase()
        const existingLogin = logins.find((login: any) => {
          const loginEmail = (login.email || login.emailAddress || '').trim().toLowerCase()
          return loginEmail === normalizedEmail
        })
        
        if (existingLogin?.id) {
          loginId = existingLogin.id
        } else {
          // Fallback: try GET /logins?realm_id={parent_org_id}
          const realmLoginsEndpoint = `/logins?realm_id=${parentOrgId}`
          const realmLoginsResult = await this.request<{ items?: Array<{ id: string; email?: string }> } | Array<{ id: string; email?: string }>>(realmLoginsEndpoint, 'GET')
          
          if (realmLoginsResult.success && realmLoginsResult.data) {
            const realmLogins = Array.isArray(realmLoginsResult.data) 
              ? realmLoginsResult.data 
              : (realmLoginsResult.data.items || [])
            
            const realmExistingLogin = realmLogins.find((login: any) => {
              const loginEmail = (login.email || login.emailAddress || '').trim().toLowerCase()
              return loginEmail === normalizedEmail
            })
            
            if (realmExistingLogin?.id) {
              loginId = realmExistingLogin.id
            } else {
              return {
                success: false,
                error: `Login already exists but could not find it by email: ${params.email}`,
                statusCode: 404,
              }
            }
          } else {
            return {
              success: false,
              error: `Login already exists but could not retrieve logins from realm: ${realmLoginsResult.error || 'Unknown error'}`,
              statusCode: realmLoginsResult.statusCode || 500,
            }
          }
        }
      } else {
        return {
          success: false,
          error: `Login already exists but could not retrieve logins: ${loginsResult.error || 'Unknown error'}`,
          statusCode: loginsResult.statusCode || 500,
        }
      }
    } else {
      return {
        success: false,
        error: `Failed to create login: ${loginResult.error || 'Unknown error'}`,
        statusCode: loginResult.statusCode || 500,
      }
    }
    
    if (!loginId) {
      return {
        success: false,
        error: 'Could not determine loginId',
        statusCode: 500,
      }
    }
    
    // Step 2: Create member with OWNER role in customer org context
    // Endpoint: POST /orgs/{customer_org_id}/members
    // Body: { loginId, roles: ["Owner"] }
    // According to Role.php: const OWNER = 'Owner'; (capital O, lowercase rest)
    const memberData: any = {
      loginId: loginId,
      roles: ['Owner'], // Role enum value from Enhance API - must be 'Owner', not 'OWNER'
    }
    
    const memberEndpoint = `/orgs/${customerOrgId}/members`
    const memberResult = await this.request<{ id: string }>(memberEndpoint, 'POST', memberData)
    
    if (!memberResult.success || !memberResult.data?.id) {
      // Login was created but member creation failed
      return {
        success: false,
        error: `Login created but failed to create member with OWNER role: ${memberResult.error || 'Unknown error'}`,
        statusCode: memberResult.statusCode || 500,
      }
    }
    
    const memberId = memberResult.data.id
    
    return {
      success: true,
      data: {
        id: loginId,
        loginId: loginId,
        memberId: memberId,
      },
      statusCode: 200,
    }
  }

  /**
   * Get customer by ID (customer_org_id)
   * Note: There's no direct GET endpoint for a single customer
   * We need to get the list and find by ID
   */
  async getCustomer(customerId: string): Promise<EnhanceApiResponse<any>> {
    if (!customerId || !customerId.trim()) {
      return {
        success: false,
        error: 'Customer ID is required',
        statusCode: 400,
      }
    }

    const normalizedId = customerId.trim()
    const result = await this.request<{ items: any[]; total: number }>(`${this.getOrgPrefix()}/customers`, 'GET')
    
    // Kiểm tra response format - tương tự như findCustomerByEmail
    let customers: any[] = []
    
    if (result.success && result.data) {
      const data = result.data as any
      
      // Case 1: result.data.items là array
      if (Array.isArray(data.items)) {
        customers = data.items
      }
      // Case 2: result.data là array trực tiếp
      else if (Array.isArray(data)) {
        customers = data
      }
      // Case 3: result.data có field khác chứa array
      else if (data.data && Array.isArray(data.data)) {
        customers = data.data
      }
      // Case 4: Kiểm tra các field khác
      else {
        for (const key in data) {
          if (Array.isArray(data[key])) {
            customers = data[key]
            break
          }
        }
      }
    }
    
    if (customers.length > 0) {
      // Tìm customer có ID khớp chính xác
      const customer = customers.find((c: any) => {
        const cId = c.id?.toString().trim() || c.uuid?.toString().trim()
        return cId === normalizedId
      })
      
      if (customer) {
        return {
          success: true,
          data: customer,
        }
      }
      
      // Không tìm thấy customer với ID khớp
      return {
        success: false,
        error: `Customer not found with ID: ${customerId}`,
        statusCode: 404,
      }
    }
    
    // Nếu API không trả về items hoặc có lỗi
    if (!result.success) {
      console.error('[EnhanceClient.getCustomer] API error:', result.error)
      return result
    }
    
    // Nếu không có items hoặc items rỗng
    return {
      success: false,
      error: `Customer not found with ID: ${customerId} - no customers in response`,
      statusCode: 404,
    }
  }

  /**
   * Update customer
   * Note: Customer is actually an Organization in Enhance
   * Endpoint: PATCH /orgs/{customer_org_id}
   * According to API spec, OrgUpdate schema only supports: name, status, isSuspended, locale, slackNotificationWebhookUrl
   */
  async updateCustomer(customerId: string, params: Partial<{
    name: string
    email: string
    phone?: string
    company?: string
  }>): Promise<EnhanceApiResponse<any>> {
    // Customer is an org, so we update the org directly
    // OrgUpdate schema only supports: name, status, isSuspended, locale, slackNotificationWebhookUrl
    // Note: email, phone, company are not in OrgUpdate schema
    const orgUpdate: any = {}
    if (params.name) {
      orgUpdate.name = params.name
    }
    // Note: email, phone, company cannot be updated via OrgUpdate
    // They might need to be updated via login/member endpoints
    
    return this.request(`/orgs/${customerId}`, 'PATCH', orgUpdate)
  }

  /**
   * Delete customer
   * Note: Customer is actually an Organization in Enhance
   * Endpoint: DELETE /orgs/{customer_org_id}
   * Optional query parameter: force=true (for hard delete, requires MO privileges)
   */
  async deleteCustomer(customerId: string, force: boolean = false): Promise<EnhanceApiResponse<void>> {
    // Customer is an org, so we delete the org directly
    const endpoint = force ? `/orgs/${customerId}?force=true` : `/orgs/${customerId}`
    return this.request<void>(endpoint, 'DELETE')
  }

  /**
   * Get all plans
   * Endpoint: GET /orgs/{org_id}/plans
   */
  async getPlans(): Promise<EnhanceApiResponse<Array<{ id: string; name: string }>>> {
    return this.request<Array<{ id: string; name: string }>>(`${this.getOrgPrefix()}/plans`, 'GET')
  }

  /**
   * Get plan by ID
   * Endpoint: GET /orgs/{org_id}/plans/{plan_id}
   */
  async getPlan(planId: string): Promise<EnhanceApiResponse<any>> {
    return this.request(`${this.getOrgPrefix()}/plans/${planId}`, 'GET')
  }

  /**
   * Create website/hosting account
   * Endpoint: POST /orgs/{org_id}/websites
   * According to API spec, NewWebsite schema requires:
   * - domain (required): string
   * - subscriptionId (optional): integer
   * - appServerId, backupServerId, dbServerId, emailServerId, serverGroupId (optional): UUID
   * - phpVersion, kind, wordPressAdminCredentials (optional)
   * Note: Website is created in the context of the specified org_id
   * If customerId is provided, website will be created in customer's org context
   * Response is NewResourceUuid with id as UUID string
   */
  async createWebsite(params: {
    customerId?: string
    planId?: string
    subscriptionId?: string | number
    domain?: string
    orgId?: string // Optional: specify org context, defaults to this.orgId
  }): Promise<EnhanceApiResponse<{ id: string }>> {
    // NewWebsite schema only supports: domain (required), subscriptionId (integer), and optional server IDs
    const newWebsite: any = {}
    
    if (!params.domain) {
      return {
        success: false,
        error: 'domain is required',
      }
    }
    newWebsite.domain = params.domain
    
    // Convert subscriptionId to integer if provided
    if (params.subscriptionId) {
      const subscriptionIdInt = typeof params.subscriptionId === 'string' 
        ? parseInt(params.subscriptionId, 10) 
        : params.subscriptionId
      if (!isNaN(subscriptionIdInt)) {
        newWebsite.subscriptionId = subscriptionIdInt
      }
    }
    
    // Determine which org context to use
    // If customerId is provided, create website in customer's org context
    // Otherwise, use the current org_id (parent org)
    const targetOrgId = params.customerId || params.orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId or customerId is required',
      }
    }
    
    return this.request<{ id: string }>(`/orgs/${targetOrgId}/websites`, 'POST', newWebsite)
  }

  /**
   * Create subscription for customer
   * Endpoint: POST /orgs/{org_id}/customers/{customer_org_id}/subscriptions
   * According to API spec, NewSubscription requires planId as integer
   * Response is NewResourceId with id as integer
   */
  async createSubscription(
    customerId: string,
    planId: string | number
  ): Promise<EnhanceApiResponse<{ id: number }>> {
    // Convert planId to integer if it's a string
    const planIdInt = typeof planId === 'string' ? parseInt(planId, 10) : planId
    if (isNaN(planIdInt)) {
      return {
        success: false,
        error: 'planId must be a valid integer',
      }
    }
    
    const result = await this.request<{ id: number }>(
      `${this.getOrgPrefix()}/customers/${customerId}/subscriptions`,
      'POST',
      { planId: planIdInt }
    )
    
    // Response format: { id: 123 } (integer)
    return result
  }

  /**
   * List subscriptions for a customer
   * Endpoint: GET /orgs/{org_id}/customers/{customer_id}/subscriptions
   */
  async listSubscriptions(
    customerId: string
  ): Promise<EnhanceApiResponse<Array<{ id: number; planId?: number; [key: string]: any }>>> {
    const result = await this.request<Array<{ id: number; planId?: number; [key: string]: any }>>(
      `${this.getOrgPrefix()}/customers/${customerId}/subscriptions`,
      'GET'
    )
    
    return result
  }

  /**
   * Get subscription by ID
   * Endpoint: GET /orgs/{org_id}/customers/{customer_id}/subscriptions/{subscription_id}
   */
  async getSubscription(
    customerId: string,
    subscriptionId: number | string
  ): Promise<EnhanceApiResponse<{ id: number; planId?: number; [key: string]: any }>> {
    const subscriptionIdInt = typeof subscriptionId === 'string' ? parseInt(subscriptionId, 10) : subscriptionId
    if (isNaN(subscriptionIdInt)) {
      return {
        success: false,
        error: 'subscriptionId must be a valid integer',
      }
    }
    
    const result = await this.request<{ id: number; planId?: number; [key: string]: any }>(
      `${this.getOrgPrefix()}/customers/${customerId}/subscriptions/${subscriptionIdInt}`,
      'GET'
    )
    
    return result
  }

  /**
   * Update subscription
   * Endpoint: PATCH /orgs/{org_id}/subscriptions/{subscription_id}
   * According to API docs and PHP code: Updates the organization's subscription
   * Note: org_id should be the customer org ID (subscriberId), not vendor org ID
   * Based on enhance.php line 316: updateSubscription uses customer's enhOrgId
   */
  async updateSubscription(
    customerId: string,
    subscriptionId: number | string,
    planId: string | number
  ): Promise<EnhanceApiResponse<{ id: number }>> {
    // Convert planId to integer if it's a string
    const planIdInt = typeof planId === 'string' ? parseInt(planId, 10) : planId
    if (isNaN(planIdInt)) {
      return {
        success: false,
        error: 'planId must be a valid integer',
      }
    }

    const subscriptionIdInt = typeof subscriptionId === 'string' ? parseInt(subscriptionId, 10) : subscriptionId
    if (isNaN(subscriptionIdInt)) {
      return {
        success: false,
        error: 'subscriptionId must be a valid integer',
      }
    }
    
    // Endpoint đúng theo API docs: /orgs/{org_id}/subscriptions/{subscription_id}
    // Theo code PHP (enhance.php line 316), org_id là customer org ID (enhOrgId), không phải vendor org ID
    // Thử với customer org ID trước
    const endpointWithCustomerOrg = `/orgs/${customerId}/subscriptions/${subscriptionIdInt}`
    const requestBody = { planId: planIdInt }
    
    // Theo API docs, method là PATCH
    // Thử với customer org ID trước (theo code PHP)
    let result = await this.request<{ id: number }>(
      endpointWithCustomerOrg,
      'PATCH',
      requestBody
    )
    
    // Nếu thất bại với customer org ID, thử với vendor org ID (fallback)
    if (!result.success && result.statusCode === 404) {
      const endpointWithVendorOrg = `${this.getOrgPrefix()}/subscriptions/${subscriptionIdInt}`
      result = await this.request<{ id: number }>(
        endpointWithVendorOrg,
        'PATCH',
        requestBody
      )
    }
    
    if (!result.success) {
      console.error(`[EnhanceClient] Update subscription failed:`, {
        subscriptionId: subscriptionIdInt,
        customerOrgId: customerId,
        vendorOrgId: this.orgId,
        planId: planIdInt,
        error: result.error,
        statusCode: result.statusCode,
        triedEndpoints: [endpointWithCustomerOrg, `${this.getOrgPrefix()}/subscriptions/${subscriptionIdInt}`],
      })
    }
    
    return result
  }

  /**
   * Delete subscription
   * Endpoint: DELETE /orgs/{org_id}/subscriptions/{subscription_id}
   * According to API docs and PHP code: Uses customer org ID (enhOrgId), not vendor org ID
   * Based on enhance.php line 263: deleteSubscription uses customer's enhOrgId
   */
  async deleteSubscription(
    customerId: string,
    subscriptionId: number | string
  ): Promise<EnhanceApiResponse<void>> {
    const subscriptionIdInt = typeof subscriptionId === 'string' ? parseInt(subscriptionId, 10) : subscriptionId
    if (isNaN(subscriptionIdInt)) {
      return {
        success: false,
        error: 'subscriptionId must be a valid integer',
      }
    }
    
    // Endpoint đúng theo API docs: /orgs/{org_id}/subscriptions/{subscription_id}
    // Theo code PHP (enhance.php line 263), org_id là customer org ID (enhOrgId), không phải vendor org ID
    // Thử với customer org ID trước
    const endpointWithCustomerOrg = `/orgs/${customerId}/subscriptions/${subscriptionIdInt}`
    
    let result = await this.request<void>(
      endpointWithCustomerOrg,
      'DELETE'
    )
    
    // Nếu thất bại với customer org ID, thử với vendor org ID (fallback)
    if (!result.success && result.statusCode === 404) {
      const endpointWithVendorOrg = `${this.getOrgPrefix()}/subscriptions/${subscriptionIdInt}`
      result = await this.request<void>(
        endpointWithVendorOrg,
        'DELETE'
      )
    }
    
    if (!result.success) {
      console.error(`[EnhanceClient] Delete subscription failed:`, {
        subscriptionId: subscriptionIdInt,
        customerOrgId: customerId,
        vendorOrgId: this.orgId,
        error: result.error,
        statusCode: result.statusCode,
        triedEndpoints: [endpointWithCustomerOrg, `${this.getOrgPrefix()}/subscriptions/${subscriptionIdInt}`],
      })
    }
    
    return result
  }

  /**
   * List websites for an org
   * Endpoint: GET /orgs/{org_id}/websites
   * If orgId is provided, use that org context, otherwise use parent org (this.orgId)
   */
  async listWebsites(orgId?: string): Promise<EnhanceApiResponse<Array<{ id: string; domain?: string; [key: string]: any }>>> {
    const targetOrgId = orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId is required to list websites',
      }
    }
    return this.request<Array<{ id: string; domain?: string; [key: string]: any }>>(`/orgs/${targetOrgId}/websites`, 'GET')
  }

  /**
   * Get website by ID
   * Endpoint: GET /orgs/{org_id}/websites/{website_id}
   * Note: Website can be accessed from parent org or the org where it was created
   * If orgId is provided, use that org context, otherwise use parent org (this.orgId)
   */
  async getWebsite(websiteId: string, orgId?: string): Promise<EnhanceApiResponse<any>> {
    // Use provided orgId or fallback to parent org
    const targetOrgId = orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId is required to get website',
      }
    }
    return this.request(`/orgs/${targetOrgId}/websites/${websiteId}`, 'GET')
  }

  /**
   * Update website
   * Endpoint: PUT /orgs/{org_id}/websites/{website_id}
   * If orgId is provided, use that org context, otherwise use parent org (this.orgId)
   */
  async updateWebsite(websiteId: string, params: any, orgId?: string): Promise<EnhanceApiResponse<any>> {
    // Use provided orgId or fallback to parent org
    const targetOrgId = orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId is required to update website',
      }
    }
    return this.request(`/orgs/${targetOrgId}/websites/${websiteId}`, 'PUT', params)
  }

  /**
   * Delete website
   * Endpoint: DELETE /orgs/{org_id}/websites/{website_id}
   * Optional query parameter: force=true (for hard delete, requires MO privileges)
   * Alternative: DELETE /orgs/{org_id}/websites with body containing UuidListing (for multiple)
   * If orgId is provided, use that org context, otherwise use parent org (this.orgId)
   */
  async deleteWebsite(websiteId: string, force: boolean = false, orgId?: string): Promise<EnhanceApiResponse<void>> {
    // Use provided orgId or fallback to parent org
    const targetOrgId = orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId is required to delete website',
      }
    }
    const endpoint = force 
      ? `/orgs/${targetOrgId}/websites/${websiteId}?force=true`
      : `/orgs/${targetOrgId}/websites/${websiteId}`
    return this.request<void>(endpoint, 'DELETE')
  }

  /**
   * Add domain to website
   * Endpoint: POST /orgs/{org_id}/websites/{website_id}/domains
   * If orgId is provided, use that org context, otherwise use parent org (this.orgId)
   */
  async addDomain(websiteId: string, domain: string, orgId?: string): Promise<EnhanceApiResponse<void>> {
    // Use provided orgId or fallback to parent org
    const targetOrgId = orgId || this.orgId
    if (!targetOrgId) {
      return {
        success: false,
        error: 'orgId is required to add domain',
      }
    }
    return this.request<void>(`/orgs/${targetOrgId}/websites/${websiteId}/domains`, 'POST', { domain })
  }

  /**
   * Remove domain from website
   * Endpoint: DELETE /orgs/{org_id}/websites/{website_id}/domains/{domain_id}
   */
  async removeDomain(websiteId: string, domainId: string): Promise<EnhanceApiResponse<void>> {
    return this.request<void>(`${this.getOrgPrefix()}/websites/${websiteId}/domains/${domainId}`, 'DELETE')
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<EnhanceApiResponse<{ status: string; version?: string }>> {
    const versionResult = await this.getVersion()
    if (versionResult.success) {
      return {
        success: true,
        data: {
          status: 'healthy',
          version: versionResult.data,
        },
      }
    }
    return {
      success: false,
      data: {
        status: 'down',
      },
      error: versionResult.error,
    }
  }
}

