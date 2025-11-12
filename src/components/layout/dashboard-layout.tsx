'use client'

import { useState } from 'react'
import { AppSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'
function DashboardFooter() {
  return (
    <footer className="p-6 bg-white/80 text-center text-sm text-slate-600 border-t border-slate-200">
      Một sản phẩm của <a href="https://anlinh.vn" target="_blank">An Linh Technology JSC</a>
    </footer>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AppSidebar isOpen={isMobileSidebarOpen} setIsOpen={setIsMobileSidebarOpen} />
        <SidebarInset className="flex overflow-hidden">
          <Header 
            isMobileSidebarOpen={isMobileSidebarOpen} 
            setIsMobileSidebarOpen={setIsMobileSidebarOpen} 
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {children}
          </main>
          <DashboardFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
