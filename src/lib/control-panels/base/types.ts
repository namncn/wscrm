/**
 * Shared types và enums cho tất cả control panels
 */

export enum ControlPanelType {
  ENHANCE = 'ENHANCE',
  CPANEL = 'CPANEL',
  PLESK = 'PLESK',
  DIRECTADMIN = 'DIRECTADMIN',
}

export interface ControlPanelResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface CreateCustomerParams {
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
}

export interface UpdateCustomerParams extends Partial<CreateCustomerParams> {}

export interface CustomerAccount {
  id: string
  username?: string
  email: string
  name: string
  status?: string
  metadata?: Record<string, any>
}

export interface Plan {
  id: string
  name: string
  description?: string
  features?: Record<string, any>
  metadata?: Record<string, any>
}

export interface CreateHostingParams {
  customerId: string
  planId: string
  domain?: string
  username?: string
  password?: string
  email?: string
  metadata?: Record<string, any>
}

export interface UpdateHostingParams extends Partial<CreateHostingParams> {}

export interface HostingAccount {
  id: string
  customerId: string
  planId: string
  domain?: string
  status: string
  ipAddress?: string
  createdAt?: string
  metadata?: Record<string, any>
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  message?: string
  latency?: number
}

