'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Globe, Server, FileText, ShoppingCart, Users, Edit, Loader2, Activity, AlertCircle, Wrench } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastError } from '@/lib/toast'

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
  createdAt: string
  updatedAt: string
  domainName: string | null
  hostingPlanName: string | null
  vpsPlanName: string | null
  contractNumber: string | null
  orderNumber: string | null
  customerName: string | null
  customerEmail: string | null
}

export default function WebsiteViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [website, setWebsite] = useState<Website | null>(null)
  const [loading, setLoading] = useState(true)

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  const fetchWebsite = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/websites/${id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setWebsite(result.data)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
            <Activity className="h-3 w-3" />
            <span>Đang hoạt động</span>
          </Badge>
        )
      case 'DOWN':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
            <AlertCircle className="h-3 w-3" />
            <span>Đang tắt</span>
          </Badge>
        )
      case 'MAINTENANCE':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center space-x-1">
            <Wrench className="h-3 w-3" />
            <span>Bảo trì</span>
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/admin/websites')}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {website.name}
                </h1>
                {getStatusBadge(website.status)}
              </div>
              {website.domainName && (
                <p className="text-sm text-gray-500 mt-1">{website.domainName}</p>
              )}
            </div>
          </div>
          <Button onClick={() => router.push(`/admin/websites/${website.id}/edit`)}>
            <Edit className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Tên website</label>
                <p className="mt-0.5">{website.name}</p>
              </div>
              {website.description && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Mô tả</label>
                    <p className="mt-0.5">{website.description}</p>
                  </div>
                </>
              )}
              {website.notes && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Ghi chú</label>
                    <p className="mt-0.5">{website.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Khách hàng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Tên</label>
                <p className="mt-0.5">{website.customerName || <span className="text-gray-400">-</span>}</p>
              </div>
              {website.customerEmail && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="mt-0.5">{website.customerEmail}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Domain Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-600" />
                <span>Tên miền</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {website.domainName ? (
                <p>{website.domainName}</p>
              ) : (
                <p className="text-gray-400 text-xs">Chưa liên kết</p>
              )}
            </CardContent>
          </Card>

          {/* Hosting Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-600" />
                <span>Hosting</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {website.hostingPlanName ? (
                <p>{website.hostingPlanName}</p>
              ) : (
                <p className="text-gray-400 text-xs">Chưa liên kết</p>
              )}
            </CardContent>
          </Card>

          {/* VPS Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-pink-600" />
                <span>VPS</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {website.vpsPlanName ? (
                <p>{website.vpsPlanName}</p>
              ) : (
                <p className="text-gray-400 text-xs">Chưa liên kết</p>
              )}
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span>Hợp đồng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {website.contractNumber ? (
                <p>{website.contractNumber}</p>
              ) : (
                <p className="text-gray-400 text-xs">Chưa liên kết</p>
              )}
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-600" />
                <span>Đơn hàng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {website.orderNumber ? (
                <p>{website.orderNumber}</p>
              ) : (
                <p className="text-gray-400 text-xs">Chưa liên kết</p>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader className="gap-0">
              <CardTitle className="text-base">Thời gian</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Ngày tạo</label>
                <p className="mt-0.5">{new Date(website.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <Separator className="my-2" />
              <div>
                <label className="text-xs font-medium text-gray-500">Cập nhật</label>
                <p className="mt-0.5">{new Date(website.updatedAt).toLocaleString('vi-VN')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

