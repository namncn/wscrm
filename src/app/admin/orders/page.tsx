'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
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
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Search, Eye, Edit, Trash2, Loader2, ChevronUp, Check, X, ChevronRight, ChevronDown, Mail, Download } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastSuccess, toastError } from '@/lib/toast'
import { CustomerCombobox } from '@/components/ui/customer-combobox'

interface Order {
  id: string
  orderNumber?: string | null
  status: string
  paymentStatus: string
  paymentMethod: string
  totalAmount: number
  paidAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name?: string | null
    email?: string | null
  }
  orderItems: {
    id: string
    serviceType: string
    serviceId: string
    quantity: number
    price: number
    domainName?: string
    serviceName?: string
  }[]
}

interface Customer {
  id: number
  name: string
  email: string
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  
  // Expanded orders state (for showing all services)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Customer search combobox state

  // Domain types, Hosting, VPS data
  const [domainTypes, setDomainTypes] = useState<any[]>([])
  const [hostings, setHostings] = useState<any[]>([])
  const [vps, setVps] = useState<any[]>([])
  
  // Combobox states
  const [domainTypeSearchOpen, setDomainTypeSearchOpen] = useState(false)
  const [domainTypeSearchValue, setDomainTypeSearchValue] = useState('')
  const [hostingSearchOpen, setHostingSearchOpen] = useState(false)
  const [hostingSearchValue, setHostingSearchValue] = useState('')
  const [vpsSearchOpen, setVpsSearchOpen] = useState(false)
  const [vpsSearchValue, setVpsSearchValue] = useState('')

  // Form state for new order
  const [newOrder, setNewOrder] = useState({
    customerId: null as number | null,
    domainTypeIds: [] as string[],
    domainNames: {} as Record<string, string>, // domainTypeId -> domainName
    hostingIds: [] as string[],
    vpsIds: [] as string[],
    notes: ''
  })

