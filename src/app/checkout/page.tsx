'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  CreditCard, 
  ArrowLeft,
  Globe,
  Server,
  Monitor,
  CheckCircle,
  UserPlus
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

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  company?: string
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
      return <Globe className="h-5 w-5 text-blue-500" />
    case 'HOSTING':
      return <Server className="h-5 w-5 text-green-500" />
    case 'VPS':
      return <Monitor className="h-5 w-5 text-purple-500" />
    default:
      return <CreditCard className="h-5 w-5 text-gray-500" />
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

export default function CheckoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    paymentMethod: 'BANK_TRANSFER',
    notes: ''
  })

  // Registration form data (for non-logged-in users)
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    // Fetch cart items always (public) - from localStorage if not logged in, from API if logged in
    const fetchCartItems = async () => {
      try {
        if (session?.user) {
          // If logged in, fetch from API
          const cartResponse = await fetch('/api/cart')
          if (cartResponse.ok) {
            const cartData = await cartResponse.json()
            // Transform items to extract domainName from serviceData
            const transformedItems = (cartData.data || []).map((item: any) => ({
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
      } catch (error) {
        console.error('Error fetching cart:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCartItems()
    
    // Fetch customer data only if logged in
    if (session?.user) {
      const fetchCustomerData = async () => {
        try {
          const customerResponse = await fetch('/api/customers/me')
          if (customerResponse.ok) {
            const result = await customerResponse.json()
            if (result.success && result.data) {
              const currentCustomer = result.data
              setCustomer(currentCustomer)
              setFormData(prev => ({
                name: currentCustomer.name || '',
                email: currentCustomer.email || '',
                phone: (currentCustomer.phone && currentCustomer.phone.trim() !== '') ? currentCustomer.phone : '',
                address: (currentCustomer.address && currentCustomer.address.trim() !== '') ? currentCustomer.address : '',
                company: (currentCustomer.company && currentCustomer.company.trim() !== '') ? currentCustomer.company : '',
                paymentMethod: prev.paymentMethod || 'E_WALLET',
                notes: prev.notes || ''
              }))
            }
          } else {
            console.error('Failed to fetch customer:', customerResponse.status)
            if (customerResponse.status === 404) {
              const userType = (session?.user as any)?.userType
              if (userType === 'admin') {
                toastError('Không tìm thấy thông tin khách hàng.')
                router.push('/admin/dashboard')
                return
              }
              toastError('Không tìm thấy thông tin khách hàng.')
            } else if (customerResponse.status === 401) {
              toastError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
              router.push('/auth/signin')
            }
          }
        } catch (error) {
          console.error('Error fetching customer:', error)
        }
      }
      fetchCustomerData()
    }
  }, [session])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle registration form input changes
  const handleRegisterInputChange = (field: string, value: string) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Auto-fill checkout form from registration form
    if (field === 'name') {
      setFormData(prev => ({ ...prev, name: value }))
    }
    if (field === 'email') {
      setFormData(prev => ({ ...prev, email: value }))
    }
  }

  // Handle registration
  const handleRegister = async () => {
    // Validate registration form
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      toastError('Vui lòng điền đầy đủ thông tin đăng ký')
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      toastError('Mật khẩu xác nhận không khớp')
      return
    }

    if (registerData.password.length < 6) {
      toastError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setIsRegistering(true)
    try {
      // Register new user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          userType: 'customer',
        }),
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json()
        throw new Error(errorData.error || 'Không thể đăng ký tài khoản')
      }

      toastSuccess('Đăng ký thành công, vui lòng click vào link xác nhận tài khoản đã được gửi vào trong Email.')
      
      // Reset registration form
      setRegisterData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      })
      
      // Reload page to show login form instead
      window.location.reload()
    } catch (error: any) {
      toastError(`Lỗi: ${error.message || 'Có lỗi xảy ra khi đăng ký'}`)
      console.error('Error during registration:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  // Process checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toastError('Giỏ hàng trống')
      return
    }

    if (!formData.name || !formData.phone || !formData.address) {
      toastError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    // For checkout, user must be logged in (they can register on this page)
    if (!session?.user?.email) {
      toastError('Vui lòng đăng ký tài khoản ở trên để tiếp tục thanh toán')
      return
    }

    setIsProcessing(true)
    try {
      // Create order from cart items
      // Always use logged-in user's email, not formData.email
      const orderData = {
        customerId: session.user.email, // Always use logged-in user's email
        items: cartItems.map(item => ({
          serviceType: item.serviceType,
          serviceName: item.serviceName,
          serviceId: item.serviceId,
          quantity: item.quantity,
          price: parseFloat(item.price),
          domainName: item.domainName || item.serviceData?.domainName || undefined
        })),
        totalAmount: cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0),
        notes: formData.notes || `Đơn hàng từ giỏ hàng - ${cartItems.length} sản phẩm`,
        paymentMethod: formData.paymentMethod,
        customerInfo: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          company: formData.company
        }
      }

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Không thể tạo đơn hàng')
      }

      const order = await orderResponse.json()
      
      // Clear cart after successful order
      if (session?.user) {
        // If logged in, clear database cart
        try {
          await fetch('/api/cart', { method: 'DELETE' })
        } catch (error) {
          console.error('Error clearing cart:', error)
          // Continue anyway - cart will be cleared by user manually if needed
        }
      } else {
        // If not logged in, clear localStorage cart
        localStorage.removeItem('cart')
      }

      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new Event('cartUpdated'))

      // If payment method is CASH, redirect to orders page
      if (formData.paymentMethod === 'CASH') {
        toastSuccess('Đơn hàng đã được tạo thành công!')
        router.push('/orders')
        return
      }

      // For other payment methods, create VietQR code
      toastSuccess('Đơn hàng đã được tạo thành công! Tạo mã QR thanh toán...')
      
      const sepayResponse = await fetch('/api/payments/sepay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.data.id,
          customerId: order.data.customerId,
          amount: order.data.totalAmount,
          description: `Thanh toán đơn hàng #${order.data.orderNumber}`,
        }),
      })
      
      if (!sepayResponse.ok) {
        const contentType = sepayResponse.headers.get('content-type')
        console.error('[Checkout] Sepay API error. Content-Type:', contentType)
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await sepayResponse.json()
          throw new Error(errorData.error || 'Không thể tạo QR code thanh toán')
        } else {
          const text = await sepayResponse.text()
          console.error('[Checkout] Non-JSON response:', text.substring(0, 500))
          throw new Error('Lỗi: Sepay API trả về response không phải JSON')
        }
      }

      const sepayData = await sepayResponse.json()
      
      if (sepayData.qrCodeUrl && sepayData.bankInfo) {
        // Redirect to QR payment page
        const qrPaymentUrl = `/payments/qr?orderId=${order.data.id}&paymentId=${sepayData.paymentId}`
        router.push(qrPaymentUrl)
      } else {
        throw new Error('Không nhận được thông tin QR code từ Sepay')
      }

    } catch (error: any) {
      toastError(`Lỗi: ${error.message || 'Có lỗi xảy ra khi thanh toán'}`)
      console.error('Error during checkout:', error)
    } finally {
      setIsProcessing(false)
    }
  }


  if (isLoading) {
    return (
      <MemberLayout title="Thanh toán">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Đang tải thông tin...</p>
          </div>
        </div>
      </MemberLayout>
    )
  }

  if (cartItems.length === 0) {
    return (
      <MemberLayout title="Thanh toán">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Giỏ hàng trống</h3>
              <p className="text-gray-600 mb-4">Bạn cần có sản phẩm trong giỏ hàng để thanh toán</p>
              <Link href="/">
                <Button>Tiếp tục mua sắm</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MemberLayout>
    )
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity)
  }, 0)

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <MemberLayout title="Thanh toán">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
            <p className="text-gray-600 mt-2">
              Hoàn tất đơn hàng của bạn
            </p>
          </div>
          <Link href="/cart">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Quay lại giỏ hàng
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Registration Form - Only show if not logged in */}
            {!session?.user && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <span>Đăng ký tài khoản</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Vui lòng đăng ký tài khoản để tiếp tục thanh toán
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-name" className="font-medium mb-2 block">
                        Họ và tên *
                      </Label>
                      <Input
                        id="register-name"
                        value={registerData.name}
                        onChange={(e) => handleRegisterInputChange('name', e.target.value)}
                        placeholder="Nhập họ và tên"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email" className="font-medium mb-2 block">
                        Email *
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => handleRegisterInputChange('email', e.target.value)}
                        placeholder="Nhập email"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-password" className="font-medium mb-2 block">
                        Mật khẩu *
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => handleRegisterInputChange('password', e.target.value)}
                        placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-confirm-password" className="font-medium mb-2 block">
                        Xác nhận mật khẩu *
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => handleRegisterInputChange('confirmPassword', e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleRegister} 
                    disabled={isRegistering}
                    className="w-full"
                  >
                    {isRegistering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Đang đăng ký...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Đăng ký và tiếp tục
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Đã có tài khoản?{' '}
                    <Link href="/auth/signin" className="text-blue-600 hover:underline">
                      Đăng nhập ngay
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="font-medium mb-2 block">
                      Họ và tên *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="font-medium mb-2 block">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!!session?.user}
                      readOnly={!!session?.user}
                      className={session?.user ? "bg-gray-100 cursor-not-allowed" : ""}
                      placeholder="Nhập email"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="font-medium mb-2 block">
                      Số điện thoại *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Nhập số điện thoại"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company" className="font-medium mb-2 block">
                      Công ty
                    </Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Nhập tên công ty"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address" className="font-medium mb-2 block">
                    Địa chỉ *
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Nhập địa chỉ chi tiết"
                    rows={3}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="font-medium mb-4 block">
                    Chọn phương thức thanh toán
                  </Label>
                  <div className="space-y-3">
                    {/* <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="E_WALLET"
                        checked={formData.paymentMethod === 'E_WALLET'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Ví điện tử</div>
                        <div className="text-sm text-gray-500">Thanh toán nhanh chóng qua ví điện tử</div>
                      </div>
                    </label> */}
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={formData.paymentMethod === 'BANK_TRANSFER'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Chuyển khoản qua VietQR</div>
                        <div className="text-sm text-gray-500">Quét mã QR để thanh toán qua SePay - Tự động xác nhận</div>
                      </div>
                    </label>
                    {/* <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CREDIT_CARD"
                        checked={formData.paymentMethod === 'CREDIT_CARD'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Thẻ tín dụng</div>
                        <div className="text-sm text-gray-500">Thanh toán bằng thẻ tín dụng</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CASH"
                        checked={formData.paymentMethod === 'CASH'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Tiền mặt</div>
                        <div className="text-sm text-gray-500">Thanh toán khi nhận hàng</div>
                      </div>
                    </label> */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="notes" className="font-medium mb-2 block">
                    Ghi chú thêm
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Đơn hàng của bạn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center space-x-3">
                        {getServiceIcon(item.serviceType)}
                        <div>
                          <div className="font-medium text-sm">{item.domainName || item.serviceData?.domainName || item.serviceName}</div>
                          {(item.domainName || item.serviceData?.domainName) && (
                            <div className="text-xs text-blue-600">{item.serviceName}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {getServiceTypeLabel(item.serviceType)} × {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Số sản phẩm:</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Tổng cộng:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isProcessing || !session?.user}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang xử lý...
                    </>
                  ) : !session?.user ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Vui lòng đăng nhập để thanh toán
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Hoàn tất thanh toán
                    </>
                  )}
                </Button>
                {!session?.user && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Bạn cần đăng nhập tài khoản ở trên để tiếp tục thanh toán
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}
