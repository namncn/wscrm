'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MemberLayout from '@/components/layout/member-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  Globe,
  Server,
  Monitor
} from 'lucide-react'
import Link from 'next/link'
import { toastSuccess, toastError } from '@/lib/toast'

interface CartItem {
  id: string
  serviceId: string
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS'
  serviceName: string
  quantity: number
  price: string
  createdAt: string
  updatedAt: string
  domainName?: string
  serviceData?: any
}

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(num)
}

const getServiceIcon = (serviceType: string) => {
  switch (serviceType) {
    case 'DOMAIN':
      return <Globe className="h-4 w-4 text-blue-500" />
    case 'HOSTING':
      return <Server className="h-4 w-4 text-green-500" />
    case 'VPS':
      return <Monitor className="h-4 w-4 text-purple-500" />
    default:
      return <ShoppingCart className="h-4 w-4 text-gray-500" />
  }
}

const getServiceTypeLabel = (serviceType: string) => {
  switch (serviceType) {
    case 'DOMAIN':
      return 'Tên miền'
    case 'HOSTING':
      return 'Hosting'
    case 'VPS':
      return 'VPS'
    default:
      return serviceType
  }
}

export default function CartPage() {
  const { data: session } = useSession()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [itemToDeleteName, setItemToDeleteName] = useState<string>('')

  // Fetch cart items
  const fetchCartItems = async () => {
    try {
      if (session?.user) {
        // If logged in, fetch from API
        const response = await fetch('/api/cart')
        if (response.ok) {
          const data = await response.json()
          // Transform items to extract domainName from serviceData
          const transformedItems = (data.data || []).map((item: any) => ({
            ...item,
            domainName: item.domainName || item.serviceData?.domainName
          }))
          setCartItems(transformedItems)
        }
      } else {
        // If not logged in, fetch from localStorage
        const existingCart = localStorage.getItem('cart')
        if (existingCart) {
          const cartItems = JSON.parse(existingCart)
          setCartItems(cartItems)
        } else {
          setCartItems([])
        }
      }
    } catch (error: any) {
      toastError(`Lỗi: ${error.message}`)
      console.error('Error fetching cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCartItems()
  }, [session])

  // Update quantity
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setIsUpdating(itemId)
    try {
      if (session?.user) {
        // If logged in, use API
        const response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: itemId,
            quantity: newQuantity,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update quantity')
        }

        // Update local state
        setCartItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, quantity: newQuantity }
              : item
          )
        )
        
        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new Event('cartUpdated'))
        
        toastSuccess('Đã cập nhật số lượng')
      } else {
        // If not logged in, update localStorage
        const existingCart = localStorage.getItem('cart')
        if (existingCart) {
          const cartItems = JSON.parse(existingCart)
          const updatedCart = cartItems.map((item: any) => 
            item.id === itemId 
              ? { ...item, quantity: newQuantity, updatedAt: new Date().toISOString() }
              : item
          )
          localStorage.setItem('cart', JSON.stringify(updatedCart))
          setCartItems(updatedCart)
          
          // Dispatch custom event to update cart count in header
          window.dispatchEvent(new Event('cartUpdated'))
          
          toastSuccess('Đã cập nhật số lượng')
        }
      }
    } catch (error: any) {
      toastError(`Lỗi: ${error.message}`)
    } finally {
      setIsUpdating(null)
    }
  }

  // Handle delete confirmation
  const handleDeleteClick = (itemId: string, itemName: string) => {
    setItemToDelete(itemId)
    setItemToDeleteName(itemName)
    setDeleteConfirmOpen(true)
  }

  // Remove item
  const removeItem = async (itemId: string) => {
    try {
      if (session?.user) {
        // If logged in, use API
        const response = await fetch(`/api/cart?id=${itemId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to remove item')
        }

        // Update local state
        setCartItems(prev => prev.filter(item => item.id !== itemId))
        
        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new Event('cartUpdated'))
        
        toastSuccess('Đã xóa sản phẩm khỏi giỏ hàng')
      } else {
        // If not logged in, update localStorage
        const existingCart = localStorage.getItem('cart')
        if (existingCart) {
          const cartItems = JSON.parse(existingCart)
          const updatedCart = cartItems.filter((item: any) => item.id !== itemId)
          localStorage.setItem('cart', JSON.stringify(updatedCart))
          setCartItems(updatedCart)
          
          // Dispatch custom event to update cart count in header
          window.dispatchEvent(new Event('cartUpdated'))
          
          toastSuccess('Đã xóa sản phẩm khỏi giỏ hàng')
        }
      }
      
      // Close dialog
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      setItemToDeleteName('')
    } catch (error: any) {
      toastError(`Lỗi: ${error.message}`)
    }
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity)
  }, 0)

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Cart page is public - no authentication required

  if (isLoading) {
    return (
      <MemberLayout title="Giỏ hàng">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Đang tải giỏ hàng...</p>
          </div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout title="Giỏ hàng">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Giỏ hàng</h1>
            <p className="text-gray-600 mt-2">
              {totalItems} sản phẩm trong giỏ hàng
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              Tiếp tục mua sắm
            </Button>
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <Card className="w-full">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Giỏ hàng trống
              </h3>
              <p className="text-gray-600 mb-6">
                Bạn chưa có sản phẩm nào trong giỏ hàng
              </p>
              <Link href="/">
                <Button>
                  Bắt đầu mua sắm
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
                  {cartItems.map((item) => (
                <Card key={item.id} className="py-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getServiceIcon(item.serviceType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {item.domainName || item.serviceName}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getServiceTypeLabel(item.serviceType)}
                            </Badge>
                            {(item.domainName || item.serviceData?.domainName) && (
                              <span className="text-xs text-blue-600 truncate">
                                {item.serviceName}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 truncate">
                              ID: {item.serviceId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={isUpdating === item.id || item.quantity <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isUpdating === item.id}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-right min-w-[120px]">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(parseFloat(item.price) * item.quantity)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.price)} × {item.quantity}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(item.id, item.serviceName)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Tổng kết đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Số sản phẩm:</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Tổng cộng:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                  
                  <Link href="/checkout" className="block">
                    <Button className="w-full" size="lg">
                      Thanh toán
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa sản phẩm <strong>"{itemToDeleteName}"</strong> khỏi giỏ hàng không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setItemToDelete(null)
                  setItemToDeleteName('')
                }}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (itemToDelete) {
                    removeItem(itemToDelete)
                  }
                }}
              >
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MemberLayout>
  )
}
