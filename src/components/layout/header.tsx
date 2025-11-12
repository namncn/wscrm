'use client'

import { User, LogOut, PanelLeft, Settings, Menu, X } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  isMobileSidebarOpen: boolean
  setIsMobileSidebarOpen: (isOpen: boolean) => void
}

export function Header({ isMobileSidebarOpen, setIsMobileSidebarOpen }: HeaderProps) {
  const { data: session } = useSession()
  const { open, toggle } = useSidebar()
  const isCollapsed = !open

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
      <header className="bg-gradient-to-r from-white via-blue-50 to-indigo-50 border-b border-gray-200 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Sidebar Toggle + Search */}
        <div className="flex items-center space-x-3 flex-1 max-w-lg">
          {/* Mobile Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10"
          >
            {isMobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Desktop Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="hidden lg:flex items-center justify-center w-10 h-10"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal py-2">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                  {(session?.user as any)?.role && (
                    <p className="text-xs leading-none text-blue-600">
                      {(session?.user as any).role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/profile" className="flex items-center">
                        <User className="h-4 w-4" />
                        <span>Hồ sơ</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="flex items-center">
                        <Settings className="h-4 w-4" />
                        <span>Cài đặt</span>
                      </Link>
                    </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span className="text-red-500">Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
