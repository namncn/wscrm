'use client'

import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Pagination } from '@/components/ui/pagination'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import { Monitor, Plus, Search, Eye, CheckCircle, XCircle, HardDrive, Cpu, MemoryStick, Loader2, Edit, Trash2 } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

interface VPS {
  id: number
  planName: string
  ipAddress: string | null
  cpu: number
  ram: number
  storage: number
  bandwidth: number
  price: number
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  customerId: number | null
  expiryDate: string | null
  os: string | null
  createdAt: string
  updatedAt: string
}

export default function VPSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vps, setVps] = useState<VPS[]>([])
  const [purchasedVps, setPurchasedVps] = useState<VPS[]>([])
  const [activeTab, setActiveTab] = useState<'packages' | 'purchased'>('purchased')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isCreateVPSDialogOpen, setIsCreateVPSDialogOpen] = useState(false)
  const [isViewVPSDialogOpen, setIsViewVPSDialogOpen] = useState(false)
  const [isEditVPSDialogOpen, setIsEditVPSDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVPS, setSelectedVPS] = useState<VPS | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; email: string }>>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const [newVPS, setNewVPS] = useState({
    planName: '',
    cpu: 0,
    ram: 0,
    storage: 0,
    bandwidth: 0,
    price: 0,
    os: '',
    customerId: null as number | null,
    expiryDate: undefined as Date | undefined,
  })

  const [editVPS, setEditVPS] = useState<VPS | null>(null)
  const [isRegisterVPSDialogOpen, setIsRegisterVPSDialogOpen] = useState(false)
  const createInitialRegisterVPSState = () => ({
    planName: '',
    ipAddress: '',
    cpu: 0,
    ram: 0,
    storage: 0,
    bandwidth: 0,
    price: 0,
    os: '',
    customerId: null as number | null,
    registrationDate: undefined as Date | undefined,
    expiryDate: undefined as Date | undefined,
  })
  const [registerVPS, setRegisterVPS] = useState(createInitialRegisterVPSState)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchVPS()
    fetchCustomers()
  }, [session, status, router])
  
  // Reset to first page when search term changes or tab switches
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const fetchVPS = async () => {
    setLoading(true)
    try {
      const [packagesRes, purchasedRes] = await Promise.all([
        fetch('/api/vps'),
        fetch('/api/vps?purchased=all')
      ])
      if (packagesRes.ok) {
        const result = await packagesRes.json()
        if (result.success && result.data) {
          const processedData = result.data.map((v: any) => ({
            ...v,
            price: parseFloat(v.price) || 0,
            expiryDate: v.expiryDate ? new Date(v.expiryDate).toISOString().split('T')[0] : null,
          }))
          setVps(processedData)
        } else setVps([])
      } else setVps([])

      if (purchasedRes.ok) {
        const result2 = await purchasedRes.json()
        if (result2.success && result2.data) {
          const processedPurchased = result2.data.map((v: any) => ({
            ...v,
            price: parseFloat(v.price) || 0,
            expiryDate: v.expiryDate ? new Date(v.expiryDate).toISOString().split('T')[0] : null,
          }))
          setPurchasedVps(processedPurchased)
        } else setPurchasedVps([])
      } else setPurchasedVps([])
    } catch (error) {
      console.error('Error fetching VPS:', error)
      setVps([])
      toastError('Có lỗi xảy ra khi tải danh sách VPS')
    } finally {
      setLoading(false)
    }
  }

  const createVPS = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/vps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: newVPS.planName,
          cpu: newVPS.cpu,
          ram: newVPS.ram,
          storage: newVPS.storage,
          bandwidth: newVPS.bandwidth,
          price: newVPS.price,
          os: newVPS.os,
          customerId: newVPS.customerId,
          expiryDate: newVPS.expiryDate
            ? format(newVPS.expiryDate, 'yyyy-MM-dd')
            : null,
        }),
      })

      if (response.ok) {
        await fetchVPS()
        setIsCreateVPSDialogOpen(false)
        setNewVPS({
          planName: '',
          cpu: 0,
          ram: 0,
          storage: 0,
          bandwidth: 0,
          price: 0,
          os: '',
          customerId: null,
          expiryDate: undefined,
        })
        toastSuccess('Tạo VPS thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể tạo VPS'}`)
      }
    } catch (error) {
      console.error('Error creating VPS:', error)
      toastError('Có lỗi xảy ra khi tạo VPS')
    } finally {
      setIsCreating(false)
    }
  }

  const updateVPS = async () => {
    if (!editVPS) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/vps', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editVPS.id,
          planName: editVPS.planName,
          ...(editVPS.customerId && { ipAddress: editVPS.ipAddress }),
          cpu: editVPS.cpu,
          ram: editVPS.ram,
          storage: editVPS.storage,
          bandwidth: editVPS.bandwidth,
          price: editVPS.price,
          status: editVPS.status,
          os: editVPS.os,
          customerId: editVPS.customerId,
          ...(editVPS.customerId && {
            createdAt: editVPS.createdAt
              ? editVPS.createdAt.includes('T')
                ? format(new Date(editVPS.createdAt), 'yyyy-MM-dd')
                : editVPS.createdAt
              : null,
            expiryDate: editVPS.expiryDate
              ? editVPS.expiryDate.includes('T')
                ? format(new Date(editVPS.expiryDate), 'yyyy-MM-dd')
                : editVPS.expiryDate
              : null,
          }),
        }),
      })

      if (response.ok) {
        await fetchVPS()
        setIsEditVPSDialogOpen(false)
        setEditVPS(null)
        toastSuccess('Cập nhật VPS thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật VPS'}`)
      }
    } catch (error) {
      console.error('Error updating VPS:', error)
      toastError('Có lỗi xảy ra khi cập nhật VPS')
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteVPS = async (id: number) => {
    try {
      const response = await fetch(`/api/vps?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchVPS()
        setIsDeleteDialogOpen(false)
        setSelectedVPS(null)
        toastSuccess('Xóa VPS thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa VPS'}`)
      }
    } catch (error) {
      console.error('Error deleting VPS:', error)
      toastError('Có lỗi xảy ra khi xóa VPS')
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data.map((c: any) => ({ id: typeof c.id === 'string' ? parseInt(c.id) : c.id, name: c.name, email: c.email })))
        }
      }
    } catch (e) {
      console.error('Error fetching customers list:', e)
    }
  }

  const filteredVPS = vps.filter(v =>
    v.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.os && v.os.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  const filteredPurchased = purchasedVps.filter(v =>
    v.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.ipAddress && v.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.os && v.os.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Pagination logic for packages
  const vpsStartIndex = (currentPage - 1) * itemsPerPage
  const vpsEndIndex = vpsStartIndex + itemsPerPage
  const paginatedVPS = filteredVPS.slice(vpsStartIndex, vpsEndIndex)
  const totalVPSPages = Math.ceil(filteredVPS.length / itemsPerPage)
  
  // Pagination logic for purchased
  const purchasedStartIndex = (currentPage - 1) * itemsPerPage
  const purchasedEndIndex = purchasedStartIndex + itemsPerPage
  const paginatedPurchased = filteredPurchased.slice(purchasedStartIndex, purchasedEndIndex)
  const totalPurchasedPages = Math.ceil(filteredPurchased.length / itemsPerPage)
  
  // Use different pagination based on active tab
  const totalFilteredPages = activeTab === 'packages' ? totalVPSPages : totalPurchasedPages

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'INACTIVE':
        return <Badge variant="outline">Không hoạt động</Badge>
      case 'SUSPENDED':
        return <Badge variant="destructive">Tạm dừng</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-gray-600" />
      case 'SUSPENDED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có'
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const handleViewVPS = (v: VPS) => {
    setSelectedVPS(v)
    setIsViewVPSDialogOpen(true)
  }

  const handleEditVPS = (v: VPS) => {
    setEditVPS(v)
    setIsEditVPSDialogOpen(true)
  }

  const handleDeleteVPS = (v: VPS) => {
    setSelectedVPS(v)
    setIsDeleteDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý VPS</h1>
            <p className="text-gray-600 mt-1">Quản lý máy chủ ảo và tài nguyên hệ thống</p>
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'packages' && (
              <Dialog open={isCreateVPSDialogOpen} onOpenChange={setIsCreateVPSDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Thêm VPS
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Thêm VPS Mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin máy chủ ảo mới để tạo
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="planName" className="text-right">
                    Tên Gói
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="planName"
                      placeholder="VPS Basic"
                      value={newVPS.planName}
                      onChange={(e) => setNewVPS({...newVPS, planName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cpu" className="text-right">
                    CPU (cores)
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="cpu"
                      type="number"
                      placeholder="2"
                      value={newVPS.cpu}
                      onChange={(e) => setNewVPS({...newVPS, cpu: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ram" className="text-right">
                    RAM (GB)
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="ram"
                      type="number"
                      placeholder="4"
                      value={newVPS.ram}
                      onChange={(e) => setNewVPS({...newVPS, ram: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="storage" className="text-right">
                    Storage (GB)
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="storage"
                      type="number"
                      placeholder="50"
                      value={newVPS.storage}
                      onChange={(e) => setNewVPS({...newVPS, storage: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bandwidth" className="text-right">
                    Bandwidth (GB)
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="bandwidth"
                      type="number"
                      placeholder="1000"
                      value={newVPS.bandwidth}
                      onChange={(e) => setNewVPS({...newVPS, bandwidth: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="os" className="text-right">
                    Hệ Điều Hành
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="os"
                      placeholder="Ubuntu 20.04"
                      value={newVPS.os}
                      onChange={(e) => setNewVPS({...newVPS, os: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Giá
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="price"
                      type="number"
                      placeholder="1500000"
                      value={newVPS.price}
                      onChange={(e) => setNewVPS({...newVPS, price: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expiryDate" className="text-right">
                    Ngày Hết Hạn
                  </Label>
                  <div className="col-span-3">
                    <DatePicker
                      value={newVPS.expiryDate}
                      onChange={(date) =>
                        setNewVPS({
                          ...newVPS,
                          expiryDate: date ?? undefined,
                        })
                      }
                    />
                  </div>
                </div>
                </div>
              </div>
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsCreateVPSDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={createVPS} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Thêm VPS
                    </>
                  )}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {activeTab === 'purchased' && (
            <Dialog open={isRegisterVPSDialogOpen} onOpenChange={setIsRegisterVPSDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Đăng ký VPS
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <DialogTitle>Đăng ký VPS cho khách hàng</DialogTitle>
                  <DialogDescription>Nhập thông tin VPS và gán cho khách hàng</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tên Gói</Label>
                    <div className="col-span-3">
                      <Select
                        value={registerVPS.planName}
                        onValueChange={(val) => setRegisterVPS({ ...registerVPS, planName: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn gói VPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {vps.map((v) => (
                            <SelectItem key={v.id} value={v.planName}>
                              {v.planName} ({new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(v.price)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-ip" className="text-right">IP Address</Label>
                    <div className="col-span-3">
                      <Input 
                        id="reg-vps-ip" 
                        value={registerVPS.ipAddress} 
                        onChange={(e) => setRegisterVPS({...registerVPS, ipAddress: e.target.value})} 
                        placeholder="192.168.1.100" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-cpu" className="text-right">CPU</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-cpu" type="number" value={registerVPS.cpu} onChange={(e) => setRegisterVPS({...registerVPS, cpu: parseInt(e.target.value) || 0})} placeholder="2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-ram" className="text-right">RAM (GB)</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-ram" type="number" value={registerVPS.ram} onChange={(e) => setRegisterVPS({...registerVPS, ram: parseInt(e.target.value) || 0})} placeholder="4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-storage" className="text-right">Storage (GB)</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-storage" type="number" value={registerVPS.storage} onChange={(e) => setRegisterVPS({...registerVPS, storage: parseInt(e.target.value) || 0})} placeholder="50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-bandwidth" className="text-right">Bandwidth (GB)</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-bandwidth" type="number" value={registerVPS.bandwidth} onChange={(e) => setRegisterVPS({...registerVPS, bandwidth: parseInt(e.target.value) || 0})} placeholder="1000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-price" className="text-right">Giá</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-price" type="number" value={registerVPS.price} onChange={(e) => setRegisterVPS({...registerVPS, price: parseInt(e.target.value) || 0})} placeholder="1500000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-os" className="text-right">Hệ Điều Hành</Label>
                    <div className="col-span-3">
                      <Input id="reg-vps-os" value={registerVPS.os} onChange={(e) => setRegisterVPS({...registerVPS, os: e.target.value})} placeholder="Ubuntu 22.04" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Khách hàng</Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={registerVPS.customerId?.toString() || null}
                        onValueChange={(val) => setRegisterVPS({ ...registerVPS, customerId: val ? parseInt(String(val)) : null })}
                        placeholder="Chọn khách hàng"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-created" className="text-right">Ngày Đăng Ký</Label>
                    <div className="col-span-3">
                      <DatePicker
                      value={registerVPS.registrationDate}
                      onChange={(date) =>
                        setRegisterVPS({
                          ...registerVPS,
                          registrationDate: date ?? undefined,
                        })
                      }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-expiry" className="text-right">Ngày Hết Hạn</Label>
                    <div className="col-span-3">
                      <DatePicker
                      value={registerVPS.expiryDate}
                      onChange={(date) =>
                        setRegisterVPS({
                          ...registerVPS,
                          expiryDate: date ?? undefined,
                        })
                      }
                      />
                    </div>
                  </div>
                  </div>
                </div>
                <DialogFooter className="px-6 pt-4 pb-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegisterVPS(createInitialRegisterVPSState())
                      setIsRegisterVPSDialogOpen(false)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button onClick={async () => {
                    try {
                      const res = await fetch('/api/vps', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          planName: registerVPS.planName,
                          ipAddress: registerVPS.ipAddress || null,
                          cpu: registerVPS.cpu,
                          ram: registerVPS.ram,
                          storage: registerVPS.storage,
                          bandwidth: registerVPS.bandwidth,
                          price: registerVPS.price,
                          status: 'ACTIVE',
                          customerId: registerVPS.customerId || null,
                          createdAt: registerVPS.registrationDate
                            ? format(registerVPS.registrationDate, 'yyyy-MM-dd')
                            : null,
                          expiryDate: registerVPS.expiryDate
                            ? format(registerVPS.expiryDate, 'yyyy-MM-dd')
                            : null,
                          os: registerVPS.os || null,
                        })
                      })
                      if (!res.ok) {
                        const err = await res.json()
                        toastError(err.error || 'Không thể đăng ký VPS')
                        return
                      }
                      setRegisterVPS(createInitialRegisterVPSState())
                      setIsRegisterVPSDialogOpen(false)
                      await fetchVPS()
                      toastSuccess('Đăng ký VPS thành công!')
                    } catch (e) {
                      toastError('Có lỗi xảy ra khi đăng ký VPS')
                    }
                  }}>Đăng ký</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* View VPS Dialog */}
          <Dialog open={isViewVPSDialogOpen} onOpenChange={setIsViewVPSDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Chi Tiết VPS</DialogTitle>
                <DialogDescription>
                  Thông tin chi tiết về máy chủ ảo
                </DialogDescription>
              </DialogHeader>
              {selectedVPS && (
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Tên Gói</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.planName}</p>
                    </div>
                    {selectedVPS.customerId && (
                      <div>
                        <Label className="font-medium mb-2 block">IP Address</Label>
                        <p className="text-sm text-gray-600">
                          {selectedVPS.ipAddress ? (
                            <code className="bg-gray-100 px-2 py-1 rounded">{selectedVPS.ipAddress}</code>
                          ) : (
                            'Chưa có'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">CPU</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.cpu} cores</p>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">RAM</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.ram} GB</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Storage</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.storage} GB</p>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Bandwidth</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.bandwidth} GB</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Hệ Điều Hành</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.os || 'Chưa có'}</p>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Trạng Thái</Label>
                      <div className="mt-1">{getStatusBadge(selectedVPS.status)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Giá</Label>
                      <p className="text-sm text-gray-600">{formatCurrency(selectedVPS.price)}</p>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Ngày Hết Hạn</Label>
                      <p className="text-sm text-gray-600">{formatDate(selectedVPS.expiryDate)}</p>
                    </div>
                  </div>
                  </div>
                </div>
              )}
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsViewVPSDialogOpen(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          

          {/* Edit VPS Dialog */}
          <Dialog open={isEditVPSDialogOpen} onOpenChange={setIsEditVPSDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Chỉnh Sửa VPS</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin máy chủ ảo
                </DialogDescription>
              </DialogHeader>
              {editVPS && (
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-planName" className="text-right">
                      Tên Gói
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-planName"
                        value={editVPS.planName}
                        onChange={(e) => setEditVPS({...editVPS, planName: e.target.value})}
                      />
                    </div>
                  </div>
                  {editVPS.customerId && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-ipAddress" className="text-right">
                        IP Address
                      </Label>
                      <div className="col-span-3">
                        <Input
                          id="edit-ipAddress"
                          value={editVPS.ipAddress || ''}
                          onChange={(e) => setEditVPS({...editVPS, ipAddress: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cpu" className="text-right">
                      CPU (cores)
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-cpu"
                        type="number"
                        value={editVPS.cpu}
                        onChange={(e) => setEditVPS({...editVPS, cpu: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-ram" className="text-right">
                      RAM (GB)
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-ram"
                        type="number"
                        value={editVPS.ram}
                        onChange={(e) => setEditVPS({...editVPS, ram: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-storage" className="text-right">
                      Storage (GB)
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-storage"
                        type="number"
                        value={editVPS.storage}
                        onChange={(e) => setEditVPS({...editVPS, storage: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bandwidth" className="text-right">
                      Bandwidth (GB)
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-bandwidth"
                        type="number"
                        value={editVPS.bandwidth}
                        onChange={(e) => setEditVPS({...editVPS, bandwidth: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-os" className="text-right">
                      Hệ Điều Hành
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-os"
                        value={editVPS.os || ''}
                        onChange={(e) => setEditVPS({...editVPS, os: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">
                      Giá
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-price"
                        type="number"
                        value={editVPS.price}
                        onChange={(e) => setEditVPS({...editVPS, price: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">
                      Trạng thái
                    </Label>
                    <div className="col-span-3 mt-2">
                      <Select
                        value={editVPS.status}
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                          setEditVPS({...editVPS, status: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                          <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                          <SelectItem value="SUSPENDED">Tạm dừng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-customerId" className="text-right">
                      Khách hàng
                    </Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={editVPS.customerId?.toString() || null}
                        onValueChange={(val) => setEditVPS({...editVPS, customerId: val ? parseInt(String(val)) : null})}
                        placeholder="Chọn khách hàng"
                      />
                    </div>
                  </div>
                  {editVPS.customerId && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-createdAt" className="text-right">
                          Ngày Đăng Ký
                        </Label>
                        <div className="col-span-3">
                          <DatePicker
                            value={
                              editVPS.createdAt
                                ? editVPS.createdAt.includes('T')
                                  ? new Date(editVPS.createdAt)
                                  : parse(editVPS.createdAt, 'yyyy-MM-dd', new Date())
                                : undefined
                            }
                            onChange={(date) =>
                              setEditVPS({
                                ...editVPS,
                                createdAt: date ? format(date, 'yyyy-MM-dd') : '',
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-expiryDate" className="text-right">
                          Ngày Hết Hạn
                        </Label>
                        <div className="col-span-3">
                          <DatePicker
                            value={
                              editVPS.expiryDate
                                ? editVPS.expiryDate.includes('T')
                                  ? new Date(editVPS.expiryDate)
                                  : parse(editVPS.expiryDate, 'yyyy-MM-dd', new Date())
                                : undefined
                            }
                            onChange={(date) =>
                              setEditVPS({
                                ...editVPS,
                                expiryDate: date ? format(date, 'yyyy-MM-dd') : null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                </div>
              )}
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsEditVPSDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={updateVPS} disabled={isUpdating}>
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

          {/* Delete VPS Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Xác Nhận Xóa VPS</DialogTitle>
                <DialogDescription>
                  Bạn có chắc chắn muốn xóa VPS này không? Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              {selectedVPS && (
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="py-4">
                    <p className="text-sm text-gray-600">
                      VPS: <span className="font-medium">{selectedVPS.planName}</span>
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedVPS && deleteVPS(selectedVPS.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa VPS
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng VPS</CardTitle>
              <Monitor className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vps.length}</div>
              <p className="text-xs text-muted-foreground">Tất cả máy chủ ảo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vps.filter(v => v.status === 'ACTIVE').length}
              </div>
              <p className="text-xs text-muted-foreground">Đang hoạt động</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Không Hoạt Động</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vps.filter(v => v.status === 'INACTIVE').length}
              </div>
              <p className="text-xs text-muted-foreground">Không hoạt động</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Giá Trị</CardTitle>
              <MemoryStick className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(vps.reduce((sum, v) => sum + v.price, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Tổng giá trị</p>
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
              VPS Đã Đăng Ký
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'packages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Gói VPS
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Tìm Kiếm VPS</CardTitle>
            <CardDescription>Tìm kiếm và lọc VPS theo tên gói, IP hoặc hệ điều hành</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={activeTab === 'packages' ? 'Tìm kiếm VPS hoặc hệ điều hành...' : 'Tìm VPS đã đăng ký...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {activeTab === 'packages' ? (
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách VPS</CardTitle>
                <CardDescription>Gói VPS trong catalog</CardDescription>
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
                        <TableHead>Tên Gói</TableHead>
                        <TableHead>CPU</TableHead>
                        <TableHead>RAM</TableHead>
                        <TableHead>Storage</TableHead>
                        <TableHead>Bandwidth</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVPS.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.planName}</TableCell>
                          <TableCell><div className="flex items-center space-x-1"><Cpu className="h-4 w-4 text-gray-500" /><span>{v.cpu} cores</span></div></TableCell>
                          <TableCell><div className="flex items-center space-x-1"><MemoryStick className="h-4 w-4 text-gray-500" /><span>{v.ram} GB</span></div></TableCell>
                          <TableCell><div className="flex items-center space-x-1"><HardDrive className="h-4 w-4 text-gray-500" /><span>{v.storage} GB</span></div></TableCell>
                          <TableCell><span>{v.bandwidth} GB</span></TableCell>
                          <TableCell><div className="flex items-center space-x-2">{getStatusIcon(v.status)}{getStatusBadge(v.status)}</div></TableCell>
                          <TableCell>{formatCurrency(v.price)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewVPS(v)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditVPS(v)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteVPS(v)}><Trash2 className="text-red-600 hover:text-red-700 hover:bg-red-50" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
        ) : (
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách VPS Đã Đăng Ký</CardTitle>
                <CardDescription>Các VPS đã gán cho khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên Gói</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>RAM</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Bandwidth</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>Ngày Đăng Ký</TableHead>
                      <TableHead>Ngày Hết Hạn</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchased.map((v) => {
                      const customer = customers.find(c => c.id === (v as any).customerId)
                      const label = customer ? `${customer.name} (${customer.email})` : '—'
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-gray-600">{v.id}</TableCell>
                          <TableCell className="font-medium">{v.planName}</TableCell>
                          <TableCell>{v.ipAddress || 'Chưa có'}</TableCell>
                          <TableCell>{v.cpu} cores</TableCell>
                          <TableCell>{v.ram} GB</TableCell>
                          <TableCell>{v.storage} GB</TableCell>
                          <TableCell>{v.bandwidth} GB</TableCell>
                          <TableCell>{label}</TableCell>
                          <TableCell>{new Date(v.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{v.expiryDate ? formatDate(v.expiryDate) : '—'}</TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell>{formatCurrency(v.price)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewVPS(v)} title="Xem chi tiết">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditVPS(v)} title="Chỉnh sửa">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteVPS(v)} title="Xóa" className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
        
        {/* Pagination for VPS */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalFilteredPages}
          totalItems={activeTab === 'packages' ? filteredVPS.length : filteredPurchased.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  )
}