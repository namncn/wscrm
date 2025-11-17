'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Server, 
  ShoppingCart, 
  CheckCircle,
  Loader2,
  Cpu,
  HardDrive,
  Wifi,
  Monitor
} from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface VpsProduct {
  id: string
  name: string
  price: number
  description: string
  specs: {
    cpu: string
    ram: string
    storage: string
    bandwidth: string
    os: string
  }
  popular?: boolean
}

export default function VpsPage() {
  const { data: session, status } = useSession()
  // VPS page is public - no authentication required
  const [isLoading, setIsLoading] = useState(false)
  const [vpsProducts, setVpsProducts] = useState<VpsProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  // Fetch VPS products from API (public access)
  useEffect(() => {
    const fetchVpsProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const response = await fetch('/api/vps-packages')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const products: VpsProduct[] = result.data.map((vps: any) => ({
              id: vps.id,
              name: vps.planName,
              price: parseFloat(vps.price) || 0,
              description: vps.description || `VPS ${vps.planName}`,
              specs: {
                cpu: vps.cpu || 'Unlimited',
                ram: `${vps.ram}GB RAM`,
                storage: `${vps.storage}GB SSD`,
                bandwidth: `${vps.bandwidth}GB/tháng`,
                os: vps.os || 'Ubuntu 20.04'
              },
              popular: vps.status === 'ACTIVE'
            }))
            setVpsProducts(products)
          }
        }
      } catch (error) {
        console.error('Error fetching VPS products:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchVpsProducts()
  }, [])

  if (isLoadingProducts) {
    return (
      <MemberLayout title="VPS">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MemberLayout>
    )
  }

  const handlePurchase = async (vps: VpsProduct) => {
    setIsLoading(true)
    try {
      const cartData = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serviceId: vps.id,
        serviceType: 'VPS',
        serviceName: vps.name,
        quantity: 1,
        price: vps.price.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // If user is logged in, use API
      if (status === 'authenticated' && session?.user) {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId: vps.id,
            serviceType: 'VPS',
            serviceName: vps.name,
            quantity: 1,
            price: vps.price
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Không thể thêm vào giỏ hàng')
        }

        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new Event('cartUpdated'))

        toastSuccess('Đã thêm vào giỏ hàng! Chuyển đến trang giỏ hàng.')
        window.location.href = '/cart'
      } else {
        // If not logged in, use localStorage
        const existingCart = localStorage.getItem('cart')
        const cartItems = existingCart ? JSON.parse(existingCart) : []
        
        // Check if item already exists
        const existingIndex = cartItems.findIndex(
          (item: any) => item.serviceId === vps.id && item.serviceType === 'VPS'
        )
        
        if (existingIndex >= 0) {
          cartItems[existingIndex].quantity += 1
          cartItems[existingIndex].updatedAt = new Date().toISOString()
        } else {
          cartItems.push(cartData)
        }
        
        localStorage.setItem('cart', JSON.stringify(cartItems))
        
        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new Event('cartUpdated'))
        
        toastSuccess('Đã thêm vào giỏ hàng! Chuyển đến trang giỏ hàng.')
        window.location.href = '/cart'
      }
    } catch (error: any) {
      toastError(`Lỗi: ${error.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng'}`)
      console.error('Error adding to cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <MemberLayout title="VPS">
      <div className="bg-slate-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-700 via-indigo-500 to-slate-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Máy Chủ Ảo VPS
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-indigo-100">
                VPS mạnh mẽ với root access, phù hợp cho doanh nghiệp và ứng dụng lớn
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* VPS Products */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Chọn gói VPS phù hợp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {vpsProducts.map((vps) => (
                <Card key={vps.id} className="relative hover:shadow-lg transition-shadow">
                  {vps.popular && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-sky-500 text-white">Phổ biến</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500/80 shadow-sm">
                        <Server className="h-5 w-5 text-white" />
                      </div>
                      <span>{vps.name}</span>
                    </CardTitle>
                    <CardDescription>{vps.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-sky-600 to-slate-700 bg-clip-text text-transparent">
                        {formatCurrency(vps.price)}
                      </div>
                      <div className="text-sm text-gray-500">/ tháng</div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Cpu className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm text-gray-600">{vps.specs.cpu}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4 text-sky-500" />
                          <span className="text-sm text-gray-600">{vps.specs.ram}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <HardDrive className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-gray-600">{vps.specs.storage}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Wifi className="h-4 w-4 text-teal-500" />
                          <span className="text-sm text-gray-600">{vps.specs.bandwidth}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm text-gray-600">{vps.specs.os}</span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-slate-700 text-white shadow-md hover:shadow-lg transition-all duration-300" 
                        onClick={() => handlePurchase(vps)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Đăng ký ngay
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-2xl font-bold text-center mb-8">
              Tính năng VPS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Server className="h-8 w-8 text-indigo-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Root Access</h4>
                <p className="text-gray-600">Quyền truy cập root để tùy chỉnh hoàn toàn máy chủ</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                  <Cpu className="h-8 w-8 text-sky-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Hiệu suất cao</h4>
                <p className="text-gray-600">CPU và RAM chuyên dụng, không chia sẻ tài nguyên</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Backup tự động</h4>
                <p className="text-gray-600">Hệ thống backup tự động hàng ngày để bảo vệ dữ liệu</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}
