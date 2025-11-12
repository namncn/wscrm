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
import { Pagination } from '@/components/ui/pagination'
import { Plus, Search, Eye, Edit, Trash2, Loader2, Globe, Server } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toastSuccess, toastError } from '@/lib/toast'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import { DomainCombobox } from '@/components/ui/domain-combobox'
import { HostingCombobox } from '@/components/ui/hosting-combobox'
import { VPSCombobox } from '@/components/ui/vps-combobox'
import { ContractCombobox } from '@/components/ui/contract-combobox'
import { OrderCombobox } from '@/components/ui/order-combobox'

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

interface Customer {
  id: number
  name: string
  email: string
}

interface Domain {
  id: number
  domainName: string
}

interface Hosting {
  id: number
  planName: string
  storage?: number
  bandwidth?: number
  price?: string
}

interface VPS {
  id: number
  planName: string
  cpu?: number
  ram?: number
  storage?: number
  bandwidth?: number
  price?: string
}

interface Contract {
  id: number
  contractNumber: string
}

interface Order {
  id: number
}

export default function WebsitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [hostings, setHostings] = useState<Hosting[]>([])
  const [vpss, setVpss] = useState<VPS[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form state for new website
  const [newWebsite, setNewWebsite] = useState({
    name: '',
    domainId: null as number | null,
    hostingId: null as number | null,
    vpsId: null as number | null,
    contractId: null as number | null,
    orderId: '',
    customerId: null as number | null,
    status: 'LIVE' as 'LIVE' | 'DOWN' | 'MAINTENANCE',
    description: '',
    notes: '',
  })

  // Combobox search states

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchWebsites()
    fetchCustomers()
    // Don't fetch domains, hostings, vpss here - they will be fetched when customer is selected
    fetchContracts()
    fetchOrders()
  }, [session, status, router])

  // Fetch domain, hosting, VPS, contracts and orders when customer is selected
  useEffect(() => {
    if (newWebsite.customerId) {
      fetchDomains(newWebsite.customerId.toString())
      fetchHostings(newWebsite.customerId.toString())
      fetchVPSs(newWebsite.customerId.toString())
      fetchContracts(newWebsite.customerId.toString())
      fetchOrders(newWebsite.customerId.toString())
      // Clear domain, hosting, VPS, contract and order selection when customer changes
      setNewWebsite(prev => ({
        ...prev,
        domainId: null,
        hostingId: null,
        vpsId: null,
        contractId: null as number | null,
        orderId: '',
      }))
    } else {
      // If no customer selected, clear all lists (similar to domain behavior)
      setDomains([])
      setHostings([])
      setVpss([])
      fetchContracts()
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newWebsite.customerId])
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setWebsites(result.data)
        } else {
          setWebsites([])
          toastError('Không thể tải danh sách websites')
        }
      } else {
        setWebsites([])
        toastError('Không thể tải danh sách websites')
      }
    } catch (error) {
      console.error('Error fetching websites:', error)
      setWebsites([])
      toastError('Lỗi khi tải danh sách websites')
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
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchDomains = async (customerId?: string) => {
    try {
      const url = customerId 
        ? `/api/domain?customerId=${customerId}`
        : '/api/domain'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDomains(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    }
  }

  const fetchHostings = async (customerId?: string) => {
    try {
      const url = customerId 
        ? `/api/hosting?customerId=${customerId}`
        : '/api/hosting?purchased=all'
      const response = await fetch(url)
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

  const fetchVPSs = async (customerId?: string) => {
    try {
      const url = customerId 
        ? `/api/vps?customerId=${customerId}`
        : '/api/vps?purchased=all'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVpss(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching VPSs:', error)
    }
  }

  const fetchContracts = async (customerId?: string) => {
    try {
      const url = customerId 
        ? `/api/contracts?customerId=${customerId}`
        : '/api/contracts'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setContracts(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    }
  }

  const fetchOrders = async (customerId?: string) => {
    try {
      const url = customerId 
        ? `/api/orders?customerId=${customerId}`
        : '/api/orders'
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setOrders(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const createWebsite = async () => {
    if (!newWebsite.name || !newWebsite.customerId) {
      toastError('Tên website và khách hàng là bắt buộc')
      return
    }
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newWebsite,
          domainId: newWebsite.domainId || null,
          hostingId: newWebsite.hostingId || null,
          vpsId: newWebsite.vpsId || null,
          contractId: newWebsite.contractId || null,
          orderId: newWebsite.orderId ? parseInt(newWebsite.orderId) : null,
          customerId: newWebsite.customerId,
        }),
      })

      if (response.ok) {
        await fetchWebsites()
        setIsAddDialogOpen(false)
        setNewWebsite({
          name: '',
          domainId: null,
          hostingId: null,
          vpsId: null,
          contractId: null as number | null,
          orderId: '',
          customerId: null,
          status: 'LIVE',
          description: '',
          notes: '',
        })
        toastSuccess('Tạo website thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể tạo website')
      }
    } catch (error) {
      console.error('Error creating website:', error)
      toastError('Có lỗi xảy ra khi tạo website')
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewWebsite = (website: Website) => {
    router.push(`/admin/websites/${website.id}`)
  }

  const handleEditWebsite = (website: Website) => {
    router.push(`/admin/websites/${website.id}/edit`)
  }

  const handleDeleteWebsite = (website: Website) => {
    setSelectedWebsite(website)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteWebsite = async () => {
    if (!selectedWebsite) return

    try {
      const response = await fetch('/api/websites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedWebsite.id }),
      })

      if (response.ok) {
        await fetchWebsites()
        setIsDeleteDialogOpen(false)
        setSelectedWebsite(null)
        toastSuccess('Xóa website thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.message || 'Không thể xóa website')
      }
    } catch (error) {
      console.error('Error deleting website:', error)
      toastError('Có lỗi xảy ra khi xóa website')
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

  const filteredWebsites = websites.filter(website =>
    website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (website.customerName && website.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (website.domainName && website.domainName.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWebsites = filteredWebsites.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredWebsites.length / itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
      case 'DOWN':
        return <Badge className="bg-red-100 text-red-800">Đang tắt</Badge>
      case 'MAINTENANCE':
        return <Badge className="bg-yellow-100 text-yellow-800">Bảo trì</Badge>
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
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Websites</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tất cả websites</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              // Reset form when dialog closes
              setNewWebsite({
                name: '',
                domainId: null,
                hostingId: null,
                vpsId: null,
                contractId: null as number | null,
                orderId: '',
                customerId: null,
                status: 'LIVE',
                description: '',
                notes: '',
              })
              // Clear lists when dialog closes
              setDomains([])
              setHostings([])
              setVpss([])
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Tạo Website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Tạo Website Mới</DialogTitle>
                <DialogDescription>
                  Tạo website mới và liên kết với các dịch vụ
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Tên website <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    className="col-span-3" 
                    placeholder="Nhập tên website"
                    value={newWebsite.name}
                    onChange={(e) => setNewWebsite({...newWebsite, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customerId" className="text-right">
                    Khách hàng <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <CustomerCombobox
                      customers={customers}
                      value={newWebsite.customerId || null}
                      onValueChange={(value) => setNewWebsite({...newWebsite, customerId: typeof value === 'number' ? value : null})}
                      placeholder="Chọn khách hàng..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="domainId" className="text-right">
                    Tên miền
                  </Label>
                  <div className="col-span-3">
                    <DomainCombobox
                      domains={domains}
                      value={newWebsite.domainId}
                      onValueChange={(value) => setNewWebsite({...newWebsite, domainId: value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hostingId" className="text-right">
                    Hosting
                  </Label>
                  <div className="col-span-3">
                    <HostingCombobox
                      hostings={hostings}
                      value={newWebsite.hostingId}
                      onValueChange={(value) => setNewWebsite({...newWebsite, hostingId: value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vpsId" className="text-right">
                    VPS
                  </Label>
                  <div className="col-span-3">
                    <VPSCombobox
                      vpss={vpss}
                      value={newWebsite.vpsId}
                      onValueChange={(value) => setNewWebsite({...newWebsite, vpsId: value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contractId" className="text-right">
                    Hợp đồng
                  </Label>
                  <div className="col-span-3">
                    <ContractCombobox
                      contracts={contracts}
                      value={newWebsite.contractId}
                      onValueChange={(value) => setNewWebsite({...newWebsite, contractId: typeof value === 'number' ? value : null})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orderId" className="text-right">
                    Đơn hàng
                  </Label>
                  <div className="col-span-3">
                    <OrderCombobox
                      orders={orders}
                      value={newWebsite.orderId}
                      onValueChange={(value) => setNewWebsite({...newWebsite, orderId: value || ''})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Trạng thái
                  </Label>
                  <Select
                    value={newWebsite.status}
                    onValueChange={(value: 'LIVE' | 'DOWN' | 'MAINTENANCE') => setNewWebsite({...newWebsite, status: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIVE">Đang hoạt động</SelectItem>
                      <SelectItem value="DOWN">Đang tắt</SelectItem>
                      <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Mô tả
                  </Label>
                  <Textarea 
                    id="description" 
                    className="col-span-3" 
                    placeholder="Mô tả website"
                    value={newWebsite.description}
                    onChange={(e) => setNewWebsite({...newWebsite, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Ghi chú
                  </Label>
                  <Textarea 
                    id="notes" 
                    className="col-span-3" 
                    placeholder="Ghi chú"
                    value={newWebsite.notes}
                    onChange={(e) => setNewWebsite({...newWebsite, notes: e.target.value})}
                  />
                </div>
                </div>
              </div>
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={createWebsite} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo Website'
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
              <CardTitle className="text-sm font-medium">Tổng Websites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{websites.length}</div>
              <p className="text-xs text-gray-600">Tất cả websites</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang Hoạt Động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{websites.filter(w => w.status === 'LIVE').length}</div>
              <p className="text-xs text-gray-600">Trạng thái Live</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang Tắt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{websites.filter(w => w.status === 'DOWN').length}</div>
              <p className="text-xs text-gray-600">Trạng thái Down</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bảo Trì</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{websites.filter(w => w.status === 'MAINTENANCE').length}</div>
              <p className="text-xs text-gray-600">Đang bảo trì</p>
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
                    placeholder="Tìm kiếm theo tên website, khách hàng, tên miền..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Websites Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Websites</CardTitle>
            <CardDescription>
              Quản lý và theo dõi tất cả websites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {websites.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có website nào</h3>
                <p className="text-gray-500 mb-4">Tạo website đầu tiên</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Tạo Website
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Website</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Tên Miền</TableHead>
                    <TableHead>Hosting</TableHead>
                    <TableHead>VPS</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead>Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWebsites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell>
                        <div className="font-medium">{website.name}</div>
                        <div className="text-sm text-gray-500">ID: {website.id}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{website.customerName || '-'}</div>
                          <div className="text-sm text-gray-500">{website.customerEmail || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {website.domainName ? (
                          <div className="flex items-center space-x-1">
                            <Globe className="h-4 w-4 text-cyan-600" />
                            <span>{website.domainName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {website.hostingPlanName ? (
                          <div className="flex items-center space-x-1">
                            <Server className="h-4 w-4 text-indigo-600" />
                            <span>{website.hostingPlanName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {website.vpsPlanName ? (
                          <div className="flex items-center space-x-1">
                            <Server className="h-4 w-4 text-pink-600" />
                            <span>{website.vpsPlanName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(website.status)}</TableCell>
                      <TableCell>{new Date(website.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewWebsite(website)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditWebsite(website)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteWebsite(website)}
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
          {totalFilteredPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalFilteredPages}
              totalItems={filteredWebsites.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      </div>

      {/* Delete Website Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Xác nhận xóa website</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa website <strong>{selectedWebsite?.name}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 pt-4 pb-6 border-t">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDeleteWebsite}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

