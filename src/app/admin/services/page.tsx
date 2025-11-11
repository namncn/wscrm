'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Plus, Search, Globe, Server, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

interface Domain {
  id: string
  domainName: string
  registrar: string | null
  registrationDate: string | null
  expiryDate: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  price: number | null
  customerId: string | null
  createdAt: string
  updatedAt: string
}

interface Hosting {
  id: string
  planName: string
  domain: string | null
  storage: number
  bandwidth: number
  price: number
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  customerId: string | null
  expiryDate: string | null
  serverLocation: string | null
  createdAt: string
  updatedAt: string
}

interface VPS {
  id: string
  planName: string
  ipAddress: string | null
  cpu: number
  ram: number
  storage: number
  bandwidth: number
  price: number
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  customerId: string | null
  expiryDate: string | null
  os: string | null
  createdAt: string
  updatedAt: string
}

interface Customer {
  id: string
  name: string
  email: string
}

export default function ServicesPage() {
  const [domain, setdomain] = useState<Domain[]>([])
  const [hostings, setHostings] = useState<Hosting[]>([])
  const [vps, setVps] = useState<VPS[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [serviceType, setServiceType] = useState<'domain' | 'hosting' | 'vps'>('domain')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [domainRes, hostingsRes, vpsRes, customersRes] = await Promise.all([
        fetch('/api/domain'),
        fetch('/api/hosting'),
        fetch('/api/vps'),
        fetch('/api/customers')
      ])

      if (domainRes.ok) {
        const domainData = await domainRes.json()
        setdomain(domainData)
      }

      if (hostingsRes.ok) {
        const hostingsData = await hostingsRes.json()
        setHostings(hostingsData)
      }

      if (vpsRes.ok) {
        const vpsData = await vpsRes.json()
        setVps(vpsData)
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toastError('Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Hết hạn</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm khóa</Badge>
      case 'INACTIVE':
        return <Badge variant="secondary">Không hoạt động</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Chưa có'
    return new Date(date).toLocaleDateString('vi-VN')
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    return expiry < now
  }

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Chưa có'
    const customer = customers.find(c => c.id === customerId)
    return customer ? customer.name : 'Unknown'
  }

  const filtereddomain = domain.filter(domain =>
    domain.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(domain.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredHostings = hostings.filter(hosting =>
    hosting.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hosting.domain && hosting.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getCustomerName(hosting.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredVps = vps.filter(vpsItem =>
    vpsItem.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vpsItem.ipAddress && vpsItem.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getCustomerName(vpsItem.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalExpiringSoon = [
    ...domain.filter(d => isExpiringSoon(d.expiryDate)),
    ...hostings.filter(h => isExpiringSoon(h.expiryDate)),
    ...vps.filter(v => isExpiringSoon(v.expiryDate))
  ].length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Quản Lý Dịch Vụ</h1>
            <p className="text-gray-600 mt-1">Quản lý Tên miền, Hosting và VPS</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Thêm Dịch Vụ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Thêm Dịch Vụ Mới</DialogTitle>
                <DialogDescription>
                  Thêm dịch vụ mới cho khách hàng
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceType" className="text-right">
                    Loại dịch vụ
                  </Label>
                  <div className="col-span-3">
                    <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại dịch vụ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domain">Tên miền</SelectItem>
                        <SelectItem value="hosting">Hosting</SelectItem>
                        <SelectItem value="vps">VPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customer" className="text-right">
                    Khách hàng
                  </Label>
                  <div className="col-span-3">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khách hàng" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {serviceType === 'domain' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="domainName" className="text-right">
                      Tên miền
                    </Label>
                    <div className="col-span-3">
                      <Input id="domainName" placeholder="example.com" />
                    </div>
                  </div>
                )}
                {serviceType === 'hosting' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="domain" className="text-right">
                        Domain
                      </Label>
                      <div className="col-span-3">
                        <Input id="domain" placeholder="example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="plan" className="text-right">
                        Gói hosting
                      </Label>
                      <div className="col-span-3">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn gói hosting" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Hosting Basic</SelectItem>
                            <SelectItem value="premium">Hosting Premium</SelectItem>
                            <SelectItem value="enterprise">Hosting Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                {serviceType === 'vps' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="vpsName" className="text-right">
                        Tên VPS
                      </Label>
                      <div className="col-span-3">
                        <Input id="vpsName" placeholder="VPS-001" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="specs" className="text-right">
                        Cấu hình
                      </Label>
                      <div className="col-span-3">
                        <Input id="specs" placeholder="2 CPU, 4GB RAM, 50GB SSD" />
                      </div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expiryDate" className="text-right">
                    Ngày hết hạn
                  </Label>
                  <div className="col-span-3">
                    <Input id="expiryDate" type="date" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Thêm Dịch Vụ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Tên Miền</CardTitle>
              <Globe className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{domain.length}</div>
              <p className="text-xs text-gray-600">
                {domain.filter(d => d.status === 'ACTIVE').length} hoạt động
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Hosting</CardTitle>
              <Server className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostings.length}</div>
              <p className="text-xs text-gray-600">
                {hostings.filter(h => h.status === 'ACTIVE').length} hoạt động
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng VPS</CardTitle>
              <Server className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vps.length}</div>
              <p className="text-xs text-gray-600">
                {vps.filter(v => v.status === 'ACTIVE').length} hoạt động
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sắp Hết Hạn</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExpiringSoon}</div>
              <p className="text-xs text-gray-600">Trong 30 ngày tới</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Tabs */}
        <Tabs defaultValue="domain" className="space-y-4">
          <TabsList>
            <TabsTrigger value="domain">Tên Miền</TabsTrigger>
            <TabsTrigger value="hosting">Hosting</TabsTrigger>
            <TabsTrigger value="vps">VPS</TabsTrigger>
          </TabsList>

          {/* domain Tab */}
          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách Tên Miền</CardTitle>
                <CardDescription>
                  Quản lý tất cả tên miền của khách hàng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm tên miền..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Đang tải...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên Miền</TableHead>
                        <TableHead>Khách Hàng</TableHead>
                        <TableHead>Nhà Đăng Ký</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Ngày Hết Hạn</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtereddomain.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell className="font-medium">{domain.domainName}</TableCell>
                          <TableCell>{getCustomerName(domain.customerId)}</TableCell>
                          <TableCell>{domain.registrar || 'Chưa có'}</TableCell>
                          <TableCell>{getStatusBadge(domain.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{formatDate(domain.expiryDate)}</span>
                              {isExpiringSoon(domain.expiryDate) && (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                              {isExpired(domain.expiryDate) && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {domain.price ? new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(domain.price) : 'Chưa có'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
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
          </TabsContent>

          {/* Hosting Tab */}
          <TabsContent value="hosting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách Hosting</CardTitle>
                <CardDescription>
                  Quản lý tất cả hosting của khách hàng
                </CardDescription>
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
                        <TableHead>Domain</TableHead>
                        <TableHead>Khách Hàng</TableHead>
                        <TableHead>Cấu Hình</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Ngày Hết Hạn</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHostings.map((hosting) => (
                        <TableRow key={hosting.id}>
                          <TableCell className="font-medium">{hosting.planName}</TableCell>
                          <TableCell>{hosting.domain || 'Chưa có'}</TableCell>
                          <TableCell>{getCustomerName(hosting.customerId)}</TableCell>
                          <TableCell>
                            {hosting.storage}GB / {hosting.bandwidth}GB
                          </TableCell>
                          <TableCell>{getStatusBadge(hosting.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{formatDate(hosting.expiryDate)}</span>
                              {isExpiringSoon(hosting.expiryDate) && (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(hosting.price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
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
          </TabsContent>

          {/* VPS Tab */}
          <TabsContent value="vps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh Sách VPS</CardTitle>
                <CardDescription>
                  Quản lý tất cả VPS của khách hàng
                </CardDescription>
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
                        <TableHead>Khách Hàng</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Cấu Hình</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Ngày Hết Hạn</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVps.map((vpsItem) => (
                        <TableRow key={vpsItem.id}>
                          <TableCell className="font-medium">{vpsItem.planName}</TableCell>
                          <TableCell>{getCustomerName(vpsItem.customerId)}</TableCell>
                          <TableCell>{vpsItem.ipAddress || 'Chưa có'}</TableCell>
                          <TableCell>
                            {vpsItem.cpu} CPU / {vpsItem.ram}GB RAM / {vpsItem.storage}GB SSD
                          </TableCell>
                          <TableCell>{getStatusBadge(vpsItem.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{formatDate(vpsItem.expiryDate)}</span>
                              {isExpiringSoon(vpsItem.expiryDate) && (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(vpsItem.price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}