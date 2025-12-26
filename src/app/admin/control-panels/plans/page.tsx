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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Server,
  Network
} from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import Link from 'next/link'

interface ControlPanel {
  id: number
  type: 'ENHANCE' | 'CPANEL' | 'PLESK' | 'DIRECTADMIN'
  enabled: 'YES' | 'NO'
  config: any
  createdAt: string
  updatedAt: string
}

interface HostingPackage {
  id: number
  planName: string
  storage: number
  bandwidth: number
  price: number | string
}

interface VpsPackage {
  id: number
  planName: string
  cpu: number
  ram: number
  storage: number
  bandwidth: number
  price: number | string
}

interface PlanMapping {
  id: number
  controlPanelId: number
  localPlanType: 'HOSTING' | 'VPS'
  localPlanId: number
  externalPlanId: string
  externalPlanName?: string | null
  isActive: 'YES' | 'NO'
  mappingConfig?: any
  createdAt: string
  updatedAt: string
}

export default function PlanMappingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [planMappings, setPlanMappings] = useState<PlanMapping[]>([])
  const [controlPanels, setControlPanels] = useState<ControlPanel[]>([])
  const [hostingPackages, setHostingPackages] = useState<HostingPackage[]>([])
  const [vpsPackages, setVpsPackages] = useState<VpsPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterControlPanel, setFilterControlPanel] = useState<string>('all')
  const [filterPlanType, setFilterPlanType] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<PlanMapping | null>(null)
  const [deletingMapping, setDeletingMapping] = useState<PlanMapping | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [enhancePlans, setEnhancePlans] = useState<Array<{ id: string | number; name: string }>>([])
  const [loadingEnhancePlans, setLoadingEnhancePlans] = useState(false)

  const [formData, setFormData] = useState({
    controlPanelId: '',
    localPlanType: 'HOSTING' as 'HOSTING' | 'VPS',
    localPlanId: '',
    externalPlanId: '',
    externalPlanName: '',
    isActive: true,
    mappingConfig: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    // Check if user is ADMIN
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }
    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchControlPanels(),
        fetchHostingPackages(),
        fetchVpsPackages(),
        fetchPlanMappings(),
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchControlPanels = async () => {
    try {
      const response = await fetch('/api/control-panels')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setControlPanels(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching control panels:', error)
    }
  }

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
            price: pkg.price,
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching hosting packages:', error)
    }
  }

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
            price: pkg.price,
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching VPS packages:', error)
    }
  }

  const fetchPlanMappings = async () => {
    try {
      let url = '/api/control-panels/plans'
      const params = new URLSearchParams()
      if (filterControlPanel !== 'all') {
        params.append('controlPanelId', filterControlPanel)
      }
      if (filterPlanType !== 'all') {
        params.append('localPlanType', filterPlanType)
      }
      if (params.toString()) {
        url += '?' + params.toString()
      }

      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setPlanMappings(result.data)
        } else {
          setPlanMappings([])
        }
      } else {
        setPlanMappings([])
      }
    } catch (error) {
      console.error('Error fetching plan mappings:', error)
      toastError('Có lỗi xảy ra khi tải danh sách plan mappings')
      setPlanMappings([])
    }
  }

  useEffect(() => {
    if (session) {
      fetchPlanMappings()
    }
  }, [filterControlPanel, filterPlanType, session])

  const handleCreate = async () => {
    try {
      setIsSubmitting(true)

      if (!formData.controlPanelId || !formData.localPlanId || !formData.externalPlanId) {
        toastError('Vui lòng điền đầy đủ thông tin bắt buộc')
        return
      }

      // Validate mappingConfig JSON
      let parsedConfig = null
      if (formData.mappingConfig) {
        try {
          parsedConfig = JSON.parse(formData.mappingConfig)
        } catch (e) {
          toastError('Mapping Config phải là JSON hợp lệ')
          return
        }
      }

      const response = await fetch('/api/control-panels/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mappingConfig: parsedConfig,
          isActive: formData.isActive ? 'YES' : 'NO',
        }),
      })

      if (response.ok) {
        toastSuccess('Tạo plan mapping thành công!')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchPlanMappings()
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể tạo plan mapping')
      }
    } catch (error) {
      console.error('Error creating plan mapping:', error)
      toastError('Có lỗi xảy ra khi tạo plan mapping')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (mapping: PlanMapping) => {
    setEditingMapping(mapping)
    setFormData({
      controlPanelId: mapping.controlPanelId.toString(),
      localPlanType: mapping.localPlanType,
      localPlanId: mapping.localPlanId.toString(),
      externalPlanId: mapping.externalPlanId,
      externalPlanName: mapping.externalPlanName || '',
      isActive: mapping.isActive === 'YES',
      mappingConfig: mapping.mappingConfig ? JSON.stringify(mapping.mappingConfig, null, 2) : '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingMapping) return

    try {
      setIsSubmitting(true)

      // Validate mappingConfig JSON
      let parsedConfig = null
      if (formData.mappingConfig) {
        try {
          parsedConfig = JSON.parse(formData.mappingConfig)
        } catch (e) {
          toastError('Mapping Config phải là JSON hợp lệ')
          return
        }
      }

      const response = await fetch('/api/control-panels/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMapping.id,
          externalPlanId: formData.externalPlanId,
          externalPlanName: formData.externalPlanName,
          isActive: formData.isActive ? 'YES' : 'NO',
          mappingConfig: parsedConfig,
        }),
      })

      if (response.ok) {
        toastSuccess('Cập nhật plan mapping thành công!')
        setIsEditDialogOpen(false)
        setEditingMapping(null)
        resetForm()
        fetchPlanMappings()
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể cập nhật plan mapping')
      }
    } catch (error) {
      console.error('Error updating plan mapping:', error)
      toastError('Có lỗi xảy ra khi cập nhật plan mapping')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (mapping: PlanMapping) => {
    setDeletingMapping(mapping)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingMapping) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/control-panels/plans?id=${deletingMapping.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toastSuccess('Xóa plan mapping thành công!')
        setIsDeleteDialogOpen(false)
        setDeletingMapping(null)
        fetchPlanMappings()
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể xóa plan mapping')
      }
    } catch (error) {
      console.error('Error deleting plan mapping:', error)
      toastError('Có lỗi xảy ra khi xóa plan mapping')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      controlPanelId: '',
      localPlanType: 'HOSTING',
      localPlanId: '',
      externalPlanId: '',
      externalPlanName: '',
      isActive: true,
      mappingConfig: '',
    })
    setEnhancePlans([])
  }

  const fetchEnhancePlans = async (controlPanelId?: string) => {
    const cpId = controlPanelId || formData.controlPanelId
    const selectedControlPanel = controlPanels.find(cp => cp.id.toString() === cpId)
    if (!selectedControlPanel || selectedControlPanel.type !== 'ENHANCE') {
      setEnhancePlans([])
      return
    }

    setLoadingEnhancePlans(true)
    try {
      const response = await fetch('/api/control-panels/enhance/plans', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        const plans = Array.isArray(data.data) ? data.data : []
        
        const mappedPlans = plans.map((plan: any) => {
          const planId = plan.id || plan.planId || plan.plan_id
          const planName = plan.name || plan.planName || plan.plan_name || plan.title || `Plan ${planId}`
          return {
            id: planId ? String(planId) : String(plan.id || ''),
            name: planName,
          }
        })
        
        setEnhancePlans(mappedPlans)
        
        if (plans.length === 0) {
          toastError('Không tìm thấy plan nào từ Enhance API')
        } else {
          toastSuccess(`Đã tải ${plans.length} plan(s) từ Enhance API`)
        }
      } else {
        setEnhancePlans([])
        toastError('Không thể tải danh sách plans từ Enhance API: ' + (data.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error fetching Enhance plans:', error)
      setEnhancePlans([])
      toastError('Có lỗi xảy ra khi tải plans: ' + error.message)
    } finally {
      setLoadingEnhancePlans(false)
    }
  }

  const handleControlPanelChange = (value: string) => {
    setFormData({ ...formData, controlPanelId: value, externalPlanId: '', externalPlanName: '' })
    // Load Enhance plans if Enhance is selected
    if (value) {
      const selectedControlPanel = controlPanels.find(cp => cp.id.toString() === value)
      if (selectedControlPanel?.type === 'ENHANCE') {
        // Fetch plans immediately with the new control panel ID
        fetchEnhancePlans(value)
      } else {
        setEnhancePlans([])
      }
    } else {
      setEnhancePlans([])
    }
  }

  const getControlPanelTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      'ENHANCE': 'Enhance',
      'CPANEL': 'cPanel',
      'PLESK': 'Plesk',
      'DIRECTADMIN': 'DirectAdmin'
    }
    return typeNames[type] || type
  }

  const getControlPanelName = (id: number) => {
    const cp = controlPanels.find(cp => cp.id === id)
    if (!cp) return `ID: ${id}`
    return getControlPanelTypeName(cp.type)
  }

  const getLocalPlanName = (type: 'HOSTING' | 'VPS', id: number) => {
    if (type === 'HOSTING') {
      const pkg = hostingPackages.find(p => p.id === id)
      return pkg?.planName || `ID: ${id}`
    } else {
      const pkg = vpsPackages.find(p => p.id === id)
      return pkg?.planName || `ID: ${id}`
    }
  }

  const filteredMappings = planMappings.filter(mapping => {
    const matchesSearch = 
      getControlPanelName(mapping.controlPanelId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLocalPlanName(mapping.localPlanType, mapping.localPlanId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.externalPlanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mapping.externalPlanName || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/control-panels">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Plan Mappings</h1>
              <p className="text-muted-foreground">Quản lý mapping giữa local plans và control panel plans</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Thêm Plan Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Thêm Plan Mapping</DialogTitle>
                <DialogDescription>
                  Tạo mapping giữa local plan và control panel plan
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-controlPanel" className="text-right whitespace-nowrap col-span-2">
                      Control Panel <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.controlPanelId}
                        onValueChange={handleControlPanelChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn control panel" />
                        </SelectTrigger>
                        <SelectContent>
                          {controlPanels
                            .filter(cp => cp.enabled === 'YES')
                            .map((cp) => (
                              <SelectItem key={cp.id} value={cp.id.toString()}>
                                {getControlPanelTypeName(cp.type)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-planType" className="text-right whitespace-nowrap col-span-2">
                      Loại Plan <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.localPlanType}
                        onValueChange={(value: 'HOSTING' | 'VPS') => {
                          setFormData({ ...formData, localPlanType: value, localPlanId: '' })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOSTING">Hosting</SelectItem>
                          <SelectItem value="VPS">VPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-localPlan" className="text-right whitespace-nowrap col-span-2">
                      Local Plan <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.localPlanId}
                        onValueChange={(value) => setFormData({ ...formData, localPlanId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.localPlanType === 'HOSTING'
                            ? hostingPackages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                  {pkg.planName}
                                </SelectItem>
                              ))
                            : vpsPackages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                  {pkg.planName}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-externalPlanId" className="text-right whitespace-nowrap col-span-2">
                      External Plan ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="col-span-3">
                      {(() => {
                        const selectedControlPanel = controlPanels.find(cp => cp.id.toString() === formData.controlPanelId)
                        const isEnhance = selectedControlPanel?.type === 'ENHANCE'
                        
                        if (isEnhance) {
                          return (
                            <Select
                              value={formData.externalPlanId || undefined}
                              onValueChange={(value) => {
                                const selectedPlan = enhancePlans.find(p => String(p.id) === value)
                                setFormData({ 
                                  ...formData, 
                                  externalPlanId: value,
                                  externalPlanName: selectedPlan?.name || ''
                                })
                              }}
                              disabled={loadingEnhancePlans || enhancePlans.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingEnhancePlans ? "Đang tải..." : enhancePlans.length === 0 ? "Chọn Control Panel trước" : "Chọn plan từ Enhance"} />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingEnhancePlans ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    Đang tải plans...
                                  </div>
                                ) : enhancePlans.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    Không có plan nào. Vui lòng chọn Control Panel trước.
                                  </div>
                                ) : (
                                  enhancePlans.map((plan) => (
                                    <SelectItem key={String(plan.id)} value={String(plan.id)}>
                                      {plan.name} (ID: {plan.id})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )
                        } else {
                          return (
                            <Input
                              id="create-externalPlanId"
                              value={formData.externalPlanId}
                              onChange={(e) => setFormData({ ...formData, externalPlanId: e.target.value })}
                              placeholder="plan_123"
                            />
                          )
                        }
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-externalPlanName" className="text-right whitespace-nowrap col-span-2">
                      External Plan Name
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="create-externalPlanName"
                        value={formData.externalPlanName}
                        onChange={(e) => setFormData({ ...formData, externalPlanName: e.target.value })}
                        placeholder="Basic Hosting Plan"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="create-isActive" className="text-right whitespace-nowrap col-span-2">
                      Trạng thái
                    </Label>
                    <div className="col-span-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="create-isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="create-isActive" className="font-normal cursor-pointer">
                          Kích hoạt
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 items-start gap-4">
                    <Label htmlFor="create-mappingConfig" className="text-right pt-2 whitespace-nowrap col-span-2">
                      Mapping Config (JSON)
                    </Label>
                    <div className="col-span-3">
                      <Textarea
                        id="create-mappingConfig"
                        value={formData.mappingConfig}
                        onChange={(e) => setFormData({ ...formData, mappingConfig: e.target.value })}
                        rows={4}
                        className="font-mono text-sm"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pt-4 pb-6 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Thêm Mapping
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Danh sách Plan Mappings</CardTitle>
                <CardDescription>
                  Mapping giữa local plans (Hosting/VPS) và external plans trên control panels
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={filterControlPanel} onValueChange={setFilterControlPanel}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tất cả Control Panels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả Control Panels</SelectItem>
                    {controlPanels
                      .filter(cp => cp.enabled === 'YES')
                      .map((cp) => (
                        <SelectItem key={cp.id} value={cp.id.toString()}>
                          {getControlPanelTypeName(cp.type)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={filterPlanType} onValueChange={setFilterPlanType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="HOSTING">Hosting</SelectItem>
                    <SelectItem value="VPS">VPS</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchPlanMappings}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || filterControlPanel !== 'all' || filterPlanType !== 'all'
                  ? 'Không tìm thấy plan mapping nào'
                  : 'Chưa có plan mapping nào'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-fit">Thao tác</TableHead>
                    <TableHead>Control Panel</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Local Plan</TableHead>
                    <TableHead>External Plan ID</TableHead>
                    <TableHead>External Plan Name</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="w-fit">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(mapping)}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8"
                            onClick={() => handleEdit(mapping)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getControlPanelName(mapping.controlPanelId)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={mapping.localPlanType === 'HOSTING' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                          {mapping.localPlanType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getLocalPlanName(mapping.localPlanType, mapping.localPlanId)}</div>
                        <div className="text-sm text-muted-foreground">ID: {mapping.localPlanId}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{mapping.externalPlanId}</code>
                      </TableCell>
                      <TableCell>{mapping.externalPlanName || '-'}</TableCell>
                      <TableCell>
                        {mapping.isActive === 'YES' ? (
                          <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
                        ) : (
                          <Badge variant="outline">Không hoạt động</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh sửa Plan Mapping</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin plan mapping
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-controlPanel" className="text-right">
                    Control Panel
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-controlPanel"
                      value={getControlPanelName(parseInt(formData.controlPanelId))}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-planType" className="text-right">
                    Loại Plan
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-planType"
                      value={formData.localPlanType}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-localPlan" className="text-right">
                    Local Plan
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-localPlan"
                      value={getLocalPlanName(formData.localPlanType, parseInt(formData.localPlanId))}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-externalPlanId" className="text-right">
                    External Plan ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-externalPlanId"
                      value={formData.externalPlanId}
                      onChange={(e) => setFormData({ ...formData, externalPlanId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-externalPlanName" className="text-right">
                    External Plan Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="edit-externalPlanName"
                      value={formData.externalPlanName}
                      onChange={(e) => setFormData({ ...formData, externalPlanName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-isActive" className="text-right">
                    Trạng thái
                  </Label>
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="edit-isActive" className="font-normal cursor-pointer">
                        Kích hoạt
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-mappingConfig" className="text-right pt-2">
                    Mapping Config (JSON)
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="edit-mappingConfig"
                      value={formData.mappingConfig}
                      onChange={(e) => setFormData({ ...formData, mappingConfig: e.target.value })}
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    Cập nhật
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa plan mapping này?
                <br />
                <strong>
                  {deletingMapping && `${getControlPanelName(deletingMapping.controlPanelId)} - ${getLocalPlanName(deletingMapping.localPlanType, deletingMapping.localPlanId)} → ${deletingMapping.externalPlanId}`}
                </strong>
                <br />
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setDeletingMapping(null)
                }}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

