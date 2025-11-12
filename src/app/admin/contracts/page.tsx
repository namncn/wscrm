'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderCombobox } from '@/components/ui/order-combobox'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Pagination } from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Plus, Eye, Edit, Trash2, Loader2, Mail } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastSuccess, toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface Contract {
  id: number
  contractNumber: string
  orderId: number
  customerId: number
  userId: number
  startDate: string
  endDate: string
  totalValue: number // Now integer
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  customerName: string
  customerEmail: string
  userName: string
  orderNumber?: string | null
  domainIds?: number[]
  hostingIds?: number[]
  vpsIds?: number[]
  domains?: Array<{ id: number; domainName: string }>
  hostings?: Array<{ id: number; planName: string; storage?: number; bandwidth?: number; price?: string }>
  vpss?: Array<{ id: number; planName: string; cpu?: number; ram?: number; storage?: number; price?: string }>
}

interface Customer {
  id: number
  name: string
  email: string
}

interface Order {
  id: number
  orderNumber: string
  customerId: number
  totalAmount: number
}

export default function ContractsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEmailConfirmDialogOpen, setIsEmailConfirmDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form state for new contract
  const [newContract, setNewContract] = useState({
    orderId: 0,
    startDate: '',
    endDate: '',
    totalValue: 0,
    notes: ''
  })
  
  // Order search combobox state

  // Form state for edit contract
  const [editContract, setEditContract] = useState({
    id: '',
    startDate: '',
    endDate: '',
    totalValue: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
    customerId: null as number | null,
    orderId: null as number | null,
    domainIds: [] as number[],
    hostingIds: [] as number[],
    vpsIds: [] as number[],
  })

  // States for multiple selection comboboxes
  const [domainSearchOpen, setDomainSearchOpen] = useState(false)
  const [domainSearchValue, setDomainSearchValue] = useState('')
  const [hostingSearchOpen, setHostingSearchOpen] = useState(false)
  const [hostingSearchValue, setHostingSearchValue] = useState('')
  const [vpsSearchOpen, setVpsSearchOpen] = useState(false)
  const [vpsSearchValue, setVpsSearchValue] = useState('')

  // States for domain, hosting, VPS lists
  const [domains, setDomains] = useState<any[]>([])
  const [hostings, setHostings] = useState<any[]>([])
  const [vpss, setVpss] = useState<any[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchContracts()
    fetchCustomers()
    fetchOrders()
  }, [session, status, router])
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setContracts(result.data)
        } else {
          setContracts([])
          toastError('Không thể tải danh sách hợp đồng')
        }
      } else {
        setContracts([])
        toastError('Không thể tải danh sách hợp đồng')
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
      setContracts([])
      toastError('Lỗi khi tải danh sách hợp đồng')
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
        }
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setOrders(result.data)
        } else {
          setOrders([])
        }
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    }
  }

  const fetchDomains = async (customerId?: number) => {
    try {
      const url = customerId ? `/api/domain?customerId=${customerId}` : '/api/domain'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDomains(result.data)
        } else {
          setDomains([])
        }
      } else {
        setDomains([])
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
      setDomains([])
    }
  }

  const fetchHostings = async (customerId?: number) => {
    try {
      const url = customerId ? `/api/hosting?customerId=${customerId}` : '/api/hosting?purchased=all'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setHostings(result.data)
        } else {
          setHostings([])
        }
      } else {
        setHostings([])
      }
    } catch (error) {
      console.error('Error fetching hostings:', error)
      setHostings([])
    }
  }

  const fetchVPSs = async (customerId?: number) => {
    try {
      const url = customerId ? `/api/vps?customerId=${customerId}` : '/api/vps?purchased=all'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVpss(result.data)
        } else {
          setVpss([])
        }
      } else {
        setVpss([])
      }
    } catch (error) {
      console.error('Error fetching VPSs:', error)
      setVpss([])
    }
  }

  const createContract = async () => {
    if (!newContract.orderId || newContract.orderId === 0) {
      toastError('Vui lòng chọn đơn hàng')
      return
    }
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContract),
      })

      if (response.ok) {
        await fetchContracts()
        setIsAddDialogOpen(false)
        setNewContract({
          orderId: 0,
          startDate: '',
          endDate: '',
          totalValue: 0,
          notes: ''
        })
        toastSuccess('Tạo hợp đồng thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể tạo hợp đồng')
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      toastError('Có lỗi xảy ra khi tạo hợp đồng')
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewContract = (contract: Contract) => {
    router.push(`/contract/${contract.id}`)
  }

  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract)
    setEditContract({
      id: contract.id.toString(),
      startDate: contract.startDate,
      endDate: contract.endDate,
      totalValue: contract.totalValue,
      status: contract.status,
      customerId: contract.customerId,
      orderId: contract.orderId,
      domainIds: (contract as any).domainIds || [],
      hostingIds: (contract as any).hostingIds || [],
      vpsIds: (contract as any).vpsIds || [],
    })
    // Fetch domains, hostings, VPSs when customer is selected
    if (contract.customerId) {
      fetchDomains(contract.customerId)
      fetchHostings(contract.customerId)
      fetchVPSs(contract.customerId)
    }
    setIsEditDialogOpen(true)
  }

  // Fetch domains, hostings, VPSs when customerId changes in edit form
  useEffect(() => {
    if (isEditDialogOpen && editContract.customerId) {
      fetchDomains(editContract.customerId)
      fetchHostings(editContract.customerId)
      fetchVPSs(editContract.customerId)
    } else if (isEditDialogOpen && !editContract.customerId) {
      // Clear lists if no customer selected
      setDomains([])
      setHostings([])
      setVpss([])
    }
  }, [editContract.customerId, isEditDialogOpen])

  const handleUpdateContract = async () => {
    if (!editContract.id) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/contracts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editContract),
      })

      if (response.ok) {
        await fetchContracts()
        setIsEditDialogOpen(false)
        setEditContract({
          id: '',
          startDate: '',
          endDate: '',
          totalValue: 0,
          status: 'ACTIVE',
          customerId: null,
          orderId: null,
          domainIds: [],
          hostingIds: [],
          vpsIds: [],
        })
        toastSuccess('Cập nhật hợp đồng thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể cập nhật hợp đồng')
      }
    } catch (error) {
      console.error('Error updating contract:', error)
      toastError('Có lỗi xảy ra khi cập nhật hợp đồng')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendEmail = (contract: Contract) => {
    setSelectedContract(contract)
    setIsEmailConfirmDialogOpen(true)
  }

  const confirmSendEmail = async () => {
    if (!selectedContract) return

    try {
      setIsSendingEmail(true)
      const response = await fetch(`/api/contract/${selectedContract.id}/send-email`, {
        method: 'POST',
      })

      if (response.ok) {
        toastSuccess('Email đã được gửi thành công!')
        setIsEmailConfirmDialogOpen(false)
        setSelectedContract(null)
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể gửi email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toastError('Có lỗi xảy ra khi gửi email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleDeleteContract = (contract: Contract) => {
    setSelectedContract(contract)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteContract = async () => {
    if (!selectedContract) return

    try {
      const response = await fetch('/api/contracts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedContract.id }),
      })

      if (response.ok) {
        await fetchContracts()
        setIsDeleteDialogOpen(false)
        setSelectedContract(null)
        toastSuccess('Xóa hợp đồng thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể xóa hợp đồng')
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
      toastError('Có lỗi xảy ra khi xóa hợp đồng')
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

  const filteredContracts = contracts.filter(contract =>
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredContracts.length / itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Nháp</Badge>
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Hết hạn</Badge>
      case 'TERMINATED':
        return <Badge variant="destructive">Chấm dứt</Badge>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Hợp Đồng</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tất cả hợp đồng</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Tạo Hợp Đồng
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Tạo Hợp Đồng Mới</DialogTitle>
                <DialogDescription>
                  Tạo hợp đồng mới từ đơn hàng
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="order" className="text-right">
                    Đơn hàng
                  </Label>
                  <div className="col-span-3">
                    <OrderCombobox
                      orders={orders}
                      value={newContract.orderId && newContract.orderId !== 0 ? newContract.orderId.toString() : null}
                      onValueChange={(value) => {
                        const orderId = value ? parseInt(value) : 0
                        const selectedOrder = value ? orders.find(o => o.id === parseInt(value)) : null
                        setNewContract({
                          ...newContract, 
                          orderId: orderId,
                          totalValue: selectedOrder ? Math.round(selectedOrder.totalAmount || 0) : 0
                        })
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startDate" className="text-right">
                    Ngày bắt đầu
                  </Label>
                  <div className="col-span-3">
                    <DatePicker
                      value={newContract.startDate ? new Date(newContract.startDate) : undefined}
                      onChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          setNewContract({...newContract, startDate: `${year}-${month}-${day}`})
                        } else {
                          setNewContract({...newContract, startDate: ''})
                        }
                      }}
                      placeholder="Chọn ngày bắt đầu"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endDate" className="text-right">
                    Ngày kết thúc
                  </Label>
                  <div className="col-span-3">
                    <DatePicker
                      value={newContract.endDate ? new Date(newContract.endDate) : undefined}
                      onChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          setNewContract({...newContract, endDate: `${year}-${month}-${day}`})
                        } else {
                          setNewContract({...newContract, endDate: ''})
                        }
                      }}
                      placeholder="Chọn ngày kết thúc"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalValue" className="text-right">
                    Giá trị hợp đồng
                  </Label>
                  <Input 
                    id="totalValue" 
                    type="number" 
                    step="1"
                    min="0"
                    className="col-span-3" 
                    placeholder="0"
                    value={newContract.totalValue}
                    onChange={(e) => setNewContract({...newContract, totalValue: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Ghi chú
                  </Label>
                  <Textarea 
                    id="notes" 
                    className="col-span-3" 
                    placeholder="Ghi chú hợp đồng"
                    value={newContract.notes}
                    onChange={(e) => setNewContract({...newContract, notes: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={createContract} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo Hợp Đồng'
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
              <CardTitle className="text-sm font-medium">Tổng Hợp Đồng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.length}</div>
              <p className="text-xs text-gray-600">+5% so với tháng trước</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'ACTIVE').length}</div>
              <p className="text-xs text-gray-600">Đang có hiệu lực</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sắp Hết Hạn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contracts.filter(c => {
                  const endDate = new Date(c.endDate)
                  const now = new Date()
                  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  return diffDays <= 30 && diffDays > 0
                }).length}
              </div>
              <p className="text-xs text-gray-600">Trong 30 ngày tới</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Giá Trị</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(contracts.reduce((sum, c) => sum + c.totalValue, 0))}
              </div>
              <p className="text-xs text-gray-600">+15% so với tháng trước</p>
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
                    placeholder="Tìm kiếm theo số hợp đồng, tên khách hàng..."
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

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Hợp Đồng</CardTitle>
            <CardDescription>
              Quản lý và theo dõi tất cả hợp đồng
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có hợp đồng nào</h3>
                <p className="text-gray-500 mb-4">Tạo hợp đồng đầu tiên từ đơn hàng</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Tạo Hợp Đồng
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số Hợp Đồng</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Đơn Hàng</TableHead>
                    <TableHead>Giá Trị</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Thời Hạn</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead>Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="font-medium">{contract.contractNumber}</div>
                        <div className="text-sm text-gray-500">ID: {contract.id}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.customerName}</div>
                          <div className="text-sm text-gray-500">{contract.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">ORD-{contract.orderId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(contract.totalValue)}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Từ: {new Date(contract.startDate).toLocaleDateString('vi-VN')}</div>
                          <div>Đến: {new Date(contract.endDate).toLocaleDateString('vi-VN')}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(contract.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewContract(contract)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditContract(contract)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSendEmail(contract)}
                            title="Gửi email"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteContract(contract)}
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
            )}
          </CardContent>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            totalItems={filteredContracts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>

      {/* View Contract Dialog replaced by dedicated detail page */}

      {/* Edit Contract Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh Sửa Hợp Đồng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate" className="font-medium mb-2 block">Ngày bắt đầu</Label>
                <div className="col-span-3">
                  <DatePicker
                    value={editContract.startDate ? new Date(editContract.startDate) : undefined}
                    onChange={(date: Date | undefined) => setEditContract({...editContract, startDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Chọn ngày bắt đầu"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-endDate" className="font-medium mb-2 block">
                  Ngày kết thúc <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3">
                  <DatePicker
                    value={editContract.endDate ? new Date(editContract.endDate) : undefined}
                    onChange={(date: Date | undefined) => setEditContract({...editContract, endDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Chọn ngày kết thúc"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-totalValue" className="font-medium mb-2 block">
                  Giá trị hợp đồng <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-totalValue"
                    type="number"
                    step="1"
                    min="0"
                    value={editContract.totalValue}
                    onChange={(e) => setEditContract({...editContract, totalValue: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-status" className="font-medium mb-2 block">Trạng thái</Label>
                <div className="col-span-3">
                  <Select
                    value={editContract.status}
                    onValueChange={(value: 'ACTIVE' | 'EXPIRED' | 'CANCELLED') => 
                      setEditContract({...editContract, status: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                      <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                      <SelectItem value="CANCELLED">Hủy bỏ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-customer" className="font-medium mb-2 block">
                  Khách hàng <span className="text-red-500">*</span>
                </Label>
                <CustomerCombobox
                  customers={customers}
                  value={editContract.customerId?.toString() || ''}
                  onValueChange={(value) => {
                    const newCustomerId = value ? parseInt(value.toString()) : null
                    // Clear selections and fetch new data when customer changes
                    setEditContract({
                      ...editContract,
                      customerId: newCustomerId,
                      domainIds: [],
                      hostingIds: [],
                      vpsIds: [],
                    })
                    // Fetch domains, hostings, VPSs for the selected customer
                    if (newCustomerId) {
                      fetchDomains(newCustomerId)
                      fetchHostings(newCustomerId)
                      fetchVPSs(newCustomerId)
                    } else {
                      // Clear lists if no customer selected
                      setDomains([])
                      setHostings([])
                      setVpss([])
                    }
                  }}
                  placeholder="Chọn khách hàng"
                />
              </div>
              <div>
                <Label htmlFor="edit-order" className="font-medium mb-2 block">
                  Đơn hàng <span className="text-red-500">*</span>
                </Label>
                <OrderCombobox
                  orders={orders}
                  value={editContract.orderId?.toString() || ''}
                  onValueChange={(value) => {
                    setEditContract({
                      ...editContract,
                      orderId: value ? parseInt(value.toString()) : null
                    })
                  }}
                  placeholder="Chọn đơn hàng"
                />
              </div>
            </div>
            {/* Optional fields: Domain, Hosting, VPS - Only show if customer is selected */}
            {editContract.customerId && (
              <div className="grid grid-cols-1 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="edit-domains" className="font-medium mb-2 block">Tên miền (tùy chọn)</Label>
                <Popover open={domainSearchOpen} onOpenChange={setDomainSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editContract.domainIds.length > 0
                        ? `${editContract.domainIds.length} tên miền đã chọn`
                        : "Chọn tên miền"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm tên miền..."
                          value={domainSearchValue}
                          onChange={(e) => setDomainSearchValue(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div 
                      className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {domains
                        .filter(d =>
                          d.domainName?.toLowerCase().includes(domainSearchValue.toLowerCase())
                        )
                        .map((domain) => {
                          const isSelected = editContract.domainIds.includes(domain.id)
                          return (
                            <div
                              key={domain.id}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                const newIds = isSelected
                                  ? editContract.domainIds.filter(id => id !== domain.id)
                                  : [...editContract.domainIds, domain.id]
                                setEditContract({ ...editContract, domainIds: newIds })
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span>{domain.domainName}</span>
                            </div>
                          )
                        })}
                      {domains.filter(d =>
                        d.domainName?.toLowerCase().includes(domainSearchValue.toLowerCase())
                      ).length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Không tìm thấy tên miền
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-hostings" className="font-medium mb-2 block">Hosting (tùy chọn)</Label>
                <Popover open={hostingSearchOpen} onOpenChange={setHostingSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editContract.hostingIds.length > 0
                        ? `${editContract.hostingIds.length} hosting đã chọn`
                        : "Chọn hosting"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm hosting..."
                          value={hostingSearchValue}
                          onChange={(e) => setHostingSearchValue(e.target.value)}
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
                        .map((hosting) => {
                          const isSelected = editContract.hostingIds.includes(hosting.id)
                          return (
                            <div
                              key={hosting.id}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                const newIds = isSelected
                                  ? editContract.hostingIds.filter(id => id !== hosting.id)
                                  : [...editContract.hostingIds, hosting.id]
                                setEditContract({ ...editContract, hostingIds: newIds })
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{hosting.planName}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {hosting.id} • {hosting.storage}GB • {hosting.bandwidth}GB • {hosting.price}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      {hostings.filter(h =>
                        h.planName?.toLowerCase().includes(hostingSearchValue.toLowerCase())
                      ).length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Không tìm thấy hosting
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-vpss" className="font-medium mb-2 block">VPS (tùy chọn)</Label>
                <Popover open={vpsSearchOpen} onOpenChange={setVpsSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editContract.vpsIds.length > 0
                        ? `${editContract.vpsIds.length} VPS đã chọn`
                        : "Chọn VPS"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm VPS..."
                          value={vpsSearchValue}
                          onChange={(e) => setVpsSearchValue(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div 
                      className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {vpss
                        .filter(v =>
                          v.planName?.toLowerCase().includes(vpsSearchValue.toLowerCase())
                        )
                        .map((vps) => {
                          const isSelected = editContract.vpsIds.includes(vps.id)
                          return (
                            <div
                              key={vps.id}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                const newIds = isSelected
                                  ? editContract.vpsIds.filter(id => id !== vps.id)
                                  : [...editContract.vpsIds, vps.id]
                                setEditContract({ ...editContract, vpsIds: newIds })
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{vps.planName}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {vps.id} • {vps.cpu} CPU • {vps.ram}GB RAM • {vps.storage}GB • {vps.price}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      {vpss.filter(v =>
                        v.planName?.toLowerCase().includes(vpsSearchValue.toLowerCase())
                      ).length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Không tìm thấy VPS
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            )}
            {!editContract.customerId && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Vui lòng chọn khách hàng để hiển thị danh sách Tên miền, Hosting, VPS
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateContract} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  'Cập nhật'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={isEmailConfirmDialogOpen} onOpenChange={setIsEmailConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi Email Thông Báo</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gửi email thông báo hợp đồng mới cho khách hàng <strong>{selectedContract?.customerName}</strong> ({selectedContract?.customerEmail})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailConfirmDialogOpen(false)} disabled={isSendingEmail}>
              Hủy
            </Button>
            <Button onClick={confirmSendEmail} disabled={isSendingEmail} className="bg-green-600 hover:bg-green-700 text-white">
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Gửi Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contract Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hợp đồng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Bạn có chắc chắn muốn xóa hợp đồng <strong>{selectedContract?.contractNumber}</strong>?</p>
            <p className="text-sm text-gray-500">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={confirmDeleteContract}>
                Xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
