'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Globe, 
  Server, 
  User, 
  Menu, 
  X,
  LogOut,
  ShoppingCart,
  LogIn,
  UserPlus,
  FileText
} from 'lucide-react'
import { getBrandName } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBackButton?: boolean
}

export default function MemberHeader({ title, showBackButton = false }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const brandName = getBrandName()

  const navigation = [
    { name: 'Trang chủ', href: '/', icon: Globe },
    { name: 'Tên miền', href: '/domain', icon: Globe },
    { name: 'Hosting', href: '/hosting', icon: Server },
    { name: 'VPS', href: '/vps', icon: Server },
  ]

  // Fetch cart count (only for customers)
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const userType = (session?.user as any)?.userType
        // Only fetch cart for customers
        if (session?.user && userType === 'customer') {
          const response = await fetch('/api/cart')
          if (response.ok) {
            const data = await response.json()
            const totalItems = data.data?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
            setCartCount(totalItems)
          } else {
            setCartCount(0)
          }
        } else {
          // If not logged in, fetch from localStorage
          const existingCart = localStorage.getItem('cart')
          if (existingCart) {
            try {
              const cartItems = JSON.parse(existingCart)
              const totalItems = cartItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
              setCartCount(totalItems)
            } catch (error) {
              setCartCount(0)
            }
          } else {
            setCartCount(0)
          }
        }
      } catch (error) {
        console.error('Error fetching cart count:', error)
        setCartCount(0)
      }
    }

    fetchCartCount()

    // Listen for storage changes (when cart is updated in localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') {
        fetchCartCount()
      }
    }

    // Listen for custom cart update event
    const handleCartUpdate = () => {
      fetchCartCount()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('cartUpdated', handleCartUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
  }, [session])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo và Title */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Quay lại</span>
              </Button>
            )}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{brandName}</h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors space-x-2 ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Menu và Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon - Always visible */}
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-blue-500">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0 hover:bg-transparent">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {session?.user ? (
                  <>
                    {/* Logged in - Show user info and menu items */}
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {session.user.name || 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.user.email}
                      </p>
                      {(session.user as any)?.userType === 'admin' && (
                        <Badge variant="outline" className="mt-1 text-xs">Admin</Badge>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    {(session.user as any)?.userType === 'admin' ? (
                      // Admin menu items only
                      <>
                        <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                          <User className="h-4 w-4" />
                          <span>Bảng điều khiển Admin</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
                          <User className="h-4 w-4" />
                          <span>Hồ sơ Admin</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      // Customer menu items only
                      <>
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                          <User className="h-4 w-4" />
                          <span>Hồ sơ cá nhân</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/orders')}>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Đơn hàng của tôi</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/domain-management')}>
                          <Globe className="h-4 w-4" />
                          <span>Quản lý Tên miền</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/hosting-management')}>
                          <Server className="h-4 w-4" />
                          <span>Quản lý Hosting</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/vps-management')}>
                          <Server className="h-4 w-4" />
                          <span>Quản lý VPS</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/website-management')}>
                          <Globe className="h-4 w-4" />
                          <span>Quản lý Website</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/contract-management')}>
                          <FileText className="h-4 w-4" />
                          <span>Quản lý Hợp đồng</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {/* Not logged in - Show login/register options */}
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        Khách
                      </p>
                      <p className="text-xs text-gray-500">
                        Chưa đăng nhập
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/auth/signin')}>
                      <LogIn className="h-4 w-4" />
                      <span>Đăng nhập</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/auth/register')}>
                      <UserPlus className="h-4 w-4" />
                      <span>Đăng ký</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/cart')}>
                      <ShoppingCart className="h-4 w-4" />
                      <span>Giỏ hàng</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
