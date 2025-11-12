'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Pagination } from '@/components/ui/pagination'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import { Server, Plus, Search, Eye, RefreshCw, CheckCircle, XCircle, HardDrive, Cpu, Edit, Trash2, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface Hosting {
  id: number
  planName: string
  storage: number
  bandwidth: number
  price: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  domain?: string | null
  customerId?: string | null
  expiryDate?: string | null
  serverLocation?: string | null
  addonDomain?: string
  subDomain?: string
  ftpAccounts?: string
  databases?: string
  hostingType?: string
  operatingSystem?: string
}

export default function HostingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hostings, setHostings] = useState<Hosting[]>([])
  const [purchasedHostings, setPurchasedHostings] = useState<Hosting[]>([])
  const [activeTab, setActiveTab] = useState<'packages' | 'purchased'>('purchased')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateHostingDialogOpen, setIsCreateHostingDialogOpen] = useState(false)
  const [isViewHostingDialogOpen, setIsViewHostingDialogOpen] = useState(false)
  const [isEditHostingDialogOpen, setIsEditHostingDialogOpen] = useState(false)
  const [isDeleteHostingDialogOpen, setIsDeleteHostingDialogOpen] = useState(false)
  const [selectedHosting, setSelectedHosting] = useState<Hosting | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; email: string }>>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Register purchased hosting (assign to customer)
  const [isRegisterHostingDialogOpen, setIsRegisterHostingDialogOpen] = useState(false)
  const createInitialRegisterHostingState = () => ({
    planName: '',
    storage: 0,
    bandwidth: 0,
    price: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    customerId: null as number | null,
    registrationDate: undefined as Date | undefined,
    expiryDate: undefined as Date | undefined,
    serverLocation: '',
  })
  const [registerHosting, setRegisterHosting] = useState(createInitialRegisterHostingState)

  // Form state for new hosting
  const [newHosting, setNewHosting] = useState({
    planName: '',
    storage: 0,
    bandwidth: 0,
    price: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    addonDomain: 'Unlimited',
    subDomain: 'Unlimited',
    ftpAccounts: 'Unlimited',
    databases: 'Unlimited',
    hostingType: 'VPS Hosting',
    operatingSystem: 'Linux'
  })

  // Form state for edit hosting
  const [editHosting, setEditHosting] = useState({
    planName: '',
    storage: 0,
    bandwidth: 0,
    price: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    addonDomain: 'Unlimited',
    subDomain: 'Unlimited',
    ftpAccounts: 'Unlimited',
    databases: 'Unlimited',
    hostingType: 'VPS Hosting',
    operatingSystem: 'Linux',
    domain: '',
    expiryDate: '',
    serverLocation: '',
    customerId: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchHostings()
    fetchCustomers()
  }, [session, status, router])
  
  // Reset to first page when search term changes or tab switches
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const fetchHostings = async () => {
    try {
      const [packagesRes, purchasedRes] = await Promise.all([
        fetch('/api/hosting'),
        fetch('/api/hosting?purchased=all')
      ])

      if (packagesRes.ok) {
        const result = await packagesRes.json()
        if (result.success && result.data) setHostings(result.data)
        else setHostings([])
      } else setHostings([])

      if (purchasedRes.ok) {
        const result2 = await purchasedRes.json()
        if (result2.success && result2.data) setPurchasedHostings(result2.data)
        else setPurchasedHostings([])
      } else setPurchasedHostings([])
    } catch (error) {
      setHostings([])
      setPurchasedHostings([])
      toastError('Có lỗi xảy ra khi tải danh sách hosting')
      console.error('Error fetching hostings:', error)
    } finally {
      setLoading(false)
    }
  }

  const createHosting = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/hosting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newHosting),
      })

      if (response.ok) {
        await fetchHostings()
        setIsCreateHostingDialogOpen(false)
        setNewHosting({
          planName: '',
          storage: 0,
          bandwidth: 0,
          price: 0,
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
          addonDomain: 'Unlimited',
          subDomain: 'Unlimited',
          ftpAccounts: 'Unlimited',
          databases: 'Unlimited',
          hostingType: 'VPS Hosting',
          operatingSystem: 'Linux'
        })
        toastSuccess('Tạo gói hosting thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể tạo gói hosting'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi tạo gói hosting')
      console.error('Error creating hosting:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data.map((c: any) => ({ id: typeof c.id === 'string' ? parseInt(c.id, 10) : c.id, name: c.name, email: c.email })))
        }
      }
    } catch (e) {
      // ignore silently in header toolbar
      console.error('Error fetching customers list:', e)
    }
  }

  const handleViewHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    setIsViewHostingDialogOpen(true)
  }

  const handleEditHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    setEditHosting({
      planName: hosting.planName,
      storage: hosting.storage,
      bandwidth: hosting.bandwidth,
      price: parseFloat(hosting.price),
      status: hosting.status,
      addonDomain: hosting.addonDomain || 'Unlimited',
      subDomain: hosting.subDomain || 'Unlimited',
      ftpAccounts: hosting.ftpAccounts || 'Unlimited',
      databases: hosting.databases || 'Unlimited',
      hostingType: hosting.hostingType || 'VPS Hosting',
      operatingSystem: hosting.operatingSystem || 'Linux',
      domain: (hosting as any).domain || '',
      expiryDate: (hosting as any).expiryDate || '',
      serverLocation: (hosting as any).serverLocation || '',
      customerId: (hosting as any).customerId || ''
    })
    setIsEditHostingDialogOpen(true)
  }

  const handleDeleteHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    setIsDeleteHostingDialogOpen(true)
  }

  const updateHosting = async () => {
    if (!selectedHosting) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/hosting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedHosting.id,
          ...editHosting,
          customerId: editHosting.customerId || null
        }),
      })

      if (response.ok) {
        await fetchHostings()
        setIsEditHostingDialogOpen(false)
        setSelectedHosting(null)
        setEditHosting({
          planName: '',
          storage: 0,
          bandwidth: 0,
          price: 0,
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          addonDomain: 'Unlimited',
          subDomain: 'Unlimited',
          ftpAccounts: 'Unlimited',
          databases: 'Unlimited',
          hostingType: 'VPS Hosting',
          operatingSystem: 'Linux',
          domain: '',
          expiryDate: '',
          serverLocation: '',
          customerId: ''
        })
        toastSuccess('Cập nhật gói hosting thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật gói hosting'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật gói hosting')
      console.error('Error updating hosting:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteHosting = async () => {
    if (!selectedHosting) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/hosting?id=${selectedHosting.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchHostings()
        setIsDeleteHostingDialogOpen(false)
        setSelectedHosting(null)
        toastSuccess('Xóa gói hosting thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa gói hosting'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xóa gói hosting')
      console.error('Error deleting hosting:', error)
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

  const filteredHostings = hostings.filter(hosting =>
    hosting.planName.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredPurchased = purchasedHostings.filter(hosting =>
    hosting.planName.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic for packages
  const hostingStartIndex = (currentPage - 1) * itemsPerPage
  const hostingEndIndex = hostingStartIndex + itemsPerPage
  const paginatedHostings = filteredHostings.slice(hostingStartIndex, hostingEndIndex)
  const totalHostingPages = Math.ceil(filteredHostings.length / itemsPerPage)
  
  // Pagination logic for purchased
  const purchasedStartIndex = (currentPage - 1) * itemsPerPage
  const purchasedEndIndex = purchasedStartIndex + itemsPerPage
  const paginatedPurchased = filteredPurchased.slice(purchasedStartIndex, purchasedEndIndex)
  const totalPurchasedPages = Math.ceil(filteredPurchased.length / itemsPerPage)
  
  // Use different pagination based on active tab
  const totalFilteredPages = activeTab === 'packages' ? totalHostingPages : totalPurchasedPages

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'INACTIVE':
        return <Badge variant="destructive">Không hoạt động</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm ngừng</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(parseFloat(amount))
  }

  const formatStorage = (storage: number) => {
    if (storage >= 1024) {
      return `${(storage / 1024).toFixed(1)}TB`
    }
    return `${storage}GB`
  }

  const formatBandwidth = (bandwidth: number) => {
    if (bandwidth >= 1024) {
      return `${(bandwidth / 1024).toFixed(1)}TB`
    }
    return `${bandwidth}GB`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Hosting</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tất cả gói hosting</p>
          </div>
          {activeTab === 'packages' && (
            <Dialog open={isCreateHostingDialogOpen} onOpenChange={setIsCreateHostingDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Thêm Gói Hosting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <DialogTitle>Thêm Gói Hosting Mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin gói hosting mới vào form bên dưới.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="planName" className="text-right">
                      Tên gói
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="planName" 
                        placeholder="Basic Hosting"
                        value={newHosting.planName}
                        onChange={(e) => setNewHosting({...newHosting, planName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="storage" className="text-right">
                      Dung lượng (GB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="storage" 
                        type="number"
                        placeholder="10"
                        value={newHosting.storage}
                        onChange={(e) => setNewHosting({...newHosting, storage: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bandwidth" className="text-right">
                      Băng thông (GB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="bandwidth" 
                        type="number"
                        placeholder="100"
                        value={newHosting.bandwidth}
                        onChange={(e) => setNewHosting({...newHosting, bandwidth: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Giá (VND)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="price" 
                        type="number"
                        placeholder="500000"
                        value={newHosting.price}
                        onChange={(e) => setNewHosting({...newHosting, price: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Trạng thái
                    </Label>
                    <div className="col-span-3">
                      <Select 
                        value={newHosting.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE') =>
                          setNewHosting({...newHosting, status: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                          <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="addonDomain" className="text-right">
                      Addon Domain
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="addonDomain" 
                        placeholder="Unlimited"
                        value={newHosting.addonDomain}
                        onChange={(e) => setNewHosting({...newHosting, addonDomain: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subDomain" className="text-right">
                      Sub Domain
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="subDomain" 
                        placeholder="Unlimited"
                        value={newHosting.subDomain}
                        onChange={(e) => setNewHosting({...newHosting, subDomain: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftpAccounts" className="text-right">
                      Tài khoản FTP
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="ftpAccounts" 
                        placeholder="Unlimited"
                        value={newHosting.ftpAccounts}
                        onChange={(e) => setNewHosting({...newHosting, ftpAccounts: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="databases" className="text-right">
                      Database
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="databases" 
                        placeholder="Unlimited"
                        value={newHosting.databases}
                        onChange={(e) => setNewHosting({...newHosting, databases: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hostingType" className="text-right">
                      Loại hosting
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="hostingType" 
                        placeholder="VPS Hosting"
                        value={newHosting.hostingType}
                        onChange={(e) => setNewHosting({...newHosting, hostingType: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="operatingSystem" className="text-right">
                      Hệ điều hành
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="operatingSystem" 
                        placeholder="Linux"
                        value={newHosting.operatingSystem}
                        onChange={(e) => setNewHosting({...newHosting, operatingSystem: e.target.value})}
                      />
                    </div>
                  </div>
                  </div>
                </div>
                <DialogFooter className="px-6 pt-4 pb-6 border-t">
                  <Button variant="outline" onClick={() => setIsCreateHostingDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={createHosting} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      'Thêm Gói Hosting'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'purchased' && (
            <Dialog open={isRegisterHostingDialogOpen} onOpenChange={setIsRegisterHostingDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Đăng ký Hosting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <DialogTitle>Đăng ký Hosting cho khách hàng</DialogTitle>
                  <DialogDescription>Nhập thông tin gói và gán cho khách hàng</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tên gói</Label>
                    <div className="col-span-3">
                      <Select
                        value={registerHosting.planName}
                        onValueChange={(val) => setRegisterHosting({ ...registerHosting, planName: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn gói hosting" />
                        </SelectTrigger>
                        <SelectContent>
                          {hostings.map((h) => (
                            <SelectItem key={h.id} value={h.planName}>
                              {h.planName} ({new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(parseFloat(h.price))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-storage" className="text-right">Dung lượng (GB)</Label>
                    <div className="col-span-3">
                      <Input id="reg-storage" type="number" value={registerHosting.storage} onChange={(e) => setRegisterHosting({...registerHosting, storage: parseInt(e.target.value) || 0})} placeholder="10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-bandwidth" className="text-right">Băng thông (GB)</Label>
                    <div className="col-span-3">
                      <Input id="reg-bandwidth" type="number" value={registerHosting.bandwidth} onChange={(e) => setRegisterHosting({...registerHosting, bandwidth: parseInt(e.target.value) || 0})} placeholder="100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-price" className="text-right">Giá (VND)</Label>
                    <div className="col-span-3">
                      <Input id="reg-price" type="number" value={registerHosting.price} onChange={(e) => setRegisterHosting({...registerHosting, price: parseInt(e.target.value) || 0})} placeholder="500000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Khách hàng</Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={registerHosting.customerId}
                        onValueChange={(val) =>
                          setRegisterHosting({
                            ...registerHosting,
                            customerId:
                              typeof val === 'number'
                                ? val
                                : val
                                ? parseInt(String(val), 10)
                                : null,
                          })
                        }
                        placeholder="Chọn khách hàng"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ngày đăng ký</Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={registerHosting.registrationDate}
                        onChange={(date) =>
                          setRegisterHosting({
                            ...registerHosting,
                            registrationDate: date ?? undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-expiry" className="text-right">Ngày hết hạn</Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={registerHosting.expiryDate}
                        onChange={(date) =>
                          setRegisterHosting({
                            ...registerHosting,
                            expiryDate: date ?? undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-location" className="text-right">Vị trí máy chủ</Label>
                    <div className="col-span-3">
                      <Input id="reg-location" value={registerHosting.serverLocation} onChange={(e) => setRegisterHosting({...registerHosting, serverLocation: e.target.value})} placeholder="Hanoi" />
                    </div>
                  </div>
                  </div>
                </div>
                <DialogFooter className="px-6 pt-4 pb-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegisterHosting(createInitialRegisterHostingState())
                      setIsRegisterHostingDialogOpen(false)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button onClick={async () => {
                    try {
                      const res = await fetch('/api/hosting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          planName: registerHosting.planName,
                          storage: registerHosting.storage,
                          bandwidth: registerHosting.bandwidth,
                          price: registerHosting.price,
                          status: registerHosting.status,
                          customerId: registerHosting.customerId || null,
                          createdAt: registerHosting.registrationDate
                            ? format(registerHosting.registrationDate, 'yyyy-MM-dd')
                            : null,
                          expiryDate: registerHosting.expiryDate
                            ? format(registerHosting.expiryDate, 'yyyy-MM-dd')
                            : null,
                          serverLocation: registerHosting.serverLocation || null,
                        })
                      })
                      if (!res.ok) {
                        const err = await res.json()
                        toastError(err.error || 'Không thể đăng ký hosting')
                        return
                      }
                      setRegisterHosting(createInitialRegisterHostingState())
                      setIsRegisterHostingDialogOpen(false)
                      await fetchHostings()
                      toastSuccess('Đăng ký hosting thành công!')
                    } catch (e) {
                      toastError('Có lỗi xảy ra khi đăng ký hosting')
                    }
                  }}>Đăng ký</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Gói Hosting</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostings.length}</div>
              <p className="text-xs text-gray-600">+8% so với tháng trước</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostings.filter(h => h.status === 'ACTIVE').length}</div>
              <p className="text-xs text-gray-600">Đang hoạt động</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Không Hoạt Động</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostings.filter(h => h.status === 'INACTIVE').length}</div>
              <p className="text-xs text-gray-600">Tạm dừng</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Dung Lượng</CardTitle>
              <HardDrive className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatStorage(hostings.reduce((sum, h) => sum + h.storage, 0))}</div>
              <p className="text-xs text-gray-600">Tổng dung lượng</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs (styled like admin/domain) */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('purchased')}
              className={`py-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'purchased'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hosting Đã Đăng Ký
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'packages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Gói Hosting
            </button>
          </nav>
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
                    placeholder={activeTab === 'packages' ? 'Tìm kiếm theo tên gói hosting...' : 'Tìm kiếm theo tên gói đã mua...'}
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

        {activeTab === 'packages' ? (
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách Gói Hosting</CardTitle>
                <CardDescription>Gói công khai trong catalog</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Gói</TableHead>
                      <TableHead>Dung Lượng</TableHead>
                      <TableHead>Băng Thông</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHostings.map((hosting) => (
                      <TableRow key={hosting.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(hosting.status)}
                            <span className="font-medium">{hosting.planName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <HardDrive className="h-4 w-4 text-gray-500" />
                            <span>{formatStorage(hosting.storage)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Cpu className="h-4 w-4 text-gray-500" />
                            <span>{formatBandwidth(hosting.bandwidth)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(hosting.price)}</TableCell>
                        <TableCell>{getStatusBadge(hosting.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewHosting(hosting)} title="Xem chi tiết">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditHosting(hosting)} title="Chỉnh sửa">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteHosting(hosting)} title="Xóa" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        ) : (
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách Hosting Đã Đăng Ký</CardTitle>
                <CardDescription>Các bản ghi đã gán cho khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên Gói</TableHead>
                      <TableHead>Dung Lượng</TableHead>
                      <TableHead>Băng Thông</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>Ngày Đăng Ký</TableHead>
                      <TableHead>Ngày Hết Hạn</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchased.map((hosting) => {
                      const customerId = (hosting as any).customerId
                      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
                      const customer = customers.find(c => c.id === customerIdNum)
                      const label = customer ? `${customer.name} (${customer.email})` : '—'
                      return (
                        <TableRow key={hosting.id}>
                          <TableCell className="font-mono text-gray-600">{hosting.id}</TableCell>
                          <TableCell className="font-medium">{hosting.planName}</TableCell>
                          <TableCell>{formatStorage(hosting.storage)}</TableCell>
                          <TableCell>{formatBandwidth(hosting.bandwidth)}</TableCell>
                          <TableCell>{label}</TableCell>
                          <TableCell>{new Date(hosting.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{(hosting as any).expiryDate ? new Date((hosting as any).expiryDate as any).toLocaleDateString('vi-VN') : '—'}</TableCell>
                          <TableCell>{formatCurrency(hosting.price)}</TableCell>
                          <TableCell>{getStatusBadge(hosting.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewHosting(hosting)} title="Xem chi tiết">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditHosting(hosting)} title="Chỉnh sửa">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteHosting(hosting)} title="Xóa" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}

        {/* Pagination for hosting */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalFilteredPages}
          totalItems={activeTab === 'packages' ? filteredHostings.length : filteredPurchased.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

        {/* View Hosting Dialog */}
        <Dialog open={isViewHostingDialogOpen} onOpenChange={setIsViewHostingDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chi Tiết Gói Hosting</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của gói hosting
              </DialogDescription>
            </DialogHeader>
            {selectedHosting && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Tên gói</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.planName}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Trạng thái</Label>
                    <div>{getStatusBadge(selectedHosting.status)}</div>
                  </div>
                </div>
                {(selectedHosting as any).domain && (
                  <div>
                    <Label className="font-medium mb-2 block">Domain</Label>
                    <div className="text-sm text-gray-600">{(selectedHosting as any).domain}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Dung lượng</Label>
                    <div className="text-sm text-gray-600">{formatStorage(selectedHosting.storage)}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Băng thông</Label>
                    <div className="text-sm text-gray-600">{formatBandwidth(selectedHosting.bandwidth)}</div>
                  </div>
                </div>
                {selectedHosting.addonDomain && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Addon Domain</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.addonDomain}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Sub Domain</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.subDomain}</div>
                    </div>
                  </div>
                )}
                {(selectedHosting.ftpAccounts || selectedHosting.databases) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Tài khoản FTP</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.ftpAccounts}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Database</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.databases}</div>
                    </div>
                  </div>
                )}
                {(selectedHosting.hostingType || selectedHosting.operatingSystem) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Loại hosting</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.hostingType}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Hệ điều hành</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.operatingSystem}</div>
                    </div>
                  </div>
                )}
                {(selectedHosting as any).expiryDate && (
                  <div>
                    <Label className="font-medium mb-2 block">Ngày hết hạn</Label>
                    <div className="text-sm text-gray-600">
                      {new Date((selectedHosting as any).expiryDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                )}
                {(selectedHosting as any).serverLocation && (
                  <div>
                    <Label className="font-medium mb-2 block">Server Location</Label>
                    <div className="text-sm text-gray-600">{(selectedHosting as any).serverLocation}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Giá</Label>
                    <div className="text-sm text-gray-600">{formatCurrency(selectedHosting.price)}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Ngày tạo</Label>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedHosting.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsViewHostingDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Hosting Dialog */}
        <Dialog open={isEditHostingDialogOpen} onOpenChange={setIsEditHostingDialogOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Gói Hosting</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin gói hosting
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-planName" className="text-right">
                  Tên gói
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-planName" 
                    placeholder="Basic Hosting"
                    value={editHosting.planName}
                    onChange={(e) => setEditHosting({...editHosting, planName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-storage" className="text-right">
                  Dung lượng (GB)
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-storage" 
                    type="number"
                    placeholder="10"
                    value={editHosting.storage}
                    onChange={(e) => setEditHosting({...editHosting, storage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bandwidth" className="text-right">
                  Băng thông (GB)
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-bandwidth" 
                    type="number"
                    placeholder="100"
                    value={editHosting.bandwidth}
                    onChange={(e) => setEditHosting({...editHosting, bandwidth: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Giá (VND)
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-price" 
                    type="number"
                    placeholder="500000"
                    value={editHosting.price}
                    onChange={(e) => setEditHosting({...editHosting, price: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Trạng thái
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={editHosting.status} 
                    onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                      setEditHosting({...editHosting, status: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                      <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                      <SelectItem value="SUSPENDED">Tạm ngừng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addonDomain" className="text-right">
                  Addon Domain
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-addonDomain" 
                    placeholder="Unlimited"
                    value={editHosting.addonDomain}
                    onChange={(e) => setEditHosting({...editHosting, addonDomain: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-subDomain" className="text-right">
                  Sub Domain
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-subDomain" 
                    placeholder="Unlimited"
                    value={editHosting.subDomain}
                    onChange={(e) => setEditHosting({...editHosting, subDomain: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-ftpAccounts" className="text-right">
                  Tài khoản FTP
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-ftpAccounts" 
                    placeholder="Unlimited"
                    value={editHosting.ftpAccounts}
                    onChange={(e) => setEditHosting({...editHosting, ftpAccounts: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-databases" className="text-right">
                  Database
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-databases" 
                    placeholder="Unlimited"
                    value={editHosting.databases}
                    onChange={(e) => setEditHosting({...editHosting, databases: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-hostingType" className="text-right">
                  Loại hosting
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-hostingType" 
                    placeholder="VPS Hosting"
                    value={editHosting.hostingType}
                    onChange={(e) => setEditHosting({...editHosting, hostingType: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-operatingSystem" className="text-right">
                  Hệ điều hành
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="edit-operatingSystem" 
                    placeholder="Linux"
                    value={editHosting.operatingSystem}
                    onChange={(e) => setEditHosting({...editHosting, operatingSystem: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Khách hàng
                </Label>
                <div className="col-span-3">
                  <CustomerCombobox
                    customers={customers}
                    value={editHosting.customerId ? (typeof editHosting.customerId === 'string' ? parseInt(editHosting.customerId, 10) : editHosting.customerId) : null}
                    onValueChange={(val) => setEditHosting({...editHosting, customerId: val ? String(val) : ''})}
                    placeholder="Chọn khách hàng"
                  />
                </div>
              </div>
              {selectedHosting && (selectedHosting as any).customerId && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-domain" className="text-right">
                      Domain
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-domain" 
                        placeholder="example.com"
                        value={editHosting.domain}
                        onChange={(e) => setEditHosting({...editHosting, domain: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-expiryDate" className="text-right">
                      Ngày hết hạn
                    </Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={editHosting.expiryDate ? new Date(editHosting.expiryDate) : undefined}
                        onChange={(date) => setEditHosting({
                          ...editHosting,
                          expiryDate: date ? date.toISOString().split('T')[0] : ''
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-serverLocation" className="text-right">
                      Server Location
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-serverLocation" 
                        placeholder="Ho Chi Minh City"
                        value={editHosting.serverLocation}
                        onChange={(e) => setEditHosting({...editHosting, serverLocation: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditHostingDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={updateHosting} disabled={isUpdating}>
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

        {/* Delete Hosting Dialog */}
        <Dialog open={isDeleteHostingDialogOpen} onOpenChange={setIsDeleteHostingDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xóa Gói Hosting</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa gói hosting này không? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            {selectedHosting && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="py-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium">{selectedHosting.planName}</div>
                    <div className="text-sm text-gray-600">
                      {formatStorage(selectedHosting.storage)} - {formatCurrency(selectedHosting.price)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteHostingDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteHosting} 
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