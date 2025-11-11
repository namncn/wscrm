import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const SETTINGS_KEY = 'general'

const FOOTER_DESCRIPTION_DEFAULT =
  'Nhà cung cấp dịch vụ hosting, domain và VPS hàng đầu Việt Nam. Cam kết mang đến giải pháp công nghệ tốt nhất cho doanh nghiệp.'

const DEFAULT_SETTINGS = {
  companyName: process.env.NEXT_PUBLIC_BRAND_NAME || 'CRM Portal',
  companyEmail: 'support@crmportal.com',
  companyPhone: '1900 1234',
  companyAddress: '123 Nguyễn Huệ, Q1, TP.HCM',
  companyTaxCode: '',
  companyAccountingEmail: '',
  companyBankName: '',
  companyBankAccount: '',
  companyBankAccountName: '',
  companyBankBranch: '',
  twoFactorAuth: false,
  sessionTimeout: 30,
  passwordPolicy: 'strong',
  autoBackup: true,
  backupFrequency: 'daily',
  logRetention: 90,
  defaultCurrency: 'VND',
  taxRate: 10,
  paymentGateway: 'cash',
  serviceExpiryEmailNotifications: true,
  footerDescription: FOOTER_DESCRIPTION_DEFAULT,
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

// GET /api/settings - Public endpoint to get settings
export async function GET() {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    if (result.length === 0) {
      // Return default settings if not found
      return NextResponse.json({
        success: true,
        data: DEFAULT_SETTINGS,
      })
    }

    // Parse value if it's a string, otherwise use as-is
    let settingsValue = result[0].value
    if (typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch (e) {
        console.error('Error parsing settings value:', e)
        settingsValue = {}
      }
    }

    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(settingsValue as Record<string, any>),
    }

    return NextResponse.json({
      success: true,
      data: mergedSettings,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Admin only endpoint to update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = (session.user as any).role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const rawBody = await request.json()
    
    // Filter out numeric keys (in case body was parsed incorrectly)
    // Only keep object properties (non-numeric keys or valid property names)
    const body: any = {}
    for (const key in rawBody) {
      // Skip numeric string keys (like "0", "1", "2" which indicate string parsing issues)
      if (isNaN(Number(key))) {
        body[key] = rawBody[key]
      }
    }

    // Settings are optional - allow partial updates

    // Check if settings already exist
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    // Get existing settings or defaults
    // Parse value if it's a string, otherwise use as-is
    let existingSettingsValue = existing.length > 0 ? existing[0].value : null
    if (existingSettingsValue && typeof existingSettingsValue === 'string') {
      try {
        existingSettingsValue = JSON.parse(existingSettingsValue)
      } catch (e) {
        console.error('Error parsing existing settings:', e)
        existingSettingsValue = null
      }
    }

    const existingSettings = existingSettingsValue && typeof existingSettingsValue === 'object' && !Array.isArray(existingSettingsValue)
      ? { ...DEFAULT_SETTINGS, ...(existingSettingsValue as Record<string, any>) }
      : { ...DEFAULT_SETTINGS }

    // Merge existing with new settings
    // For company info fields: if provided in body (even if empty), use it. Otherwise keep existing.
    // For other fields: use provided value or keep existing
    const settingsData = {
      companyName: 'companyName' in body ? String(body.companyName || '') : (existingSettings.companyName || process.env.NEXT_PUBLIC_BRAND_NAME || 'CRM Portal'),
      companyEmail: 'companyEmail' in body ? String(body.companyEmail || '') : (existingSettings.companyEmail || ''),
      companyPhone: 'companyPhone' in body ? String(body.companyPhone || '') : (existingSettings.companyPhone || ''),
      companyAddress: 'companyAddress' in body ? String(body.companyAddress || '') : (existingSettings.companyAddress || ''),
      companyTaxCode: 'companyTaxCode' in body ? String(body.companyTaxCode || '') : (existingSettings.companyTaxCode || ''),
      companyAccountingEmail:
        'companyAccountingEmail' in body
          ? String(body.companyAccountingEmail || '')
          : existingSettings.companyAccountingEmail || '',
      companyBankName: 'companyBankName' in body ? String(body.companyBankName || '') : (existingSettings.companyBankName || ''),
      companyBankAccount: 'companyBankAccount' in body ? String(body.companyBankAccount || '') : (existingSettings.companyBankAccount || ''),
      companyBankAccountName: 'companyBankAccountName' in body ? String(body.companyBankAccountName || '') : (existingSettings.companyBankAccountName || ''),
      companyBankBranch: 'companyBankBranch' in body ? String(body.companyBankBranch || '') : (existingSettings.companyBankBranch || ''),
      // Include other settings if provided, otherwise keep existing
      serviceExpiryEmailNotifications: body.serviceExpiryEmailNotifications ?? existingSettings.serviceExpiryEmailNotifications ?? true,
      twoFactorAuth: body.twoFactorAuth ?? existingSettings.twoFactorAuth ?? false,
      sessionTimeout: body.sessionTimeout ?? existingSettings.sessionTimeout ?? 30,
      passwordPolicy: body.passwordPolicy || existingSettings.passwordPolicy || 'strong',
      autoBackup: body.autoBackup ?? existingSettings.autoBackup ?? true,
      backupFrequency: body.backupFrequency || existingSettings.backupFrequency || 'daily',
      logRetention: body.logRetention ?? existingSettings.logRetention ?? 90,
      defaultCurrency: body.defaultCurrency || existingSettings.defaultCurrency || 'VND',
      taxRate: body.taxRate ?? existingSettings.taxRate ?? 10,
      paymentGateway: body.paymentGateway || existingSettings.paymentGateway || 'cash',
      footerDescription: 'footerDescription' in body ? String(body.footerDescription ?? '') : (existingSettings.footerDescription ?? FOOTER_DESCRIPTION_DEFAULT),
      footerTicketSupportLink: 'footerTicketSupportLink' in body ? String(body.footerTicketSupportLink ?? '') : (existingSettings.footerTicketSupportLink ?? '/support/ticket'),
      footerLiveChatLink: 'footerLiveChatLink' in body ? String(body.footerLiveChatLink ?? '') : (existingSettings.footerLiveChatLink ?? '/support/live-chat'),
      footerNewsLink: 'footerNewsLink' in body ? String(body.footerNewsLink ?? '') : (existingSettings.footerNewsLink ?? '/news'),
      footerHelpCenterLink: 'footerHelpCenterLink' in body ? String(body.footerHelpCenterLink ?? '') : (existingSettings.footerHelpCenterLink ?? '/support/help-center'),
      footerRecruitmentLink: 'footerRecruitmentLink' in body ? String(body.footerRecruitmentLink ?? '') : (existingSettings.footerRecruitmentLink ?? '/careers'),
      footerSslCertificateLink: 'footerSslCertificateLink' in body ? String(body.footerSslCertificateLink ?? '') : (existingSettings.footerSslCertificateLink ?? '/services/ssl-certificate'),
      footerEmailHostingLink: 'footerEmailHostingLink' in body ? String(body.footerEmailHostingLink ?? '') : (existingSettings.footerEmailHostingLink ?? '/services/email-hosting'),
      footerBackupServiceLink: 'footerBackupServiceLink' in body ? String(body.footerBackupServiceLink ?? '') : (existingSettings.footerBackupServiceLink ?? '/services/backup-service'),
      footerUserGuideLink: 'footerUserGuideLink' in body ? String(body.footerUserGuideLink ?? '') : (existingSettings.footerUserGuideLink ?? '/support/user-guide'),
      footerFaqLink: 'footerFaqLink' in body ? String(body.footerFaqLink ?? '') : (existingSettings.footerFaqLink ?? '/support/faq'),
      footerContactLink: 'footerContactLink' in body ? String(body.footerContactLink ?? '') : (existingSettings.footerContactLink ?? '/support/contact'),
      footerAboutLink: 'footerAboutLink' in body ? String(body.footerAboutLink ?? '') : (existingSettings.footerAboutLink ?? '/about'),
      footerPartnersLink: 'footerPartnersLink' in body ? String(body.footerPartnersLink ?? '') : (existingSettings.footerPartnersLink ?? '/partners'),
      footerPrivacyPolicyLink: 'footerPrivacyPolicyLink' in body ? String(body.footerPrivacyPolicyLink ?? '') : (existingSettings.footerPrivacyPolicyLink ?? '/privacy-policy'),
      footerTermsLink: 'footerTermsLink' in body ? String(body.footerTermsLink ?? '') : (existingSettings.footerTermsLink ?? '/terms'),
      footerFacebookLink: 'footerFacebookLink' in body ? String(body.footerFacebookLink ?? '') : (existingSettings.footerFacebookLink ?? '#'),
      footerTwitterLink: 'footerTwitterLink' in body ? String(body.footerTwitterLink ?? '') : (existingSettings.footerTwitterLink ?? '#'),
      footerTiktokLink: 'footerTiktokLink' in body ? String(body.footerTiktokLink ?? '') : (existingSettings.footerTiktokLink ?? '#'),
    }

    // Ensure settingsData is an object, not a string
    const dataToSave = typeof settingsData === 'object' && !Array.isArray(settingsData) 
      ? settingsData 
      : (typeof settingsData === 'string' ? JSON.parse(settingsData) : {})

    if (existing.length > 0) {
      // Update existing settings
      const updateResult = await db
        .update(settings)
        .set({
          value: dataToSave,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, SETTINGS_KEY))

      // Verify the update by fetching the saved data
      const verifyResult = await db
        .select()
        .from(settings)
        .where(eq(settings.key, SETTINGS_KEY))
        .limit(1)

      // Parse value if it's a string
      let savedData = dataToSave
      if (verifyResult.length > 0) {
        let parsedValue = verifyResult[0].value
        if (typeof parsedValue === 'string') {
          try {
            parsedValue = JSON.parse(parsedValue)
          } catch (e) {
            console.error('Error parsing verified settings:', e)
          }
        }
        savedData = parsedValue as any
      }

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        data: savedData,
      })
    } else {
      // Create new settings
      await db.insert(settings).values({
        key: SETTINGS_KEY,
        value: dataToSave,
        description: 'General system settings',
      })

      // Verify the insert by fetching the saved data
      const verifyResult = await db
        .select()
        .from(settings)
        .where(eq(settings.key, SETTINGS_KEY))
        .limit(1)

      // Parse value if it's a string
      let savedData = dataToSave
      if (verifyResult.length > 0) {
        let parsedValue = verifyResult[0].value
        if (typeof parsedValue === 'string') {
          try {
            parsedValue = JSON.parse(parsedValue)
          } catch (e) {
            console.error('Error parsing verified settings:', e)
          }
        }
        savedData = parsedValue as any
      }

      return NextResponse.json({
        success: true,
        message: 'Settings created successfully',
        data: savedData,
      })
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

