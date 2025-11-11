'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Server,
  Search,
  Calendar,
  MapPin
} from 'lucide-react'
import { toastError } from '@/lib/toast'

interface RegisteredHosting {
  id: string
  planName: string
  domain?: string
  storage: number
  bandwidth: number
  price: number
  status: string
  expiryDate?: string
  serverLocation?: string
}

export default function HostingManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hosting, setHosting] = useState<RegisteredHosting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)

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
      const response = await fetch('/api/customers')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const customer = result.data.find((c: any) => c.email === session.user?.email)
          if (customer) {
            setCustomerId(customer.id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchHosting()
    }
  }, [customerId])

  const fetchHosting = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/hosting?customerId=${customerId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setHosting(result.data)
        }
      } else {
        setHosting([])
        toastError('Không thể tải danh sách hosting')
      }
    } catch (error) {
      setHosting([])
      toastError('Có lỗi xảy ra khi tải danh sách hosting')
      console.error('Error fetching hosting:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHosting = hosting.filter(h =>
    h.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.domain && h.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm dừng</Badge>
      case 'INACTIVE':
        return <Badge variant="outline">Không hoạt động</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <MemberLayout title="Quản lý Hosting">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <Server className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Quản lý Hosting
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100">
                Quản lý và theo dõi tất cả gói hosting của bạn
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
              <CardDescription>Tìm kiếm hosting theo tên gói hoặc domain</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm hosting..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hosting List */}
          {filteredHosting.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'Không tìm thấy hosting nào' : 'Bạn chưa có hosting nào đã đăng ký'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHosting.map((h) => (
                <Card key={h.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Server className="h-5 w-5 text-green-600" />
                        <span>{h.planName}</span>
                      </div>
                      {getStatusBadge(h.status)}
                    </CardTitle>
                    <CardDescription>
                      {h.domain || 'Chưa có domain'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Dung lượng:</span>
                        <span className="font-medium">{h.storage}GB SSD</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Băng thông:</span>
                        <span className="font-medium">{h.bandwidth}GB/tháng</span>
                      </div>
                      {h.serverLocation && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{h.serverLocation}</span>
                        </div>
                      )}
                      {h.expiryDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Hết hạn: {formatDate(h.expiryDate)}
                          </span>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Giá:</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(parseFloat(h.price.toString()))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  )
}

