/**
 * Common interface cho tất cả control panels
 * Mỗi control panel phải implement interface này
 */

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
} from './types'

export interface IControlPanel {
  // Identification
  getName(): string
  getType(): ControlPanelType

  // Customer Management
  findCustomerByEmail(email: string): Promise<ControlPanelResponse<CustomerAccount | null>>
  findOrCreateCustomer(params: CreateCustomerParams): Promise<ControlPanelResponse<CustomerAccount>>
  getCustomer(customerId: string): Promise<ControlPanelResponse<CustomerAccount>>
  updateCustomer(customerId: string, params: UpdateCustomerParams): Promise<ControlPanelResponse<CustomerAccount>>
  deleteCustomer(customerId: string): Promise<ControlPanelResponse<void>>

  // Plan Management
  getPlans(): Promise<ControlPanelResponse<Plan[]>>
  getPlan(planId: string): Promise<ControlPanelResponse<Plan>>

  // Hosting/Website Management
  createHosting(params: CreateHostingParams): Promise<ControlPanelResponse<HostingAccount>>
  getHosting(hostingId: string): Promise<ControlPanelResponse<HostingAccount>>
  updateHosting(hostingId: string, params: UpdateHostingParams): Promise<ControlPanelResponse<HostingAccount>>
  suspendHosting(hostingId: string): Promise<ControlPanelResponse<void>>
  unsuspendHosting(hostingId: string): Promise<ControlPanelResponse<void>>
  deleteHosting(hostingId: string): Promise<ControlPanelResponse<void>>

  // Domain Management (nếu CP hỗ trợ)
  addDomain(hostingId: string, domain: string): Promise<ControlPanelResponse<void>>
  removeDomain(hostingId: string, domain: string): Promise<ControlPanelResponse<void>>

  // Health Check
  healthCheck(): Promise<ControlPanelResponse<HealthStatus>>
}

