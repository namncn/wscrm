'use client'

import { ReactNode } from 'react'
import MemberHeader from './member-header'
import MemberFooter from './member-footer'

interface MemberLayoutProps {
  children: ReactNode
  title?: string
  showBackButton?: boolean
}

export default function MemberLayout({ 
  children, 
  title, 
  showBackButton = false 
}: MemberLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MemberHeader title={title} showBackButton={showBackButton} />
      <main>
        {children}
      </main>
      <MemberFooter />
    </div>
  )
}
