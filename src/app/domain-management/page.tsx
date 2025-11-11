'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Globe,
  Search,
  Calendar
} from 'lucide-react'
import { toastError } from '@/lib/toast'

interface Domain {
  id: string
  domainName: string
  registrar?: string
  registrationDate?: string
  expiryDate?: string
  status: string
  price?: number
}

export default function DomainManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [domain, setdomain] = useState<Domain[]>([])
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
      fetchdomain()
    }
  }, [customerId])

  const fetchdomain = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/domain?customerId=${customerId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setdomain(result.data)
        }
      } else {
        setdomain([])
        toastError('Không thể tải danh sách tên miền')
      }
    } catch (error) {
      setdomain([])
      toastError('Có lỗi xảy ra khi tải danh sách tên miền')
      console.error('Error fetching domain:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtereddomain = domain.filter(domain =>
    domain.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (domain.registrar && domain.registrar.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Hết hạn</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm dừng</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
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
    <MemberLayout title="Quản lý tên miền">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <Globe className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Quản lý tên miền
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Quản lý và theo dõi tất cả tên miền của bạn
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
              <CardDescription>Tìm kiếm tên miền theo tên hoặc nhà đăng ký</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm tên miền..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* domain List */}
          {filtereddomain.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'Không tìm thấy tên miền nào' : 'Bạn chưa có tên miền nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtereddomain.map((domain) => (
                <Card key={domain.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        <span className="truncate">{domain.domainName}</span>
                      </div>
                      {getStatusBadge(domain.status)}
                    </CardTitle>
                    {domain.registrar && (
                      <CardDescription>{domain.registrar}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ngày đăng ký:</span>
                        <span className="text-sm font-medium flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(domain.registrationDate)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ngày hết hạn:</span>
                        <span className="text-sm font-medium flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(domain.expiryDate)}</span>
                        </span>
                      </div>
                      {domain.price && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Giá:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatCurrency(domain.price)}
                            </span>
                          </div>
                        </div>
                      )}
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

