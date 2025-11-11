'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShoppingCart,
  Search,
  Eye,
  Calendar,
  CreditCard,
  ArrowRight
} from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

interface Order {
  id: number
  orderNumber?: string | null
  status: string
  paymentStatus: string
  paymentMethod: string
  totalAmount: number
  paidAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  orderItems: {
    id: number
    serviceType: string
    serviceId: number
    quantity: number
    price: number
    serviceName?: string
    domainName?: string
  }[]
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Only customers can access orders page
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      if (userType === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/auth/signin')
      }
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
        } else {
          console.warn('Customer data not found in response:', result)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch customer:', response.status, errorData)
        if (response.status === 404) {
          // If no customer record, redirect admin to admin dashboard
          const userType = (session?.user as any)?.userType
          if (userType === 'admin') {
            toastError('Không tìm thấy thông tin khách hàng.')
            router.push('/admin/dashboard')
            return
          }
          toastError('Không tìm thấy thông tin khách hàng. Vui lòng cập nhật hồ sơ.')
        } else if (response.status === 401) {
          toastError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
          router.push('/auth/signin')
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
      toastError('Không thể tải thông tin khách hàng')
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchOrders()
    }
  }, [customerId])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      console.log('Response status:', response.status)
      console.log('Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.log('Non-JSON response:', text.substring(0, 200))
        throw new Error(`Response is not JSON. Status: ${response.status}, Content-Type: ${contentType}`)
      }
      
      const result = await response.json()
      if (result.success && result.data) {
        // Filter orders for current customer
        const customerOrders = result.data.filter((order: any) => 
          order.customerId === customerId || order.customer?.id === customerId
        ).map((order: any) => ({
          ...order,
          totalAmount: parseFloat(order.totalAmount) || 0,
          paidAmount: parseFloat(order.paidAmount) || 0
        }))
        setOrders(customerOrders)
        setTotalPages(Math.ceil(customerOrders.length / itemsPerPage))
      } else {
        setOrders([])
        setTotalPages(1)
        toastError('Không thể tải danh sách đơn hàng')
      }
    } catch (error) {
      setOrders([])
      toastError('Có lỗi xảy ra khi tải danh sách đơn hàng')
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order =>
    order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredOrders.length / itemsPerPage)

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-100 text-blue-800">Đã xác nhận</Badge>
      case 'PENDING':
        return <Badge variant="outline">Chờ xử lý</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Đã hủy</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Đã thanh toán</Badge>
      case 'PENDING':
        return <Badge variant="outline">Chờ thanh toán</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Tiền mặt'
      case 'BANK_TRANSFER':
        return 'Chuyển khoản'
      case 'CREDIT_CARD':
        return 'Thẻ tín dụng'
      case 'E_WALLET':
        return 'Ví điện tử'
      default:
        return method
    }
  }

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'DOMAIN':
        return 'Tên miền'
      case 'HOSTING':
        return 'Hosting'
      case 'VPS':
        return 'VPS'
      default:
        return type
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleContinuePayment = async (order: Order) => {
    try {
      // Check if payment already exists for this order
      const paymentResponse = await fetch(`/api/payments/sepay?orderId=${order.id}`)
      
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json()
        if (paymentData.success) {
          // Redirect to QR payment page with existing payment
          router.push(`/payments/qr?orderId=${order.id}&paymentId=${paymentData.paymentId}`)
        } else {
          // If no payment found, create a new one
          await createPaymentForOrder(order)
        }
      } else {
        // If API error, try to create payment
        await createPaymentForOrder(order)
      }
    } catch (error: any) {
      console.error('Error handling payment:', error)
      toastError('Có lỗi xảy ra khi tiếp tục thanh toán. Vui lòng thử lại.')
    }
  }

  const createPaymentForOrder = async (order: Order) => {
    try {
      // Get customer ID first
      if (!customerId) {
        toastError('Không tìm thấy thông tin khách hàng')
        return
      }

      // Create payment via POST
      const paymentResponse = await fetch('/api/payments/sepay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          customerId: customerId,
          amount: order.totalAmount,
        }),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || 'Không thể tạo thanh toán')
      }

      const paymentData = await paymentResponse.json()
      
      if (paymentData.success) {
        toastSuccess('Đã tạo mã QR thanh toán!')
        // Redirect to QR payment page
        router.push(`/payments/qr?orderId=${order.id}&paymentId=${paymentData.paymentId}`)
      } else {
        throw new Error(paymentData.error || 'Không thể tạo thanh toán')
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      toastError(error.message || 'Có lỗi xảy ra khi tạo thanh toán')
    }
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
    <MemberLayout title="Đơn hàng của tôi">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Đơn hàng của tôi
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Theo dõi và quản lý tất cả đơn hàng của bạn
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
              <CardDescription>Tìm kiếm đơn hàng theo mã đơn hàng hoặc trạng thái</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm đơn hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'Không tìm thấy đơn hàng nào' : 'Bạn chưa có đơn hàng nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{order.orderNumber || `Đơn hàng #${order.id}`}</h3>
                            <p className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(order.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Trạng thái</p>
                            <div className="mt-1">{getStatusBadge(order.status)}</div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Thanh toán</p>
                            <div className="mt-1">{getPaymentStatusBadge(order.paymentStatus)}</div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Phương thức</p>
                            <div className="mt-1 flex items-center space-x-2">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{getPaymentMethodLabel(order.paymentMethod)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Tổng tiền</p>
                              <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(order.totalAmount)}</p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                              Xem chi tiết
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalFilteredPages}
                totalItems={filteredOrders.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                className="mt-8 px-0"
              />
            </>
          )}

          {/* View Order Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chi tiết đơn hàng</DialogTitle>
                <DialogDescription>
                  {selectedOrder?.orderNumber || `Đơn hàng #${selectedOrder?.id}`}
                </DialogDescription>
              </DialogHeader>
              {selectedOrder && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Trạng thái</p>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Thanh toán</p>
                      <div className="mt-1">{getPaymentStatusBadge(selectedOrder.paymentStatus)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phương thức thanh toán</p>
                      <p className="mt-1 text-sm">{getPaymentMethodLabel(selectedOrder.paymentMethod)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ngày đặt hàng</p>
                      <p className="mt-1 text-sm">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Dịch vụ</p>
                    <div className="space-y-2">
                      {selectedOrder.orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{getServiceTypeLabel(item.serviceType)}</div>
                            <div className="text-sm text-gray-600">{item.serviceName || item.domainName || item.serviceId}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(parseFloat(item.price.toString()))}</div>
                            <div className="text-sm text-gray-600">x{item.quantity}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Tổng tiền</span>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Ghi chú</p>
                      <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                    </div>
                  )}

                  {/* Continue Payment Button - Show only if payment is pending */}
                  {selectedOrder.paymentStatus !== 'PAID' && (
                    <div className="border-t pt-4">
                      <Button
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleContinuePayment(selectedOrder)
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <CreditCard className="h-5 w-5" />
                        Tiếp tục thanh toán
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Bạn sẽ được chuyển đến trang thanh toán để hoàn tất đơn hàng
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MemberLayout>
  )
}
