'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Globe,
  Search,
  Eye,
  Server,
  FileText,
  ShoppingCart,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
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

export default function WebsiteManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchCustomerId()
  }, [session, status, router])

  const fetchCustomerId = async () => {
    try {
      if (!session?.user?.email) return
      const response = await fetch('/api/customers/me')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCustomerId(result.data.id)
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchWebsites()
    }
  }, [customerId])

  const fetchWebsites = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/websites?customerId=${customerId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setWebsites(result.data)
        }
      } else {
        setWebsites([])
        toastError('Không thể tải danh sách websites')
      }
    } catch (error) {
      setWebsites([])
      toastError('Có lỗi xảy ra khi tải danh sách websites')
      console.error('Error fetching websites:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWebsites = websites.filter(website =>
    website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (website.domainName && website.domainName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (website.hostingPlanName && website.hostingPlanName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (website.vpsPlanName && website.vpsPlanName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
      case 'DOWN':
        return <Badge className="bg-red-100 text-red-800">Đã dừng</Badge>
      case 'MAINTENANCE':
        return <Badge className="bg-yellow-100 text-yellow-800">Bảo trì</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'DOWN':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'MAINTENANCE':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Globe className="h-5 w-5 text-gray-600" />
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleViewWebsite = (website: Website) => {
    setSelectedWebsite(website)
    setIsViewDialogOpen(true)
  }

  if (status === 'loading' || loading) {
    return (
      <MemberLayout title="Quản lý Website">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MemberLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <MemberLayout title="Quản lý Website">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <Globe className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Quản lý Website
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-purple-100">
                Quản lý và theo dõi tất cả websites của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Search */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Tìm Kiếm</CardTitle>
              <CardDescription>Tìm kiếm website theo tên, tên miền, hosting hoặc VPS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Websites List */}
          {filteredWebsites.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'Không tìm thấy website nào' : 'Bạn chưa có website nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWebsites.map((website) => (
                <Card key={website.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(website.status)}
                        <span className="truncate">{website.name}</span>
                      </div>
                      {getStatusBadge(website.status)}
                    </CardTitle>
                    {website.domainName && (
                      <CardDescription className="flex items-center space-x-1">
                        <Globe className="h-4 w-4" />
                        <span>{website.domainName}</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {website.hostingPlanName && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Server className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Hosting:</span>
                          <span className="font-medium">{website.hostingPlanName}</span>
                        </div>
                      )}
                      {website.vpsPlanName && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Server className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">VPS:</span>
                          <span className="font-medium">{website.vpsPlanName}</span>
                        </div>
                      )}
                      {website.contractNumber && (
                        <div className="flex items-center space-x-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Hợp đồng:</span>
                          <span className="font-medium">{website.contractNumber}</span>
                        </div>
                      )}
                      {website.orderNumber && (
                        <div className="flex items-center space-x-2 text-sm">
                          <ShoppingCart className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Đơn hàng:</span>
                          <span className="font-medium">{website.orderNumber}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Tạo: {new Date(website.createdAt).toLocaleDateString('vi-VN')}</span>
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => handleViewWebsite(website)}
                          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Xem chi tiết</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Website Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedWebsite && getStatusIcon(selectedWebsite.status)}
              <span>Chi Tiết Website</span>
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về website
            </DialogDescription>
          </DialogHeader>
          {selectedWebsite && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên Website</label>
                <p className="text-lg font-semibold mt-1">{selectedWebsite.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                <div className="mt-1">{getStatusBadge(selectedWebsite.status)}</div>
              </div>
              {selectedWebsite.domainName && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <span>Tên miền</span>
                  </label>
                  <p className="text-sm mt-1">{selectedWebsite.domainName}</p>
                </div>
              )}
              {selectedWebsite.hostingPlanName && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Server className="h-4 w-4" />
                    <span>Hosting</span>
                  </label>
                  <p className="text-sm mt-1">{selectedWebsite.hostingPlanName}</p>
                </div>
              )}
              {selectedWebsite.vpsPlanName && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Server className="h-4 w-4" />
                    <span>VPS</span>
                  </label>
                  <p className="text-sm mt-1">{selectedWebsite.vpsPlanName}</p>
                </div>
              )}
              {selectedWebsite.contractNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>Số hợp đồng</span>
                  </label>
                  <p className="text-sm mt-1">{selectedWebsite.contractNumber}</p>
                </div>
              )}
              {selectedWebsite.orderNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Số đơn hàng</span>
                  </label>
                  <p className="text-sm mt-1">{selectedWebsite.orderNumber}</p>
                </div>
              )}
              {selectedWebsite.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <p className="text-sm mt-1 text-gray-600">{selectedWebsite.description}</p>
                </div>
              )}
              {selectedWebsite.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                  <p className="text-sm mt-1 text-gray-600">{selectedWebsite.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="text-sm mt-1 text-gray-600">{formatDate(selectedWebsite.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cập nhật</label>
                  <p className="text-sm mt-1 text-gray-600">{formatDate(selectedWebsite.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setIsViewDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberLayout>
  )
}

