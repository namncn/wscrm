'use client'

import { useState, useEffect } from 'react'
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
import { Globe, Plus, Search, Eye, RefreshCw, CheckCircle, XCircle, Calendar, Edit, Trash2, Loader2, Package, Settings } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface Domain {
  id: number
  domainName: string
  registrar: string | null
  registrationDate: string | null
  expiryDate: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  price: string | null
  createdAt: string
  updatedAt: string
  customerId?: string | null
  customerName?: string | null
  customerEmail?: string | null
}

interface DomainPackage {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular: boolean
  category: string
  status: 'ACTIVE' | 'INACTIVE'
}

export default function domainPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [domain, setdomain] = useState<Domain[]>([])
  const [domainPackages, setDomainPackages] = useState<DomainPackage[]>([])
  const [customersList, setCustomersList] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'domain' | 'packages'>('domain')
  const [isCreateDomainDialogOpen, setIsCreateDomainDialogOpen] = useState(false)
  const [isViewDomainDialogOpen, setIsViewDomainDialogOpen] = useState(false)
  const [isEditDomainDialogOpen, setIsEditDomainDialogOpen] = useState(false)
  const [isDeleteDomainDialogOpen, setIsDeleteDomainDialogOpen] = useState(false)
  const [isCreatePackageDialogOpen, setIsCreatePackageDialogOpen] = useState(false)
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<DomainPackage | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form state for new domain
  const [newDomain, setNewDomain] = useState({
    domainName: '',
    registrar: '',
    registrationDate: '',
    expiryDate: '',
    price: '',
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
    customerId: null as number | null
  })

  // Form state for new domain package
  const [newPackage, setNewPackage] = useState({
    name: '',
    price: '',
    description: '',
    features: '',
    popular: false,
    category: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  // Form state for edit domain
  const [editDomain, setEditDomain] = useState({
    domainName: '',
    registrar: '',
    registrationDate: '',
    expiryDate: '',
    price: '',
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
    customerId: null as number | null
  })

  // Helper function to parse date string to Date object or undefined
  const parseDate = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString || !dateString.trim()) return undefined
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? undefined : date
  }

  // Helper function to format date to YYYY-MM-DD in local timezone (avoid timezone issues)
  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchdomain()
    fetchDomainPackages()
    fetchCustomers()
  }, [session, status, router])
  
  // Reset to first page when search term changes or tab switches
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const fetchdomain = async () => {
    try {
      const response = await fetch('/api/domain')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setdomain(result.data)
        } else {
          setdomain([])
          toastError('Không thể tải danh sách tên miền')
        }
      } else {
        setdomain([])
        toastError('Không thể tải danh sách tên miền')
      }
    } catch (error) {
      setdomain([])
      toastError('Có lỗi xảy ra khi tải danh sách tên miền')
      console.error('Error fetching domain:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDomainPackages = async () => {
    try {
      const response = await fetch('/api/domain-types')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDomainPackages(result.data)
        } else {
          setDomainPackages([])
          toastError('Không thể tải danh sách gói tên miền')
        }
      } else {
        setDomainPackages([])
        toastError('Không thể tải danh sách gói tên miền')
      }
    } catch (error) {
      setDomainPackages([])
      toastError('Có lỗi xảy ra khi tải danh sách gói tên miền')
      console.error('Error fetching domain packages:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setCustomersList(data.data.map((c: any) => ({ id: typeof c.id === 'string' ? parseInt(c.id) : c.id, name: c.name, email: c.email })))
        } else setCustomersList([])
      } else setCustomersList([])
    } catch (e) {
      setCustomersList([])
    }
  }

  const createDomain = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDomain),
      })

      if (response.ok) {
        await fetchdomain()
        setIsCreateDomainDialogOpen(false)
        setNewDomain({
          domainName: '',
          registrar: '',
          registrationDate: '',
          expiryDate: '',
          price: '',
          status: 'ACTIVE',
          customerId: null
        })
        toastSuccess('Tạo tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể tạo tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi tạo tên miền')
      console.error('Error creating domain:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const updateDomain = async () => {
    if (!selectedDomain) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/domain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedDomain.id,
          ...editDomain
        }),
      })

      if (response.ok) {
        await fetchdomain()
        setIsEditDomainDialogOpen(false)
        setSelectedDomain(null)
        toastSuccess('Cập nhật tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật tên miền')
      console.error('Error updating domain:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteDomain = async () => {
    if (!selectedDomain) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/domain?id=${selectedDomain.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchdomain()
        setIsDeleteDomainDialogOpen(false)
        setSelectedDomain(null)
        toastSuccess('Xóa tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xóa tên miền')
      console.error('Error deleting domain:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Domain Package CRUD functions
  const createDomainPackage = async () => {
    setIsCreating(true)
    try {
      const packageData = {
        ...newPackage,
        price: parseFloat(newPackage.price),
        features: newPackage.features.split(',').map((f: string) => f.trim()).filter((f: string) => f)
      }

      const response = await fetch('/api/domain-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      })

      if (response.ok) {
        await fetchDomainPackages()
        setIsCreatePackageDialogOpen(false)
        setNewPackage({
          name: '',
          price: '',
          description: '',
          features: '',
          popular: false,
          category: '',
          status: 'ACTIVE'
        })
        toastSuccess('Tạo gói tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể tạo gói tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi tạo gói tên miền')
      console.error('Error creating domain package:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const updateDomainPackage = async () => {
    if (!selectedPackage) return
    
    setIsUpdating(true)
    try {
      // Handle features conversion
      let featuresArray: string[] = []
      if (Array.isArray(selectedPackage.features)) {
        featuresArray = selectedPackage.features
      } else {
        const featuresStr = String(selectedPackage.features)
        featuresArray = featuresStr.split(',').map((f: string) => f.trim()).filter((f: string) => f)
      }

      const packageData = {
        id: selectedPackage.id,
        name: selectedPackage.name,
        price: typeof selectedPackage.price === 'number' ? selectedPackage.price : parseFloat(String(selectedPackage.price)),
        description: selectedPackage.description,
        features: featuresArray,
        popular: selectedPackage.popular,
        category: selectedPackage.category,
        status: selectedPackage.status
      }

      const response = await fetch('/api/domain-types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      })

      if (response.ok) {
        await fetchDomainPackages()
        setIsEditPackageDialogOpen(false)
        setSelectedPackage(null)
        toastSuccess('Cập nhật gói tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật gói tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật gói tên miền')
      console.error('Error updating domain package:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteDomainPackage = async () => {
    if (!selectedPackage) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/domain-types?id=${selectedPackage.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDomainPackages()
        setIsDeleteDomainDialogOpen(false)
        setSelectedPackage(null)
        toastSuccess('Xóa gói tên miền thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể xóa gói tên miền'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xóa gói tên miền')
      console.error('Error deleting domain package:', error)
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

  const filtereddomain = domain.filter(domain =>
    domain.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (domain.registrar && domain.registrar.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  const filteredPackages = domainPackages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.category.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic for domain
  const domainStartIndex = (currentPage - 1) * itemsPerPage
  const domainEndIndex = domainStartIndex + itemsPerPage
  const paginatedDomain = filtereddomain.slice(domainStartIndex, domainEndIndex)
  const totalDomainPages = Math.ceil(filtereddomain.length / itemsPerPage)
  
  // Pagination logic for packages
  const packageStartIndex = (currentPage - 1) * itemsPerPage
  const packageEndIndex = packageStartIndex + itemsPerPage
  const paginatedPackages = filteredPackages.slice(packageStartIndex, packageEndIndex)
  const totalPackagePages = Math.ceil(filteredPackages.length / itemsPerPage)
  
  // Use different pagination based on active tab
  const totalFilteredPages = activeTab === 'domain' ? totalDomainPages : totalPackagePages

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Hết hạn</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm khóa</Badge>
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">Không hoạt động</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'SUSPENDED':
        return <RefreshCw className="h-4 w-4 text-yellow-600" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Chưa có'
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount))
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Chưa có'
    return new Date(date).toLocaleDateString('vi-VN')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Tên Miền</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tất cả tên miền</p>
          </div>
          <div className="flex space-x-2">
            {activeTab === 'domain' ? (
              <Dialog open={isCreateDomainDialogOpen} onOpenChange={setIsCreateDomainDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Thêm Tên Miền
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
                  <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Thêm Tên Miền Mới</DialogTitle>
                    <DialogDescription>
                      Nhập thông tin tên miền mới vào form bên dưới.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6">
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="domainName" className="text-right">
                        Tên miền
                      </Label>
                      <div className="col-span-3">
                        <Input 
                          id="domainName"
                          value={newDomain.domainName}
                          onChange={(e) => setNewDomain({...newDomain, domainName: e.target.value})}
                          placeholder="example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="registrar" className="text-right">
                        Nhà đăng ký
                      </Label>
                      <div className="col-span-3">
                        <Input 
                          id="registrar"
                          value={newDomain.registrar}
                          onChange={(e) => setNewDomain({...newDomain, registrar: e.target.value})}
                          placeholder="Nhà đăng ký tên miền"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="registrationDate" className="text-right">
                        Ngày đăng ký
                      </Label>
                      <div className="col-span-3">
                        <DatePicker
                          value={parseDate(newDomain.registrationDate)}
                          onChange={(date) => setNewDomain({...newDomain, registrationDate: date ? formatDateToISO(date) : ''})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="expiryDate" className="text-right">
                        Ngày hết hạn
                      </Label>
                      <div className="col-span-3">
                        <DatePicker
                          value={parseDate(newDomain.expiryDate)}
                          onChange={(date) => setNewDomain({...newDomain, expiryDate: date ? formatDateToISO(date) : ''})}
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
                          step="1"
                          value={newDomain.price}
                          onChange={(e) => setNewDomain({...newDomain, price: e.target.value})}
                          placeholder="Giá tên miền"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        Khách hàng
                      </Label>
                      <div className="col-span-3">
                        <CustomerCombobox
                          customers={customersList}
                          value={newDomain.customerId?.toString() || null}
                          onValueChange={(val) => setNewDomain({ ...newDomain, customerId: val ? parseInt(String(val)) : null })}
                          placeholder="Chọn khách hàng"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="status" className="text-right">
                        Trạng thái
                      </Label>
                      <div className="col-span-3">
                        <Select 
                          value={newDomain.status} 
                          onValueChange={(value: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED') =>
                            setNewDomain({...newDomain, status: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                            <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                            <SelectItem value="SUSPENDED">Tạm khóa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    </div>
                  </div>
                  <DialogFooter className="px-6 pt-4 pb-6 border-t">
                    <Button variant="outline" onClick={() => setIsCreateDomainDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={createDomain} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        'Thêm Tên Miền'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isCreatePackageDialogOpen} onOpenChange={setIsCreatePackageDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Thêm Gói Tên Miền
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
                  <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Thêm Gói Tên Miền Mới</DialogTitle>
                    <DialogDescription>
                      Nhập thông tin gói tên miền mới vào form bên dưới.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6">
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packageName" className="text-right">
                        Tên gói
                      </Label>
                      <div className="col-span-3">
                        <Input 
                          id="packageName"
                          value={newPackage.name}
                          onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                          placeholder=".com, .vn, .net..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packagePrice" className="text-right">
                        Giá
                      </Label>
                      <div className="col-span-3">
                        <Input 
                          id="packagePrice"
                          type="number"
                          step="1"
                          value={newPackage.price}
                          onChange={(e) => setNewPackage({...newPackage, price: e.target.value})}
                          placeholder="250000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packageDescription" className="text-right">
                        Mô tả
                      </Label>
                      <div className="col-span-3">
                        <Textarea 
                          id="packageDescription"
                          value={newPackage.description}
                          onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                          placeholder="Mô tả về gói tên miền"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packageFeatures" className="text-right">
                        Tính năng
                      </Label>
                      <div className="col-span-3">
                        <Input 
                          id="packageFeatures"
                          value={newPackage.features}
                          onChange={(e) => setNewPackage({...newPackage, features: e.target.value})}
                          placeholder="Tính năng 1, Tính năng 2, Tính năng 3"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packageCategory" className="text-right">
                        Danh mục
                      </Label>
                      <div className="col-span-3">
                        <Select 
                          value={newPackage.category} 
                          onValueChange={(value) => setNewPackage({...newPackage, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="International">Quốc tế</SelectItem>
                            <SelectItem value="Vietnam">Việt Nam</SelectItem>
                            <SelectItem value="Business">Doanh nghiệp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="packagePopular" className="text-right">
                        Phổ biến
                      </Label>
                      <div className="col-span-3">
                        <Select 
                          value={newPackage.popular.toString()} 
                          onValueChange={(value) => setNewPackage({...newPackage, popular: value === 'true'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Có</SelectItem>
                            <SelectItem value="false">Không</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    </div>
                  </div>
                  <DialogFooter className="px-6 pt-4 pb-6 border-t">
                    <Button variant="outline" onClick={() => setIsCreatePackageDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={createDomainPackage} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        'Thêm Gói Tên Miền'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Tên Miền</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{domain.length}</div>
              <p className="text-xs text-gray-600">+12% so với tháng trước</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Gói Tên Miền</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{domainPackages.length}</div>
              <p className="text-xs text-gray-600">+5% so với tháng trước</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tên Miền Hoạt Động</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{domain.filter(d => d.status === 'ACTIVE').length}</div>
              <p className="text-xs text-gray-600">85% tổng số tên miền</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gói Phổ Biến</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{domainPackages.filter(p => p.popular).length}</div>
              <p className="text-xs text-gray-600">Gói được ưa chuộng</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('domain')}
              className={`py-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'domain'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Tên Miền Đã Đăng Ký
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'packages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Gói Tên Miền
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
                    placeholder={activeTab === 'domain' ? "Tìm kiếm theo tên miền, nhà đăng ký..." : "Tìm kiếm theo tên gói, mô tả..."}
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

        {/* Content based on active tab */}
        {activeTab === 'domain' ? (
          /* domain Table */
          <Card>
            <CardHeader>
              <CardTitle>Danh Sách Tên Miền</CardTitle>
              <CardDescription>
                Quản lý tất cả tên miền đã đăng ký
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filtereddomain.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có tên miền nào</h3>
                  <p className="text-gray-500 mb-4">Bắt đầu bằng cách thêm tên miền đầu tiên</p>
                  <Button onClick={() => setIsCreateDomainDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Thêm Tên Miền
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên Miền</TableHead>
                      <TableHead>Nhà Đăng Ký</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>Ngày Đăng Ký</TableHead>
                      <TableHead>Ngày Hết Hạn</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDomain.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell className="font-mono text-gray-600">{domain.id}</TableCell>
                        <TableCell className="font-medium">{domain.domainName}</TableCell>
                        <TableCell>{domain.registrar || 'Chưa có'}</TableCell>
                        <TableCell>{domain.customerName ? `${domain.customerName} (${domain.customerEmail || ''})` : '—'}</TableCell>
                        <TableCell>{formatDate(domain.registrationDate)}</TableCell>
                        <TableCell>{formatDate(domain.expiryDate)}</TableCell>
                        <TableCell>{getStatusBadge(domain.status)}</TableCell>
                        <TableCell>{formatCurrency(domain.price)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDomain(domain)
                                setIsViewDomainDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditDomain({
                                  domainName: domain.domainName,
                                  registrar: domain.registrar || '',
                                  registrationDate: domain.registrationDate || '',
                                  expiryDate: domain.expiryDate || '',
                                  price: domain.price ? Math.floor(Number(domain.price)).toString() : '',
                                  status: domain.status,
                                  customerId: domain.customerId ? parseInt(String(domain.customerId)) : null
                                })
                                setSelectedDomain(domain)
                                setIsEditDomainDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedDomain(domain)
                                setIsDeleteDomainDialogOpen(true)
                              }}
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
        ) : (
          /* Domain Packages Table */
          <Card>
            <CardHeader>
              <CardTitle>Danh Sách Gói Tên Miền</CardTitle>
              <CardDescription>
                Quản lý các gói tên miền có sẵn cho khách hàng
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPackages.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có gói tên miền nào</h3>
                  <p className="text-gray-500 mb-4">Bắt đầu bằng cách thêm gói tên miền đầu tiên</p>
                  <Button onClick={() => setIsCreatePackageDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Thêm Gói Tên Miền
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Gói</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Mô Tả</TableHead>
                      <TableHead>Danh Mục</TableHead>
                      <TableHead>Phổ Biến</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPackages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{formatCurrency(pkg.price.toString())}</TableCell>
                        <TableCell className="max-w-xs truncate">{pkg.description}</TableCell>
                        <TableCell>{pkg.category}</TableCell>
                        <TableCell>
                          {pkg.popular ? (
                            <Badge className="bg-blue-100 text-blue-800">Phổ biến</Badge>
                          ) : (
                            <Badge variant="outline">Thường</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg)
                                setIsEditPackageDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg)
                                setIsDeleteDomainDialogOpen(true)
                              }}
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
        )}

        {/* Pagination for domain */}
        <Pagination
          currentPage={currentPage}
          totalPages={activeTab === 'domain' ? totalDomainPages : totalPackagePages}
          totalItems={activeTab === 'domain' ? filtereddomain.length : filteredPackages.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

        {/* View Domain Dialog */}
        <Dialog open={isViewDomainDialogOpen} onOpenChange={setIsViewDomainDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chi Tiết Tên Miền</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của tên miền
              </DialogDescription>
            </DialogHeader>
            {selectedDomain && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Tên miền</Label>
                    <p className="text-sm text-gray-600">{selectedDomain.domainName}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Nhà đăng ký</Label>
                    <p className="text-sm text-gray-600">{selectedDomain.registrar || 'Chưa có'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Ngày đăng ký</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedDomain.registrationDate)}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Ngày hết hạn</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedDomain.expiryDate)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Trạng thái</Label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedDomain.status)}
                      {getStatusBadge(selectedDomain.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Giá</Label>
                    <p className="text-sm text-gray-600">{formatCurrency(selectedDomain.price)}</p>
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium mb-2 block">Khách hàng</Label>
                  <p className="text-sm text-gray-600">
                    {selectedDomain.customerName
                      ? `${selectedDomain.customerName}${selectedDomain.customerEmail ? ` (${selectedDomain.customerEmail})` : ''}`
                      : '—'}
                  </p>
                </div>
              </div>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsViewDomainDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Domain Dialog */}
        <Dialog open={isEditDomainDialogOpen} onOpenChange={setIsEditDomainDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Tên Miền</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin tên miền
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDomainName" className="text-right">
                  Tên miền
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="editDomainName"
                    value={editDomain.domainName}
                    onChange={(e) => setEditDomain({...editDomain, domainName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editRegistrar" className="text-right">
                  Nhà đăng ký
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="editRegistrar"
                    value={editDomain.registrar}
                    onChange={(e) => setEditDomain({...editDomain, registrar: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editRegistrationDate" className="text-right">
                  Ngày đăng ký
                </Label>
                <div className="col-span-3">
                  <DatePicker
                    value={parseDate(editDomain.registrationDate)}
                    onChange={(date) => setEditDomain({...editDomain, registrationDate: date ? formatDateToISO(date) : ''})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editExpiryDate" className="text-right">
                  Ngày hết hạn
                </Label>
                <div className="col-span-3">
                  <DatePicker
                    value={parseDate(editDomain.expiryDate)}
                    onChange={(date) => setEditDomain({...editDomain, expiryDate: date ? formatDateToISO(date) : ''})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPrice" className="text-right">
                  Giá
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="editPrice"
                    type="number"
                    step="1"
                    value={editDomain.price}
                    onChange={(e) => setEditDomain({...editDomain, price: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Khách hàng
                </Label>
                <div className="col-span-3">
                  <CustomerCombobox
                    customers={customersList}
                    value={editDomain.customerId?.toString() || null}
                    onValueChange={(val) => setEditDomain({ ...editDomain, customerId: val ? parseInt(String(val)) : null })}
                    placeholder="Chọn khách hàng"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editStatus" className="text-right">
                  Trạng thái
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={editDomain.status} 
                    onValueChange={(value: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED') =>
                      setEditDomain({...editDomain, status: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                      <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                      <SelectItem value="SUSPENDED">Tạm khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDomainDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={updateDomain} disabled={isUpdating}>
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

        {/* Delete Domain Dialog */}
        <Dialog open={isDeleteDomainDialogOpen} onOpenChange={setIsDeleteDomainDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa tên miền này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteDomainDialogOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={deleteDomain} disabled={isDeleting}>
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

        {/* Edit Package Dialog */}
        <Dialog open={isEditPackageDialogOpen} onOpenChange={setIsEditPackageDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Gói Tên Miền</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin gói tên miền
              </DialogDescription>
            </DialogHeader>
            {selectedPackage && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackageName" className="text-right">
                    Tên gói
                  </Label>
                  <div className="col-span-3">
                    <Input 
                      id="editPackageName"
                      value={selectedPackage.name}
                      onChange={(e) => setSelectedPackage({...selectedPackage, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackagePrice" className="text-right">
                    Giá
                  </Label>
                  <div className="col-span-3">
                    <Input 
                      id="editPackagePrice"
                      type="number"
                      step="1"
                      value={Math.floor(selectedPackage.price).toString()}
                      onChange={(e) => setSelectedPackage({...selectedPackage, price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackageDescription" className="text-right">
                    Mô tả
                  </Label>
                  <div className="col-span-3">
                    <Textarea 
                      id="editPackageDescription"
                      value={selectedPackage.description}
                      onChange={(e) => setSelectedPackage({...selectedPackage, description: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackageFeatures" className="text-right">
                    Tính năng
                  </Label>
                  <div className="col-span-3">
                    <Input 
                      id="editPackageFeatures"
                      value={Array.isArray(selectedPackage.features) ? selectedPackage.features.join(', ') : (typeof selectedPackage.features === 'string' ? selectedPackage.features : '')}
                      onChange={(e) => {
                        const featuresValue = e.target.value
                        setSelectedPackage({...selectedPackage, features: featuresValue as any})
                      }}
                      placeholder="Tính năng 1, Tính năng 2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackageCategory" className="text-right">
                    Danh mục
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={selectedPackage.category} 
                      onValueChange={(value) => setSelectedPackage({...selectedPackage, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="International">Quốc tế</SelectItem>
                        <SelectItem value="Vietnam">Việt Nam</SelectItem>
                        <SelectItem value="Business">Doanh nghiệp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackagePopular" className="text-right">
                    Phổ biến
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={selectedPackage.popular.toString()} 
                      onValueChange={(value) => setSelectedPackage({...selectedPackage, popular: value === 'true'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Có</SelectItem>
                        <SelectItem value="false">Không</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPackageStatus" className="text-right">
                    Trạng thái
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={selectedPackage.status} 
                      onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setSelectedPackage({...selectedPackage, status: value})}
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
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditPackageDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={updateDomainPackage} disabled={isUpdating}>
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

        {/* Delete Package Dialog */}
        <Dialog open={isDeleteDomainDialogOpen} onOpenChange={setIsDeleteDomainDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa gói tên miền này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteDomainDialogOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={deleteDomainPackage} disabled={isDeleting}>
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