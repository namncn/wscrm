'use client'

import { getBrandName } from '@/lib/utils'
import { toastSuccess, toastError } from '@/lib/toast'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  User, 
  Bell,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

const FOOTER_DESCRIPTION_DEFAULT =
  'Nhà cung cấp dịch vụ hosting, domain và VPS hàng đầu Việt Nam. Cam kết mang đến giải pháp công nghệ tốt nhất cho doanh nghiệp.'

const FOOTER_LINK_DEFAULTS = {
  footerTicketSupportLink: '/support/ticket',
  footerLiveChatLink: '/support/live-chat',
  footerNewsLink: '/news',
  footerHelpCenterLink: '/support/help-center',
  footerRecruitmentLink: '/careers',
  footerSslCertificateLink: '/services/ssl-certificate',
  footerEmailHostingLink: '/services/email-hosting',
  footerBackupServiceLink: '/services/backup-service',
  footerUserGuideLink: '/support/user-guide',
  footerFaqLink: '/support/faq',
  footerContactLink: '/support/contact',
  footerAboutLink: '/about',
  footerPartnersLink: '/partners',
  footerPrivacyPolicyLink: '/privacy-policy',
  footerTermsLink: '/terms',
  footerFacebookLink: '#',
  footerTwitterLink: '#',
  footerTiktokLink: '#',
}

