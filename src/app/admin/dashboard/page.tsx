'use client'

import { getBrandName } from '@/lib/utils'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { 
  Users, 
  ShoppingCart, 
  FileText, 
  Globe, 
  Server, 
  CreditCard, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react'

interface DashboardStats {
  totalCustomers: number
  monthlyOrders: number
  activeContracts: number
  monthlyRevenue: number
  domainCount: number
  hostingCount: number
  vpsCount: number
  recentOrders: any[]
  alerts: any[]
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    monthlyOrders: 0,
    activeContracts: 0,
    monthlyRevenue: 0,
    domainCount: 0,
    hostingCount: 0,
    vpsCount: 0,
    recentOrders: [],
    alerts: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const brandName = getBrandName()
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    // Only fetch data once when component first mounts
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchDashboardData()
    }
  }, [session, status, router])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data in parallel
      const [customersRes, ordersRes, contractsRes, domainRes, hostingRes, vpsRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/orders'),
        fetch('/api/contracts'),
        fetch('/api/domain'),
        fetch('/api/hosting?purchased=all'),
        fetch('/api/vps?purchased=all')
      ])

      const customersData = customersRes.ok ? await customersRes.json() : { data: [] }
      const ordersData = ordersRes.ok ? await ordersRes.json() : { data: [] }
      const contractsData = contractsRes.ok ? await contractsRes.json() : { data: [] }
      const domainData = domainRes.ok ? await domainRes.json() : { data: [] }
      const hostingData = hostingRes.ok ? await hostingRes.json() : { data: [] }
      const vpsData = vpsRes.ok ? await vpsRes.json() : { data: [] }

      const customers = customersData.data || []
      const orders = ordersData.data || []
      const contracts = contractsData.data || []
      const domain = domainData.data || []
      const hostings = hostingData.data || []
      const vpsList = vpsData.data || []

      // Calculate monthly stats
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      const monthlyOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= startOfMonth
      })

      const lastMonthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth
      })

      // Calculate monthly revenue
      const monthlyRevenue = monthlyOrders.reduce((sum: number, order: any) => {
        const amount = parseFloat(order.totalAmount) || 0
        return sum + amount
      }, 0)

      // Active contracts
      const activeContracts = contracts.filter((c: any) => c.status === 'ACTIVE')

      // Get recent orders (latest 5)
      const recentOrders = orders.slice(0, 5).map((order: any) => ({
        id: order.orderNumber || `ORD-${order.id}`,
        customer: order.customerName || 'Khách hàng',
        amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(order.totalAmount) || 0),
        status: order.status?.toLowerCase() || 'pending'
      }))

      // Calculate alerts (expiring soon)
      const alerts = []
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      // Check expiring domain
      const expiringdomain = domain.filter((d: any) => {
        if (!d.expiryDate) return false
        const expiryDate = new Date(d.expiryDate)
        return expiryDate <= thirtyDaysFromNow && expiryDate >= now && d.status === 'ACTIVE'
      })
      if (expiringdomain.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${expiringdomain.length} tên miền sắp hết hạn`,
          description: 'Cần gia hạn trong 30 ngày tới'
        })
      }

      // Check expired domain
      const expireddomain = domain.filter((d: any) => {
        if (!d.expiryDate) return false
        const expiryDate = new Date(d.expiryDate)
        return expiryDate < now && d.status === 'ACTIVE'
      })
      if (expireddomain.length > 0) {
        alerts.push({
          type: 'error',
          message: `${expireddomain.length} tên miền đã hết hạn`,
          description: 'Cần xử lý ngay'
        })
      }

      // Check expired hosting
      const expiredHosting = hostings.filter((h: any) => {
        if (!h.expiryDate) return false
        const expiryDate = new Date(h.expiryDate)
        return expiryDate < now && h.status === 'ACTIVE'
      })
      if (expiredHosting.length > 0) {
        alerts.push({
          type: 'error',
          message: `${expiredHosting.length} hosting đã hết hạn`,
          description: 'Cần xử lý ngay'
        })
      }

      // Check pending payment orders
      const pendingPaymentOrders = orders.filter((o: any) => 
        o.status === 'PENDING' || (o.status === 'CONFIRMED' && o.paymentStatus === 'PENDING')
      )
      if (pendingPaymentOrders.length > 0) {
        alerts.push({
          type: 'info',
          message: `${pendingPaymentOrders.length} đơn hàng chờ thanh toán`,
          description: 'Cần theo dõi'
        })
      }

      // Calculate percentage changes (simple comparison)
      const ordersChange = lastMonthOrders.length > 0 
        ? Math.round(((monthlyOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100)
        : monthlyOrders.length > 0 ? 100 : 0

      setStats({
        totalCustomers: customers.length,
        monthlyOrders: monthlyOrders.length,
        activeContracts: activeContracts.length,
        monthlyRevenue,
        domainCount: domain.filter((d: any) => d.customerId).length, // Only purchased domain
        hostingCount: hostings.length,
        vpsCount: vpsList.length,
        recentOrders,
        alerts
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  const statsCards = [
    {
      title: 'Tổng Khách Hàng',
      value: stats.totalCustomers.toLocaleString('vi-VN'),
      change: '+0%', // Can calculate from previous month if needed
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      title: 'Đơn Hàng Tháng',
      value: stats.monthlyOrders.toString(),
      change: '+0%', // Will calculate from last month data if available
      changeType: 'positive' as const,
      icon: ShoppingCart,
    },
    {
      title: 'Hợp Đồng Hoạt Động',
      value: stats.activeContracts.toString(),
      change: '+0%',
      changeType: 'positive' as const,
      icon: FileText,
    },
    {
      title: 'Doanh Thu Tháng',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue),
      change: '+0%',
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
  ]

  const services = [
    {
      title: 'Tên Miền',
      count: stats.domainCount,
      icon: Globe,
      color: 'bg-primary',
    },
    {
      title: 'Hosting',
      count: stats.hostingCount,
      icon: Server,
      color: 'bg-primary',
    },
    {
      title: 'VPS',
      count: stats.vpsCount,
      icon: Server,
      color: 'bg-primary',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-gray-600 mt-1">Tổng quan hệ thống {brandName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-600">
                  <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  {' '}so với tháng trước
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span>Cảnh Báo & Thông Báo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.alerts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Không có cảnh báo nào</p>
              ) : (
                stats.alerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center space-x-3 p-3 rounded-md ${
                      alert.type === 'error' ? 'bg-red-50' :
                      alert.type === 'warning' ? 'bg-orange-50' :
                      'bg-blue-50'
                    }`}
                  >
                    <AlertCircle 
                      className={`h-4 w-4 ${
                        alert.type === 'error' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-orange-500' :
                        'text-blue-500'
                      }`} 
                    />
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-600">{alert.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Dịch Vụ</CardTitle>
              <CardDescription>Tổng quan các dịch vụ đang cung cấp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <div key={service.title} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-md ${service.color}`}>
                    <service.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{service.title}</p>
                    <p className="text-xs text-gray-600">{service.count} dịch vụ</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Đơn Hàng Gần Đây</CardTitle>
              <CardDescription>Các đơn hàng mới nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Chưa có đơn hàng nào</p>
                ) : (
                  stats.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{order.id}</p>
                        <p className="text-xs text-gray-600">{order.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{order.amount}</p>
                        <Badge
                          variant={order.status === 'completed' || order.status === 'COMPLETED' ? 'default' :
                                  order.status === 'confirmed' || order.status === 'CONFIRMED' ? 'secondary' : 'outline'}
                        >
                          {order.status === 'pending' || order.status === 'PENDING' ? 'Chờ xử lý' :
                           order.status === 'confirmed' || order.status === 'CONFIRMED' ? 'Đã xác nhận' :
                           order.status === 'completed' || order.status === 'COMPLETED' ? 'Hoàn thành' : 
                           order.status === 'cancelled' || order.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xử lý'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thao Tác Nhanh</CardTitle>
              <CardDescription>Các chức năng thường dùng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button 
                onClick={() => router.push('/admin/customers')}
                className="w-full text-left p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Thêm khách hàng mới</span>
                </div>
              </button>
              <button 
                onClick={() => router.push('/admin/orders')}
                className="w-full text-left p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Quản lý đơn hàng</span>
                </div>
              </button>
              <button 
                onClick={() => router.push('/admin/contracts')}
                className="w-full text-left p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Quản lý hợp đồng</span>
                </div>
              </button>
              <button 
                onClick={() => router.push('/admin/websites')}
                className="w-full text-left p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Quản lý websites</span>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}