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
import { DomainCombobox } from '@/components/ui/domain-combobox'
import { HostingPackageCombobox } from '@/components/ui/hosting-package-combobox'
import { Server, Plus, Search, Eye, RefreshCw, CheckCircle, XCircle, HardDrive, Cpu, Edit, Trash2, Loader2, DollarSign } from 'lucide-react'
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
  hostingTypeId?: number | null
  expiryDate?: string | null
  serverLocation?: string | null
  addonDomain?: string
  subDomain?: string
  ftpAccounts?: string
  databases?: string
  hostingType?: string
  operatingSystem?: string
}

// Helper function to format date to YYYY-MM-DD in local timezone
const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to format Date to YYYY-MM-DD string, ensuring local timezone
const formatDateForAPI = (date: Date | undefined): string | null => {
  if (!date) return null
  // Ensure we use local date components to avoid timezone issues
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return formatDateToLocalString(localDate)
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
  const [domains, setDomains] = useState<Array<{ id: number; domainName: string; status?: string }>>([])
  const [hostingPackages, setHostingPackages] = useState<Array<{ id: number; planName: string; storage: number; bandwidth: number; price: string | number }>>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Register purchased hosting (assign to customer)
  const [isRegisterHostingDialogOpen, setIsRegisterHostingDialogOpen] = useState(false)
  const [selectedHostingPackageId, setSelectedHostingPackageId] = useState<number | null>(null)
  const createInitialRegisterHostingState = () => ({
    hostingTypeId: null as number | null,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    customerId: null as number | null,
    ipAddress: '',
    registrationDate: undefined as Date | undefined,
    expiryDate: undefined as Date | undefined,
  })
  const [registerHosting, setRegisterHosting] = useState(createInitialRegisterHostingState)

  // Form state for new hosting
  const [newHosting, setNewHosting] = useState({
    planName: '',
    storage: '',
    bandwidth: '',
    price: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    hostingTypeId: null as number | null,
    addonDomain: 'Unlimited',
    subDomain: 'Unlimited',
    ftpAccounts: 'Unlimited',
    databases: 'Unlimited',
    hostingType: 'VPS Hosting',
    operatingSystem: 'Linux',
    serverLocation: '',
  })

  // Form state for edit hosting (only for purchased hosting)
  const [editHosting, setEditHosting] = useState({
    hostingTypeId: null as number | null,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    customerId: null as number | null,
    registrationDate: undefined as Date | undefined,
    expiryDate: undefined as Date | undefined,
  })

  // Form state for edit hosting package
  const [isEditHostingPackageDialogOpen, setIsEditHostingPackageDialogOpen] = useState(false)
  const [selectedHostingPackage, setSelectedHostingPackage] = useState<Hosting | null>(null)
  const [editHostingPackage, setEditHostingPackage] = useState({
    planName: '',
    storage: '',
    bandwidth: '',
    price: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    hostingTypeId: null as number | null,
    addonDomain: 'Unlimited',
    subDomain: 'Unlimited',
    ftpAccounts: 'Unlimited',
    databases: 'Unlimited',
    hostingType: 'VPS Hosting',
    operatingSystem: 'Linux',
    serverLocation: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchHostings()
    fetchCustomers()
    fetchHostingPackages()
  }, [session, status, router])
  
  const fetchHostingPackages = async () => {
    try {
      const response = await fetch('/api/hosting-packages')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setHostingPackages(result.data.map((pkg: any) => ({
            id: typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id,
            planName: pkg.planName,
            storage: pkg.storage,
            bandwidth: pkg.bandwidth,
            price: pkg.price
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching hosting packages:', error)
    }
  }
  
  // Reset to first page when search term changes or tab switches
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const fetchHostings = async () => {
    try {
      // For packages tab, load from /api/hosting-packages
      // For purchased tab, load from /api/hosting?purchased=all
      const [packagesRes, purchasedRes] = await Promise.all([
        fetch('/api/hosting-packages'), // Load hosting packages (catalog)
        fetch('/api/hosting?purchased=all') // Load purchased hostings
      ])

      if (packagesRes.ok) {
        const result = await packagesRes.json()
        if (result.success && result.data) {
          // Map hosting packages to Hosting format for display
          setHostings(result.data.map((pkg: any) => ({
            id: typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id,
            planName: pkg.planName,
            storage: pkg.storage || 0,
            bandwidth: pkg.bandwidth || 0,
            price: pkg.price,
            status: pkg.status,
            addonDomain: pkg.addonDomain,
            subDomain: pkg.subDomain,
            ftpAccounts: pkg.ftpAccounts,
            databases: pkg.databases,
            hostingType: pkg.hostingType,
            operatingSystem: pkg.operatingSystem,
            serverLocation: pkg.serverLocation,
            createdAt: pkg.createdAt,
            updatedAt: pkg.updatedAt,
          })))
        } else {
          setHostings([])
        }
      } else {
        setHostings([])
      }

      if (purchasedRes.ok) {
        const result2 = await purchasedRes.json()
        if (result2.success && result2.data) setPurchasedHostings(result2.data)
        else setPurchasedHostings([])
      } else {
        setPurchasedHostings([])
      }
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
      // For packages tab, create hosting package using /api/hosting-packages
      // For purchased tab, create customer hosting registration using /api/hosting
      const endpoint = activeTab === 'packages' ? '/api/hosting-packages' : '/api/hosting'
      
      let requestBody: any
      if (activeTab === 'packages') {
        // Save value directly from input (no conversion)
        const storageValue = newHosting.storage === '' || newHosting.storage.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(newHosting.storage)
              return isNaN(parsed) ? 0 : parsed
            })()
        
        const bandwidthValue = newHosting.bandwidth === '' || newHosting.bandwidth.toLowerCase() === 'unlimited'
          ? 0
          : (() => {
              const parsed = parseFloat(newHosting.bandwidth)
              return isNaN(parsed) ? 0 : parsed
            })()
        
        // Create hosting package
        requestBody = {
          planName: newHosting.planName,
          storage: storageValue,
          bandwidth: bandwidthValue,
          price: newHosting.price,
          status: newHosting.status,
          serverLocation: newHosting.serverLocation || null,
          addonDomain: newHosting.addonDomain || 'Unlimited',
          subDomain: newHosting.subDomain || 'Unlimited',
          ftpAccounts: newHosting.ftpAccounts || 'Unlimited',
          databases: newHosting.databases || 'Unlimited',
          hostingType: newHosting.hostingType || 'VPS Hosting',
          operatingSystem: newHosting.operatingSystem || 'Linux',
        }
      } else {
        // Create customer hosting registration (should not happen from this dialog, but handle it)
        requestBody = {
          hostingTypeId: newHosting.hostingTypeId,
          customerId: null, // This dialog is only for packages, so customerId should be null
          status: newHosting.status,
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
          fetchHostings(),
          fetchHostingPackages() // Refresh packages list for combobox
        ])
        setIsCreateHostingDialogOpen(false)
        setNewHosting({
          planName: '',
          storage: '',
          bandwidth: '',
          price: 0,
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
          hostingTypeId: null,
          addonDomain: 'Unlimited',
          subDomain: 'Unlimited',
          ftpAccounts: 'Unlimited',
          databases: 'Unlimited',
          hostingType: 'VPS Hosting',
          operatingSystem: 'Linux',
          serverLocation: '',
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

  const fetchDomains = async (customerId: number | string | null) => {
    if (!customerId) {
      setDomains([])
      return
    }
    try {
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
      const res = await fetch(`/api/domain?customerId=${customerIdNum}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setDomains(json.data.map((d: any) => ({ 
            id: typeof d.id === 'string' ? parseInt(d.id, 10) : d.id, 
            domainName: d.domainName,
            status: d.status
          })))
        } else {
          setDomains([])
        }
      } else {
        setDomains([])
      }
    } catch (e) {
      console.error('Error fetching domains list:', e)
      setDomains([])
    }
  }

  const handleViewHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    setIsViewHostingDialogOpen(true)
  }

  const handleEditHostingPackage = (hosting: Hosting) => {
    setSelectedHostingPackage(hosting)
    // Display value directly from database (no conversion)
    const storageValue = hosting.storage ? String(hosting.storage) : ''
    const bandwidthValue = hosting.bandwidth ? String(hosting.bandwidth) : ''
    
    setEditHostingPackage({
      planName: hosting.planName || '',
      storage: storageValue,
      bandwidth: bandwidthValue,
      price: typeof hosting.price === 'string' ? parseFloat(hosting.price) : hosting.price || 0,
      status: (hosting.status === 'SUSPENDED' ? 'INACTIVE' : hosting.status) as 'ACTIVE' | 'INACTIVE',
      hostingTypeId: (hosting as any).hostingTypeId || null,
      addonDomain: (hosting as any).addonDomain || 'Unlimited',
      subDomain: (hosting as any).subDomain || 'Unlimited',
      ftpAccounts: (hosting as any).ftpAccounts || 'Unlimited',
      databases: (hosting as any).databases || 'Unlimited',
      hostingType: (hosting as any).hostingType || 'VPS Hosting',
      operatingSystem: (hosting as any).operatingSystem || 'Linux',
      serverLocation: (hosting as any).serverLocation || '',
    })
    setIsEditHostingPackageDialogOpen(true)
  }

  const handleEditHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    const hasCustomerId = !!(hosting as any).customerId
    const customerId = hasCustomerId ? (hosting as any).customerId : null
    
    // For DatePicker, pass date strings directly - DatePicker will parse them correctly
    // This avoids timezone issues when converting ISO strings to Date objects
    let registrationDate: Date | undefined = undefined
    let expiryDate: Date | undefined = undefined
    
    if (hasCustomerId && hosting.createdAt) {
      // Extract date part from ISO string if needed (e.g., "2024-01-15T00:00:00.000Z" -> "2024-01-15")
      const dateStr = hosting.createdAt.includes('T') 
        ? hosting.createdAt.split('T')[0] 
        : hosting.createdAt
      // Parse using local timezone to avoid timezone issues
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // month is 0-indexed
        const day = parseInt(parts[2], 10)
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          registrationDate = new Date(year, month, day)
        }
      }
    }
    
    if ((hosting as any).expiryDate) {
      const dateStr = (hosting as any).expiryDate.includes('T')
        ? (hosting as any).expiryDate.split('T')[0]
        : (hosting as any).expiryDate
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // month is 0-indexed
        const day = parseInt(parts[2], 10)
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          expiryDate = new Date(year, month, day)
        }
      }
    }
    
    // Ensure hostingTypeId is set correctly (convert to number if needed)
    let hostingTypeId: number | null = null
    if ((hosting as any).hostingTypeId !== undefined && (hosting as any).hostingTypeId !== null) {
      hostingTypeId = typeof (hosting as any).hostingTypeId === 'string' 
        ? parseInt((hosting as any).hostingTypeId, 10) 
        : (hosting as any).hostingTypeId
    }
    
    setEditHosting({
      hostingTypeId: hostingTypeId,
      status: hosting.status,
      customerId: customerId ? (typeof customerId === 'number' ? customerId : parseInt(String(customerId), 10)) : null,
      registrationDate: registrationDate,
      expiryDate: expiryDate,
    })
    setIsEditHostingDialogOpen(true)
  }

  const handleDeleteHosting = (hosting: Hosting) => {
    setSelectedHosting(hosting)
    setIsDeleteHostingDialogOpen(true)
  }

  const updateHostingPackage = async () => {
    if (!selectedHostingPackage) return
    
    setIsUpdating(true)
    try {
      // Save value directly from input (no conversion)
      const storageValue = editHostingPackage.storage === '' || editHostingPackage.storage.toLowerCase() === 'unlimited'
        ? 0
        : (() => {
            const parsed = parseFloat(editHostingPackage.storage)
            return isNaN(parsed) ? 0 : parsed
          })()
      
      const bandwidthValue = editHostingPackage.bandwidth === '' || editHostingPackage.bandwidth.toLowerCase() === 'unlimited'
        ? 0
        : (() => {
            const parsed = parseFloat(editHostingPackage.bandwidth)
            return isNaN(parsed) ? 0 : parsed
          })()
      
      const updateData = {
        id: selectedHostingPackage.id,
        planName: editHostingPackage.planName,
        storage: storageValue,
        bandwidth: bandwidthValue,
        price: editHostingPackage.price,
        status: editHostingPackage.status,
        serverLocation: editHostingPackage.serverLocation || null,
        addonDomain: editHostingPackage.addonDomain || 'Unlimited',
        subDomain: editHostingPackage.subDomain || 'Unlimited',
        ftpAccounts: editHostingPackage.ftpAccounts || 'Unlimited',
        databases: editHostingPackage.databases || 'Unlimited',
        hostingType: editHostingPackage.hostingType || 'VPS Hosting',
        operatingSystem: editHostingPackage.operatingSystem || 'Linux',
      }
      
      const response = await fetch('/api/hosting-packages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        await Promise.all([
          fetchHostings(),
          fetchHostingPackages() // Refresh packages list for combobox
        ])
        setIsEditHostingPackageDialogOpen(false)
        setSelectedHostingPackage(null)
        setEditHostingPackage({
          planName: '',
          storage: '',
          bandwidth: '',
          price: 0,
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
          hostingTypeId: null,
          addonDomain: 'Unlimited',
          subDomain: 'Unlimited',
          ftpAccounts: 'Unlimited',
          databases: 'Unlimited',
          hostingType: 'VPS Hosting',
          operatingSystem: 'Linux',
          serverLocation: '',
        })
        toastSuccess('Cập nhật gói hosting thành công!')
      } else {
        const errorData = await response.json()
        toastError(`Lỗi: ${errorData.error || 'Không thể cập nhật gói hosting'}`)
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật gói hosting')
      console.error('Error updating hosting package:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const updateHosting = async () => {
    if (!selectedHosting) return
    
    setIsUpdating(true)
    try {
      // Build update data - only include fields that can be updated
      const updateData: any = {
        id: selectedHosting.id,
        hostingTypeId: editHosting.hostingTypeId,
        customerId: editHosting.customerId,
        status: editHosting.status,
        ipAddress: (editHosting as any).ipAddress || null,
        expiryDate: formatDateForAPI(editHosting.expiryDate),
        createdAt: formatDateForAPI(editHosting.registrationDate),
      }
      
      const response = await fetch('/api/hosting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        await Promise.all([
          fetchHostings(),
          fetchHostingPackages() // Refresh packages list for combobox
        ])
        setIsEditHostingDialogOpen(false)
        setSelectedHosting(null)
        setEditHosting({
          hostingTypeId: null,
          status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          customerId: null,
          registrationDate: undefined,
          expiryDate: undefined,
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
      // For packages tab, delete from /api/hosting-packages
      // For purchased tab, delete from /api/hosting
      const endpoint = activeTab === 'packages' 
        ? `/api/hosting-packages?id=${selectedHosting.id}`
        : `/api/hosting?id=${selectedHosting.id}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (response.ok) {
        await Promise.all([
          fetchHostings(),
          fetchHostingPackages() // Refresh packages list for combobox
        ])
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
    if (storage === 0 || storage === null || storage === undefined) {
      return 'Unlimited'
    }
    // Convert MB to GB (divide by 1024) and display with GB unit
    const gb = storage / 1024
    // Round to 1 decimal place if needed
    const displayValue = gb % 1 === 0 ? gb : gb.toFixed(1)
    return `${displayValue}GB`
  }

  const formatBandwidth = (bandwidth: number) => {
    if (bandwidth === 0 || bandwidth === null || bandwidth === undefined) {
      return 'Unlimited'
    }
    // Convert MB to GB (divide by 1024) and display with GB unit
    const gb = bandwidth / 1024
    // Round to 1 decimal place if needed
    const displayValue = gb % 1 === 0 ? gb : gb.toFixed(1)
    return `${displayValue}GB`
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
                      Tên gói <span className="text-red-500">*</span>
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
                      Dung lượng (MB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="storage" 
                        type="text"
                        placeholder="Unlimited"
                        value={newHosting.storage}
                        onChange={(e) => setNewHosting({...newHosting, storage: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bandwidth" className="text-right">
                      Băng thông (MB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="bandwidth" 
                        type="text"
                        placeholder="Unlimited"
                        value={newHosting.bandwidth}
                        onChange={(e) => setNewHosting({...newHosting, bandwidth: e.target.value})}
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
                      <Select 
                        value={newHosting.hostingType} 
                        onValueChange={(value) =>
                          setNewHosting({...newHosting, hostingType: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại hosting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Shared Hosting">Shared Hosting</SelectItem>
                          <SelectItem value="VPS Hosting">VPS Hosting</SelectItem>
                          <SelectItem value="Cloud Hosting">Cloud Hosting</SelectItem>
                          <SelectItem value="Dedicated Server">Dedicated Server</SelectItem>
                          <SelectItem value="WordPress Hosting">WordPress Hosting</SelectItem>
                        </SelectContent>
                      </Select>
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="serverLocation" className="text-right">
                      Vị trí máy chủ
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="serverLocation" 
                        placeholder="Hanoi"
                        value={newHosting.serverLocation}
                        onChange={(e) => setNewHosting({...newHosting, serverLocation: e.target.value})}
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
                    <Label className="text-right">
                      Gói Hosting <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <HostingPackageCombobox
                        packages={hostingPackages.filter(pkg => pkg.id)}
                        value={registerHosting.hostingTypeId || null}
                        onValueChange={(val) => setRegisterHosting({ ...registerHosting, hostingTypeId: val ? (typeof val === 'string' ? parseInt(val) : val) : null })}
                        placeholder="Chọn gói hosting"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reg-status" className="text-right">Trạng thái</Label>
                    <div className="col-span-3">
                      <Select 
                        value={registerHosting.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                          setRegisterHosting({...registerHosting, status: value})
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
                        value={registerHosting.customerId}
                        onValueChange={(val) => {
                          const customerIdNum = typeof val === 'number' ? val : val ? parseInt(String(val), 10) : null
                          setRegisterHosting({
                            ...registerHosting,
                            customerId: customerIdNum,
                          })
                        }}
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
                    <Label htmlFor="reg-hosting-ip" className="text-right">IP Address</Label>
                    <div className="col-span-3">
                      <Input
                        id="reg-hosting-ip"
                        placeholder="192.168.1.1"
                        value={registerHosting.ipAddress || ''}
                        onChange={(e) => setRegisterHosting({ ...registerHosting, ipAddress: e.target.value })}
                      />
                    </div>
                  </div>
                  </div>
                </div>
                <DialogFooter className="px-6 pt-4 pb-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegisterHosting(createInitialRegisterHostingState())
                      setSelectedHostingPackageId(null)
                      setIsRegisterHostingDialogOpen(false)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button onClick={async () => {
                    try {
                      // Validate required fields
                      if (!registerHosting.hostingTypeId) {
                        toastError('Vui lòng chọn gói hosting')
                        return
                      }
                      if (!registerHosting.customerId) {
                        toastError('Vui lòng chọn khách hàng')
                        return
                      }
                      
                      const res = await fetch('/api/hosting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          hostingTypeId: registerHosting.hostingTypeId,
                          customerId: registerHosting.customerId,
                          status: registerHosting.status,
                          ipAddress: registerHosting.ipAddress || null,
                          createdAt: formatDateForAPI(registerHosting.registrationDate),
                          expiryDate: formatDateForAPI(registerHosting.expiryDate),
                        })
                      })
                      if (!res.ok) {
                        const err = await res.json()
                        toastError(err.error || 'Không thể đăng ký hosting')
                        return
                      }
                      setRegisterHosting(createInitialRegisterHostingState())
                      setSelectedHostingPackageId(null)
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

        {/* Stats Cards for Purchased Hostings */}
        {activeTab === 'purchased' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Hosting Đã Đăng Ký</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchasedHostings.length}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(purchasedHostings)} so với tháng trước
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchasedHostings.filter(h => h.status === 'ACTIVE').length}</div>
                <p className="text-xs text-gray-600">Đang hoạt động</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Dung Lượng</CardTitle>
                <HardDrive className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatStorage(purchasedHostings.reduce((sum, h) => sum + h.storage, 0))}</div>
                <p className="text-xs text-gray-600">Tổng dung lượng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Giá Trị</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(purchasedHostings.reduce((sum, h) => sum + parseFloat(h.price), 0).toString())}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(purchasedHostings, (h) => parseFloat(h.price))} so với tháng trước
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards for Packages */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Gói Hosting</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hostings.length}</div>
                <p className="text-xs text-gray-600">
                  {calculateMonthOverMonthChange(hostings)} so với tháng trước
                </p>
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
        )}

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
                      <TableHead className="w-fit">Thao Tác</TableHead>
                      <TableHead>Tên Gói</TableHead>
                      <TableHead>Dung Lượng</TableHead>
                      <TableHead>Băng Thông</TableHead>
                      <TableHead>Addon Domain</TableHead>
                      <TableHead>Sub Domain</TableHead>
                      <TableHead>Tài Khoản FTP</TableHead>
                      <TableHead>Database</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Ngày Tạo</TableHead>
                      <TableHead>Ngày Cập Nhật</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHostings.map((hosting) => (
                      <TableRow key={hosting.id}>
                        <TableCell className="w-fit">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteHosting(hosting)} title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="w-8" onClick={() => handleEditHostingPackage(hosting)} title="Chỉnh sửa">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="w-8" onClick={() => handleViewHosting(hosting)} title="Xem chi tiết">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{hosting.planName}</span>
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
                        <TableCell>
                          <span className="text-sm">{hosting.addonDomain || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{hosting.subDomain || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{hosting.ftpAccounts || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{hosting.databases || '—'}</span>
                        </TableCell>
                        <TableCell>{formatCurrency(hosting.price)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(hosting.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(hosting.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(hosting.status)}</TableCell>
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
                      <TableHead className="w-fit">Thao Tác</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Gói Hosting</TableHead>
                      <TableHead>Dung Lượng</TableHead>
                      <TableHead>Băng Thông</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Ngày Đăng Ký</TableHead>
                      <TableHead>Ngày Hết Hạn</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchased.map((hosting) => {
                      const customerId = (hosting as any).customerId
                      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId, 10) : customerId
                      const customer = customers.find(c => c.id === customerIdNum)
                      return (
                        <TableRow key={hosting.id}>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteHosting(hosting)} title="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleEditHosting(hosting)} title="Chỉnh sửa">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="w-8" onClick={() => handleViewHosting(hosting)} title="Xem chi tiết">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium font-mono">{hosting.id}</div>
                          </TableCell>
                          <TableCell>
                            {hosting.planName || (hosting.hostingTypeId ? (
                              hostingPackages.find(pkg => String(pkg.id) === String(hosting.hostingTypeId))?.planName || '—'
                            ) : (
                              '—'
                            ))}
                          </TableCell>
                          <TableCell>{formatStorage(hosting.storage)}</TableCell>
                          <TableCell>{formatBandwidth(hosting.bandwidth)}</TableCell>
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
                          <TableCell>
                            {(hosting as any).ipAddress ? (
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">{(hosting as any).ipAddress}</code>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>{new Date(hosting.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{(hosting as any).expiryDate ? new Date((hosting as any).expiryDate as any).toLocaleDateString('vi-VN') : '—'}</TableCell>
                          <TableCell>{formatCurrency(hosting.price)}</TableCell>
                          <TableCell>{getStatusBadge(hosting.status)}</TableCell>
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>
                {selectedHosting && (selectedHosting as any).customerId 
                  ? 'Chi Tiết Gói Hosting Đã Đăng Ký'
                  : 'Chi Tiết Gói Hosting'}
              </DialogTitle>
              <DialogDescription>
                {selectedHosting && (selectedHosting as any).customerId
                  ? 'Thông tin chi tiết của gói hosting đã đăng ký cho khách hàng'
                  : 'Thông tin chi tiết của gói hosting'}
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
                  {(selectedHosting as any).customerId && (
                    <div>
                      <Label className="font-medium mb-2 block">IP Address</Label>
                      <div className="text-sm text-gray-600">
                        {(selectedHosting as any).ipAddress ? (
                          <code className="bg-gray-100 px-2 py-1 rounded">{(selectedHosting as any).ipAddress}</code>
                        ) : (
                          'Chưa có'
                        )}
                      </div>
                    </div>
                  )}
                  {!(selectedHosting as any).customerId && (
                    <div>
                      <Label className="font-medium mb-2 block">Trạng thái</Label>
                      <div>{getStatusBadge(selectedHosting.status)}</div>
                    </div>
                  )}
                </div>
                {(selectedHosting as any).customerId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Trạng thái</Label>
                      <div>{getStatusBadge(selectedHosting.status)}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Giá</Label>
                      <div className="text-sm text-gray-600">{formatCurrency(selectedHosting.price)}</div>
                    </div>
                  </div>
                )}
                {(selectedHosting as any).customerId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Domain</Label>
                      <div className="text-sm text-gray-600">{(selectedHosting as any).domain || '—'}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Vị trí máy chủ</Label>
                      <div className="text-sm text-gray-600">{(selectedHosting as any).serverLocation || '—'}</div>
                    </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Addon Domain</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.addonDomain || '—'}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Sub Domain</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.subDomain || '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Tài khoản FTP</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.ftpAccounts || '—'}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Database</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.databases || '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Loại hosting</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.hostingType || '—'}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Hệ điều hành</Label>
                    <div className="text-sm text-gray-600">{selectedHosting.operatingSystem || '—'}</div>
                  </div>
                </div>
                {!(selectedHosting as any).customerId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Giá</Label>
                      <div className="text-sm text-gray-600">{formatCurrency(selectedHosting.price)}</div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">ID</Label>
                      <div className="text-sm text-gray-600">{selectedHosting.id}</div>
                    </div>
                  </div>
                )}
                {(selectedHosting as any).customerId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-medium mb-2 block">Ngày đăng ký</Label>
                        <div className="text-sm text-gray-600">
                          {new Date(selectedHosting.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      <div>
                        <Label className="font-medium mb-2 block">Ngày hết hạn</Label>
                        <div className="text-sm text-gray-600">
                          {(selectedHosting as any).expiryDate 
                            ? new Date((selectedHosting as any).expiryDate).toLocaleDateString('vi-VN')
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-medium mb-2 block">Ngày cập nhật</Label>
                        <div className="text-sm text-gray-600">
                          {new Date(selectedHosting.updatedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {!(selectedHosting as any).customerId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Ngày tạo</Label>
                      <div className="text-sm text-gray-600">
                        {new Date(selectedHosting.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Ngày cập nhật</Label>
                      <div className="text-sm text-gray-600">
                        {new Date(selectedHosting.updatedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                )}
                {!(selectedHosting as any).customerId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 block">Vị trí máy chủ</Label>
                      <div className="text-sm text-gray-600">{(selectedHosting as any).serverLocation || '—'}</div>
                    </div>
                  </div>
                )}
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>
                {selectedHosting && (selectedHosting as any).customerId 
                  ? 'Chỉnh Sửa Gói Hosting Đã Đăng Ký'
                  : 'Chỉnh Sửa Gói Hosting'}
              </DialogTitle>
              <DialogDescription>
                {selectedHosting && (selectedHosting as any).customerId
                  ? 'Cập nhật thông tin gói hosting đã đăng ký cho khách hàng'
                  : 'Cập nhật thông tin gói hosting'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              {/* Only show fields for purchased hosting (has customerId) */}
              {selectedHosting && (selectedHosting as any).customerId && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      Gói Hosting <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <HostingPackageCombobox
                        packages={hostingPackages}
                        value={editHosting.hostingTypeId ? (typeof editHosting.hostingTypeId === 'string' ? parseInt(editHosting.hostingTypeId, 10) : editHosting.hostingTypeId) : null}
                        onValueChange={(val) => {
                          const hostingTypeId = val ? (typeof val === 'string' ? parseInt(val, 10) : val) : null
                          setEditHosting({ ...editHosting, hostingTypeId: hostingTypeId })
                        }}
                        placeholder="Chọn gói hosting"
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
                    <Label className="text-right">
                      Khách hàng <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <CustomerCombobox
                        customers={customers}
                        value={editHosting.customerId}
                        onValueChange={(val) => {
                          const customerIdNum = typeof val === 'number' ? val : val ? parseInt(String(val), 10) : null
                          setEditHosting({...editHosting, customerId: customerIdNum})
                        }}
                        placeholder="Chọn khách hàng"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-registrationDate" className="text-right">
                      Ngày đăng ký
                    </Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={editHosting.registrationDate}
                        onChange={(date) => setEditHosting({
                          ...editHosting,
                          registrationDate: date ?? undefined
                        })}
                        placeholder="Chọn ngày đăng ký"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-expiryDate" className="text-right">
                      Ngày hết hạn
                    </Label>
                    <div className="col-span-3">
                      <DatePicker
                        value={editHosting.expiryDate}
                        onChange={(date) => setEditHosting({
                          ...editHosting,
                          expiryDate: date ?? undefined
                        })}
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
                        value={(editHosting as any).ipAddress || ''}
                        onChange={(e) => setEditHosting({ ...editHosting, ipAddress: e.target.value } as any)}
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

        {/* Edit Hosting Package Dialog */}
        {activeTab === 'packages' && (
          <Dialog open={isEditHostingPackageDialogOpen} onOpenChange={setIsEditHostingPackageDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
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
                      Tên gói <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-planName" 
                        placeholder="Basic Hosting"
                        value={editHostingPackage.planName}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, planName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-storage" className="text-right">
                      Dung lượng (MB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-storage" 
                        type="text"
                        placeholder="Unlimited"
                        value={editHostingPackage.storage}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, storage: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bandwidth" className="text-right">
                      Băng thông (MB)
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-bandwidth" 
                        type="text"
                        placeholder="Unlimited"
                        value={editHostingPackage.bandwidth}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, bandwidth: e.target.value})}
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
                        value={editHostingPackage.price}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, price: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">
                      Trạng thái
                    </Label>
                    <div className="col-span-3">
                      <Select 
                        value={editHostingPackage.status} 
                        onValueChange={(value: 'ACTIVE' | 'INACTIVE') =>
                          setEditHostingPackage({...editHostingPackage, status: value})
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
                    <Label htmlFor="edit-serverLocation" className="text-right">
                      Vị trí máy chủ
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="edit-serverLocation" 
                        placeholder="Vietnam"
                        value={editHostingPackage.serverLocation}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, serverLocation: e.target.value})}
                      />
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
                        value={editHostingPackage.addonDomain}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, addonDomain: e.target.value})}
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
                        value={editHostingPackage.subDomain}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, subDomain: e.target.value})}
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
                        value={editHostingPackage.ftpAccounts}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, ftpAccounts: e.target.value})}
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
                        value={editHostingPackage.databases}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, databases: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-hostingType" className="text-right">
                      Loại Hosting
                    </Label>
                    <div className="col-span-3">
                      <Select 
                        value={editHostingPackage.hostingType} 
                        onValueChange={(value) =>
                          setEditHostingPackage({...editHostingPackage, hostingType: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại hosting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Shared Hosting">Shared Hosting</SelectItem>
                          <SelectItem value="VPS Hosting">VPS Hosting</SelectItem>
                          <SelectItem value="Dedicated Server">Dedicated Server</SelectItem>
                          <SelectItem value="Cloud Hosting">Cloud Hosting</SelectItem>
                          <SelectItem value="WordPress Hosting">WordPress Hosting</SelectItem>
                        </SelectContent>
                      </Select>
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
                        value={editHostingPackage.operatingSystem}
                        onChange={(e) => setEditHostingPackage({...editHostingPackage, operatingSystem: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsEditHostingPackageDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={updateHostingPackage} disabled={isUpdating}>
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
        )}

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