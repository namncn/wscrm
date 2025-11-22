/**
 * Config types cho Enhance Control Panel
 */

export interface EnhanceConfig {
  apiKey: string
  baseUrl: string
  orgId?: string
  timeout?: number
}

export interface EnhanceApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

