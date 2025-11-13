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
import { DatePicker } from '@/components/ui/date-picker'
import { OrderCombobox } from '@/components/ui/order-combobox'
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastSuccess, toastError } from '@/lib/toast'

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

// Helper function to calculate month-over-month change percentage
const calculateMonthOverMonthChange = <T extends { createdAt: string }>(
  items: T[],
  getValue: (item: T) => number = () => 1
): string => {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const currentMonthValue = items
    .filter(item => new Date(item.createdAt) >= currentMonthStart)
    .reduce((sum, item) => sum + getValue(item), 0)

  const lastMonthValue = items
    .filter(item => {
      const itemDate = new Date(item.createdAt)
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd
    })
    .reduce((sum, item) => sum + getValue(item), 0)

  if (lastMonthValue === 0) {
    return currentMonthValue > 0 ? '+100%' : '—'
  }

  const changePercent = ((currentMonthValue - lastMonthValue) / lastMonthValue) * 100
  const sign = changePercent >= 0 ? '+' : ''
  return `${sign}${Math.round(changePercent)}%`
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
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Form state for new contract
  const [newContract, setNewContract] = useState({
    orderId: 0,
    startDate: '',
    endDate: '',
    totalValue: 0,
    notes: ''
  })

  // Form state for edit contract
  const [editContract, setEditContract] = useState({
    id: '',
    startDate: '',
    endDate: '',
    totalValue: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
  })

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

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts')
      if (response.ok) {
        const data = await response.json()
        setContracts(data)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const createContract = async () => {
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
    })
    setIsEditDialogOpen(true)
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Quản Lý Hợp Đồng</h1>
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
                      value={newContract.orderId?.toString() || null}
                      onValueChange={(value) => {
                        const orderId = value ? parseInt(value) : null
                        const selectedOrder = orders.find(o => o.id === orderId)
                        setNewContract({
                          ...newContract, 
                          orderId: orderId || 0,
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
              <p className="text-xs text-gray-600">
                {calculateMonthOverMonthChange(contracts)} so với tháng trước
              </p>
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
              <p className="text-xs text-gray-600">
                {calculateMonthOverMonthChange(contracts, (c) => c.totalValue)} so với tháng trước
              </p>
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
                  {filteredContracts.map((contract) => (
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
                            onClick={() => handleDeleteContract(contract)}
                            title="Xóa"
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
                <Label htmlFor="edit-endDate" className="font-medium mb-2 block">Ngày kết thúc</Label>
                <div className="col-span-3">
                  <DatePicker
                    value={editContract.endDate ? new Date(editContract.endDate) : undefined}
                    onChange={(date: Date | undefined) => setEditContract({...editContract, endDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Chọn ngày kết thúc"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-totalValue" className="font-medium mb-2 block">Giá trị hợp đồng</Label>
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
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateContract} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
