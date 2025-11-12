'use client'

import * as React from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  isHydrated: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
  storageKey?: string
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  storageKey = 'sidebar:state',
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved !== null) {
        setOpen(saved === 'true')
      }
    } catch (error) {
      console.warn('[SidebarProvider] Không thể đọc trạng thái từ localStorage:', error)
    } finally {
      setIsHydrated(true)
    }
  }, [storageKey])

  React.useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(storageKey, open ? 'true' : 'false')
    } catch (error) {
      console.warn('[SidebarProvider] Không thể lưu trạng thái vào localStorage:', error)
    }
  }, [open, storageKey, isHydrated])

  const toggle = React.useCallback(() => setOpen((prev) => !prev), [])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      isHydrated,
    }),
    [open, toggle, isHydrated]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export interface SidebarProps extends React.ComponentPropsWithoutRef<'aside'> {}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar()
    return (
      <aside
        ref={ref}
        data-state={open ? 'expanded' : 'collapsed'}
        className={cn(
          'group/sidebar flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out',
          open ? 'w-64' : 'w-[72px]',
          className
        )}
        {...props}
      />
    )
  }
)
Sidebar.displayName = 'Sidebar'

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between px-4 py-4', className)}
    {...props}
  />
))
SidebarHeader.displayName = 'SidebarHeader'

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto px-3 py-2', className)}
    {...props}
  />
))
SidebarContent.displayName = 'SidebarContent'

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-t border-slate-200 px-3 py-4', className)} {...props} />
))
SidebarFooter.displayName = 'SidebarFooter'

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-1 flex-col', className)} {...props} />
))
SidebarInset.displayName = 'SidebarInset'

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => {
  const { toggle, open } = useSidebar()
  return (
    <Button
      ref={ref}
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggle}
      className={cn('h-8 w-8', className)}
      {...props}
    >
      {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = 'SidebarTrigger'

export const SidebarRail = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => {
  const { open, toggle } = useSidebar()
  if (open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'group/rail absolute inset-y-0 left-full hidden w-2 cursor-pointer items-center justify-center bg-transparent transition hover:bg-blue-100 sm:flex',
        className
      )}
      onClick={toggle}
      {...props}
    >
      <span className="sr-only">Expand sidebar</span>
    </div>
  )
})
SidebarRail.displayName = 'SidebarRail'

export const SidebarMenu = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn('space-y-1 py-2', className)} {...props} />
))
SidebarMenu.displayName = 'SidebarMenu'

export const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-1', className)} {...props} />
))
SidebarMenuItem.displayName = 'SidebarMenuItem'

export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
      className
    )}
    {...props}
  />
))
SidebarMenuButton.displayName = 'SidebarMenuButton'