export default function SettingsPage() {
  const brandName = getBrandName()
  const [settings, setSettings] = useState({
    // General Settings
    companyName: getBrandName(),
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyTaxCode: '',
    companyAccountingEmail: '',
    companyBankName: '',
    companyBankAccount: '',
    companyBankAccountName: '',
    companyBankBranch: '',
    
    // Notification Settings
    serviceExpiryEmailNotifications: true, // Bật/tắt email thông báo hết hạn dịch vụ
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordPolicy: 'strong',
    
    // System Settings
    autoBackup: true,
    backupFrequency: 'daily',
    logRetention: 90,
    
    // Payment Settings
    defaultCurrency: 'VND',
    taxRate: 10,
    paymentGateway: 'cash',
    
    // Footer Settings
    footerDescription: FOOTER_DESCRIPTION_DEFAULT,
    ...FOOTER_LINK_DEFAULTS,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/settings')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setSettings(prev => ({
              ...prev,
              ...result.data,
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
        toastError('Không thể tải cài đặt')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSaveStatus('success')
        // Update local state with saved data
        if (result.data) {
          setSettings(prev => ({
            ...prev,
            ...result.data,
          }))
        }
        toastSuccess('Đã lưu cài đặt thành công')
      } else {
        setSaveStatus('error')
        toastError(result.error || 'Không thể lưu cài đặt')
      }
    } catch (error) {
      setSaveStatus('error')
      console.error('Error saving settings:', error)
      toastError('Đã xảy ra lỗi khi lưu cài đặt')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Cài Đặt Hệ Thống</h1>
            <p className="text-gray-600 mt-1">Quản lý cài đặt và cấu hình hệ thống {brandName}</p>
          </div>
          <div className="flex items-center space-x-2">
            {saveStatus === 'success' && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Đã lưu</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Lỗi lưu</span>
              </div>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu Cài Đặt
                </>
              )}
            </Button>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Thông Tin Công Ty</span>
            </CardTitle>
            <CardDescription>Cấu hình thông tin cơ bản của công ty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Tên Công Ty</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => handleSettingChange('companyName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email Công Ty</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Số Điện Thoại</Label>
                <Input
                  id="companyPhone"
                  value={settings.companyPhone}
                  onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyTaxCode">Mã Số Thuế</Label>
                <Input
                  id="companyTaxCode"
                  value={settings.companyTaxCode}
                  onChange={(e) => handleSettingChange('companyTaxCode', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAccountingEmail">Email Kế Toán</Label>
              <Input
                id="companyAccountingEmail"
                type="email"
                value={settings.companyAccountingEmail}
                onChange={(e) => handleSettingChange('companyAccountingEmail', e.target.value)}
                placeholder="vd: accounting@company.vn"
              />
              <p className="text-xs text-muted-foreground">
                Email sẽ nhận bản sao các hoá đơn khi bật tuỳ chọn CC phòng kế toán.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyBankName">Tên Ngân Hàng</Label>
                <Input
                  id="companyBankName"
                  value={settings.companyBankName}
                  onChange={(e) => handleSettingChange('companyBankName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyBankAccount">Số Tài Khoản Ngân Hàng</Label>
                <Input
                  id="companyBankAccount"
                  value={settings.companyBankAccount}
                  onChange={(e) => handleSettingChange('companyBankAccount', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyBankAccountName">Tên Tài Khoản Nhận</Label>
                <Input
                  id="companyBankAccountName"
                  value={settings.companyBankAccountName}
                  onChange={(e) => handleSettingChange('companyBankAccountName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyBankBranch">Chi Nhánh</Label>
                <Input
                  id="companyBankBranch"
                  value={settings.companyBankBranch}
                  onChange={(e) => handleSettingChange('companyBankBranch', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Địa Chỉ</Label>
              <Textarea
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Cài Đặt Thông Báo</span>
            </CardTitle>
            <CardDescription>Quản lý các thông báo và cảnh báo hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="serviceExpiryEmailNotifications">Email Thông Báo Hết Hạn Dịch Vụ</Label>
                <p className="text-sm text-gray-500">
                  Tự động gửi email thông báo khi dịch vụ sắp hết hạn, đã hết hạn, sắp bị xóa và đã bị xóa
                </p>
              </div>
              <Switch
                id="serviceExpiryEmailNotifications"
                checked={settings.serviceExpiryEmailNotifications}
                onCheckedChange={(checked) => handleSettingChange('serviceExpiryEmailNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Footer</span>
            </CardTitle>
            <CardDescription>Cài đặt nội dung hiển thị dưới chân trang frontend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="footerDescription">Mô tả dưới logo</Label>
              <Textarea
                id="footerDescription"
                value={settings.footerDescription}
                onChange={(e) => handleSettingChange('footerDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="footerTicketSupportLink">Link Ticket hỗ trợ</Label>
                <Input
                  id="footerTicketSupportLink"
                  value={settings.footerTicketSupportLink}
                  onChange={(e) => handleSettingChange('footerTicketSupportLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerLiveChatLink">Link Live chat</Label>
                <Input
                  id="footerLiveChatLink"
                  value={settings.footerLiveChatLink}
                  onChange={(e) => handleSettingChange('footerLiveChatLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerNewsLink">Link Tin tức</Label>
                <Input
                  id="footerNewsLink"
                  value={settings.footerNewsLink}
                  onChange={(e) => handleSettingChange('footerNewsLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerHelpCenterLink">Link Trung tâm hỗ trợ</Label>
                <Input
                  id="footerHelpCenterLink"
                  value={settings.footerHelpCenterLink}
                  onChange={(e) => handleSettingChange('footerHelpCenterLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerRecruitmentLink">Link Tuyển dụng</Label>
                <Input
                  id="footerRecruitmentLink"
                  value={settings.footerRecruitmentLink}
                  onChange={(e) => handleSettingChange('footerRecruitmentLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerSslCertificateLink">Link SSL Certificate</Label>
                <Input
                  id="footerSslCertificateLink"
                  value={settings.footerSslCertificateLink}
                  onChange={(e) => handleSettingChange('footerSslCertificateLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerEmailHostingLink">Link Email Hosting</Label>
                <Input
                  id="footerEmailHostingLink"
                  value={settings.footerEmailHostingLink}
                  onChange={(e) => handleSettingChange('footerEmailHostingLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerBackupServiceLink">Link Backup Service</Label>
                <Input
                  id="footerBackupServiceLink"
                  value={settings.footerBackupServiceLink}
                  onChange={(e) => handleSettingChange('footerBackupServiceLink', e.target.value)}
                  placeholder="#"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="footerUserGuideLink">Link Hướng dẫn sử dụng</Label>
                <Input
                  id="footerUserGuideLink"
                  value={settings.footerUserGuideLink}
                  onChange={(e) => handleSettingChange('footerUserGuideLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerFaqLink">Link FAQ</Label>
                <Input
                  id="footerFaqLink"
                  value={settings.footerFaqLink}
                  onChange={(e) => handleSettingChange('footerFaqLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerContactLink">Link Liên hệ</Label>
                <Input
                  id="footerContactLink"
                  value={settings.footerContactLink}
                  onChange={(e) => handleSettingChange('footerContactLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerAboutLink">Link Về chúng tôi</Label>
                <Input
                  id="footerAboutLink"
                  value={settings.footerAboutLink}
                  onChange={(e) => handleSettingChange('footerAboutLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerPartnersLink">Link Đối tác</Label>
                <Input
                  id="footerPartnersLink"
                  value={settings.footerPartnersLink}
                  onChange={(e) => handleSettingChange('footerPartnersLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerPrivacyPolicyLink">Link Chính sách bảo mật</Label>
                <Input
                  id="footerPrivacyPolicyLink"
                  value={settings.footerPrivacyPolicyLink}
                  onChange={(e) => handleSettingChange('footerPrivacyPolicyLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerTermsLink">Link Điều khoản sử dụng</Label>
                <Input
                  id="footerTermsLink"
                  value={settings.footerTermsLink}
                  onChange={(e) => handleSettingChange('footerTermsLink', e.target.value)}
                  placeholder="#"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="footerFacebookLink">Link Facebook</Label>
                <Input
                  id="footerFacebookLink"
                  value={settings.footerFacebookLink}
                  onChange={(e) => handleSettingChange('footerFacebookLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerTwitterLink">Link Twitter/X</Label>
                <Input
                  id="footerTwitterLink"
                  value={settings.footerTwitterLink}
                  onChange={(e) => handleSettingChange('footerTwitterLink', e.target.value)}
                  placeholder="#"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerTiktokLink">Link Tiktok</Label>
                <Input
                  id="footerTiktokLink"
                  value={settings.footerTiktokLink}
                  onChange={(e) => handleSettingChange('footerTiktokLink', e.target.value)}
                  placeholder="#"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Để trống hoặc nhập ký tự # nếu bạn muốn vô hiệu hóa liên kết.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}