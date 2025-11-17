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
import { VpsPackageCombobox } from '@/components/ui/vps-package-combobox'
import { Monitor, Plus, Search, Eye, CheckCircle, XCircle, HardDrive, Cpu, MemoryStick, Loader2, Edit, Trash2, DollarSign } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

// Helper function to format Date to YYYY-MM-DD string, ensuring local timezone
const formatDateForAPI = (date: Date | undefined): string | null => {
  if (!date) return null
  // Ensure we use local date components to avoid timezone issues
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  vpsTypeId?: number | null
  expiryDate: string | null
  os: string | null
  serverLocation: string | null
  createdAt: string
  updatedAt: string
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
  const [vpsPackages, setVpsPackages] = useState<Array<{ id: number; planName: string; cpu: number; ram: number; storage: number; bandwidth: number; price: number | string }>>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const [newVPS, setNewVPS] = useState({
    planName: '',
    cpu: '',
    ram: '',
    storage: '',
    bandwidth: '',
    price: 0,
    os: '',
    serverLocation: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    customerId: null as number | null,
    vpsTypeId: null as number | null,
  })

  const [editVPS, setEditVPS] = useState<VPS | null>(null)
  const [editVPSPackage, setEditVPSPackage] = useState({
    planName: '',
    cpu: '',
    ram: '',
    storage: '',
    bandwidth: '',
    price: 0,
    os: '',
    serverLocation: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  })
  const [isRegisterVPSDialogOpen, setIsRegisterVPSDialogOpen] = useState(false)
  const [selectedVPSPackageId, setSelectedVPSPackageId] = useState<number | null>(null)
  const createInitialRegisterVPSState = () => ({
    vpsTypeId: null as number | null,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    customerId: null as number | null,
    ipAddress: '',
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
    fetchVpsPackages()
  }, [session, status, router])
  
  const fetchVpsPackages = async () => {
    try {
      const response = await fetch('/api/vps-packages')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVpsPackages(result.data.map((pkg: any) => ({
            id: typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id,
            planName: pkg.planName,
            cpu: pkg.cpu,
            ram: pkg.ram,
            storage: pkg.storage,
            bandwidth: pkg.bandwidth,
            price: pkg.price
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching VPS packages:', error)
    }
  }
  
  // Reset to first page when search term changes or tab switches
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const fetchVPS = async () => {
    setLoading(true)
    try {
      const [packagesRes, purchasedRes] = await Promise.all([
        fetch('/api/vps-packages'),
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
      // For packages tab, create VPS package using /api/vps-packages
      // For purchased tab, create customer VPS registration using /api/vps
      const endpoint = activeTab === 'packages' ? '/api/vps-packages' : '/api/vps'
      
      let requestBody: any
      if (activeTab === 'packages') {
        // Convert CPU: handle "Unlimited" or empty string, otherwise parse as number
        const cpuValue = newVPS.cpu.trim().toLowerCase() === 'unlimited' || newVPS.cpu.trim() === ''
          ? 0
          : parseInt(newVPS.cpu) || 0
        
        // Convert RAM, Storage, Bandwidth from MB (string) to GB (number)
        const ramGB = newVPS.ram === '' || newVPS.ram.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(newVPS.ram)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        const storageGB = newVPS.storage === '' || newVPS.storage.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(newVPS.storage)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        const bandwidthGB = newVPS.bandwidth === '' || newVPS.bandwidth.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(newVPS.bandwidth)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        // Create VPS package
        requestBody = {
          planName: newVPS.planName,
          cpu: cpuValue,
          ram: ramGB,
          storage: storageGB,
          bandwidth: bandwidthGB,
          price: newVPS.price,
          os: newVPS.os || null,
          serverLocation: newVPS.serverLocation || null,
          status: newVPS.status,
        }
      } else {
        // Create customer VPS registration (should not happen from this dialog, but handle it)
        requestBody = {
          vpsTypeId: newVPS.vpsTypeId,
          customerId: newVPS.customerId,
          status: newVPS.status,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        await Promise.all([
          fetchVPS(),
          fetchVpsPackages() // Refresh packages list for combobox
        ])
        setIsCreateVPSDialogOpen(false)
        setNewVPS({
          planName: '',
          cpu: '',
          ram: '',
          storage: '',
          bandwidth: '',
          price: 0,
          os: '',
          serverLocation: '',
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          customerId: null,
          vpsTypeId: null,
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
      // Check if this is a package (no customerId) or purchased VPS (has customerId)
      const isPackage = !editVPS.customerId
      const endpoint = isPackage ? '/api/vps-packages' : '/api/vps'
      
      let requestBody: any
      if (isPackage) {
        // Update VPS package
        // Convert CPU: handle "Unlimited" or empty string, otherwise parse as number
        const cpuValue = editVPSPackage.cpu.trim().toLowerCase() === 'unlimited' || editVPSPackage.cpu.trim() === ''
          ? 0
          : parseInt(editVPSPackage.cpu) || 0
        
        // Convert RAM, Storage, Bandwidth from MB (string) to GB (number)
        const ramGB = editVPSPackage.ram === '' || editVPSPackage.ram.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(editVPSPackage.ram)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        const storageGB = editVPSPackage.storage === '' || editVPSPackage.storage.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(editVPSPackage.storage)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        const bandwidthGB = editVPSPackage.bandwidth === '' || editVPSPackage.bandwidth.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(editVPSPackage.bandwidth)
              return isNaN(parsed) ? 0 : Math.round(parsed / 1024 * 100) / 100
            })()
        
        requestBody = {
          id: editVPS.id,
          planName: editVPSPackage.planName,
          cpu: cpuValue,
          ram: ramGB,
          storage: storageGB,
          bandwidth: bandwidthGB,
          price: editVPSPackage.price,
          os: editVPSPackage.os || null,
          serverLocation: editVPSPackage.serverLocation || null,
          status: editVPSPackage.status,
        }
      } else {
        // Update purchased VPS
        requestBody = {
          id: editVPS.id,
          vpsTypeId: (editVPS as any).vpsTypeId,
          customerId: editVPS.customerId,
          status: editVPS.status,
          ipAddress: (editVPS as any).ipAddress || null,
          expiryDate: editVPS.expiryDate
            ? formatDateForAPI((editVPS as any).expiryDate instanceof Date ? (editVPS as any).expiryDate : (typeof editVPS.expiryDate === 'string' ? new Date(editVPS.expiryDate) : undefined))
            : null,
          createdAt: editVPS.createdAt
            ? formatDateForAPI((editVPS as any).createdAt instanceof Date ? (editVPS as any).createdAt : (typeof editVPS.createdAt === 'string' ? new Date(editVPS.createdAt) : undefined))
            : null,
        }
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        await Promise.all([
          fetchVPS(),
          fetchVpsPackages() // Refresh packages list for combobox
        ])
        setIsEditVPSDialogOpen(false)
        setEditVPS(null)
        setEditVPSPackage({
          planName: '',
          cpu: '',
          ram: '',
          storage: '',
          bandwidth: '',
          price: 0,
          os: '',
          serverLocation: '',
          status: 'ACTIVE',
        })
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
    if (!selectedVPS) return
    
    try {
      // Check if this is a package (no customerId) or purchased VPS (has customerId)
      const isPackage = !selectedVPS.customerId
      const endpoint = isPackage ? `/api/vps-packages?id=${id}` : `/api/vps?id=${id}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (response.ok) {
        await Promise.all([
          fetchVPS(),
          fetchVpsPackages() // Refresh packages list for combobox
        ])
        setIsDeleteDialogOpen(false)
        setSelectedVPS(null)
        toastSuccess(isPackage ? 'Xóa gói VPS thành công!' : 'Xóa VPS thành công!')
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

  const formatStorage = (storage: number) => {
    if (storage === 0 || storage === null || storage === undefined) {
      return 'Unlimited'
    }
    if (storage >= 1024) {
      return `${(storage / 1024).toFixed(1)}TB`
    }
    return `${storage}GB`
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
    // Check if this is a package (no customerId) or purchased VPS (has customerId)
    if (!v.customerId) {
      // This is a VPS package - use editVPSPackage state
      setEditVPSPackage({
        planName: v.planName || '',
        cpu: v.cpu ? (v.cpu === 0 ? 'Unlimited' : String(v.cpu)) : '',
        ram: v.ram ? (v.ram === 0 ? 'Unlimited' : String(Math.round(v.ram * 1024))) : '',
        storage: v.storage ? (v.storage === 0 ? 'Unlimited' : String(Math.round(v.storage * 1024))) : '',
        bandwidth: v.bandwidth ? (v.bandwidth === 0 ? 'Unlimited' : String(Math.round(v.bandwidth * 1024))) : '',
        price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : v.price || 0,
        os: v.os || '',
        serverLocation: v.serverLocation || '',
        status: v.status || 'ACTIVE',
      })
      setEditVPS({ ...v } as VPS) // Keep the ID for update
    } else {
      // This is a purchased VPS - use editVPS state
      const parsedVPS = { ...v }
      
      // Ensure vpsTypeId is set correctly (convert to number if needed)
      if ((v as any).vpsTypeId !== undefined && (v as any).vpsTypeId !== null) {
        (parsedVPS as any).vpsTypeId = typeof (v as any).vpsTypeId === 'string' 
          ? parseInt((v as any).vpsTypeId, 10) 
          : (v as any).vpsTypeId
      }
      
      if (v.createdAt) {
        const dateStr = v.createdAt.includes('T') ? v.createdAt.split('T')[0] : v.createdAt
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const day = parseInt(parts[2], 10)
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            (parsedVPS as any).createdAt = new Date(year, month, day)
          }
        }
      }
      if (v.expiryDate) {
        const dateStr = v.expiryDate.includes('T') ? v.expiryDate.split('T')[0] : v.expiryDate
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const day = parseInt(parts[2], 10)
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            (parsedVPS as any).expiryDate = new Date(year, month, day)
          }
        }
      }
      setEditVPS(parsedVPS as any)
    }
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
                  Thêm Gói VPS
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Thêm Gói VPS Mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin máy chủ ảo mới để tạo
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="planName" className="text-right">
                    Tên Gói <span className="text-red-500">*</span>
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
                    CPU (cores) <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="cpu"
                      type="text"
                      placeholder="Unlimited"
                      value={newVPS.cpu}
                      onChange={(e) => setNewVPS({...newVPS, cpu: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ram" className="text-right">
                    RAM (MB) <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="ram"
                      type="text"
                      placeholder="Unlimited"
                      value={newVPS.ram}
                      onChange={(e) => setNewVPS({...newVPS, ram: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="storage" className="text-right">
                    Storage (MB) <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="storage"
                      type="text"
                      placeholder="Unlimited"
                      value={newVPS.storage}
                      onChange={(e) => setNewVPS({...newVPS, storage: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bandwidth" className="text-right">
                    Bandwidth (MB) <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="bandwidth"
                      type="text"
                      placeholder="Unlimited"
                      value={newVPS.bandwidth}
                      onChange={(e) => setNewVPS({...newVPS, bandwidth: e.target.value})}
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
                    Giá <span className="text-red-500">*</span>
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
                  <Label htmlFor="serverLocation" className="text-right">
                    Vị trí máy chủ
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="serverLocation"
                      placeholder="Ho Chi Minh City"
                      value={newVPS.serverLocation}
                      onChange={(e) => setNewVPS({...newVPS, serverLocation: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Trạng thái
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={newVPS.status} 
                      onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                        setNewVPS({...newVPS, status: value})
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
                      Thêm Gói VPS
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
                    <Label className="text-right">
                      Gói VPS <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <VpsPackageCombobox
                        packages={vpsPackages.filter(pkg => pkg.id)}
                        value={registerVPS.vpsTypeId || null}
                        onValueChange={(val) => setRegisterVPS({ ...registerVPS, vpsTypeId: val ? (typeof val === 'string' ? parseInt(val) : val) : null })}
                        placeholder="Chọn gói VPS"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-status" className="text-right">Trạng thái</Label>
                    <div className="col-span-3">
                      <Select 
                        value={registerVPS.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                          setRegisterVPS({...registerVPS, status: value})
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
                    <Label className="text-right">Khách hàng <span className="text-red-500">*</span></Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={registerVPS.customerId}
                        onValueChange={(val) => setRegisterVPS({ ...registerVPS, customerId: val ? (typeof val === 'number' ? val : parseInt(String(val))) : null })}
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
                        placeholder="Chọn ngày đăng ký"
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
                        placeholder="Chọn ngày hết hạn"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-vps-ip" className="text-right">IP Address</Label>
                    <div className="col-span-3">
                      <Input
                        id="reg-vps-ip"
                        placeholder="192.168.1.1"
                        value={registerVPS.ipAddress || ''}
                        onChange={(e) => setRegisterVPS({ ...registerVPS, ipAddress: e.target.value })}
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
                    if (!registerVPS.vpsTypeId) {
                      toastError('Vui lòng chọn gói VPS')
                      return
                    }
                    if (!registerVPS.customerId) {
                      toastError('Vui lòng chọn khách hàng')
                      return
                    }
                    try {
                      const res = await fetch('/api/vps', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          vpsTypeId: registerVPS.vpsTypeId,
                          customerId: registerVPS.customerId,
                          status: registerVPS.status,
                          ipAddress: registerVPS.ipAddress || null,
                          createdAt: formatDateForAPI(registerVPS.registrationDate),
                          expiryDate: formatDateForAPI(registerVPS.expiryDate),
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
                <DialogTitle>{selectedVPS && !selectedVPS.customerId ? 'Chi Tiết Gói VPS' : 'Chi Tiết VPS'}</DialogTitle>
                <DialogDescription>
                  {selectedVPS && !selectedVPS.customerId ? 'Thông tin chi tiết về gói VPS' : 'Thông tin chi tiết về máy chủ ảo'}
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
                      <Label className="font-medium mb-2 block">Vị trí máy chủ</Label>
                      <p className="text-sm text-gray-600">{selectedVPS.serverLocation || 'Chưa có'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Trạng Thái</Label>
                      <div className="mt-1">{getStatusBadge(selectedVPS.status)}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Giá</Label>
                      <p className="text-sm text-gray-600">{formatCurrency(selectedVPS.price)}</p>
                    </div>
                  </div>
                  {selectedVPS.customerId && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium mb-2 block">Ngày Đăng Ký</Label>
                          <p className="text-sm text-gray-600">{formatDate(selectedVPS.createdAt)}</p>
                        </div>
                        <div>
                          <Label className="font-medium mb-2 block">Ngày Hết Hạn</Label>
                          <p className="text-sm text-gray-600">{formatDate(selectedVPS.expiryDate)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium mb-2 block">Khách hàng</Label>
                          <div className="text-sm text-gray-600">
                            {(() => {
                              const customer = customers.find(c => c.id === selectedVPS.customerId)
                              return customer ? (
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  <div className="text-xs text-gray-500">{customer.email}</div>
                                </div>
                              ) : '—'
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
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
                <DialogTitle>{editVPS && !editVPS.customerId ? 'Chỉnh Sửa Gói VPS' : 'Chỉnh Sửa VPS'}</DialogTitle>
                <DialogDescription>
                  {editVPS && !editVPS.customerId ? 'Cập nhật thông tin gói VPS' : 'Cập nhật thông tin máy chủ ảo'}
                </DialogDescription>
              </DialogHeader>
              {editVPS && !editVPS.customerId && (
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-planName" className="text-right">
                      Tên Gói <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-planName"
                        placeholder="VPS Basic"
                        value={editVPSPackage.planName}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, planName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cpu" className="text-right">
                      CPU (cores) <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-cpu"
                        type="text"
                        placeholder="Unlimited"
                        value={editVPSPackage.cpu}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, cpu: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-ram" className="text-right">
                      RAM (MB) <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-ram"
                        type="text"
                        placeholder="Unlimited"
                        value={editVPSPackage.ram}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, ram: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-storage" className="text-right">
                      Storage (MB) <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-storage"
                        type="text"
                        placeholder="Unlimited"
                        value={editVPSPackage.storage}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, storage: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bandwidth" className="text-right">
                      Bandwidth (MB) <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-bandwidth"
                        type="text"
                        placeholder="Unlimited"
                        value={editVPSPackage.bandwidth}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, bandwidth: e.target.value})}
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
                        placeholder="Ubuntu 20.04"
                        value={editVPSPackage.os}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, os: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">
                      Giá <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-price"
                        type="number"
                        placeholder="1500000"
                        value={editVPSPackage.price}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, price: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-serverLocation" className="text-right">
                      Vị trí máy chủ
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-serverLocation"
                        placeholder="Ho Chi Minh City"
                        value={editVPSPackage.serverLocation}
                        onChange={(e) => setEditVPSPackage({...editVPSPackage, serverLocation: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">
                      Trạng thái
                    </Label>
                    <div className="col-span-3">
                      <Select 
                        value={editVPSPackage.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                          setEditVPSPackage({...editVPSPackage, status: value})
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
                  </div>
                </div>
              )}
              {editVPS && editVPS.customerId && (
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      Gói VPS <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <VpsPackageCombobox
                        packages={vpsPackages}
                        value={(editVPS as any).vpsTypeId ? (typeof (editVPS as any).vpsTypeId === 'string' ? parseInt((editVPS as any).vpsTypeId, 10) : (editVPS as any).vpsTypeId) : null}
                        onValueChange={(val) => {
                          const vpsTypeId = val ? (typeof val === 'string' ? parseInt(val, 10) : val) : null
                          setEditVPS({ ...editVPS, vpsTypeId: vpsTypeId } as any)
                        }}
                        placeholder="Chọn gói VPS"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">
                      Trạng thái
                    </Label>
                    <div className="col-span-3">
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
                    <Label className="text-right">
                      Khách hàng <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={editVPS.customerId}
                        onValueChange={(val) => setEditVPS({...editVPS, customerId: val ? (typeof val === 'number' ? val : parseInt(String(val))) : null})}
                        placeholder="Chọn khách hàng"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-createdAt" className="text-right">
                      Ngày Đăng Ký
                    </Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={(editVPS as any).createdAt instanceof Date ? (editVPS as any).createdAt : (typeof (editVPS as any).createdAt === 'string' ? new Date((editVPS as any).createdAt) : undefined)}
                        onChange={(date) =>
                          setEditVPS({
                            ...editVPS,
                            createdAt: date ?? undefined,
                          } as any)
                        }
                        placeholder="Chọn ngày đăng ký"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-expiryDate" className="text-right">
                      Ngày Hết Hạn
                    </Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={(editVPS as any).expiryDate instanceof Date ? (editVPS as any).expiryDate : (typeof (editVPS as any).expiryDate === 'string' ? new Date((editVPS as any).expiryDate) : undefined)}
                        onChange={(date) =>
                          setEditVPS({
                            ...editVPS,
                            expiryDate: date ?? undefined,
                          } as any)
                        }
                        placeholder="Chọn ngày hết hạn"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-ipAddress" className="text-right">
                      IP Address
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-ipAddress"
                        placeholder="192.168.1.1"
                        value={(editVPS as any).ipAddress || ''}
                        onChange={(e) => setEditVPS({ ...editVPS, ipAddress: e.target.value } as any)}
                      />
                    </div>
                  </div>
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

        {/* Stats Cards for Purchased VPS */}
        {activeTab === 'purchased' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng VPS Đã Đăng Ký</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchasedVps.length}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(purchasedVps)} so với tháng trước
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchasedVps.filter(v => v.status === 'ACTIVE').length}</div>
                <p className="text-xs text-gray-600">Đang hoạt động</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Dung Lượng</CardTitle>
                <HardDrive className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatStorage(purchasedVps.reduce((sum, v) => sum + v.storage, 0))}</div>
                <p className="text-xs text-gray-600">Tổng dung lượng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Giá Trị</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(purchasedVps.reduce((sum, v) => sum + v.price, 0))}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(purchasedVps, (v) => v.price)} so với tháng trước
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards for VPS Packages */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Gói VPS</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vps.length}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(vps)} so với tháng trước
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vps.filter(v => v.status === 'ACTIVE').length}</div>
                <p className="text-xs text-gray-600">Đang hoạt động</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Dung Lượng</CardTitle>
                <HardDrive className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatStorage(vps.reduce((sum, v) => sum + v.storage, 0))}</div>
                <p className="text-xs text-gray-600">Tổng dung lượng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Giá Trị</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(vps.reduce((sum, v) => sum + v.price, 0))}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(vps, (v) => v.price)} so với tháng trước
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
                <CardTitle>Danh Sách Gói VPS</CardTitle>
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
                        <TableHead className="w-fit">Thao Tác</TableHead>
                        <TableHead>Tên Gói</TableHead>
                        <TableHead>CPU</TableHead>
                        <TableHead>RAM</TableHead>
                        <TableHead>Storage</TableHead>
                        <TableHead>Bandwidth</TableHead>
                        <TableHead>Vị trí máy chủ</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Giá</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVPS.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="w-fit">
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteVPS(v)} title="Xóa"><Trash2 className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleEditVPS(v)} title="Chỉnh sửa"><Edit className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleViewVPS(v)} title="Xem chi tiết"><Eye className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{v.planName}</TableCell>
                          <TableCell><div className="flex items-center space-x-1"><Cpu className="h-4 w-4 text-gray-500" /><span>{v.cpu} cores</span></div></TableCell>
                          <TableCell><div className="flex items-center space-x-1"><MemoryStick className="h-4 w-4 text-gray-500" /><span>{v.ram} GB</span></div></TableCell>
                          <TableCell><div className="flex items-center space-x-1"><HardDrive className="h-4 w-4 text-gray-500" /><span>{v.storage} GB</span></div></TableCell>
                          <TableCell><span>{v.bandwidth} GB</span></TableCell>
                          <TableCell><span className="text-sm">{v.serverLocation || '—'}</span></TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell>{formatCurrency(v.price)}</TableCell>
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
                      <TableHead>Thao Tác</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Gói VPS</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>RAM</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Bandwidth</TableHead>
                      <TableHead>Vị trí máy chủ</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>Ngày Đăng Ký</TableHead>
                      <TableHead>Ngày Hết Hạn</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Giá</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchased.map((v) => {
                      const customer = customers.find(c => c.id === (v as any).customerId)
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="w-fit">
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteVPS(v)} title="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleEditVPS(v)} title="Chỉnh sửa">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleViewVPS(v)} title="Xem chi tiết">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium font-mono">{v.id}</div>
                          </TableCell>
                          <TableCell>
                            {v.planName || (v.vpsTypeId ? (
                              vpsPackages.find(pkg => String(pkg.id) === String(v.vpsTypeId))?.planName || '—'
                            ) : (
                              '—'
                            ))}
                          </TableCell>
                          <TableCell>
                            {v.ipAddress ? (
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">{v.ipAddress}</code>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>{v.cpu} cores</TableCell>
                          <TableCell>{v.ram} GB</TableCell>
                          <TableCell>{v.storage} GB</TableCell>
                          <TableCell>{v.bandwidth} GB</TableCell>
                          <TableCell><span className="text-sm">{v.serverLocation || '—'}</span></TableCell>
                          <TableCell>
                            {customer ? (
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-xs text-gray-500">{customer.email}</div>
                              </div>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>{new Date(v.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{v.expiryDate ? formatDate(v.expiryDate) : '—'}</TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell>{formatCurrency(v.price)}</TableCell>
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