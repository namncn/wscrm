'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface TestResult {
  scenario: string
  steps: Array<{
    step: number
    name: string
    status: 'processing' | 'success' | 'error' | 'warning'
    message?: string
  }>
  customer: {
    id: number
    email: string
    name: string
    externalAccountId: string | null
  } | null
  order: {
    id: number
    customerId: number
    totalAmount: string
    status: string
  } | null
  hosting: {
    id: number
    customerId: number
    hostingTypeId: number
    syncStatus: string
    subscriptionId: number | null
    syncError: string | null
  } | null
  checks: {
    customerCreated: boolean
    customerHasExternalId: boolean
    hostingCreated: boolean
    hostingSynced: boolean
    subscriptionCreated: boolean
  } | null
  allPassed: boolean | null
  errors: string[]
}

export default function TestHostingFlowPage() {
  const { data: session, status } = useSession()
  const [scenario, setScenario] = useState<'existing' | 'new'>('existing')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleTest = async () => {
    if (!session) {
      toastError('Bạn cần đăng nhập để chạy test')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/hosting-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          customerEmail: customerEmail || undefined,
          customerName: customerName || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult(data.data)
        toastSuccess('Test hoàn tất!')
      } else {
        toastError(data.error || 'Test thất bại')
        setResult(null)
      }
    } catch (error: any) {
      toastError(`Lỗi: ${error.message}`)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      default:
        return 'text-blue-600'
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Test Flow Mua Hosting
          </h1>
          <p className="text-gray-600 mt-2">
            Kiểm tra flow tự động khi thanh toán thành công: tạo customer, tạo hosting, tạo subscription trên Enhance
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cấu hình Test</CardTitle>
            <CardDescription>
              Chọn phương án test và nhập thông tin (nếu cần)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Phương án test</Label>
              <RadioGroup value={scenario} onValueChange={(v) => setScenario(v as 'existing' | 'new')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="cursor-pointer">
                    Phương án 1: Customer đã có sẵn (đã có externalAccountId)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="cursor-pointer">
                    Phương án 2: Customer mới (chưa có externalAccountId)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email Customer (optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder={scenario === 'existing' ? 'existing.customer@test.com' : 'new.customer@test.com'}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                {scenario === 'existing'
                  ? 'Nếu không nhập, sẽ tìm customer với email: existing.customer@test.com'
                  : 'Nếu không nhập, sẽ tạo customer mới với email tự động'}
              </p>
            </div>

            {scenario === 'new' && (
              <div className="space-y-2">
                <Label htmlFor="customerName">Tên Customer (optional)</Label>
                <Input
                  id="customerName"
                  type="text"
                  placeholder="Test Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Nếu không nhập, sẽ dùng tên tự động
                </p>
              </div>
            )}

            <Button onClick={handleTest} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang chạy test...
                </>
              ) : (
                'Chạy Test'
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>
                Kết quả Test: {result.scenario === 'existing' ? 'Customer có sẵn' : 'Customer mới'}
              </CardTitle>
              <CardDescription>
                {result.allPassed ? (
                  <span className="text-green-600">✅ Tất cả kiểm tra đã pass!</span>
                ) : (
                  <span className="text-yellow-600">⚠️ Một số kiểm tra chưa pass</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Steps */}
              <div className="space-y-3">
                <h3 className="font-semibold">Các bước đã thực hiện:</h3>
                {result.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                    <div className="flex-1">
                      <div className="font-medium">{step.step}. {step.name}</div>
                      {step.message && (
                        <div className={`text-sm mt-1 ${getStatusColor(step.status)}`}>
                          {step.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              {result.customer && (
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold">Thông tin Customer:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {result.customer.id}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {result.customer.email}
                    </div>
                    <div>
                      <span className="font-medium">Tên:</span> {result.customer.name}
                    </div>
                    <div>
                      <span className="font-medium">External Account ID:</span>{' '}
                      {result.customer.externalAccountId ? (
                        <span className="text-green-600">{result.customer.externalAccountId}</span>
                      ) : (
                        <span className="text-yellow-600">NULL</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info */}
              {result.order && (
                <div className="space-y-2 p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold">Thông tin Order:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {result.order.id}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {result.order.status}
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> {result.order.totalAmount}
                    </div>
                  </div>
                </div>
              )}

              {/* Hosting Info */}
              {result.hosting && (
                <div className="space-y-2 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold">Thông tin Hosting:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {result.hosting.id}
                    </div>
                    <div>
                      <span className="font-medium">Sync Status:</span>{' '}
                      <span className={result.hosting.syncStatus === 'SYNCED' ? 'text-green-600' : 'text-yellow-600'}>
                        {result.hosting.syncStatus}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Subscription ID:</span>{' '}
                      {result.hosting.subscriptionId ? (
                        <span className="text-green-600">{result.hosting.subscriptionId}</span>
                      ) : (
                        <span className="text-yellow-600">NULL</span>
                      )}
                    </div>
                    {result.hosting.syncError && (
                      <div className="col-span-2">
                        <span className="font-medium text-red-600">Sync Error:</span>{' '}
                        <span className="text-red-600">{result.hosting.syncError}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checks */}
              {result.checks && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold">Kết quả kiểm tra:</h3>
                  <div className="space-y-2">
                    {Object.entries(result.checks).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {key === 'customerCreated' && 'Customer đã được tạo/lấy'}
                          {key === 'customerHasExternalId' && 'Customer có externalAccountId'}
                          {key === 'hostingCreated' && 'Hosting đã được tạo'}
                          {key === 'hostingSynced' && 'Hosting đã được sync lên Enhance'}
                          {key === 'subscriptionCreated' && 'Subscription đã được tạo và lưu ID'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-red-600">Lỗi:</h3>
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600">
                      - {error}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

