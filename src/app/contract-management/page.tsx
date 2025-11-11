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
  FileText,
  Search,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Globe,
  Server,
  Database,
  HardDrive,
  Wifi,
  DollarSign,
  Cpu,
  MemoryStick,
  Box,
} from 'lucide-react'
import { toastError } from '@/lib/toast'

interface Contract {
  id: number
  contractNumber: string
  orderId: number | null
  customerId: number
  userId: number | null
  startDate: string
  endDate: string
  totalValue: number
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  customerName: string | null
  customerEmail: string | null
  userName: string | null
  orderNumber: string | null
  domainIds: number[]
  hostingIds: number[]
  vpsIds: number[]
}

export default function ContractManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [contractDetails, setContractDetails] = useState<{
    domains: Array<{ id: number; domainName: string; registrationDate?: string | null; expiryDate?: string | null }>
    hostings: Array<{ id: number; planName: string; storage?: number; bandwidth?: number; price?: string }>
    vpss: Array<{ id: number; planName: string; cpu?: number; ram?: number; storage?: number; price?: string }>
  }>({
    domains: [],
    hostings: [],
    vpss: [],
  })
  const [detailsLoading, setDetailsLoading] = useState({
    domains: false,
    hostings: false,
    vpss: false,
  })

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
      fetchContracts()
    }
  }, [customerId])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contracts?customerId=${customerId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setContracts(result.data)
        }
      } else {
        setContracts([])
        toastError('Không thể tải danh sách hợp đồng')
      }
    } catch (error) {
      setContracts([])
      toastError('Có lỗi xảy ra khi tải danh sách hợp đồng')
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContractDetails = async (contract: Contract) => {
    try {
      const domains: Array<{ id: number; domainName: string; registrationDate?: string | null; expiryDate?: string | null }> = []
      const hostings: Array<{ id: number; planName: string; storage?: number; bandwidth?: number; price?: string }> = []
      const vpss: Array<{ id: number; planName: string; cpu?: number; ram?: number; storage?: number; price?: string }> = []

      setContractDetails({ domains: [], hostings: [], vpss: [] })
      setDetailsLoading({
        domains: !!(contract.domainIds && contract.domainIds.length > 0),
        hostings: !!(contract.hostingIds && contract.hostingIds.length > 0),
        vpss: !!(contract.vpsIds && contract.vpsIds.length > 0),
      })

      // Fetch domain details
      if (contract.domainIds && contract.domainIds.length > 0) {
        await Promise.all(
          contract.domainIds.map(async (domainId) => {
            const response = await fetch(`/api/domain?id=${domainId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data && result.data.id) {
                domains.push({
                  id: result.data.id,
                  domainName: result.data.domainName || '',
                  registrationDate: result.data.registrationDate,
                  expiryDate: result.data.expiryDate,
                })
              }
            }
          })
        )
        setContractDetails((prev) => ({ ...prev, domains }))
      }
      setDetailsLoading((prev) => ({ ...prev, domains: false }))

      // Fetch hosting details
      if (contract.hostingIds && contract.hostingIds.length > 0) {
        await Promise.all(
          contract.hostingIds.map(async (hostingId) => {
            const response = await fetch(`/api/hosting?id=${hostingId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data && result.data.id) {
                hostings.push({
                  id: result.data.id,
                  planName: result.data.planName || '',
                  storage: result.data.storage,
                  bandwidth: result.data.bandwidth,
                  price: result.data.price,
                })
              }
            }
          })
        )
        setContractDetails((prev) => ({ ...prev, hostings }))
      }
      setDetailsLoading((prev) => ({ ...prev, hostings: false }))

      // Fetch VPS details
      if (contract.vpsIds && contract.vpsIds.length > 0) {
        await Promise.all(
          contract.vpsIds.map(async (vpsId) => {
            const response = await fetch(`/api/vps?id=${vpsId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data && result.data.id) {
                vpss.push({
                  id: result.data.id,
                  planName: result.data.planName || '',
                  cpu: result.data.cpu,
                  ram: result.data.ram,
                  storage: result.data.storage,
                  price: result.data.price,
                })
              }
            }
          })
        )
        setContractDetails((prev) => ({ ...prev, vpss }))
      }
      setDetailsLoading((prev) => ({ ...prev, vpss: false }))
    } catch (error) {
      console.error('Error fetching contract details:', error)
      setDetailsLoading({ domains: false, hostings: false, vpss: false })
    }
  }

  const filteredContracts = contracts.filter(contract =>
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.orderNumber && contract.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Hết hạn</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Đã hủy</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'EXPIRED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'CANCELLED':
        return <AlertCircle className="h-5 w-5 text-gray-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatPrice = (price: string | number | undefined) => {
    if (!price) return ''
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return price.toString()
    const formatted = Math.floor(numPrice).toLocaleString('vi-VN')
    return `${formatted} đ`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract)
    setIsViewDialogOpen(true)
    await fetchContractDetails(contract)
  }

  if (status === 'loading' || loading) {
    return (
      <MemberLayout title="Quản lý Hợp đồng">
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
    <MemberLayout title="Quản lý Hợp đồng">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Quản lý Hợp đồng
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-indigo-100">
                Quản lý và theo dõi tất cả hợp đồng của bạn
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
              <CardDescription>Tìm kiếm hợp đồng theo số hợp đồng hoặc số đơn hàng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm hợp đồng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contracts List */}
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'Không tìm thấy hợp đồng nào' : 'Bạn chưa có hợp đồng nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(contract.status)}
                        <span className="truncate">{contract.contractNumber}</span>
                      </div>
                      {getStatusBadge(contract.status)}
                    </CardTitle>
                    {contract.orderNumber && (
                      <CardDescription className="flex items-center space-x-1">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Đơn hàng: {contract.orderNumber}</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Giá trị:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(contract.totalValue)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div className="flex-1">
                          <div className="text-gray-600">Bắt đầu:</div>
                          <div className="font-medium">{formatDate(contract.startDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div className="flex-1">
                          <div className="text-gray-600">Kết thúc:</div>
                          <div className="font-medium">{formatDate(contract.endDate)}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Tạo: {new Date(contract.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => handleViewContract(contract)}
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

      {/* View Contract Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedContract && getStatusIcon(selectedContract.status)}
              <span>Chi Tiết Hợp Đồng</span>
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về hợp đồng
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Số hợp đồng</label>
                <p className="text-lg font-semibold mt-1">{selectedContract.contractNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                <div className="mt-1">{getStatusBadge(selectedContract.status)}</div>
              </div>
              {selectedContract.orderNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Số đơn hàng</span>
                  </label>
                  <p className="text-sm mt-1">{selectedContract.orderNumber}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Giá trị hợp đồng</label>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  {formatCurrency(selectedContract.totalValue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                  <p className="text-sm mt-1 text-gray-600">{formatDate(selectedContract.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày kết thúc</label>
                  <p className="text-sm mt-1 text-gray-600">{formatDate(selectedContract.endDate)}</p>
                </div>
              </div>
              {(selectedContract && (
                (selectedContract.domainIds?.length ?? 0) > 0 ||
                (selectedContract.hostingIds?.length ?? 0) > 0 ||
                (selectedContract.vpsIds?.length ?? 0) > 0
              )) && (
                <div className="pt-4 border-t space-y-5">
                  {selectedContract.domainIds?.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2 mb-3">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <Globe className="h-4 w-4 text-blue-600" />
                        </div>
                        <span>Tên miền ({contractDetails.domains.length})</span>
                      </label>
                      {detailsLoading.domains ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      ) : contractDetails.domains.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {contractDetails.domains.map((domain, index) => (
                            <div 
                              key={`domain-${domain.id}-${index}`} 
                              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-200"
                            >
                              <div className="flex items-start space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                  <Globe className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{domain.domainName}</div>
                                  {(domain.registrationDate || domain.expiryDate) && (
                                    <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
                                      {domain.registrationDate && (
                                        <div className="flex items-center space-x-1 text-gray-600">
                                          <Calendar className="h-3 w-3 text-gray-500" />
                                          <span>ĐK: {formatDate(domain.registrationDate)}</span>
                                        </div>
                                      )}
                                      {domain.expiryDate && (
                                        <div className="flex items-center space-x-1 text-gray-600">
                                          <Calendar className="h-3 w-3 text-gray-500" />
                                          <span>HH: {formatDate(domain.expiryDate)}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Không tìm thấy dữ liệu tên miền</div>
                      )}
                    </div>
                  )}
                  {selectedContract.hostingIds?.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2 mb-3">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <Server className="h-4 w-4 text-green-600" />
                        </div>
                        <span>Hosting ({contractDetails.hostings.length})</span>
                      </label>
                      {detailsLoading.hostings ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                        </div>
                      ) : contractDetails.hostings.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {contractDetails.hostings.map((hosting, index) => (
                            <div 
                              key={`hosting-${hosting.id}-${index}`} 
                              className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-200"
                            >
                              <div className="flex items-start space-x-2">
                                <div className="p-1.5 bg-green-100 rounded-lg">
                                  <Server className="h-3 w-3 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{hosting.planName}</div>
                                  {(hosting.storage && hosting.bandwidth && hosting.price) ? (
                                    <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
                                      <div className="flex items-center space-x-1 text-gray-600">
                                        <HardDrive className="h-3 w-3 text-gray-500" />
                                        <span>{hosting.storage}GB</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-gray-600">
                                        <Wifi className="h-3 w-3 text-gray-500" />
                                        <span>{hosting.bandwidth}GB</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-green-600 font-medium">
                                        <DollarSign className="h-3 w-3" />
                                        <span>{formatPrice(hosting.price)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 mt-1">Không có đủ thông tin chi tiết</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Không tìm thấy dữ liệu hosting</div>
                      )}
                    </div>
                  )}
                  {selectedContract.vpsIds?.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2 mb-3">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <Box className="h-4 w-4 text-purple-600" />
                        </div>
                        <span>VPS ({contractDetails.vpss.length})</span>
                      </label>
                      {detailsLoading.vpss ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                        </div>
                      ) : contractDetails.vpss.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {contractDetails.vpss.map((vps, index) => (
                            <div 
                              key={`vps-${vps.id}-${index}`} 
                              className="bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded-lg border border-purple-200"
                            >
                              <div className="flex items-start space-x-2">
                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                  <Box className="h-3 w-3 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{vps.planName}</div>
                                  {(vps.cpu && vps.ram && vps.storage && vps.price) ? (
                                    <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
                                      <div className="flex items-center space-x-1 text-gray-600">
                                        <Cpu className="h-3 w-3 text-gray-500" />
                                        <span>{vps.cpu} CPU</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-gray-600">
                                        <MemoryStick className="h-3 w-3 text-gray-500" />
                                        <span>{vps.ram}GB RAM</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-gray-600">
                                        <HardDrive className="h-3 w-3 text-gray-500" />
                                        <span>{vps.storage}GB</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-purple-600 font-medium">
                                        <DollarSign className="h-3 w-3" />
                                        <span>{formatPrice(vps.price)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 mt-1">Không có đủ thông tin chi tiết</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Không tìm thấy dữ liệu VPS</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="text-sm mt-1 text-gray-600">
                    {new Date(selectedContract.createdAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cập nhật</label>
                  <p className="text-sm mt-1 text-gray-600">
                    {new Date(selectedContract.updatedAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
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

