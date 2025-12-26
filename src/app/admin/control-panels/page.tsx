'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code, Network, Loader2, Save, AlertCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface EnhanceSettings {
  apiKey: string
  apiUrl: string
  apiOrgId: string
}

export default function ControlPanelsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enhanceSettings, setEnhanceSettings] = useState<EnhanceSettings>({
    apiKey: '',
    apiUrl: '',
    apiOrgId: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    // Check if user is ADMIN
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }
    fetchEnhanceSettings()
  }, [session, status, router])

  const fetchEnhanceSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/control-panels')
      if (response.ok) {
        const data = await response.json()
        // Find Enhance control panel
        const enhancePanel = data.data?.find((cp: any) => cp.type === 'ENHANCE')
        if (enhancePanel?.config) {
          const config = typeof enhancePanel.config === 'string' 
            ? JSON.parse(enhancePanel.config) 
            : enhancePanel.config
          setEnhanceSettings({
            apiKey: config.apiKey || '',
            apiUrl: config.baseUrl || config.apiUrl || '',
            apiOrgId: config.orgId || config.apiOrgId || '',
          })
        }
      }
    } catch (error) {
      console.error('Error fetching enhance settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveEnhanceSettings = async () => {
    try {
      setSaving(true)
      
      // Validation
      if (!enhanceSettings.apiKey.trim()) {
        toastError('API Key là bắt buộc')
        setSaving(false)
        return
      }
      if (!enhanceSettings.apiUrl.trim()) {
        toastError('API URL là bắt buộc')
        setSaving(false)
        return
      }
      if (!enhanceSettings.apiOrgId.trim()) {
        toastError('API Org ID là bắt buộc')
        setSaving(false)
        return
      }
      
      const config = {
        apiKey: enhanceSettings.apiKey,
        baseUrl: enhanceSettings.apiUrl,
        orgId: enhanceSettings.apiOrgId,
      }

      // Check if Enhance control panel exists
      const checkResponse = await fetch('/api/control-panels')
      const checkData = await checkResponse.json()
      const enhancePanel = checkData.data?.find((cp: any) => cp.type === 'ENHANCE')

      let response
      if (enhancePanel) {
        // Update existing
        response = await fetch('/api/control-panels', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ENHANCE',
            enabled: 'YES',
            config: config,
          }),
        })
      } else {
        // Create new
        response = await fetch('/api/control-panels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ENHANCE',
            enabled: 'YES',
            config: config,
          }),
        })
      }

      if (response.ok) {
        toastSuccess('Lưu cài đặt Enhance thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể lưu cài đặt')
      }
    } catch (error) {
      console.error('Error saving enhance settings:', error)
      toastError('Có lỗi xảy ra khi lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Control Panels Settings</h1>
            <p className="text-muted-foreground">Cấu hình các control panel tích hợp</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/control-panels/plans">
              <Button variant="outline">
                <Network className="h-4 w-4" />
                Plan Mappings
              </Button>
            </Link>
            <Link href="/admin/control-panels/test">
              <Button variant="outline">
                <Code className="h-4 w-4" />
                Test API
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="enhance" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="enhance">Enhance</TabsTrigger>
                <TabsTrigger value="cpanel">cPanel</TabsTrigger>
                <TabsTrigger value="directadmin">DirectAdmin</TabsTrigger>
                <TabsTrigger value="plesk">Plesk</TabsTrigger>
              </TabsList>

              {/* Enhance Tab */}
              <TabsContent value="enhance" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Enhance Control Panel Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Cấu hình thông tin kết nối với Enhance Control Panel API
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="apiKey">
                        API Key <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={enhanceSettings.apiKey}
                        onChange={(e) => setEnhanceSettings({ ...enhanceSettings, apiKey: e.target.value })}
                        placeholder="Nhập API Key"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="apiUrl">
                        API URL <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="apiUrl"
                        value={enhanceSettings.apiUrl}
                        onChange={(e) => setEnhanceSettings({ ...enhanceSettings, apiUrl: e.target.value })}
                        placeholder="https://api.enhance.com"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="apiOrgId">
                        API Org ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="apiOrgId"
                        value={enhanceSettings.apiOrgId}
                        onChange={(e) => setEnhanceSettings({ ...enhanceSettings, apiOrgId: e.target.value })}
                        placeholder="Nhập Organization ID"
                      />
                      <p className="text-xs text-muted-foreground">
                        Organization ID trong Enhance Control Panel
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={saveEnhanceSettings} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Lưu cài đặt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* cPanel Tab */}
              <TabsContent value="cpanel" className="mt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">cPanel</h3>
                  <p className="text-muted-foreground">
                    Tính năng này đang được phát triển
                  </p>
                </div>
              </TabsContent>

              {/* DirectAdmin Tab */}
              <TabsContent value="directadmin" className="mt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">DirectAdmin</h3>
                  <p className="text-muted-foreground">
                    Tính năng này đang được phát triển
                  </p>
                </div>
              </TabsContent>

              {/* Plesk Tab */}
              <TabsContent value="plesk" className="mt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Plesk</h3>
                  <p className="text-muted-foreground">
                    Tính năng này đang được phát triển
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
