'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, Plus, Search, Eye, RefreshCw, CheckCircle, XCircle, Loader2, Edit, Trash2 } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

interface Payment {
  id: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  paymentMethod: string | null
  transactionId: string | null
  paymentData: any
  createdAt: string
  updatedAt: string
}

interface Order {
  id: number
  customerName: string
  amount: number
  items: string[]
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] = useState(false)
  const [isViewPaymentDialogOpen, setIsViewPaymentDialogOpen] = useState(false)
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [newPayment, setNewPayment] = useState({
    orderId: '',
    customerId: '',
    amount: 0,
    paymentMethod: '',
    transactionId: '',
  })

  const [editPayment, setEditPayment] = useState<Payment | null>(null)

  useEffect(() => {
    fetchPayments()
    fetchOrders()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
      } else {
        toastError('Có lỗi xảy ra khi tải danh sách thanh toán')
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      toastError('Có lỗi xảy ra khi tải danh sách thanh toán')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        // Convert orders to the format expected by the pending orders section
        const pendingOrders = data
          .filter((order: any) => order.status === 'PENDING')
          .map((order: any) => ({
            id: order.id,
            customerName: order.customer?.name || 'Unknown',
            amount: parseFloat(order.totalAmount) || 0,
            items: order.orderItems?.map((item: any) => `${item.serviceName}: ${item.serviceType}`) || [],
          }))
        setOrders(pendingOrders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const createPayment = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPayment),
      })

      if (response.ok) {
        await fetchPayments()
        await fetchOrders()
        setIsCreatePaymentDialogOpen(false)
        setNewPayment({
          orderId: '',
          customerId: '',
          amount: 0,
          paymentMethod: '',
          transactionId: '',
        })
        toastSuccess('Tạo thanh toán thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể tạo thanh toán'}`)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      toastError('Có lỗi xảy ra khi tạo thanh toán')
    } finally {
      setIsCreating(false)
    }
  }

  const updatePayment = async () => {
    if (!editPayment) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editPayment.id,
          status: editPayment.status,
          transactionId: editPayment.transactionId,
        }),
      })

      if (response.ok) {
        await fetchPayments()
        setIsEditPaymentDialogOpen(false)
        setEditPayment(null)
        toastSuccess('Cập nhật thanh toán thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật thanh toán'}`)
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      toastError('Có lỗi xảy ra khi cập nhật thanh toán')
    } finally {
      setIsUpdating(false)
    }
  }

  const deletePayment = async (id: string) => {
    try {
      const response = await fetch(`/api/payments?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPayments()
        setIsDeleteDialogOpen(false)
        setSelectedPayment(null)
        toastSuccess('Xóa thanh toán thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa thanh toán'}`)
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      toastError('Có lỗi xảy ra khi xóa thanh toán')
    }
  }

  const filteredPayments = payments.filter(payment =>
    payment.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payment.transactionId && payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Chờ thanh toán</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Đã thanh toán</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Thất bại</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Đã hủy</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING':
        return <RefreshCw className="h-4 w-4 text-yellow-600" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Chưa chọn'
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Chuyển khoản'
      case 'CREDIT_CARD':
        return 'Thẻ tín dụng'
      case 'WALLET':
        return 'Ví điện tử'
      default:
        return method
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  const handleCreatePayment = (order: Order) => {
    setSelectedOrder(order)
    setNewPayment({
      orderId: String(order.id),
      customerId: '', // This should be set based on the order's customer
      amount: order.amount,
      paymentMethod: '',
      transactionId: '',
    })
    setIsCreatePaymentDialogOpen(true)
  }

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsViewPaymentDialogOpen(true)
  }

  const handleEditPayment = (payment: Payment) => {
    setEditPayment(payment)
    setIsEditPaymentDialogOpen(true)
  }

  const handleDeletePayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDeleteDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản Lý Thanh Toán</h1>
            <p className="text-gray-600 mt-1">Xử lý thanh toán tự động</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Giao Dịch</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
              <p className="text-xs text-gray-600">Tất cả giao dịch</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ Thanh Toán</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.filter(p => p.status === 'PENDING').length}</div>
              <p className="text-xs text-gray-600">Cần xử lý</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thành Công</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.filter(p => p.status === 'COMPLETED').length}</div>
              <p className="text-xs text-gray-600">Đã thanh toán</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0))}
              </div>
              <p className="text-xs text-gray-600">Đã thu được</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Đơn Hàng Chờ Thanh Toán</CardTitle>
            <CardDescription>
              Các đơn hàng cần tạo giao dịch thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm text-gray-600">{order.customerName}</div>
                    <div className="text-sm text-gray-500">
                      {order.items.map((item, index) => (
                        <span key={index}>
                          {item}
                          {index < order.items.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="font-medium">{formatCurrency(order.amount)}</div>
                  </div>
                  <Button onClick={() => handleCreatePayment(order)}>
                    <Plus className="h-4 w-4" />
                    Tạo Thanh Toán
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Tìm Kiếm Giao Dịch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng, mã giao dịch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch Sử Giao Dịch</CardTitle>
            <CardDescription>
              Tất cả giao dịch thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Đang tải...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Đơn Hàng</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Số Tiền</TableHead>
                    <TableHead>Phương Thức</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Mã Giao Dịch</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead>Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.orderNumber}</TableCell>
                      <TableCell>{payment.customerName}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          {getStatusBadge(payment.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.transactionId ? (
                          <span className="font-mono text-sm">{payment.transactionId}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePayment(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Payment Dialog */}
        <Dialog open={isCreatePaymentDialogOpen} onOpenChange={setIsCreatePaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tạo Giao Dịch Thanh Toán</DialogTitle>
              <DialogDescription>
                Tạo giao dịch thanh toán cho đơn hàng {selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Mã đơn hàng</Label>
                    <div className="font-medium">{selectedOrder.id}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Khách hàng</Label>
                    <div className="font-medium">{selectedOrder.customerName}</div>
                  </div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Số tiền</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedOrder.amount)}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentMethod" className="text-right">
                    Phương thức
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={newPayment.paymentMethod}
                      onValueChange={(value) => setNewPayment({...newPayment, paymentMethod: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phương thức thanh toán" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Chuyển khoản ngân hàng</SelectItem>
                        <SelectItem value="CREDIT_CARD">Thẻ tín dụng</SelectItem>
                        <SelectItem value="WALLET">Ví điện tử</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="transactionId" className="text-right">
                    Mã giao dịch
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="transactionId"
                      placeholder="Nhập mã giao dịch (tùy chọn)"
                      value={newPayment.transactionId}
                      onChange={(e) => setNewPayment({...newPayment, transactionId: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatePaymentDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={createPayment} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Tạo Giao Dịch Thanh Toán
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog open={isViewPaymentDialogOpen} onOpenChange={setIsViewPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Chi Tiết Giao Dịch</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về giao dịch thanh toán
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Mã Đơn Hàng</Label>
                    <p className="text-sm text-gray-600">{selectedPayment.orderNumber}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Khách Hàng</Label>
                    <p className="text-sm text-gray-600">{selectedPayment.customerName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Số Tiền</Label>
                    <p className="text-sm text-gray-600">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Phương Thức</Label>
                    <p className="text-sm text-gray-600">{getPaymentMethodLabel(selectedPayment.paymentMethod)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Trạng Thái</Label>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Mã Giao Dịch</Label>
                    <p className="text-sm text-gray-600">{selectedPayment.transactionId || 'Chưa có'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Ngày Tạo</Label>
                    <p className="text-sm text-gray-600">{formatDateTime(selectedPayment.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Ngày Cập Nhật</Label>
                    <p className="text-sm text-gray-600">{formatDateTime(selectedPayment.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewPaymentDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Payment Dialog */}
        <Dialog open={isEditPaymentDialogOpen} onOpenChange={setIsEditPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Chỉnh Sửa Giao Dịch</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin giao dịch thanh toán
              </DialogDescription>
            </DialogHeader>
            {editPayment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-status" className="text-right">
                    Trạng thái
                  </Label>
                  <div className="col-span-3 mt-2">
                    <Select
                      value={editPayment.status}
                      onValueChange={(value: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED') =>
                        setEditPayment({...editPayment, status: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                        <SelectItem value="COMPLETED">Đã thanh toán</SelectItem>
                        <SelectItem value="FAILED">Thất bại</SelectItem>
                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-transactionId" className="text-right">
                    Mã giao dịch
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-transactionId"
                      value={editPayment.transactionId || ''}
                      onChange={(e) => setEditPayment({...editPayment, transactionId: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditPaymentDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={updatePayment} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  'Cập nhật'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Payment Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Xác Nhận Xóa Giao Dịch</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  Giao dịch: <span className="font-medium">{selectedPayment.orderNumber}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Khách hàng: <span className="font-medium">{selectedPayment.customerName}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Số tiền: <span className="font-medium">{formatCurrency(selectedPayment.amount)}</span>
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedPayment && deletePayment(selectedPayment.id)}
              >
                <Trash2 className="h-4 w-4" />
                Xóa Giao Dịch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}