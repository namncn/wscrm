'use client'

import { useCallback, useEffect, useState } from 'react'
import { getBrandName } from '@/lib/utils'

interface PublicSettings {
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
}

export function usePublicSettings() {
  const brandName = getBrandName()
  const [settings, setSettings] = useState<PublicSettings>({
    companyName: brandName,
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings', { cache: 'no-store' })
      if (!response.ok) {
        console.error('Failed to fetch settings:', response.status)
        return
      }
      const result = await response.json()
      if (result.success && result.data) {
        setSettings({
          companyName: result.data.companyName || brandName,
          companyEmail: result.data.companyEmail || '',
          companyPhone: result.data.companyPhone || '',
          companyAddress: result.data.companyAddress || '',
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [brandName])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return { settings, isLoading, refetchSettings: fetchSettings }
}

