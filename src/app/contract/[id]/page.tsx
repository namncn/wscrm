'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  FileText,
  CalendarDays,
  User,
  Mail,
  CreditCard,
  Server,
  Globe,
  HardDrive,
  Cpu,
  AlertTriangle,
  Building2,
  Landmark,
  MapPin,
  Phone,
  ArrowLeft,
} from 'lucide-react'

interface DomainDetail {
  id: number
  domainName: string
  registrar: string | null
  registrationDate: string | null
  expiryDate: string | null
  status: string | null
  price: string | null
}

interface HostingDetail {
  id: number
  planName: string
  storage: number | null
  bandwidth: number | null
  price: string | null
  status: string | null
  expiryDate: string | null
  serverLocation: string | null
}

interface VpsDetail {
  id: number
  planName: string
  cpu: number | null
  ram: number | null
  storage: number | null
  bandwidth: number | null
  price: string | null
  status: string | null
  expiryDate: string | null
  os: string | null
  ipAddress: string | null
}

interface ContractDetail {
  id: number
  contractNumber: string
  orderId: number
  orderNumber: string | null
  orderStatus: string | null
  orderTotalAmount: string | null
  customerId: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerCompany: string | null
  customerTaxCode: string | null
  customerAddress: string | null
  companyEmail: string | null
  companyPhone: string | null
  companyAddress: string | null
  companyTaxCode: string | null
  assignedUserName: string | null
  assignedUserEmail: string | null
  startDate: string
  endDate: string
  totalValue: number
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  domains: DomainDetail[]
  hostings: HostingDetail[]
  vpss: VpsDetail[]
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  ACTIVE: { label: 'Hoạt động', variant: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Hết hạn', variant: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã hủy', variant: 'bg-amber-100 text-amber-700' },
  DEFAULT: { label: 'Không xác định', variant: 'bg-slate-100 text-slate-700' },
}

function formatCurrency(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined) return '—'
  const numeric =
    typeof amount === 'string' ? Number.parseFloat(amount) : typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(numeric)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(numeric))
}

function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('vi-VN')
}

