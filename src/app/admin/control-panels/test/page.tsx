'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Loader2, 
  ArrowLeft,
  Code,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { toastSuccess, toastError } from '@/lib/toast'

interface ApiTestResult {
  method: string
  endpoint: string
  requestBody?: any
  response?: any
  status?: number
  error?: string
  timestamp: string
}

export default function ApiTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ApiTestResult[]>([])
  const [activeTab, setActiveTab] = useState('control-panels')

  // Enhance API Config
  const [enhanceApiKey, setEnhanceApiKey] = useState('')
  const [enhanceBaseUrl, setEnhanceBaseUrl] = useState('https://api.enhance.com')
  const [enhanceOrgId, setEnhanceOrgId] = useState('')
  
  // Enhance API Test inputs
  const [enhanceCustomerEmail, setEnhanceCustomerEmail] = useState('')
  const [enhanceCustomerId, setEnhanceCustomerId] = useState('')
  const [enhanceCustomerName, setEnhanceCustomerName] = useState('')
  const [enhanceCustomerPhone, setEnhanceCustomerPhone] = useState('')
  const [enhanceCustomerCompany, setEnhanceCustomerCompany] = useState('')
  const [enhancePlanId, setEnhancePlanId] = useState('')
  const [enhanceWebsiteId, setEnhanceWebsiteId] = useState('')
  const [enhanceDomain, setEnhanceDomain] = useState('')
  const [enhanceSubscriptionId, setEnhanceSubscriptionId] = useState('')

  // Control Panels API
  const [cpId, setCpId] = useState('')
  const [cpName, setCpName] = useState('')
  const [cpDisplayName, setCpDisplayName] = useState('')
  const [cpType, setCpType] = useState('ENHANCE')
  const [cpConfig, setCpConfig] = useState('{"apiKey": "test", "baseUrl": "https://api.example.com"}')

  // Plan Mappings API
  const [pmControlPanelId, setPmControlPanelId] = useState('')
  const [pmLocalPlanType, setPmLocalPlanType] = useState('HOSTING')
  const [pmLocalPlanId, setPmLocalPlanId] = useState('')
  const [pmExternalPlanId, setPmExternalPlanId] = useState('')
  const [pmId, setPmId] = useState('')

  // Sync API
  const [syncHostingId, setSyncHostingId] = useState('')

  // Retry API
  const [retryHostingId, setRetryHostingId] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    // Check if user is ADMIN
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }
    // Load Enhance config from database on mount
    loadEnhanceConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  const loadEnhanceConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/control-panels?type=ENHANCE')
      const result = await response.json()
      
      console.log('[Load Enhance Config] Response:', result)
      
      if (response.ok && result.success && result.data && result.data.length > 0) {
        const enhancePanel = result.data[0]
        console.log('[Load Enhance Config] Panel:', enhancePanel)
        
        if (enhancePanel.config) {
          const config = typeof enhancePanel.config === 'string' 
            ? JSON.parse(enhancePanel.config) 
            : enhancePanel.config
          
          console.log('[Load Enhance Config] Config:', { 
            hasApiKey: !!config.apiKey, 
            hasBaseUrl: !!config.baseUrl, 
            hasOrgId: !!config.orgId 
          })
          
          if (config.apiKey) {
            setEnhanceApiKey(config.apiKey)
            console.log('[Load Enhance Config] Set API Key')
          }
          if (config.baseUrl) {
            setEnhanceBaseUrl(config.baseUrl)
            console.log('[Load Enhance Config] Set Base URL:', config.baseUrl)
          } else {
            // Set default if not provided
            setEnhanceBaseUrl('https://api.enhance.com')
          }
          if (config.orgId) {
            setEnhanceOrgId(config.orgId)
            console.log('[Load Enhance Config] Set Org ID')
          }
          
          toastSuccess('Đã tải cấu hình từ database')
        } else {
          console.warn('[Load Enhance Config] No config found in panel')
          toastError('Không tìm thấy cấu hình trong database')
        }
      } else {
        console.warn('[Load Enhance Config] No Enhance panel found or not enabled')
        toastError('Không tìm thấy Enhance control panel hoặc chưa được kích hoạt')
      }
    } catch (error) {
      console.error('[Load Enhance Config] Error:', error)
      toastError('Có lỗi xảy ra khi tải cấu hình: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const addResult = (result: ApiTestResult) => {
    setResults(prev => [result, ...prev])
  }

  const testControlPanelsGet = async () => {
    setLoading(true)
    try {
      const url = cpId ? `/api/control-panels?id=${cpId}` : '/api/control-panels'
      const response = await fetch(url)
      const data = await response.json()
      
      addResult({
        method: 'GET',
        endpoint: url,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('GET request thành công!')
      } else {
        toastError(`GET request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/api/control-panels',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testControlPanelsPost = async () => {
    setLoading(true)
    try {
      let parsedConfig
      try {
        parsedConfig = JSON.parse(cpConfig || '{}')
      } catch (e) {
        toastError('Config phải là JSON hợp lệ')
        return
      }

      const body = {
        name: cpName,
        displayName: cpDisplayName,
        type: cpType,
        status: 'ACTIVE',
        config: parsedConfig,
        isDefault: 'NO',
        priority: 0,
      }

      const response = await fetch('/api/control-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      addResult({
        method: 'POST',
        endpoint: '/api/control-panels',
        requestBody: body,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('POST request thành công!')
      } else {
        toastError(`POST request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/api/control-panels',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testPlanMappingsGet = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (pmControlPanelId) params.append('controlPanelId', pmControlPanelId)
      if (pmLocalPlanType !== 'all') params.append('localPlanType', pmLocalPlanType)
      if (pmLocalPlanId) params.append('localPlanId', pmLocalPlanId)

      const url = params.toString() 
        ? `/api/control-panels/plans?${params.toString()}`
        : '/api/control-panels/plans'

      const response = await fetch(url)
      const data = await response.json()

      addResult({
        method: 'GET',
        endpoint: url,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('GET request thành công!')
      } else {
        toastError(`GET request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/api/control-panels/plans',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testPlanMappingsPost = async () => {
    setLoading(true)
    try {
      const body = {
        controlPanelId: parseInt(pmControlPanelId),
        localPlanType: pmLocalPlanType,
        localPlanId: parseInt(pmLocalPlanId),
        externalPlanId: pmExternalPlanId,
        isActive: 'YES',
      }

      const response = await fetch('/api/control-panels/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/plans',
        requestBody: body,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('POST request thành công!')
      } else {
        toastError(`POST request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/plans',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testSync = async () => {
    setLoading(true)
    try {
      const body = {
        hostingId: parseInt(syncHostingId),
      }

      const response = await fetch('/api/control-panels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/sync',
        requestBody: body,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('Sync request thành công!')
      } else {
        toastError(`Sync request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/sync',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testRetry = async () => {
    setLoading(true)
    try {
      const body: any = {}
      if (retryHostingId) {
        body.hostingId = parseInt(retryHostingId)
      }

      const response = await fetch('/api/control-panels/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/retry',
        requestBody: body,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('Retry request thành công!')
      } else {
        toastError(`Retry request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/api/control-panels/retry',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testRetryGet = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/retry')
      const data = await response.json()

      addResult({
        method: 'GET',
        endpoint: '/api/control-panels/retry',
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toastSuccess('GET retry stats thành công!')
      } else {
        toastError(`GET request failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/api/control-panels/retry',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  // Helper to create config object (only if manually provided, otherwise let API get from DB/env)
  const getEnhanceConfig = () => {
    if (enhanceApiKey && enhanceBaseUrl) {
      return {
        apiKey: enhanceApiKey,
        baseUrl: enhanceBaseUrl,
        orgId: enhanceOrgId || undefined,
      }
    }
    return undefined
  }

  // Enhance API Test Functions
  const testEnhanceVersion = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'version',
          config: getEnhanceConfig(),
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: '/version',
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Get version thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/version',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'health',
          config: getEnhanceConfig(),
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: '/health',
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Health check thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/health',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceFindCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'findCustomer',
          config: getEnhanceConfig(),
          params: { email: enhanceCustomerEmail },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: `/orgs/{org_id}/customers (filtered by email: ${enhanceCustomerEmail})`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Find customer thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/customers',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceGetCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getCustomer',
          config: getEnhanceConfig(),
          params: { customerId: enhanceCustomerId },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: `/orgs/{org_id}/customers (filtered by ID: ${enhanceCustomerId})`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Get customer thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/customers',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceCreateCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createCustomer',
          config: getEnhanceConfig(),
          params: {
            name: enhanceCustomerName,
            email: enhanceCustomerEmail,
            phone: enhanceCustomerPhone || undefined,
            company: enhanceCustomerCompany || undefined,
          },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'POST',
        endpoint: '/orgs/{org_id}/customers (and /orgs/{customer_org_id}/logins)',
        requestBody: {
          organization: {
            name: enhanceCustomerName,
            // Note: Only name is required in NewCustomer schema
          },
          login: enhanceCustomerEmail ? {
            email: enhanceCustomerEmail,
            name: enhanceCustomerName,
            // Note: Login is created automatically after organization creation to set email and personal name
          } : null,
        },
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Create customer thành công!')
        if (data.data?.id) {
          setEnhanceCustomerId(data.data.id)
        }
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/customers',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceUpdateCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCustomer',
          config: getEnhanceConfig(),
          params: {
            customerId: enhanceCustomerId,
            name: enhanceCustomerName || undefined,
            phone: enhanceCustomerPhone || undefined,
            company: enhanceCustomerCompany || undefined,
          },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'PATCH',
        endpoint: `/orgs/${enhanceCustomerId}`,
        requestBody: {
          name: enhanceCustomerName,
          // Note: email, phone, company cannot be updated via OrgUpdate schema
        },
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Update customer thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'PUT',
        endpoint: '/customers',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceDeleteCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteCustomer',
          config: getEnhanceConfig(),
          params: { customerId: enhanceCustomerId },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'DELETE',
        endpoint: `/orgs/${enhanceCustomerId}`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Delete customer thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'DELETE',
        endpoint: '/customers',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceGetPlans = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPlans',
          config: getEnhanceConfig(),
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: '/plans',
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Get plans thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/plans',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceGetPlan = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPlan',
          config: getEnhanceConfig(),
          params: { planId: enhancePlanId },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: `/plans/${enhancePlanId}`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Get plan thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/plans',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceCreateSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSubscription',
          config: getEnhanceConfig(),
          params: {
            customerId: enhanceCustomerId,
            planId: enhancePlanId,
          },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'POST',
        endpoint: `/orgs/{org_id}/customers/${enhanceCustomerId}/subscriptions`,
        requestBody: { planId: parseInt(enhancePlanId, 10) },
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Create subscription thành công!')
        if (data.data?.id) {
          // Subscription ID is returned as integer, convert to string
          setEnhanceSubscriptionId(String(data.data.id))
        }
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/subscriptions',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceCreateWebsite = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createWebsite',
          config: getEnhanceConfig(),
          params: {
            customerId: enhanceCustomerId,
            subscriptionId: enhanceSubscriptionId ? parseInt(enhanceSubscriptionId, 10) : undefined,
            domain: enhanceDomain || undefined,
          },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'POST',
        endpoint: `/orgs/${enhanceCustomerId}/websites`,
        requestBody: {
          domain: enhanceDomain,
          subscriptionId: enhanceSubscriptionId ? parseInt(enhanceSubscriptionId, 10) : undefined,
        },
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Create website thành công!')
        if (data.data?.id) {
          setEnhanceWebsiteId(data.data.id)
        }
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'POST',
        endpoint: '/websites',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceGetWebsite = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getWebsite',
          config: getEnhanceConfig(),
          params: { 
            websiteId: enhanceWebsiteId,
            orgId: enhanceCustomerId || undefined, // Use customer org ID if provided (website was created in customer org)
          },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'GET',
        endpoint: `/orgs/{org_id}/websites/${enhanceWebsiteId}`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Get website thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'GET',
        endpoint: '/websites',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testEnhanceDeleteWebsite = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-panels/enhance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteWebsite',
          config: getEnhanceConfig(),
          params: { websiteId: enhanceWebsiteId },
        }),
      })
      const data = await response.json()
      addResult({
        method: 'DELETE',
        endpoint: `/orgs/{org_id}/websites/${enhanceWebsiteId}`,
        response: data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
      if (data.success) {
        toastSuccess('Delete website thành công!')
      } else {
        toastError(data.error || 'Failed')
      }
    } catch (error: any) {
      addResult({
        method: 'DELETE',
        endpoint: '/websites',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
      toastError('Có lỗi xảy ra: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/control-panels">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">API Testing</h1>
              <p className="text-muted-foreground">Test các API endpoints của Control Panels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearResults}>
              <RefreshCw className="h-4 w-4" />
              Clear Results
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="control-panels">Control Panels</TabsTrigger>
            <TabsTrigger value="plan-mappings">Plan Mappings</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="retry">Retry</TabsTrigger>
            <TabsTrigger value="enhance">Enhance API</TabsTrigger>
          </TabsList>

          <TabsContent value="control-panels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Control Panels API</CardTitle>
                <CardDescription>Test GET và POST endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GET Control Panels</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="ID (optional)"
                        value={cpId}
                        onChange={(e) => setCpId(e.target.value)}
                      />
                      <Button onClick={testControlPanelsGet} disabled={loading}>
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        GET
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>POST Control Panel</Label>
                    <Button onClick={testControlPanelsPost} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      POST
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={cpName}
                      onChange={(e) => setCpName(e.target.value)}
                      placeholder="enhance-test"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name *</Label>
                    <Input
                      value={cpDisplayName}
                      onChange={(e) => setCpDisplayName(e.target.value)}
                      placeholder="Enhance Test"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={cpType} onValueChange={setCpType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENHANCE">Enhance</SelectItem>
                        <SelectItem value="CPANEL">cPanel</SelectItem>
                        <SelectItem value="PLESK">Plesk</SelectItem>
                        <SelectItem value="DIRECTADMIN">DirectAdmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Config (JSON) *</Label>
                    <Textarea
                      value={cpConfig}
                      onChange={(e) => setCpConfig(e.target.value)}
                      rows={3}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan-mappings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plan Mappings API</CardTitle>
                <CardDescription>Test GET và POST endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GET Plan Mappings</Label>
                    <Button onClick={testPlanMappingsGet} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      GET
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>POST Plan Mapping</Label>
                    <Button onClick={testPlanMappingsPost} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      POST
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Control Panel ID (filter)</Label>
                    <Input
                      value={pmControlPanelId}
                      onChange={(e) => setPmControlPanelId(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local Plan Type</Label>
                    <Select value={pmLocalPlanType} onValueChange={setPmLocalPlanType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="HOSTING">Hosting</SelectItem>
                        <SelectItem value="VPS">VPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Control Panel ID (POST) *</Label>
                    <Input
                      value={pmControlPanelId}
                      onChange={(e) => setPmControlPanelId(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local Plan ID *</Label>
                    <Input
                      value={pmLocalPlanId}
                      onChange={(e) => setPmLocalPlanId(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>External Plan ID *</Label>
                    <Input
                      value={pmExternalPlanId}
                      onChange={(e) => setPmExternalPlanId(e.target.value)}
                      placeholder="plan_123"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync API</CardTitle>
                <CardDescription>Test sync hosting với control panel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Hosting ID *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={syncHostingId}
                      onChange={(e) => setSyncHostingId(e.target.value)}
                      placeholder="1"
                    />
                    <Button onClick={testSync} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Sync
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retry" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Retry API</CardTitle>
                <CardDescription>Test retry queue system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GET Retry Stats</Label>
                    <Button onClick={testRetryGet} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      GET Stats
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>POST Retry</Label>
                    <Button onClick={testRetry} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Process Queue
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hosting ID (optional - để retry specific hosting)</Label>
                  <Input
                    value={retryHostingId}
                    onChange={(e) => setRetryHostingId(e.target.value)}
                    placeholder="Leave empty to process all queue"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enhance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enhance API Configuration</CardTitle>
                <CardDescription>
                  Cấu hình được tự động tải từ database. Bạn có thể override bằng cách nhập thủ công.
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadEnhanceConfig}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại từ Database
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>API Key *</Label>
                    <Input
                      type="password"
                      value={enhanceApiKey}
                      onChange={(e) => setEnhanceApiKey(e.target.value)}
                      placeholder="your_api_key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL *</Label>
                    <Input
                      value={enhanceBaseUrl}
                      onChange={(e) => setEnhanceBaseUrl(e.target.value)}
                      placeholder="https://api.enhance.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Org ID (optional)</Label>
                    <Input
                      value={enhanceOrgId}
                      onChange={(e) => setEnhanceOrgId(e.target.value)}
                      placeholder="org_id"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health Check & Version</CardTitle>
                <CardDescription>Kiểm tra kết nối và version của API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={testEnhanceVersion} 
                    disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Get Version
                  </Button>
                  <Button 
                    onClick={testEnhanceHealth} 
                    disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Health Check
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customers API</CardTitle>
                <CardDescription>Quản lý customers trên Enhance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Find Customer by Email</Label>
                    <div className="flex gap-2">
                      <Input
                        value={enhanceCustomerEmail}
                        onChange={(e) => setEnhanceCustomerEmail(e.target.value)}
                        placeholder="customer@example.com"
                      />
                      <Button 
                        onClick={testEnhanceFindCustomer} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                        size="sm"
                      >
                        Find
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Get Customer by ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={enhanceCustomerId}
                        onChange={(e) => setEnhanceCustomerId(e.target.value)}
                        placeholder="customer_id"
                      />
                      <Button 
                        onClick={testEnhanceGetCustomer} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                        size="sm"
                      >
                        Get
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Create Customer</Label>
                    <div className="space-y-2">
                      <Input
                        value={enhanceCustomerName}
                        onChange={(e) => setEnhanceCustomerName(e.target.value)}
                        placeholder="Customer Name *"
                      />
                      <Input
                        value={enhanceCustomerEmail}
                        onChange={(e) => setEnhanceCustomerEmail(e.target.value)}
                        placeholder="Email *"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={enhanceCustomerPhone}
                          onChange={(e) => setEnhanceCustomerPhone(e.target.value)}
                          placeholder="Phone (optional)"
                        />
                        <Input
                          value={enhanceCustomerCompany}
                          onChange={(e) => setEnhanceCustomerCompany(e.target.value)}
                          placeholder="Company (optional)"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Note: Organization name is required. Email will be set via login creation after organization is created. Phone and company are not supported in Enhance API.
                      </p>
                      <Button 
                        onClick={testEnhanceCreateCustomer} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceCustomerName}
                        className="w-full"
                      >
                        Create Customer
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Update/Delete Customer</Label>
                    <div className="space-y-2">
                      <Input
                        value={enhanceCustomerId}
                        onChange={(e) => setEnhanceCustomerId(e.target.value)}
                        placeholder="Customer ID *"
                      />
                      <Input
                        value={enhanceCustomerName}
                        onChange={(e) => setEnhanceCustomerName(e.target.value)}
                        placeholder="New Name (only field that can be updated)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: Only name can be updated. Email, phone, company cannot be updated via API.
                      </p>
                      <Button 
                        onClick={testEnhanceUpdateCustomer} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceCustomerId || !enhanceCustomerName}
                        className="w-full"
                        variant="outline"
                      >
                        Update Customer
                      </Button>
                      <Button 
                        onClick={testEnhanceDeleteCustomer} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceCustomerId}
                        className="w-full"
                        variant="destructive"
                      >
                        Delete Customer
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plans API</CardTitle>
                <CardDescription>Lấy danh sách plans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Get All Plans</Label>
                    <Button 
                      onClick={testEnhanceGetPlans} 
                      disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                      className="w-full"
                    >
                      Get All Plans
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Get Plan by ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={enhancePlanId}
                        onChange={(e) => setEnhancePlanId(e.target.value)}
                        placeholder="plan_id"
                      />
                      <Button 
                        onClick={testEnhanceGetPlan} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl}
                      >
                        Get
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Websites & Subscriptions API</CardTitle>
                <CardDescription>Tạo và quản lý websites/hosting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Create Subscription</Label>
                    <div className="space-y-2">
                      <Input
                        value={enhanceCustomerId}
                        onChange={(e) => setEnhanceCustomerId(e.target.value)}
                        placeholder="Customer ID *"
                      />
                      <Input
                        value={enhancePlanId}
                        onChange={(e) => setEnhancePlanId(e.target.value)}
                        placeholder="Plan ID *"
                      />
                      <Button 
                        onClick={testEnhanceCreateSubscription} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceCustomerId || !enhancePlanId}
                        className="w-full"
                      >
                        Create Subscription
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Create Website</Label>
                    <div className="space-y-2">
                      <Input
                        value={enhanceCustomerId}
                        onChange={(e) => setEnhanceCustomerId(e.target.value)}
                        placeholder="Customer ID *"
                      />
                      <Input
                        value={enhanceDomain}
                        onChange={(e) => setEnhanceDomain(e.target.value)}
                        placeholder="Domain *"
                      />
                      <Input
                        value={enhanceSubscriptionId}
                        onChange={(e) => setEnhanceSubscriptionId(e.target.value)}
                        placeholder="Subscription ID (integer, optional)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: Website is created in customer org context. Domain is required. Subscription ID must be integer.
                      </p>
                      <Button 
                        onClick={testEnhanceCreateWebsite} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceCustomerId || !enhanceDomain}
                        className="w-full"
                      >
                        Create Website
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Get Website by ID</Label>
                    <div className="space-y-2">
                      <Input
                        value={enhanceWebsiteId}
                        onChange={(e) => setEnhanceWebsiteId(e.target.value)}
                        placeholder="Website ID (UUID) *"
                      />
                      <Input
                        value={enhanceCustomerId}
                        onChange={(e) => setEnhanceCustomerId(e.target.value)}
                        placeholder="Customer Org ID (optional - if website was created in customer org)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: If website was created in customer org context, provide Customer Org ID. Otherwise, uses parent org.
                      </p>
                      <Button 
                        onClick={testEnhanceGetWebsite} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceWebsiteId}
                        className="w-full"
                      >
                        Get Website
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Delete Website</Label>
                    <div className="flex gap-2">
                      <Input
                        value={enhanceWebsiteId}
                        onChange={(e) => setEnhanceWebsiteId(e.target.value)}
                        placeholder="website_id"
                      />
                      <Button 
                        onClick={testEnhanceDeleteWebsite} 
                        disabled={loading || !enhanceApiKey || !enhanceBaseUrl || !enhanceWebsiteId}
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>API Results</CardTitle>
            <CardDescription>Kết quả các API calls</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có kết quả nào. Hãy test một API endpoint.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-1 rounded">
                          {result.method}
                        </span>
                        <span className="text-sm text-muted-foreground">{result.endpoint}</span>
                        {result.status && (
                          <span className={`text-sm font-semibold ${
                            result.status >= 200 && result.status < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {result.status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {result.requestBody && (
                      <div>
                        <Label className="text-xs">Request Body:</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}
                    {result.response && (
                      <div>
                        <Label className="text-xs">Response:</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    {result.error && (
                      <div className="text-sm text-red-600">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