  // Form state for edit order
  const [editOrder, setEditOrder] = useState({
    status: '',
    paymentMethod: '',
    paymentStatus: '',
    notes: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrders()
    fetchCustomers()
  }, [session, status, router])
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers()
    fetchDomainTypes()
    fetchHostings()
    fetchVPS()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert totalAmount from string to number
          const processedData = result.data.map((order: any) => ({
            ...order,
            totalAmount: parseFloat(order.totalAmount) || 0,
            paidAmount: parseFloat(order.paidAmount) || 0
          }))
          setOrders(processedData)
        } else {
          setOrders([])
          toastError('Không thể tải danh sách đơn hàng')
        }
      } else {
        setOrders([])
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

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCustomers(result.data)
        } else {
          setCustomers([])
          toastError('Không thể tải danh sách khách hàng')
        }
      } else {
        setCustomers([])
        toastError('Không thể tải danh sách khách hàng')
      }
    } catch (error) {
      setCustomers([])
      toastError('Có lỗi xảy ra khi tải danh sách khách hàng')
      console.error('Error fetching customers:', error)
    }
  }

  const fetchDomainTypes = async () => {
    try {
      const response = await fetch('/api/domain-types')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDomainTypes(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching domain types:', error)
    }
  }

  const fetchHostings = async () => {
    try {
      const response = await fetch('/api/hosting')
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

  const fetchVPS = async () => {
    try {
      const response = await fetch('/api/vps')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVps(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching VPS:', error)
    }
  }

  const createOrder = async () => {
    if (!newOrder.customerId) {
      toastError('Vui lòng chọn khách hàng')
      return
    }
    
    // Build items array from all selections
    const items: any[] = []
    
    // Add domain items
    for (const domainTypeId of newOrder.domainTypeIds) {
      const domainName = newOrder.domainNames[domainTypeId]
      if (!domainName) {
        toastError(`Vui lòng nhập tên miền cho ${domainTypes.find(dt => dt.id === domainTypeId)?.name}`)
        return
      }
      const domainType = domainTypes.find(dt => dt.id === domainTypeId)
      items.push({
        serviceType: 'DOMAIN',
        serviceId: domainTypeId,
        serviceName: domainName,
        domainName: domainName, // Explicitly include domainName for API
        quantity: 1,
        price: domainType?.price || 0
      })
    }
    
    // Add hosting items
    for (const hostingId of newOrder.hostingIds) {
      const hostingPlan = hostings.find(h => h.id === hostingId)
      if (hostingPlan) {
        items.push({
          serviceType: 'HOSTING',
          serviceId: hostingId,
          serviceName: hostingPlan.planName,
          quantity: 1,
          price: parseFloat(hostingPlan.price || '0')
        })
      }
    }
    
    // Add VPS items
    for (const vpsId of newOrder.vpsIds) {
      const vpsPlan = vps.find(v => v.id === vpsId)
      if (vpsPlan) {
        items.push({
          serviceType: 'VPS',
          serviceId: vpsId,
          serviceName: vpsPlan.planName,
          quantity: 1,
          price: parseFloat(vpsPlan.price || '0')
        })
      }
    }
    
    if (items.length === 0) {
      toastError('Vui lòng chọn ít nhất một dịch vụ (Loại tên miền, Gói Hosting hoặc Gói VPS)')
      return
    }
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    setIsCreating(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: newOrder.customerId,
          items: items,
          totalAmount: totalAmount,
          notes: newOrder.notes || ''
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        toastError('Server trả về lỗi không hợp lệ. Vui lòng thử lại.')
        return
      }

      const result = await response.json()

      if (response.ok && result.success) {
        await fetchOrders()
        setIsAddDialogOpen(false)
        setNewOrder({
          customerId: null,
          domainTypeIds: [],
          domainNames: {},
          hostingIds: [],
          vpsIds: [],
          notes: ''
        })
        setDomainTypeSearchValue('')
        setHostingSearchValue('')
        setVpsSearchValue('')
        toastSuccess('Tạo đơn hàng thành công!')
      } else {
        toastError(result.error || result.message || 'Không thể tạo đơn hàng')
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      if (error.message && error.message.includes('JSON')) {
        toastError('Lỗi khi xử lý phản hồi từ server. Vui lòng thử lại.')
      } else {
        toastError('Có lỗi xảy ra khi tạo đơn hàng')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleDownloadOrderPdf = async () => {
    if (!selectedOrder) {
      return
    }

    setIsDownloadingPdf(true)
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = selectedOrder.orderNumber
        ? `${selectedOrder.orderNumber}.pdf`
        : `order-${selectedOrder.id}.pdf`

      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toastSuccess('Đã tải PDF đơn hàng')
    } catch (error) {
      console.error('Error downloading order PDF:', error)
      toastError('Không thể tải file PDF đơn hàng, vui lòng thử lại sau')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleSendOrderEmail = async () => {
    if (!selectedOrder) {
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/send-email`, {
        method: 'POST',
        credentials: 'include',
      })

      const result = await response.json()
      if (response.ok && result.success) {
        toastSuccess('Đã gửi email đơn hàng kèm PDF')
      } else {
        toastError(result.message || result.error || 'Không thể gửi email đơn hàng')
      }
    } catch (error) {
      console.error('Error sending order email:', error)
      toastError('Không thể gửi email đơn hàng, vui lòng thử lại sau')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setEditOrder({
      status: order.status,
      paymentMethod: order.paymentMethod || 'CASH',
      paymentStatus: order.paymentStatus || 'PENDING',
      notes: order.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const updateOrder = async () => {
    if (!selectedOrder) return
    
    setIsUpdating(true)
    try {
      // Use the order status from the form
      // The form already handles the logic of syncing payment status and order status
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: editOrder.status,
          paymentMethod: editOrder.paymentMethod,
          paymentStatus: editOrder.paymentStatus,
          notes: editOrder.notes
        }),
      })

      if (response.ok) {
        await fetchOrders()
        // Trigger a custom event to refresh service lists in other pages
        if (selectedOrder?.orderItems) {
          const hasVPS = selectedOrder.orderItems.some(item => item.serviceType === 'VPS')
          const hasHosting = selectedOrder.orderItems.some(item => item.serviceType === 'HOSTING')
          const hasDomain = selectedOrder.orderItems.some(item => item.serviceType === 'DOMAIN')
          
          if (hasVPS || hasHosting || hasDomain) {
            window.dispatchEvent(new CustomEvent('orderUpdated'))
          }
        }
        setIsEditDialogOpen(false)
        setSelectedOrder(null)
        toastSuccess('Cập nhật đơn hàng thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật đơn hàng'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật đơn hàng')
      console.error('Error updating order:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (!selectedOrder) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/orders?id=${selectedOrder.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchOrders()
        setIsDeleteDialogOpen(false)
        setSelectedOrder(null)
        toastSuccess('Xóa đơn hàng thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa đơn hàng'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xóa đơn hàng')
      console.error('Error deleting order:', error)
    } finally {
      setIsDeleting(false)
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

  if (!session) {
    return null
  }

  const filteredOrders = orders.filter(order =>
    (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.customer?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Chờ xử lý</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-100 text-blue-800">Đã xác nhận</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Đã hủy</Badge>
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
        return method || 'Chưa có'
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Tiền mặt</Badge>
      case 'BANK_TRANSFER':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Chuyển khoản</Badge>
      case 'CREDIT_CARD':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Thẻ tín dụng</Badge>
      case 'E_WALLET':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Ví điện tử</Badge>
      default:
        return <Badge variant="outline">Chưa có</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Chờ thanh toán</Badge>
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Đã thanh toán</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Thanh toán thất bại</Badge>
      case 'REFUNDED':
        return <Badge className="bg-gray-100 text-gray-800">Đã hoàn tiền</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Đơn Hàng</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tất cả đơn hàng</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Tạo Đơn Hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Tạo Đơn Hàng Mới</DialogTitle>
                <DialogDescription>
                  Tạo đơn hàng mới cho khách hàng
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customer" className="text-right">
                    Khách hàng
                  </Label>
                  <div className="col-span-3">
                    <CustomerCombobox
                      customers={customers}
                      value={newOrder.customerId}
                      onValueChange={(value) => setNewOrder({...newOrder, customerId: typeof value === 'number' ? value : null})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="domainType" className="text-right">
                    Loại tên miền
                  </Label>
                  <div className="col-span-3">
                    <Popover open={domainTypeSearchOpen} onOpenChange={setDomainTypeSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {newOrder.domainTypeIds.length > 0
                            ? `${newOrder.domainTypeIds.length} loại đã chọn`
                            : "Chọn loại tên miền"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                        <div className="p-3 border-b flex-shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Tìm kiếm loại tên miền..."
                              value={domainTypeSearchValue}
                              onChange={(e) => setDomainTypeSearchValue(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div 
                          className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {domainTypes
                            .filter(dt =>
                              dt.name.toLowerCase().includes(domainTypeSearchValue.toLowerCase()) ||
                              dt.description?.toLowerCase().includes(domainTypeSearchValue.toLowerCase())
                            )
                            .map((dt) => {
                              const isSelected = newOrder.domainTypeIds.includes(dt.id)
                              return (
                                <div
                                  key={dt.id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                                  onClick={() => {
                                    const newIds = isSelected
                                      ? newOrder.domainTypeIds.filter(id => id !== dt.id)
                                      : [...newOrder.domainTypeIds, dt.id]
                                    const newDomainNames = { ...newOrder.domainNames }
                                    if (isSelected) {
                                      delete newDomainNames[dt.id]
                                    }
                                    setNewOrder({
                                      ...newOrder,
                                      domainTypeIds: newIds,
                                      domainNames: newDomainNames
                                    })
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">{dt.name}</div>
                                      <div className="text-xs text-gray-500">{dt.description || ''} - {new Intl.NumberFormat('vi-VN').format(dt.price || 0)} VNĐ</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          {domainTypes.filter(dt =>
                            dt.name.toLowerCase().includes(domainTypeSearchValue.toLowerCase()) ||
                            dt.description?.toLowerCase().includes(domainTypeSearchValue.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-8 text-center text-gray-500">
                              Không tìm thấy loại tên miền
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {newOrder.domainTypeIds.map((domainTypeId) => {
                  const domainType = domainTypes.find(dt => dt.id === domainTypeId)
                  return (
                    <div key={domainTypeId} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`domain-${domainTypeId}`} className="text-right">
                        Tên miền {domainType?.name}
                      </Label>
                      <div className="col-span-3 flex gap-2">
                        <Input 
                          id={`domain-${domainTypeId}`}
                          placeholder={`Nhập tên miền ${domainType?.name} (ví dụ: example${domainType?.name})`}
                          value={newOrder.domainNames[domainTypeId] || ''}
                          onChange={(e) => setNewOrder({
                            ...newOrder,
                            domainNames: {
                              ...newOrder.domainNames,
                              [domainTypeId]: e.target.value
                            }
                          })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newIds = newOrder.domainTypeIds.filter(id => id !== domainTypeId)
                            const newDomainNames = { ...newOrder.domainNames }
                            delete newDomainNames[domainTypeId]
                            setNewOrder({
                              ...newOrder,
                              domainTypeIds: newIds,
                              domainNames: newDomainNames
                            })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hosting" className="text-right">
                    Gói Hosting
                  </Label>
                  <div className="col-span-3">
                    <Popover open={hostingSearchOpen} onOpenChange={setHostingSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {newOrder.hostingIds.length > 0
                            ? `${newOrder.hostingIds.length} gói đã chọn`
                            : "Chọn gói hosting"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                        <div className="p-3 border-b flex-shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Tìm kiếm gói hosting..."
                              value={hostingSearchValue}
                              onChange={(e) => setHostingSearchValue(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div 
                          className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {hostings
                            .filter(h =>
                              h.planName?.toLowerCase().includes(hostingSearchValue.toLowerCase())
                            )
                            .map((h) => {
                              const isSelected = newOrder.hostingIds.includes(h.id)
                              return (
                                <div
                                  key={h.id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                                  onClick={() => {
                                    const newIds = isSelected
                                      ? newOrder.hostingIds.filter(id => id !== h.id)
                                      : [...newOrder.hostingIds, h.id]
                                    setNewOrder({
                                      ...newOrder,
                                      hostingIds: newIds
                                    })
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">{h.planName}</div>
                                      <div className="text-xs text-gray-500">{h.storage}GB - {new Intl.NumberFormat('vi-VN').format(parseFloat(h.price || '0'))} VNĐ</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          {hostings.filter(h =>
                            h.planName?.toLowerCase().includes(hostingSearchValue.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-8 text-center text-gray-500">
                              Không tìm thấy gói hosting
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Display selected hostings */}
                {newOrder.hostingIds.map((hostingId) => {
                  const hostingPlan = hostings.find(h => h.id === hostingId)
                  if (!hostingPlan) return null
                  return (
                    <div key={hostingId} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        Gói Hosting đã chọn
                      </Label>
                      <div className="col-span-3 flex gap-2 items-center">
                        <div className="flex-1 p-2 border rounded">
                          <div className="font-medium text-sm">{hostingPlan.planName}</div>
                          <div className="text-xs text-gray-500">{new Intl.NumberFormat('vi-VN').format(parseFloat(hostingPlan.price || '0'))} VNĐ</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNewOrder({
                              ...newOrder,
                              hostingIds: newOrder.hostingIds.filter(id => id !== hostingId)
                            })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vps" className="text-right">
                    Gói VPS
                  </Label>
                  <div className="col-span-3">
                    <Popover open={vpsSearchOpen} onOpenChange={setVpsSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {newOrder.vpsIds.length > 0
                            ? `${newOrder.vpsIds.length} gói đã chọn`
                            : "Chọn gói VPS"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                        <div className="p-3 border-b flex-shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Tìm kiếm gói VPS..."
                              value={vpsSearchValue}
                              onChange={(e) => setVpsSearchValue(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div 
                          className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {vps
                            .filter(v =>
                              v.planName?.toLowerCase().includes(vpsSearchValue.toLowerCase())
                            )
                            .map((v) => {
                              const isSelected = newOrder.vpsIds.includes(v.id)
                              return (
                                <div
                                  key={v.id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                                  onClick={() => {
                                    const newIds = isSelected
                                      ? newOrder.vpsIds.filter(id => id !== v.id)
                                      : [...newOrder.vpsIds, v.id]
                                    setNewOrder({
                                      ...newOrder,
                                      vpsIds: newIds
                                    })
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">{v.planName}</div>
                                      <div className="text-xs text-gray-500">{v.cpu} CPU / {v.ram}GB RAM - {new Intl.NumberFormat('vi-VN').format(parseFloat(v.price || '0'))} VNĐ</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          {vps.filter(v =>
                            v.planName?.toLowerCase().includes(vpsSearchValue.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-8 text-center text-gray-500">
                              Không tìm thấy gói VPS
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Display selected VPS */}
                {newOrder.vpsIds.map((vpsId) => {
                  const vpsPlan = vps.find(v => v.id === vpsId)
                  if (!vpsPlan) return null
                  return (
                    <div key={vpsId} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        Gói VPS đã chọn
                      </Label>
                      <div className="col-span-3 flex gap-2 items-center">
                        <div className="flex-1 p-2 border rounded">
                          <div className="font-medium text-sm">{vpsPlan.planName}</div>
                          <div className="text-xs text-gray-500">{new Intl.NumberFormat('vi-VN').format(parseFloat(vpsPlan.price || '0'))} VNĐ</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNewOrder({
                              ...newOrder,
                              vpsIds: newOrder.vpsIds.filter(id => id !== vpsId)
                            })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {/* Total price display */}
                {(() => {
                  const totalPrice = 
                    newOrder.domainTypeIds.reduce((sum, id) => {
                      const dt = domainTypes.find(d => d.id === id)
                      return sum + (dt?.price || 0)
                    }, 0) +
                    newOrder.hostingIds.reduce((sum, id) => {
                      const h = hostings.find(host => host.id === id)
                      return sum + parseFloat(h?.price || '0')
                    }, 0) +
                    newOrder.vpsIds.reduce((sum, id) => {
                      const v = vps.find(vpsItem => vpsItem.id === id)
                      return sum + parseFloat(v?.price || '0')
                    }, 0)
                  
                  if (totalPrice > 0) {
                    return (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-semibold">
                          Tổng giá
                        </Label>
                        <div className="col-span-3">
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-lg font-bold text-blue-700">
                              {new Intl.NumberFormat('vi-VN').format(totalPrice)} VNĐ
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Ghi chú
                  </Label>
                  <div className="col-span-3">
                    <Textarea 
                      id="notes" 
                      placeholder="Ghi chú đơn hàng"
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                    />
                  </div>
                </div>
                </div>
              </div>
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={createOrder} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo Đơn Hàng'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-gray-600">+8% so với tháng trước</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ Xử Lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'PENDING').length}</div>
              <p className="text-xs text-gray-600">Cần xử lý ngay</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ Thanh Toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.filter(o => o.paymentStatus === 'PENDING').length}</div>
              <p className="text-xs text-gray-600">Cần theo dõi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
              </div>
              <p className="text-xs text-gray-600">+12% so với tháng trước</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Tìm Kiếm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline">Lọc</Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Đơn Hàng</CardTitle>
            <CardDescription>
              Quản lý và theo dõi tất cả đơn hàng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Đơn Hàng</TableHead>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead>Dịch Vụ</TableHead>
                  <TableHead>Tổng Tiền</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead>Thanh Toán</TableHead>
                  <TableHead>Phương Thức</TableHead>
                  <TableHead>Ngày Tạo</TableHead>
                  <TableHead>Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber || 'Chưa có'}</div>
                      <div className="text-sm text-gray-500">ID: {order.id}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer?.name || 'Chưa có'}</div>
                        <div className="text-sm text-gray-500">{order.customer?.email || 'Chưa có'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={!expandedOrders.has(order.id) ? 'line-clamp-1' : ''}>
                          {order.orderItems.map((item, index) => (
                            <div key={index} className="text-sm">
                              {getServiceTypeLabel(item.serviceType)}: {item.domainName || item.serviceName || item.serviceId}
                            </div>
                          ))}
                        </div>
                        {order.orderItems.length > 1 && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedOrders)
                              if (newExpanded.has(order.id)) {
                                newExpanded.delete(order.id)
                              } else {
                                newExpanded.add(order.id)
                              }
                              setExpandedOrders(newExpanded)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 cursor-pointer"
                          >
                            {expandedOrders.has(order.id) ? (
                              <>
                                Thu gọn <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Xem thêm <ChevronRight className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                      {order.paidAmount > 0 && (
                        <div className="text-sm text-green-600">
                          Đã trả: {formatCurrency(order.paidAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                    <TableCell>{getPaymentMethodBadge(order.paymentMethod || 'CASH')}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteOrder(order)}
                          title="Xóa"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Chi Tiết Đơn Hàng</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của đơn hàng
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Mã đơn hàng</Label>
                    <div className="text-sm text-gray-600">{selectedOrder.orderNumber}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Trạng thái</Label>
                    <div>{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Khách hàng</Label>
                    <div className="text-sm text-gray-600">{selectedOrder.customer?.name || 'Chưa có'}</div>
                    <div className="text-sm text-gray-500">{selectedOrder.customer?.email || 'Chưa có'}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Tổng tiền</Label>
                    <div className="text-sm text-gray-600">{formatCurrency(selectedOrder.totalAmount)}</div>
                  </div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Dịch vụ</Label>
                  <div className="space-y-2">
                    {selectedOrder.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{getServiceTypeLabel(item.serviceType)}</div>
                          <div className="text-sm text-gray-600">
                            {item.domainName || item.serviceName || item.serviceId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(parseFloat(item.price.toString()))}</div>
                          <div className="text-sm text-gray-600">x{item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Phương thức thanh toán</Label>
                    <div>{getPaymentMethodBadge(selectedOrder.paymentMethod || 'CASH')}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Trạng thái thanh toán</Label>
                    <div>{getPaymentStatusBadge(selectedOrder.paymentStatus)}</div>
                  </div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Ghi chú</Label>
                  <div className="text-sm text-gray-600">{selectedOrder.notes || 'Không có ghi chú'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Ngày tạo</Label>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Cập nhật cuối</Label>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedOrder.updatedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={!selectedOrder || isSendingEmail}
                onClick={handleSendOrderEmail}
              >
                {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isSendingEmail ? 'Đang gửi...' : 'Gửi Email'}
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={!selectedOrder || isDownloadingPdf}
                onClick={handleDownloadOrderPdf}
              >
                {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloadingPdf ? 'Đang tải...' : 'Tải PDF'}
              </Button>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Đơn Hàng</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin đơn hàng
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Mã đơn hàng</Label>
                    <div className="text-sm text-gray-600">{selectedOrder.orderNumber}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Ngày tạo</Label>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Khách hàng</Label>
                    <div className="text-sm text-gray-600">{selectedOrder.customer?.name || 'Chưa có'}</div>
                    <div className="text-xs text-gray-500">{selectedOrder.customer?.email || ''}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Tổng tiền</Label>
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(selectedOrder.totalAmount)}</div>
                  </div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Dịch vụ</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedOrder.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <div>
                          <div className="font-medium">{getServiceTypeLabel(item.serviceType)}</div>
                          <div className="text-xs text-gray-600">
                            {item.domainName || item.serviceName || item.serviceId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(parseFloat(item.price.toString()))}</div>
                          <div className="text-xs text-gray-600">x{item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="editStatus">
                    Trạng thái đơn hàng
                  </Label>
                  <div className="mt-2">
                    <Select 
                      value={editOrder.status} 
                      onValueChange={(value) => {
                        // Auto-update payment status based on order status
                        const newPaymentStatus = value === 'COMPLETED' ? 'PAID' : editOrder.paymentStatus
                        setEditOrder({...editOrder, status: value, paymentStatus: newPaymentStatus})
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                        <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                        <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editPaymentMethod">
                      Phương thức thanh toán
                    </Label>
                    <div className="mt-2">
                      <Select 
                        value={editOrder.paymentMethod} 
                        onValueChange={(value) => setEditOrder({...editOrder, paymentMethod: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Tiền mặt</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
                          <SelectItem value="CREDIT_CARD">Thẻ tín dụng</SelectItem>
                          <SelectItem value="E_WALLET">Ví điện tử</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editPaymentStatus">
                      Trạng thái thanh toán
                    </Label>
                    <div className="mt-2">
                      <Select 
                        value={editOrder.paymentStatus} 
                        onValueChange={(value) => {
                          // Auto-update order status based on payment status
                          let newStatus = editOrder.status
                          if (value === 'PAID') {
                            // If paid, order must be COMPLETED
                            newStatus = 'COMPLETED'
                          } else if (value === 'PENDING' && editOrder.status === 'COMPLETED') {
                            // If changing from PAID to PENDING, revert from COMPLETED
                            newStatus = 'CONFIRMED'
                          }
                          setEditOrder({...editOrder, paymentStatus: value, status: newStatus})
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                          <SelectItem value="PAID">Đã thanh toán</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="editNotes">
                    Ghi chú
                  </Label>
                  <div className="mt-2">
                    <Textarea 
                      id="editNotes"
                      value={editOrder.notes}
                      onChange={(e) => setEditOrder({...editOrder, notes: e.target.value})}
                      placeholder="Thêm ghi chú cho đơn hàng..."
                      rows={3}
                    />
                  </div>
                </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={updateOrder} disabled={isUpdating}>
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

        {/* Delete Order Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa đơn hàng "{selectedOrder?.orderNumber}"? 
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteOrder} 
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xóa'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  )
}
