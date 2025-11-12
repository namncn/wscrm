'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Pagination } from '@/components/ui/pagination'
import { toastError, toastSuccess, toastFormError, toastFormSuccess } from '@/lib/toast'
import { Plus, Search, Edit, Trash2, Eye, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface Customer {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  company: string | null
  taxCode: string | null
  companyEmail: string | null
  companyAddress: string | null
  companyPhone: string | null
  companyTaxCode: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  userId: string
  emailVerified?: 'YES' | 'NO'
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxCode: '',
    company: '',
    companyEmail: '',
    companyAddress: '',
    companyPhone: '',
    companyTaxCode: ''
  })
  const [editCustomer, setEditCustomer] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    taxCode: '',
    company: '',
    companyEmail: '',
    companyAddress: '',
    companyPhone: '',
    companyTaxCode: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    password: ''
  })

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true)
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
      console.error('Error fetching customers:', error)
      setCustomers([])
      toastError('Lỗi khi tải danh sách khách hàng')
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toastError('Vui lòng nhập tên và email')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer),
      })

      if (response.ok) {
        toastFormSuccess('Tạo khách hàng')
        setNewCustomer({ 
          name: '', 
          email: '', 
          phone: '', 
          address: '', 
          taxCode: '', 
          company: '', 
          companyEmail: '', 
          companyAddress: '', 
          companyPhone: '', 
          companyTaxCode: '' 
        })
        setIsAddDialogOpen(false)
        // Refresh customers list
        await fetchCustomers()
      } else {
        const error = await response.json()
        toastFormError('Tạo khách hàng', error.error)
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toastFormError('Tạo khách hàng', 'Có lỗi xảy ra khi tạo khách hàng')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditCustomer({
      id: customer.id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      taxCode: customer.taxCode || '',
      company: customer.company || '',
      companyEmail: customer.companyEmail || '',
      companyAddress: customer.companyAddress || '',
      companyPhone: customer.companyPhone || '',
      companyTaxCode: customer.companyTaxCode || '',
      status: customer.status,
      password: ''
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateCustomer = async () => {
    if (!editCustomer.name || !editCustomer.email) {
      toastError('Vui lòng nhập tên và email')
      return
    }

    setIsLoading(true)
    try {
      const updateData: any = {
        id: editCustomer.id,
        name: editCustomer.name,
        email: editCustomer.email,
        phone: editCustomer.phone || null,
        address: editCustomer.address || null,
        taxCode: editCustomer.taxCode || null,
        company: editCustomer.company || null,
        companyEmail: editCustomer.companyEmail || null,
        companyAddress: editCustomer.companyAddress || null,
        companyPhone: editCustomer.companyPhone || null,
        companyTaxCode: editCustomer.companyTaxCode || null,
        status: editCustomer.status
      }

      // Only include password if it's provided
      if (editCustomer.password) {
        updateData.password = editCustomer.password
      }

      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toastFormSuccess('Cập nhật khách hàng')
        setIsEditDialogOpen(false)
        // Refresh customers list
        await fetchCustomers()
      } else {
        const error = await response.json()
        toastFormError('Cập nhật khách hàng', error.error)
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      toastFormError('Cập nhật khách hàng', 'Có lỗi xảy ra khi cập nhật khách hàng')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/customers?id=${selectedCustomer.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toastFormSuccess('Xóa khách hàng')
        setIsDeleteDialogOpen(false)
        setSelectedCustomer(null)
        // Refresh customers list
        await fetchCustomers()
      } else {
        const error = await response.json()
        toastFormError('Xóa khách hàng', error.error)
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toastFormError('Xóa khách hàng', 'Có lỗi xảy ra khi xóa khách hàng')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCustomer = async (customer: Customer) => {
    if (!customer || customer.emailVerified === 'YES') return

    setIsLoading(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: customer.id
        }),
      })

      if (response.ok) {
        toastFormSuccess('Đã gửi email xác thực đến khách hàng')
        // Refresh customers list
        await fetchCustomers()
      } else {
        const error = await response.json()
        toastFormError('Gửi email xác thực', error.error)
      }
    } catch (error) {
      console.error('Error sending verification email:', error)
      toastFormError('Gửi email xác thực', 'Có lỗi xảy ra khi gửi email xác thực')
    } finally {
      setIsLoading(false)
    }
  }

  const getVerificationBadge = (emailVerified?: 'YES' | 'NO') => {
    const isVerified = emailVerified === 'YES'
    return (
      <Badge 
        variant={isVerified ? 'default' : 'outline'} 
        className={isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
      >
        {isVerified ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Đã xác thực
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Chưa xác thực
          </>
        )}
      </Badge>
    )
  }

  const filteredCustomers = (customers || []).filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'INACTIVE':
        return <Badge variant="secondary">Không hoạt động</Badge>
      case 'SUSPENDED':
        return <Badge variant="destructive">Tạm khóa</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Khách Hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin khách hàng và dịch vụ</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Thêm Khách Hàng
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Thêm Khách Hàng Mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin khách hàng mới vào form bên dưới.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Thông tin cá nhân</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Tên *
                      </Label>
                      <Input 
                        id="name" 
                        className="col-span-3" 
                        placeholder="Tên khách hàng"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email *
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        className="col-span-3" 
                        placeholder="email@example.com"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Số điện thoại
                      </Label>
                      <Input 
                        id="phone" 
                        className="col-span-3" 
                        placeholder="0123456789"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address" className="text-right">
                        Địa chỉ
                      </Label>
                      <Textarea 
                        id="address" 
                        className="col-span-3" 
                        placeholder="Địa chỉ khách hàng"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="taxCode" className="text-right">
                        Mã số thuế
                      </Label>
                      <Input 
                        id="taxCode" 
                        className="col-span-3" 
                        placeholder="Mã số thuế cá nhân"
                        value={newCustomer.taxCode}
                        onChange={(e) => setNewCustomer({...newCustomer, taxCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Thông tin công ty</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="company" className="text-right">
                        Tên
                      </Label>
                      <Input 
                        id="company" 
                        className="col-span-3" 
                        placeholder="Tên công ty"
                        value={newCustomer.company}
                        onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="companyEmail" className="text-right">
                        Email
                      </Label>
                      <Input 
                        id="companyEmail" 
                        type="email" 
                        className="col-span-3" 
                        placeholder="email@company.com"
                        value={newCustomer.companyEmail}
                        onChange={(e) => setNewCustomer({...newCustomer, companyEmail: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="companyAddress" className="text-right">
                        Địa chỉ
                      </Label>
                      <Textarea 
                        id="companyAddress" 
                        className="col-span-3" 
                        placeholder="Địa chỉ công ty"
                        value={newCustomer.companyAddress}
                        onChange={(e) => setNewCustomer({...newCustomer, companyAddress: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="companyPhone" className="text-right">
                        Số điện thoại
                      </Label>
                      <Input 
                        id="companyPhone" 
                        className="col-span-3" 
                        placeholder="0123456789"
                        value={newCustomer.companyPhone}
                        onChange={(e) => setNewCustomer({...newCustomer, companyPhone: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="companyTaxCode" className="text-right">
                        Mã số thuế
                      </Label>
                      <Input 
                        id="companyTaxCode" 
                        className="col-span-3" 
                        placeholder="Mã số thuế công ty"
                        value={newCustomer.companyTaxCode}
                        onChange={(e) => setNewCustomer({...newCustomer, companyTaxCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateCustomer} disabled={isLoading}>
                {isLoading ? 'Đang tạo...' : 'Thêm Khách Hàng'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Customer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chi Tiết Khách Hàng</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của khách hàng
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Thông tin cá nhân</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Tên</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.name}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Email</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.email}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Số điện thoại</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.phone || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Địa chỉ</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.address || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Mã số thuế</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.taxCode || 'Chưa có'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Thông tin công ty</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Tên</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.company || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Email</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.companyEmail || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Địa chỉ</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.companyAddress || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Số điện thoại</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.companyPhone || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Mã số thuế</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.companyTaxCode || 'Chưa có'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Thông tin hệ thống</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Trạng thái</Label>
                        <div className="col-span-3 text-sm">{getStatusBadge(selectedCustomer.status)}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Xác thực</Label>
                        <div className="col-span-3 flex items-center gap-2 text-sm">
                          {getVerificationBadge(selectedCustomer.emailVerified)}
                          {selectedCustomer.emailVerified !== 'YES' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerifyCustomer(selectedCustomer)}
                              title="Xác thực tài khoản"
                              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs"
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Xác thực
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">ID</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.id}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">User ID</Label>
                        <div className="col-span-3 text-sm">{selectedCustomer.userId || 'Chưa có'}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Ngày tạo</Label>
                        <div className="col-span-3 text-sm">
                          {new Date(selectedCustomer.createdAt).toLocaleDateString('vi-VN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium">Cập nhật cuối</Label>
                        <div className="col-span-3 text-sm">
                          {new Date(selectedCustomer.updatedAt).toLocaleDateString('vi-VN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Khách Hàng</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin khách hàng
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Thông tin cá nhân</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">
                        Tên
                      </Label>
                      <Input 
                        id="edit-name" 
                        className="col-span-3" 
                        placeholder="Tên khách hàng"
                        value={editCustomer.name}
                        onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-email" className="text-right">
                        Email
                      </Label>
                      <Input 
                        id="edit-email" 
                        type="email" 
                        className="col-span-3" 
                        placeholder="email@example.com"
                        value={editCustomer.email}
                        onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-password" className="text-right">
                        Mật khẩu
                      </Label>
                      <Input 
                        id="edit-password" 
                        type="password" 
                        className="col-span-3" 
                        placeholder="Để trống nếu không muốn thay đổi"
                        value={editCustomer.password}
                        onChange={(e) => setEditCustomer({...editCustomer, password: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-phone" className="text-right">
                        Số điện thoại
                      </Label>
                      <Input 
                        id="edit-phone" 
                        className="col-span-3" 
                        placeholder="0123456789"
                        value={editCustomer.phone}
                        onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-address" className="text-right">
                        Địa chỉ
                      </Label>
                      <Textarea 
                        id="edit-address" 
                        className="col-span-3" 
                        placeholder="Địa chỉ khách hàng"
                        value={editCustomer.address}
                        onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-taxCode" className="text-right">
                        Mã số thuế
                      </Label>
                      <Input 
                        id="edit-taxCode" 
                        className="col-span-3" 
                        placeholder="Mã số thuế cá nhân"
                        value={editCustomer.taxCode}
                        onChange={(e) => setEditCustomer({...editCustomer, taxCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Thông tin công ty</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-company" className="text-right">
                        Tên
                      </Label>
                      <Input 
                        id="edit-company" 
                        className="col-span-3" 
                        placeholder="Tên công ty"
                        value={editCustomer.company}
                        onChange={(e) => setEditCustomer({...editCustomer, company: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-companyEmail" className="text-right">
                        Email
                      </Label>
                      <Input 
                        id="edit-companyEmail" 
                        type="email" 
                        className="col-span-3" 
                        placeholder="email@company.com"
                        value={editCustomer.companyEmail}
                        onChange={(e) => setEditCustomer({...editCustomer, companyEmail: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-companyAddress" className="text-right">
                        Địa chỉ
                      </Label>
                      <Textarea 
                        id="edit-companyAddress" 
                        className="col-span-3" 
                        placeholder="Địa chỉ công ty"
                        value={editCustomer.companyAddress}
                        onChange={(e) => setEditCustomer({...editCustomer, companyAddress: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-companyPhone" className="text-right">
                        Số điện thoại
                      </Label>
                      <Input 
                        id="edit-companyPhone" 
                        className="col-span-3" 
                        placeholder="0123456789"
                        value={editCustomer.companyPhone}
                        onChange={(e) => setEditCustomer({...editCustomer, companyPhone: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-companyTaxCode" className="text-right">
                        Mã số thuế
                      </Label>
                      <Input 
                        id="edit-companyTaxCode" 
                        className="col-span-3" 
                        placeholder="Mã số thuế công ty"
                        value={editCustomer.companyTaxCode}
                        onChange={(e) => setEditCustomer({...editCustomer, companyTaxCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Thông tin hệ thống</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-status" className="text-right">
                        Trạng thái
                      </Label>
                      <Select 
                        value={editCustomer.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => 
                          setEditCustomer({...editCustomer, status: value})
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                          <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                          <SelectItem value="SUSPENDED">Tạm khóa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateCustomer} disabled={isLoading}>
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Customer Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xác nhận xóa khách hàng</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa khách hàng "{selectedCustomer?.name}"? 
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteCustomer} 
                disabled={isLoading}
              >
                {isLoading ? 'Đang xóa...' : 'Xóa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Khách Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingCustomers ? <Loader2 className="h-6 w-6 animate-spin" /> : customers.length}
            </div>
            <p className="text-xs text-gray-600">Khách hàng đã đăng ký</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng Hoạt Động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingCustomers ? <Loader2 className="h-6 w-6 animate-spin" /> : customers.filter(c => c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-gray-600">
              {customers.length > 0 ? Math.round((customers.filter(c => c.status === 'ACTIVE').length / customers.length) * 100) : 0}% tổng số khách hàng
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng Mới</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingCustomers ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                customers.filter(c => {
                  const createdDate = new Date(c.createdAt)
                  const thirtyDaysAgo = new Date()
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                  return createdDate >= thirtyDaysAgo
                }).length
              }
            </div>
            <p className="text-xs text-gray-600">Trong 30 ngày qua</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng Không Hoạt Động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingCustomers ? <Loader2 className="h-6 w-6 animate-spin" /> : customers.filter(c => c.status === 'INACTIVE').length}
            </div>
            <p className="text-xs text-gray-600">Cần theo dõi</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm Kiếm & Lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên, email, công ty..."
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Khách Hàng</CardTitle>
          <CardDescription>
            Quản lý thông tin và trạng thái của tất cả khách hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCustomers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải danh sách khách hàng...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead>Liên Hệ</TableHead>
                  <TableHead>Công Ty</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead>Xác Thực</TableHead>
                  <TableHead>Ngày Tạo</TableHead>
                  <TableHead>Mã Số Thuế</TableHead>
                  <TableHead>Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-white">
                              {(() => {
                                const parts = customer.name.trim().split(/\s+/)
                                return parts.length ? parts[parts.length - 1].charAt(0).toUpperCase() : 'C'
                              })()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">ID: {customer.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{customer.email}</div>
                          <div className="text-sm text-gray-500">{customer.phone || 'Chưa có'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{customer.company || 'Chưa có'}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVerificationBadge(customer.emailVerified)}
                          {customer.emailVerified !== 'YES' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerifyCustomer(customer)}
                              title="Xác thực tài khoản"
                              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs"
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Xác thực
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>{customer.taxCode || 'Chưa có'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewCustomer(customer)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                            title="Xóa"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalFilteredPages}
          totalItems={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
      </div>
    </DashboardLayout>
  )
}
