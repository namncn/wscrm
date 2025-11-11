'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn, getBrandName } from '@/lib/utils'
import { useSidebar } from '@/contexts/sidebar-context'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileText,
  Globe,
  Server,
  Settings,
  User,
  Shield,
  Mail,
  Cloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'Khách Hàng', href: '/admin/customers', icon: Users, color: 'text-green-600' },
    { name: 'Đơn Hàng', href: '/admin/orders', icon: ShoppingCart, color: 'text-purple-600' },
  { name: 'Hợp Đồng', href: '/admin/contracts', icon: FileText, color: 'text-orange-600' },
  { name: 'Hoá Đơn', href: '/admin/invoices', icon: FileText, color: 'text-amber-600' },
    { name: 'Websites', href: '/admin/websites', icon: Globe, color: 'text-emerald-600' },
    { name: 'Tên Miền', href: '/admin/domain', icon: Globe, color: 'text-cyan-600' },
    { name: 'Hosting', href: '/admin/hosting', icon: Server, color: 'text-indigo-600' },
    { name: 'VPS', href: '/admin/vps', icon: Server, color: 'text-pink-600' },
    { name: 'Email', href: '/admin/email', icon: Mail, color: 'text-yellow-600' },
    { name: 'Thành Viên', href: '/admin/users', icon: Shield, color: 'text-red-600' },
    { name: 'Hồ Sơ', href: '/admin/profile', icon: User, color: 'text-teal-600' },
    { name: 'Cài Đặt', href: '/admin/settings', icon: Settings, color: 'text-gray-600' },
  ]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

// Tooltip component that uses fixed positioning with proper tracking
function NavItemTooltip({ text, targetRef }: { text: string; targetRef: React.RefObject<HTMLElement> }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect()
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 12
        })
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [targetRef])

  if (!position) return null

  return (
    <div
      className="fixed px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] shadow-xl -translate-y-1/2"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {text}
      {/* Arrow */}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-900"></span>
    </div>
  )
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { isCollapsed, toggleSidebar, isHydrated, shouldEnableTransition } = useSidebar()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const brandName = getBrandName()
  const itemRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({})
  const upgradeUrl = process.env.NEXT_PUBLIC_CLOUD_UPGRADE_URL ?? 'https://anlinh.vn/crm-upgrade-to-cloud/'
  const upgradeTooltip = 'Nâng cấp lên bản cloud để nhận cập nhật và tính năng mới nhất'

  // Get user role from session
  const userRole = (session?.user as any)?.role

  // Filter navigation items based on user role
  // Show "Thành Viên" menu for both ADMIN and USER roles
  // If session is loading, show all items (to prevent flash)
  const filteredNavigation = navigation.filter((item) => {
    if (item.href === '/admin/users') {
      // Show "Thành Viên" menu for both ADMIN and USER
      // If session is loading, hide it temporarily to be safe
      if (status === 'loading') {
        return false
      }
      return userRole === 'ADMIN' || userRole === 'USER'
    }
    return true
  })

  // Logo component
  const LogoIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="url(#gradient)" />
      <path d="M8 12h16v2H8v-2zm0 4h16v2H8v-2zm0 4h12v2H8v-2z" fill="white" />
      <circle cx="22" cy="10" r="2" fill="white" />
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  )

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transform lg:translate-x-0 lg:static lg:inset-0",
        // Only enable transition after initial render to prevent transition on load
        shouldEnableTransition && "transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* Header with Logo */}
          <div className="flex items-center h-14 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <LogoIcon />
                <h1 className="text-lg font-bold text-white">{brandName}</h1>
              </div>
            )}
            {isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <LogoIcon />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/admin/invoices' && pathname.startsWith('/admin/invoice/')) ||
                (item.href === '/admin/contracts' &&
                  (pathname.startsWith('/admin/contract/') || pathname.startsWith('/contract/')))
              
              return (
                <div key={item.name} className="relative group">
                  <Link
                    ref={(el) => { itemRefs.current[item.name] = el }}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-300 relative",
                      isActive
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isCollapsed ? "mx-auto" : "mr-3",
                      isActive ? item.color : item.color,
                      !isActive && `group-hover:opacity-80`
                    )} />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed state - using fixed positioning to escape overflow */}
                  {isCollapsed && hoveredItem === item.name && itemRefs.current[item.name] && (
                    <NavItemTooltip 
                      text={item.name} 
                      targetRef={{ current: itemRefs.current[item.name]! }}
                    />
                  )}
                </div>
              )
            })}
          </nav>

          {/* Cloud upgrade box */}
          <div
            className={cn(
              'border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50',
              isCollapsed ? 'p-2' : 'p-3'
            )}
          >
            <div
              className={cn(
                'rounded-lg border border-dashed border-purple-200 bg-white shadow-sm',
                isCollapsed ? 'flex flex-col items-center gap-2 p-2' : 'space-y-3 p-3'
              )}
            >
              {!isCollapsed && (
                <>
                  <div className="flex items-center gap-2 text-purple-700">
                    <Cloud className="h-5 w-5" />
                    <span className="text-sm font-semibold">Nâng cấp lên bản Cloud</span>
                  </div>
                  <p className="text-xs text-purple-600 leading-snug">
                    {upgradeTooltip}
                  </p>
                </>
              )}
              <Button
                asChild
                size={isCollapsed ? 'icon' : 'default'}
                className={cn(
                  'bg-purple-600 hover:bg-purple-700 text-white',
                  isCollapsed ? 'h-9 w-9 rounded-full' : 'w-full'
                )}
              >
                <Link
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={upgradeTooltip}
                >
                  {isCollapsed ? (
                    <Cloud className="h-4 w-4" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Cloud className="h-4 w-4" />
                      Nâng cấp lên Cloud
                    </span>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
