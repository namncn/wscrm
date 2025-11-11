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
  CreditCard,
  Loader2,
  Zap,
  Shield,
  HardDrive,
  FolderOpen,
  FileText,
  Settings
} from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface HostingProduct {
  id: string
  name: string
  price: number
  description: string
  features: {
    storage: string
    bandwidth: string
    domain: string
    databases: string
    emails: string
    addonDomain?: string
    subDomain?: string
    ftpAccounts?: string
    hostingType?: string
    operatingSystem?: string
  }
  popular?: boolean
}

export default function HostingPage() {
  const { data: session, status } = useSession()
  // Hosting page is public - no authentication required
  const [isLoading, setIsLoading] = useState(false)
  const [hostingProducts, setHostingProducts] = useState<HostingProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  // Fetch hosting products from API (public access)
  useEffect(() => {
    const fetchHostingProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const response = await fetch('/api/hosting')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const products: HostingProduct[] = result.data.map((hosting: any) => ({
              id: hosting.id,
              name: hosting.planName,
              price: parseFloat(hosting.price) || 0,
              description: `Gói hosting ${hosting.planName}`,
              features: {
                storage: `${hosting.storage}GB SSD`,
                bandwidth: `${hosting.bandwidth}GB/tháng`,
                domain: 'Unlimited',
                databases: hosting.databases || 'Unlimited',
                emails: 'Unlimited',
                addonDomain: hosting.addonDomain || 'Unlimited',
                subDomain: hosting.subDomain || 'Unlimited',
                ftpAccounts: hosting.ftpAccounts || 'Unlimited',
                hostingType: hosting.hostingType || 'VPS Hosting',
                operatingSystem: hosting.operatingSystem || 'Linux'
              },
              popular: hosting.status === 'ACTIVE'
            }))
            setHostingProducts(products)
          }
        }
      } catch (error) {
        console.error('Error fetching hosting products:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchHostingProducts()
  }, [])

  if (isLoadingProducts) {
    return (
      <MemberLayout title="Hosting">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MemberLayout>
    )
  }

  const handlePurchase = async (hosting: HostingProduct) => {
    setIsLoading(true)
    try {
      const cartData = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serviceId: hosting.id,
        serviceType: 'HOSTING',
        serviceName: hosting.name,
        quantity: 1,
        price: hosting.price.toString(),
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
            serviceId: hosting.id,
            serviceType: 'HOSTING',
            serviceName: hosting.name,
            quantity: 1,
            price: hosting.price
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
          (item: any) => item.serviceId === hosting.id && item.serviceType === 'HOSTING'
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
    <MemberLayout title="Hosting">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Hosting Chất Lượng Cao
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100">
                Hosting SSD tốc độ cao với uptime 99.9%, phù hợp cho mọi loại website
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hosting Products */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center mb-12">Chọn gói hosting phù hợp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hostingProducts.map((hosting) => (
                <Card key={hosting.id} className="relative hover:shadow-lg transition-shadow">
                  {hosting.popular && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-red-500 text-white">Phổ biến</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                        <Server className="h-5 w-5 text-white" />
                      </div>
                      <span>{hosting.name}</span>
                    </CardTitle>
                    <CardDescription>{hosting.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {formatCurrency(hosting.price)}
                      </div>
                      <div className="text-sm text-gray-500">/ tháng</div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-600">{hosting.features.storage}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">{hosting.features.bandwidth}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">Domain: {hosting.features.domain}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-gray-600">Addon Domain: {hosting.features.addonDomain}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm text-gray-600">Sub Domain: {hosting.features.subDomain}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-pink-500" />
                          <span className="text-sm text-gray-600">FTP: {hosting.features.ftpAccounts}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">Database: {hosting.features.databases}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">Email: {hosting.features.emails}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-gray-600">{hosting.features.hostingType}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Server className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600">{hosting.features.operatingSystem}</span>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                        onClick={() => handlePurchase(hosting)}
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
              Tính năng nổi bật
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">SSD Storage</h4>
                <p className="text-gray-600">Ổ cứng SSD tốc độ cao, giúp website load nhanh hơn 3 lần</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">SSL Miễn phí</h4>
                <p className="text-gray-600">Chứng chỉ SSL miễn phí để bảo mật website của bạn</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Thanh toán linh hoạt</h4>
                <p className="text-gray-600">Hỗ trợ nhiều phương thức thanh toán, dễ dàng và tiện lợi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}
