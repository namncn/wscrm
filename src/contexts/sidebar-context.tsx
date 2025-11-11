'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  isHydrated: boolean
  shouldEnableTransition: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Always start with false for SSR consistency
  // Will be updated after hydration to match localStorage
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [shouldEnableTransition, setShouldEnableTransition] = useState(false)

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) {
        // Update state immediately without transition
        setIsCollapsed(saved === 'true')
      }
    } catch (error) {
      console.error('Error loading sidebar state from localStorage:', error)
    } finally {
      setIsHydrated(true)
      // Enable transition after a delay to prevent initial transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldEnableTransition(true)
        })
      })
    }
  }, [])

  // Save to localStorage whenever isCollapsed changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed))
      } catch (error) {
        console.error('Error saving sidebar state to localStorage:', error)
      }
    }
  }, [isCollapsed, isHydrated])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev)
  }

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed, 
      toggleSidebar, 
      isHydrated,
      shouldEnableTransition 
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
