'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Globe,
  ShoppingCart,
  CheckCircle,
  CreditCard,
  Loader2
} from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface DomainProduct {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
}

export default function DomainPage() {
  const { data: session, status } = useSession()
  // Domain page is public - no authentication required
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<DomainProduct | null>(null)
  const [domainProducts, setDomainProducts] = useState<DomainProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false)
  const [domainNameInput, setDomainNameInput] = useState('')

  // Fetch domain types from API (public access)
  useEffect(() => {
    const fetchDomainTypes = async () => {
      try {
        setIsLoadingProducts(true)
        const response = await fetch('/api/domain-packages')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            // Transform domain types to DomainProduct format
            const products: DomainProduct[] = data.data.map((domainType: any) => {
              // Ensure features is always an array
              let featuresArray: string[] = []
              if (Array.isArray(domainType.features)) {
                featuresArray = domainType.features
              } else if (domainType.features && typeof domainType.features === 'string') {
                try {
                  const parsed = JSON.parse(domainType.features)
                  featuresArray = Array.isArray(parsed) ? parsed : []
                } catch {
                  featuresArray = []
                }
              } else if (domainType.features && typeof domainType.features === 'object') {
                featuresArray = Object.values(domainType.features) as string[]
              }
              
              return {
                id: domainType.id,
                name: domainType.name,
                price: domainType.price,
                description: domainType.description,
                features: featuresArray,
                popular: domainType.popular
              }
            })
            setDomainProducts(products)
          } else {
            throw new Error('Invalid API response format')
          }
        } else {
          throw new Error(`API request failed with status ${response.status}`)
        }
      } catch (error) {
        console.error('Error fetching domain types:', error)
        // Fallback to mock data
        const mockProducts: DomainProduct[] = [
          {
            id: 'com',
            name: '.com',
            price: 250000,
            description: 'Tên miền quốc tế phổ biến nhất',
            features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
            popular: true
          },
          {
            id: 'vn',
            name: '.vn',
            price: 350000,
            description: 'Tên miền Việt Nam chính thức',
            features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email', 'Ưu tiên SEO Việt Nam'],
            popular: true
          },
          {
            id: 'net',
            name: '.net',
            price: 280000,
            description: 'Tên miền cho các tổ chức mạng',
            features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
            popular: false
          },
          {
            id: 'org',
            name: '.org',
            price: 300000,
            description: 'Tên miền cho tổ chức phi lợi nhuận',
            features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
            popular: false
          }
        ]
        setDomainProducts(mockProducts)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchDomainTypes()
  }, [])

  if (isLoadingProducts) {
    return (
      <MemberLayout title="Tên Miền">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MemberLayout>
    )
  }

  const handlePurchaseClick = (domain: DomainProduct) => {
    setSelectedDomain(domain)
    setDomainNameInput('')
    setIsDomainDialogOpen(true)
  }

  const handleAddToCart = async () => {
    if (!selectedDomain) return
    
    if (!domainNameInput.trim()) {
      toastError('Vui lòng nhập tên miền')
      return
    }

    // Validate domain name format (basic validation)
    const domainRegex = /^[a-z0-9]+([\-\.][a-z0-9]+)*$/i
    if (!domainRegex.test(domainNameInput.trim())) {
      toastError('Tên miền không hợp lệ')
      return
    }

    setIsLoading(true)
    try {
      const fullDomainName = `${domainNameInput.trim()}${selectedDomain.name}`
      const cartData = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        serviceId: selectedDomain.id,
        serviceType: 'DOMAIN',
        serviceName: selectedDomain.name,
        quantity: 1,
        price: selectedDomain.price.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        domainName: fullDomainName
      }

      // If user is logged in, use API
      if (status === 'authenticated' && session?.user) {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId: selectedDomain.id,
            serviceType: 'DOMAIN',
            serviceName: selectedDomain.name,
            quantity: 1,
            price: selectedDomain.price,
            domainName: fullDomainName
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Không thể thêm vào giỏ hàng')
        }

        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new Event('cartUpdated'))

        toastSuccess('Đã thêm vào giỏ hàng! Chuyển đến trang giỏ hàng.')
        setIsDomainDialogOpen(false)
        window.location.href = '/cart'
      } else {
        // If not logged in, use localStorage
        const existingCart = localStorage.getItem('cart')
        const cartItems = existingCart ? JSON.parse(existingCart) : []
        
        // Check if item already exists
        const existingIndex = cartItems.findIndex(
          (item: any) => item.serviceId === selectedDomain.id && item.serviceType === 'DOMAIN' && item.domainName === fullDomainName
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
        setIsDomainDialogOpen(false)
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
    <MemberLayout title="Tên Miền">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Đăng ký tên miền
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Tìm và đăng ký tên miền hoàn hảo cho website của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Domain Products */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center mb-12">Chọn loại tên miền phù hợp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {domainProducts.map((domain) => (
                <Card key={domain.id} className="relative hover:shadow-lg transition-shadow">
                  {domain.popular && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-red-500 text-white">Phổ biến</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <span>{domain.name}</span>
                    </CardTitle>
                    <CardDescription>{domain.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatCurrency(domain.price)}
                      </div>
                      <div className="text-sm text-gray-500">/ năm</div>
                      
                      <div className="space-y-2">
                        {Array.isArray(domain.features) && domain.features.length > 0 ? (
                          domain.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-gray-600">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Không có tính năng nào</div>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                        onClick={() => handlePurchaseClick(domain)}
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
              Tại sao chọn tên miền của chúng tôi?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">DNS Quản lý</h4>
                <p className="text-gray-600">Giao diện quản lý DNS trực quan, dễ sử dụng</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Gia hạn tự động</h4>
                <p className="text-gray-600">Tự động gia hạn để không bị mất tên miền</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Thanh toán dễ dàng</h4>
                <p className="text-gray-600">Hỗ trợ nhiều phương thức thanh toán</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Name Input Dialog */}
      <Dialog open={isDomainDialogOpen} onOpenChange={setIsDomainDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nhập tên miền</DialogTitle>
            <DialogDescription>
              Nhập tên miền bạn muốn đăng ký cho {selectedDomain?.name || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domainName">Tên miền</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="domainName"
                  placeholder="example"
                  value={domainNameInput}
                  onChange={(e) => setDomainNameInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddToCart()
                    }
                  }}
                />
                <div className="text-gray-600 font-medium min-w-fit">
                  {selectedDomain?.name}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Ví dụ: example{selectedDomain?.name} sẽ được đăng ký
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDomainDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddToCart} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Thêm vào giỏ hàng
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberLayout>
  )
}
