'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn, getBrandName } from '@/lib/utils'
import {
  Sidebar as SidebarPrimitive,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
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
  Cloud,
  LogOut,
  ChevronDown,
  X,
  NotebookText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

type NavigationSection = {
  label: string
  items: NavigationItem[]
}

const navigationSections: NavigationSection[] = [
  {
    label: 'Tổng quan',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    ],
  },
  {
    label: 'Khách hàng & giao dịch',
    items: [
      { name: 'Khách Hàng', href: '/admin/customers', icon: Users, color: 'text-green-600' },
      { name: 'Đơn Hàng', href: '/admin/orders', icon: ShoppingCart, color: 'text-purple-600' },
      { name: 'Hợp Đồng', href: '/admin/contracts', icon: FileText, color: 'text-orange-600' },
      { name: 'Hoá Đơn', href: '/admin/invoices', icon: FileText, color: 'text-amber-600' },
    ],
  },
  {
    label: 'Hạ tầng & dịch vụ',
    items: [
      { name: 'Websites', href: '/admin/websites', icon: Globe, color: 'text-emerald-600' },
      { name: 'Tên Miền', href: '/admin/domain', icon: Globe, color: 'text-cyan-600' },
      { name: 'Hosting', href: '/admin/hosting', icon: Server, color: 'text-indigo-600' },
      { name: 'VPS', href: '/admin/vps', icon: Server, color: 'text-pink-600' },
      { name: 'Email', href: '/admin/email', icon: Mail, color: 'text-yellow-600' },
    ],
  },
  {
    label: 'Tài khoản & hệ thống',
    items: [
      { name: 'Thành Viên', href: '/admin/users', icon: Shield, color: 'text-red-600' },
      { name: 'Hồ Sơ', href: '/admin/profile', icon: User, color: 'text-teal-600' },
      { name: 'Cài Đặt', href: '/admin/settings', icon: Settings, color: 'text-gray-600' },
    ],
  },
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

export function AppSidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { open, isHydrated } = useSidebar()
  const isCollapsed = !open
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
  const filteredSections = navigationSections
    .map((section) => ({
      label: section.label,
      items: section.items.filter((item) => {
        if (item.href === '/admin/users') {
          if (status === 'loading') return false
          return userRole === 'ADMIN' || userRole === 'USER'
        }
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)

  // Logo component
  const LogoIcon = () => (
    <NotebookText className="size-8 text-white" />
  )

  return (
    <>
      {/* Sidebar */}
      <SidebarPrimitive
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-white lg:static lg:inset-auto',
          isHydrated && 'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarRail className="border-r border-transparent" />
        <SidebarHeader className="bg-primary text-primary-foreground p-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div
              className={cn(
                'flex items-center gap-2 text-white',
                isCollapsed && 'w-full justify-center'
              )}
            >
              <LogoIcon />
              {!isCollapsed && <h1 className="text-lg font-bold">{brandName}</h1>}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <nav className="space-y-6">
            {filteredSections.map((section) => (
              <div key={section.label} className="space-y-2">
                <div
                  className={cn(
                    'px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 transition-all',
                    isCollapsed ? 'sr-only' : 'opacity-80'
                  )}
                >
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href === '/admin/invoices' && pathname.startsWith('/admin/invoice/')) ||
                      (item.href === '/admin/contracts' &&
                        (pathname.startsWith('/admin/contract/') || pathname.startsWith('/contract/')))

                    return (
                      <div key={item.name} className="relative group">
                        <Link
                          ref={(el) => {
                            itemRefs.current[item.name] = el
                          }}
                          href={item.href}
                          className={cn(
                            'flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-300 relative',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          )}
                          onClick={() => setIsOpen(false)}
                          onMouseEnter={() => setHoveredItem(item.name)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <item.icon
                            className={cn(
                              'h-5 w-5 transition-all duration-300',
                              isCollapsed ? 'mx-auto' : 'mr-3',
                              isActive ? 'text-primary' : item.color,
                              !isActive && 'opacity-80 group-hover:opacity-100'
                            )}
                          />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </Link>

                        {isCollapsed && hoveredItem === item.name && itemRefs.current[item.name] && (
                          <NavItemTooltip
                            text={item.name}
                            targetRef={{ current: itemRefs.current[item.name]! }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </SidebarContent>

        {/* Cloud upgrade box temporarily disabled */}
        {/* ... keep commented block? optionally when needed ... */}

        <SidebarFooter className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 h-auto border-none p-2',
                  isCollapsed && 'justify-center border-none bg-transparent hover:bg-transparent p-2'
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {session?.user?.name || 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email || '—'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56"
              align={isCollapsed ? 'end' : 'start'}
              side={isCollapsed ? 'right' : 'top'}
              sideOffset={isCollapsed ? 12 : 8}
            >
              <DropdownMenuLabel className="font-normal py-2">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || 'Người dùng'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email || '—'}
                  </p>
                  {(session?.user as any)?.role && (
                    <span className="inline-flex w-fit items-center rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                      {(session?.user as any).role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Hồ sơ</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Cài đặt</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-red-500 focus:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </SidebarPrimitive>

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
