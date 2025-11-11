'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import { DomainCombobox } from '@/components/ui/domain-combobox'
import { HostingCombobox } from '@/components/ui/hosting-combobox'
import { VPSCombobox } from '@/components/ui/vps-combobox'
import { ContractCombobox } from '@/components/ui/contract-combobox'
import { OrderCombobox } from '@/components/ui/order-combobox'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastSuccess, toastError } from '@/lib/toast'

interface Website {
  id: number
  name: string
  domainId: number | null
  hostingId: number | null
  vpsId: number | null
  contractId: number | null
  orderId: number | null
  customerId: number
  status: 'LIVE' | 'DOWN' | 'MAINTENANCE'
  description: string | null
  notes: string | null
}

interface Customer {
  id: number
  name: string
  email: string
}

interface Domain {
  id: number
  domainName: string
}

interface Hosting {
  id: number
  planName: string
  storage?: number | null
  bandwidth?: number | null
  price?: string | null
}

interface VPS {
  id: number
  planName: string
  cpu?: number | null
  ram?: number | null
  storage?: number | null
  bandwidth?: number | null
  price?: string | null
}

interface Contract {
  id: number
  contractNumber: string
}

interface Order {
  id: number
}

export default function WebsiteEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [website, setWebsite] = useState<Website | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [hostings, setHostings] = useState<Hosting[]>([])
  const [vpss, setVpss] = useState<VPS[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)


  const [formData, setFormData] = useState({
    name: '',
    domainId: null as number | null,
    hostingId: null as number | null,
    vpsId: null as number | null,
    contractId: null as number | null,
    orderId: '',
    customerId: null as number | null,
    status: 'LIVE' as 'LIVE' | 'DOWN' | 'MAINTENANCE',
    description: '',
    notes: '',
  })

  // Check authentication and redirect if needed
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fetch data only when params.id changes (not on tab switch)
  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    if (params?.id) {
      fetchWebsite(params.id as string)
      fetchCustomers()
      // Don't fetch domains, hostings, vpss, contracts, orders here - they will be fetched when customer is loaded
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  // Fetch domain, hosting, VPS, contracts and orders when customer is selected or changes
  useEffect(() => {
    if (formData.customerId) {
      fetchDomains(formData.customerId)
      fetchHostings(formData.customerId)
      fetchVPSs(formData.customerId)
      fetchContracts(formData.customerId)
      fetchOrders(formData.customerId)
    } else {
      // If no customer selected, clear all lists
      setDomains([])
      setHostings([])
      setVpss([])
      fetchContracts()
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customerId])

  const fetchWebsite = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/websites/${id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          setWebsite(data)
          setFormData({
            name: data.name || '',
            domainId: data.domainId || null,
            hostingId: data.hostingId || null,
            vpsId: data.vpsId || null,
            contractId: data.contractId || null,
            orderId: data.orderId ? data.orderId.toString() : '',
            customerId: data.customerId || null,
            status: data.status || 'LIVE',
            description: data.description || '',
            notes: data.notes || '',
          })
        } else {
          toastError('Không thể tải thông tin website')
          router.push('/admin/websites')
        }
      } else {
        toastError('Không thể tải thông tin website')
        router.push('/admin/websites')
      }
    } catch (error) {
      console.error('Error fetching website:', error)
      toastError('Lỗi khi tải thông tin website')
      router.push('/admin/websites')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCustomers(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchDomains = async (customerId?: number) => {
    try {
      const url = customerId 
        ? `/api/domain?customerId=${customerId}`
        : '/api/domain'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDomains(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    }
  }

  const fetchHostings = async (customerId?: number) => {
    try {
      const url = customerId 
        ? `/api/hosting?customerId=${customerId}`
        : '/api/hosting?purchased=all'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setHostings(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching hostings:', error)
    }
  }

  const fetchVPSs = async (customerId?: number) => {
    try {
      const url = customerId 
        ? `/api/vps?customerId=${customerId}`
        : '/api/vps?purchased=all'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVpss(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching VPSs:', error)
    }
  }

  const fetchContracts = async (customerId?: number) => {
    try {
      const url = customerId 
        ? `/api/contracts?customerId=${customerId}`
        : '/api/contracts'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setContracts(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    }
  }

  const fetchOrders = async (customerId?: number) => {
    try {
      const url = customerId 
        ? `/api/orders?customerId=${customerId}`
        : '/api/orders'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setOrders(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleSave = async () => {
    if (!website?.id) return

    if (!formData.name || !formData.customerId) {
      toastError('Tên website và khách hàng là bắt buộc')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/websites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: website.id,
          ...formData,
          domainId: formData.domainId,
          hostingId: formData.hostingId,
          vpsId: formData.vpsId,
          contractId: formData.contractId || null,
          orderId: formData.orderId ? parseInt(formData.orderId) : null,
        }),
      })

      if (response.ok) {
        toastSuccess('Cập nhật website thành công!')
        router.push(`/admin/websites/${website.id}`)
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể cập nhật website')
      }
    } catch (error) {
      console.error('Error updating website:', error)
      toastError('Có lỗi xảy ra khi cập nhật website')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session || !website) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push(`/admin/websites/${website.id}`)}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Chỉnh sửa Website
              </h1>
              <p className="text-gray-600 mt-1">Cập nhật thông tin website</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin website</CardTitle>
            <CardDescription>
              Cập nhật thông tin và liên kết của website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tên website <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nhập tên website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Khách hàng <span className="text-red-500">*</span>
                </Label>
                <CustomerCombobox
                  customers={customers}
                  value={formData.customerId || null}
                  onValueChange={(value) => {
                    const numValue = typeof value === 'string' ? parseInt(value) : value
                    setFormData({...formData, customerId: numValue || null})
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'LIVE' | 'DOWN' | 'MAINTENANCE') => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIVE">Đang hoạt động</SelectItem>
                    <SelectItem value="DOWN">Đang tắt</SelectItem>
                    <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="domainId">Tên miền</Label>
                <DomainCombobox
                  domains={domains}
                  value={formData.domainId}
                  onValueChange={(value) => setFormData({...formData, domainId: value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostingId">Hosting</Label>
                <HostingCombobox
                  hostings={hostings}
                  value={formData.hostingId}
                  onValueChange={(value) => setFormData({...formData, hostingId: value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpsId">VPS</Label>
                <VPSCombobox
                  vpss={vpss}
                  value={formData.vpsId}
                  onValueChange={(value) => setFormData({...formData, vpsId: value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractId">Hợp đồng</Label>
                <ContractCombobox
                  contracts={contracts}
                  value={formData.contractId}
                  onValueChange={(value) => {
                    const numValue = typeof value === 'string' ? parseInt(value) : value
                    setFormData({...formData, contractId: numValue || null})
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderId">Đơn hàng</Label>
                <OrderCombobox
                  orders={orders}
                  value={formData.orderId}
                  onValueChange={(value) => setFormData({...formData, orderId: value || ''})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Mô tả website"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Ghi chú"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