export default function ContractDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const routeParams = useParams<{ id: string | string[] }>()
  const contractId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contract, setContract] = useState<ContractDetail | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!contractId) {
      setError('Không tìm thấy mã hợp đồng hợp lệ')
      setContract(null)
      setLoading(false)
      return
    }

    if (!session) {
      const callbackUrl = encodeURIComponent(`/contract/${contractId}`)
      router.replace(`/auth/signin?callbackUrl=${callbackUrl}`)
      return
    }

    const fetchContract = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/contract/${contractId}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        const result = await response.json()

        if (response.status === 401) {
          const callbackUrl = encodeURIComponent(`/contract/${contractId}`)
          router.replace(`/auth/signin?callbackUrl=${callbackUrl}`)
          return
        }

        if (!response.ok || !result.success) {
          console.error('Contract detail fetch failed', response.status, result)
          const message = result.error || result.message || 'Không thể tải thông tin hợp đồng'
          setError(message)
          setContract(null)
          return
        }

        setContract(result.data as ContractDetail)
      } catch (err) {
        console.error('Error fetching contract detail:', err)
        setError('Đã xảy ra lỗi khi tải thông tin hợp đồng')
        setContract(null)
      } finally {
        setLoading(false)
      }
    }

    fetchContract()
  }, [status, session, router, contractId])

  const isDashboardUser = useMemo(() => {
    const role = (session?.user as any)?.role
    return role === 'ADMIN' || role === 'USER'
  }, [session])

  const LayoutComponent = isDashboardUser ? DashboardLayout : MemberLayout

  const layoutProps = isDashboardUser
    ? {}
    : {
        title: 'Chi tiết hợp đồng',
      }

  const mainContent = (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Chi tiết hợp đồng</h1>
          <p className="text-slate-600">Xem thông tin chi tiết về hợp đồng và các dịch vụ đã đăng ký.</p>
        </div>
        {isDashboardUser && (
          <Button
            variant="outline"
            className="hidden md:inline-flex items-center gap-2"
            onClick={() => router.push('/admin/contracts')}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </Button>
        )}
      </div>
      {isDashboardUser && (
        <Button
          variant="outline"
          className="mb-4 md:hidden flex items-center gap-2 w-full justify-center"
          onClick={() => router.push('/admin/contracts')}
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 flex flex-col items-center text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-600" />
            <h2 className="text-xl font-semibold text-red-700">Không thể tải thông tin hợp đồng</h2>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : contract ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="h-6 w-6 text-indigo-500" />
                  {contract.contractNumber}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span>
                      {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-4 hidden md:block" />
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <span>Giá trị: {formatCurrency(contract.totalValue)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-3">
                <Badge className={statusConfig[contract.status]?.variant ?? statusConfig.DEFAULT.variant}>
                  {statusConfig[contract.status]?.label ?? statusConfig.DEFAULT.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin công ty</h3>
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 text-indigo-500" />
                      <p className="font-medium text-slate-700">
                        {contract.customerCompany ?? 'Chưa cập nhật tên công ty'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Landmark className="mt-0.5 h-4 w-4 text-purple-500" />
                      <p>{contract.companyTaxCode ?? 'Chưa cập nhật mã số thuế doanh nghiệp'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 text-indigo-400" />
                      <p>{contract.companyEmail ?? 'Chưa cập nhật email công ty'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 text-blue-500" />
                      <p>{contract.companyPhone ?? 'Chưa cập nhật số điện thoại công ty'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <p>{contract.companyAddress ?? 'Chưa cập nhật địa chỉ công ty'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin khách hàng</h3>
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 text-indigo-500" />
                      <p className="font-medium text-slate-700">
                        {contract.customerName ?? 'Không có tên'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Landmark className="mt-0.5 h-4 w-4 text-purple-500" />
                      <p>{contract.customerTaxCode ?? 'Chưa cập nhật mã số thuế cá nhân'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 text-indigo-400" />
                      <p>{contract.customerEmail ?? 'Không có email'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 text-blue-500" />
                      <p>{contract.customerPhone ?? 'Chưa cập nhật số điện thoại'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <p>{contract.customerAddress ?? 'Chưa cập nhật địa chỉ liên hệ'}</p>
                    </div>
                  </div>
                  {contract.assignedUserName && (
                    <p className="text-xs text-slate-500">
                      Phụ trách: {contract.assignedUserName}
                      {contract.assignedUserEmail ? ` (${contract.assignedUserEmail})` : ''}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Server className="h-5 w-5 text-indigo-500" />
                Dịch vụ đã đăng ký
              </CardTitle>
              <p className="text-sm text-slate-600">
                Danh sách các dịch vụ (domain, hosting, VPS) thuộc hợp đồng này.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 tracking-wide">
                  <Globe className="h-4 w-4 text-slate-500" />
                  Tên miền
                </h4>
                {contract.domains.length === 0 ? (
                  <p className="text-sm text-slate-500">Không có tên miền đính kèm hợp đồng.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {contract.domains.map((item) => (
                      <div
                        key={`domain-${item.id}`}
                        className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-500/10">
                              <Globe className="h-5 w-5 text-indigo-500" />
                            </span>
                            <span className="font-semibold text-slate-800">{item.domainName}</span>
                          </div>
                          {item.status && (
                            <Badge className="bg-indigo-500/15 text-indigo-600 border border-indigo-100 text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <dl className="mt-3 text-sm text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <dt>Ngày đăng ký:</dt>
                            <dd className="font-medium">{formatDate(item.registrationDate)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Ngày hết hạn:</dt>
                            <dd className="font-medium">{formatDate(item.expiryDate)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Giá:</dt>
                            <dd className="font-medium">{formatCurrency(item.price)}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 tracking-wide">
                  <HardDrive className="h-4 w-4 text-slate-500" />
                  Hosting
                </h4>
                {contract.hostings.length === 0 ? (
                  <p className="text-sm text-slate-500">Không có gói hosting nào trong hợp đồng.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {contract.hostings.map((item) => (
                      <div
                        key={`hosting-${item.id}`}
                        className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/10">
                              <HardDrive className="h-5 w-5 text-sky-600" />
                            </span>
                            <span className="font-semibold text-slate-800">{item.planName}</span>
                          </div>
                          {item.status && (
                            <Badge className="bg-sky-500/15 text-sky-600 border border-sky-100 text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <dl className="mt-3 text-sm text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <dt>Dung lượng:</dt>
                            <dd className="font-medium">{item.storage ? `${item.storage} GB` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Băng thông:</dt>
                            <dd className="font-medium">{item.bandwidth ? `${item.bandwidth} GB` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Ngày hết hạn:</dt>
                            <dd className="font-medium">{formatDate(item.expiryDate)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Giá:</dt>
                            <dd className="font-medium">{formatCurrency(item.price)}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 tracking-wide">
                  <Cpu className="h-4 w-4 text-slate-500" />
                  VPS
                </h4>
                {contract.vpss.length === 0 ? (
                  <p className="text-sm text-slate-500">Không có gói VPS nào trong hợp đồng.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {contract.vpss.map((item) => (
                      <div
                        key={`vps-${item.id}`}
                        className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10">
                              <Cpu className="h-5 w-5 text-emerald-600" />
                            </span>
                            <span className="font-semibold text-slate-800">{item.planName}</span>
                          </div>
                          {item.status && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-100 text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <dl className="mt-3 text-sm text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <dt>CPU:</dt>
                            <dd className="font-medium">{item.cpu ? `${item.cpu} Core` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>RAM:</dt>
                            <dd className="font-medium">{item.ram ? `${item.ram} GB` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Storage:</dt>
                            <dd className="font-medium">{item.storage ? `${item.storage} GB` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Băng thông:</dt>
                            <dd className="font-medium">{item.bandwidth ? `${item.bandwidth} GB` : '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Hệ điều hành:</dt>
                            <dd className="font-medium">{item.os ?? '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Ngày hết hạn:</dt>
                            <dd className="font-medium">{formatDate(item.expiryDate)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Giá:</dt>
                            <dd className="font-medium">{formatCurrency(item.price)}</dd>
                          </div>
                        </dl>
                        {item.ipAddress && (
                          <p className="mt-2 text-xs text-slate-500">IP: {item.ipAddress}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )

  return (
    <LayoutComponent {...layoutProps}>
      <div className="py-8 px-4 md:px-8">{mainContent}</div>
    </LayoutComponent>
  )
}

