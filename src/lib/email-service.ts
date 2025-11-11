import { db } from './database'
import { emailNotifications, settings, customers, domain, hosting, vps } from './schema'
import { eq, and, gte, lte, inArray, isNotNull } from 'drizzle-orm'
import { getBrandName } from './utils'

const SETTINGS_KEY = 'general'

interface ServiceInfo {
  id: number
  expiryDate: string | null
  customerId: number | null
  name: string
}

// Email templates
function getExpiringSoonEmailTemplate(
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS',
  serviceName: string,
  expiryDate: string,
  daysRemaining: number
): { subject: string; content: string } {
  const brandName = getBrandName()
  const serviceTypeLabel = serviceType === 'DOMAIN' ? 'TÊN MIỀN' : serviceType === 'HOSTING' ? 'HOSTING' : 'VPS'
  
  const subject = `Cảnh báo: ${serviceName} sắp hết hạn trong ${daysRemaining} ngày - ${brandName}`
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cảnh báo hết hạn dịch vụ</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Cảnh báo hết hạn dịch vụ</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Chúng tôi thông báo rằng dịch vụ <strong>${serviceName}</strong> (${serviceTypeLabel}) của bạn sẽ hết hạn trong <strong>${daysRemaining} ngày</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="margin-top: 0; color: #d97706;">Thông tin dịch vụ:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Loại dịch vụ:</strong> ${serviceTypeLabel}</li>
              <li><strong>Tên dịch vụ:</strong> ${serviceName}</li>
              <li><strong>Ngày hết hạn:</strong> ${new Date(expiryDate).toLocaleDateString('vi-VN')}</li>
              <li><strong>Còn lại:</strong> ${daysRemaining} ngày</li>
            </ul>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>⚠️ Quan trọng:</strong> Vui lòng gia hạn dịch vụ trước ngày hết hạn để tránh gián đoạn dịch vụ.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Gia hạn dịch vụ ngay</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Nếu bạn đã gia hạn dịch vụ hoặc có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${brandName}</strong>
          </p>
        </div>
      </body>
    </html>
  `
  
  return { subject, content }
}

function getExpiredEmailTemplate(
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS',
  serviceName: string,
  expiryDate: string
): { subject: string; content: string } {
  const brandName = getBrandName()
  const serviceTypeLabel = serviceType === 'DOMAIN' ? 'TÊN MIỀN' : serviceType === 'HOSTING' ? 'HOSTING' : 'VPS'
  
  const subject = `Thông báo: ${serviceName} đã hết hạn - ${brandName}`
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dịch vụ đã hết hạn</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">❌ Dịch vụ đã hết hạn</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Chúng tôi thông báo rằng dịch vụ <strong>${serviceName}</strong> (${serviceTypeLabel}) của bạn đã hết hạn vào ngày <strong>${new Date(expiryDate).toLocaleDateString('vi-VN')}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h2 style="margin-top: 0; color: #dc2626;">Thông tin dịch vụ:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Loại dịch vụ:</strong> ${serviceTypeLabel}</li>
              <li><strong>Tên dịch vụ:</strong> ${serviceName}</li>
              <li><strong>Ngày hết hạn:</strong> ${new Date(expiryDate).toLocaleDateString('vi-VN')}</li>
            </ul>
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-size: 14px; color: #dc2626;">
              <strong>⚠️ Cảnh báo:</strong> Dịch vụ của bạn đã hết hạn. Vui lòng gia hạn ngay để khôi phục dịch vụ.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Gia hạn dịch vụ ngay</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Nếu bạn đã gia hạn dịch vụ hoặc có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi ngay lập tức.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${brandName}</strong>
          </p>
        </div>
      </body>
    </html>
  `
  
  return { subject, content }
}

function getDeletionWarningEmailTemplate(
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS',
  serviceName: string,
  expiryDate: string,
  deletionDate: string
): { subject: string; content: string } {
  const brandName = getBrandName()
  const serviceTypeLabel = serviceType === 'DOMAIN' ? 'TÊN MIỀN' : serviceType === 'HOSTING' ? 'HOSTING' : 'VPS'
  
  const subject = `Cảnh báo khẩn cấp: ${serviceName} sắp bị xóa - ${brandName}`
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cảnh báo xóa dịch vụ</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚨 Cảnh báo khẩn cấp</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Đây là cảnh báo cuối cùng về dịch vụ <strong>${serviceName}</strong> (${serviceTypeLabel}) của bạn. Dịch vụ sẽ bị xóa vào ngày <strong>${new Date(deletionDate).toLocaleDateString('vi-VN')}</strong> nếu không được gia hạn.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="margin-top: 0; color: #991b1b;">Thông tin dịch vụ:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Loại dịch vụ:</strong> ${serviceTypeLabel}</li>
              <li><strong>Tên dịch vụ:</strong> ${serviceName}</li>
              <li><strong>Ngày hết hạn:</strong> ${new Date(expiryDate).toLocaleDateString('vi-VN')}</li>
              <li><strong>Ngày xóa dự kiến:</strong> ${new Date(deletionDate).toLocaleDateString('vi-VN')}</li>
            </ul>
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>🚨 Cảnh báo khẩn cấp:</strong> Dịch vụ của bạn sẽ bị xóa vĩnh viễn sau ngày ${new Date(deletionDate).toLocaleDateString('vi-VN')}. Vui lòng gia hạn ngay để tránh mất dữ liệu!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Gia hạn ngay để bảo vệ dịch vụ</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Sau khi dịch vụ bị xóa, dữ liệu sẽ không thể khôi phục. Vui lòng hành động ngay!
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${brandName}</strong>
          </p>
        </div>
      </body>
    </html>
  `
  
  return { subject, content }
}

function getDeletedEmailTemplate(
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS',
  serviceName: string,
  expiryDate: string,
  deletionDate: string
): { subject: string; content: string } {
  const brandName = getBrandName()
  const serviceTypeLabel = serviceType === 'DOMAIN' ? 'TÊN MIỀN' : serviceType === 'HOSTING' ? 'HOSTING' : 'VPS'
  
  const subject = `Thông báo: ${serviceName} đã bị xóa - ${brandName}`
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dịch vụ đã bị xóa</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🗑️ Dịch vụ đã bị xóa</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Chúng tôi thông báo rằng dịch vụ <strong>${serviceName}</strong> (${serviceTypeLabel}) của bạn đã bị xóa vào ngày <strong>${new Date(deletionDate).toLocaleDateString('vi-VN')}</strong> do đã quá hạn không được gia hạn.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h2 style="margin-top: 0; color: #4b5563;">Thông tin dịch vụ đã xóa:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Loại dịch vụ:</strong> ${serviceTypeLabel}</li>
              <li><strong>Tên dịch vụ:</strong> ${serviceName}</li>
              <li><strong>Ngày hết hạn:</strong> ${new Date(expiryDate).toLocaleDateString('vi-VN')}</li>
              <li><strong>Ngày xóa:</strong> ${new Date(deletionDate).toLocaleDateString('vi-VN')}</li>
            </ul>
          </div>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Lưu ý:</strong> Dịch vụ và dữ liệu liên quan đã bị xóa vĩnh viễn và không thể khôi phục.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xem dịch vụ khác</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Nếu bạn muốn sử dụng lại dịch vụ, vui lòng đăng ký mới trên hệ thống của chúng tôi.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${brandName}</strong>
          </p>
        </div>
      </body>
    </html>
  `
  
  return { subject, content }
}

// Check if email notification already exists
async function checkExistingNotification(
  customerId: number,
  serviceId: number,
  notificationType: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(emailNotifications)
    .where(
      and(
        eq(emailNotifications.customerId, customerId),
        eq(emailNotifications.serviceId, serviceId),
        eq(emailNotifications.notificationType, notificationType as any),
        inArray(emailNotifications.status, ['PENDING', 'SENDING', 'SENT'])
      )
    )
    .limit(1)

  return existing.length > 0
}

// Schedule email notifications for expiring services
export async function scheduleExpiringEmails() {
  try {
    // Check if service expiry email notifications are enabled
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    let settingsValue: any = settingsData.length > 0 ? settingsData[0].value : null
    if (settingsValue && typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch {
        settingsValue = null
      }
    }

    const serviceExpiryEmailNotifications = settingsValue?.serviceExpiryEmailNotifications ?? true

    if (!serviceExpiryEmailNotifications) {
      return { scheduled: 0, message: 'Service expiry email notifications are disabled' }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneMonthFromNow = new Date(today)
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

    // Calculate dates for 3 expiring emails (30 days, 15 days, 7 days before expiry)
    const days30 = new Date(today)
    days30.setDate(days30.getDate() + 30)
    const days15 = new Date(today)
    days15.setDate(days15.getDate() + 15)
    const days7 = new Date(today)
    days7.setDate(days7.getDate() + 7)

    let scheduled = 0

    // Check domains
    const domains = await db.select().from(domain).where(
      and(
        eq(domain.status, 'ACTIVE'),
        gte(domain.expiryDate, today),
        lte(domain.expiryDate, oneMonthFromNow)
      )
    )

    for (const dom of domains) {
      if (!dom.customerId || !dom.expiryDate) continue

      const expiryDate = new Date(dom.expiryDate)
      const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const customer = await db.select().from(customers).where(eq(customers.id, dom.customerId)).limit(1)
      if (customer.length === 0) continue

      // Email 1: 30 days before expiry
      if (daysRemaining <= 30 && daysRemaining > 15) {
        const exists = await checkExistingNotification(dom.customerId, dom.id, 'EXPIRING_SOON_1')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('DOMAIN', dom.domainName, dom.expiryDate ? dom.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: dom.customerId,
            serviceId: dom.id,
            serviceType: 'DOMAIN',
            notificationType: 'EXPIRING_SOON_1',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      // Email 2: 15 days before expiry
      if (daysRemaining <= 15 && daysRemaining > 7) {
        const exists = await checkExistingNotification(dom.customerId, dom.id, 'EXPIRING_SOON_2')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('DOMAIN', dom.domainName, dom.expiryDate ? dom.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: dom.customerId,
            serviceId: dom.id,
            serviceType: 'DOMAIN',
            notificationType: 'EXPIRING_SOON_2',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      // Email 3: 7 days before expiry
      if (daysRemaining <= 7 && daysRemaining > 0) {
        const exists = await checkExistingNotification(dom.customerId, dom.id, 'EXPIRING_SOON_3')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('DOMAIN', dom.domainName, dom.expiryDate ? dom.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: dom.customerId,
            serviceId: dom.id,
            serviceType: 'DOMAIN',
            notificationType: 'EXPIRING_SOON_3',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check hosting
    const hostings = await db.select().from(hosting).where(
      and(
        eq(hosting.status, 'ACTIVE'),
        isNotNull(hosting.expiryDate),
        gte(hosting.expiryDate, today),
        lte(hosting.expiryDate, oneMonthFromNow)
      )
    )

    for (const host of hostings) {
      if (!host.customerId || !host.expiryDate) continue

      const expiryDate = new Date(host.expiryDate)
      const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const customer = await db.select().from(customers).where(eq(customers.id, host.customerId)).limit(1)
      if (customer.length === 0) continue

      if (daysRemaining <= 30 && daysRemaining > 15) {
        const exists = await checkExistingNotification(host.customerId, host.id, 'EXPIRING_SOON_1')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('HOSTING', host.planName, host.expiryDate ? host.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: host.customerId,
            serviceId: host.id,
            serviceType: 'HOSTING',
            notificationType: 'EXPIRING_SOON_1',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      if (daysRemaining <= 15 && daysRemaining > 7) {
        const exists = await checkExistingNotification(host.customerId, host.id, 'EXPIRING_SOON_2')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('HOSTING', host.planName, host.expiryDate ? host.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: host.customerId,
            serviceId: host.id,
            serviceType: 'HOSTING',
            notificationType: 'EXPIRING_SOON_2',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      if (daysRemaining <= 7 && daysRemaining > 0) {
        const exists = await checkExistingNotification(host.customerId, host.id, 'EXPIRING_SOON_3')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('HOSTING', host.planName, host.expiryDate ? host.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: host.customerId,
            serviceId: host.id,
            serviceType: 'HOSTING',
            notificationType: 'EXPIRING_SOON_3',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check VPS
    const vpsList = await db.select().from(vps).where(
      and(
        eq(vps.status, 'ACTIVE'),
        isNotNull(vps.expiryDate),
        gte(vps.expiryDate, today),
        lte(vps.expiryDate, oneMonthFromNow)
      )
    )

    for (const v of vpsList) {
      if (!v.customerId || !v.expiryDate) continue

      const expiryDate = new Date(v.expiryDate)
      const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const customer = await db.select().from(customers).where(eq(customers.id, v.customerId)).limit(1)
      if (customer.length === 0) continue

      if (daysRemaining <= 30 && daysRemaining > 15) {
        const exists = await checkExistingNotification(v.customerId, v.id, 'EXPIRING_SOON_1')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('VPS', v.planName, v.expiryDate ? v.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: v.customerId,
            serviceId: v.id,
            serviceType: 'VPS',
            notificationType: 'EXPIRING_SOON_1',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      if (daysRemaining <= 15 && daysRemaining > 7) {
        const exists = await checkExistingNotification(v.customerId, v.id, 'EXPIRING_SOON_2')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('VPS', v.planName, v.expiryDate ? v.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: v.customerId,
            serviceId: v.id,
            serviceType: 'VPS',
            notificationType: 'EXPIRING_SOON_2',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }

      if (daysRemaining <= 7 && daysRemaining > 0) {
        const exists = await checkExistingNotification(v.customerId, v.id, 'EXPIRING_SOON_3')
        if (!exists) {
          const template = getExpiringSoonEmailTemplate('VPS', v.planName, v.expiryDate ? v.expiryDate.toISOString().split('T')[0] : '', daysRemaining)
          await db.insert(emailNotifications).values({
            customerId: v.customerId,
            serviceId: v.id,
            serviceType: 'VPS',
            notificationType: 'EXPIRING_SOON_3',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    return { scheduled, message: `Scheduled ${scheduled} expiring emails` }
  } catch (error) {
    console.error('Error scheduling expiring emails:', error)
    throw error
  }
}

// Schedule email notifications for expired services
export async function scheduleExpiredEmails() {
  try {
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    let settingsValue: any = settingsData.length > 0 ? settingsData[0].value : null
    if (settingsValue && typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch {
        settingsValue = null
      }
    }

    const serviceExpiryEmailNotifications = settingsValue?.serviceExpiryEmailNotifications ?? true

    if (!serviceExpiryEmailNotifications) {
      return { scheduled: 0, message: 'Service expiry email notifications are disabled' }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let scheduled = 0

    // Check expired domains
    const expiredDomains = await db.select().from(domain).where(
      and(
        eq(domain.status, 'ACTIVE'),
        lte(domain.expiryDate, today)
      )
    )

    for (const dom of expiredDomains) {
      if (!dom.customerId || !dom.expiryDate) continue

      const exists = await checkExistingNotification(dom.customerId, dom.id, 'EXPIRED')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, dom.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getExpiredEmailTemplate('DOMAIN', dom.domainName, dom.expiryDate ? dom.expiryDate.toISOString().split('T')[0] : '')
          await db.insert(emailNotifications).values({
            customerId: dom.customerId,
            serviceId: dom.id,
            serviceType: 'DOMAIN',
            notificationType: 'EXPIRED',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check expired hosting
    const expiredHostings = await db.select().from(hosting).where(
      and(
        eq(hosting.status, 'ACTIVE'),
        isNotNull(hosting.expiryDate),
        lte(hosting.expiryDate, today)
      )
    )

    for (const host of expiredHostings) {
      if (!host.customerId || !host.expiryDate) continue

      const exists = await checkExistingNotification(host.customerId, host.id, 'EXPIRED')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, host.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getExpiredEmailTemplate('HOSTING', host.planName, host.expiryDate ? host.expiryDate.toISOString().split('T')[0] : '')
          await db.insert(emailNotifications).values({
            customerId: host.customerId,
            serviceId: host.id,
            serviceType: 'HOSTING',
            notificationType: 'EXPIRED',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check expired VPS
    const expiredVPS = await db.select().from(vps).where(
      and(
        eq(vps.status, 'ACTIVE'),
        isNotNull(vps.expiryDate),
        lte(vps.expiryDate, today)
      )
    )

    for (const v of expiredVPS) {
      if (!v.customerId || !v.expiryDate) continue

      const exists = await checkExistingNotification(v.customerId, v.id, 'EXPIRED')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, v.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getExpiredEmailTemplate('VPS', v.planName, v.expiryDate ? v.expiryDate.toISOString().split('T')[0] : '')
          await db.insert(emailNotifications).values({
            customerId: v.customerId,
            serviceId: v.id,
            serviceType: 'VPS',
            notificationType: 'EXPIRED',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    return { scheduled, message: `Scheduled ${scheduled} expired emails` }
  } catch (error) {
    console.error('Error scheduling expired emails:', error)
    throw error
  }
}

// Schedule deletion warning emails (7 days after expiry)
export async function scheduleDeletionWarningEmails() {
  try {
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    let settingsValue: any = settingsData.length > 0 ? settingsData[0].value : null
    if (settingsValue && typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch {
        settingsValue = null
      }
    }

    const serviceExpiryEmailNotifications = settingsValue?.serviceExpiryEmailNotifications ?? true

    if (!serviceExpiryEmailNotifications) {
      return { scheduled: 0, message: 'Service expiry email notifications are disabled' }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deletionDate = new Date(today)
    deletionDate.setDate(deletionDate.getDate() + 7)
    const warningDate = new Date(today)
    warningDate.setDate(warningDate.getDate() + 6)

    let scheduled = 0

    // Check domains that expired 7 days ago
    const domainsToDelete = await db.select().from(domain).where(
      and(
        eq(domain.status, 'ACTIVE'),
        isNotNull(domain.expiryDate),
        lte(domain.expiryDate, new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
      )
    )

    for (const dom of domainsToDelete) {
      if (!dom.customerId || !dom.expiryDate) continue

      const exists = await checkExistingNotification(dom.customerId, dom.id, 'DELETION_WARNING')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, dom.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getDeletionWarningEmailTemplate('DOMAIN', dom.domainName, dom.expiryDate ? dom.expiryDate.toISOString().split('T')[0] : '', deletionDate.toISOString().split('T')[0])
          await db.insert(emailNotifications).values({
            customerId: dom.customerId,
            serviceId: dom.id,
            serviceType: 'DOMAIN',
            notificationType: 'DELETION_WARNING',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check hosting that expired 7 days ago
    const hostingsToDelete = await db.select().from(hosting).where(
      and(
        eq(hosting.status, 'ACTIVE'),
        isNotNull(hosting.expiryDate),
        lte(hosting.expiryDate, new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
      )
    )

    for (const host of hostingsToDelete) {
      if (!host.customerId || !host.expiryDate) continue

      const exists = await checkExistingNotification(host.customerId, host.id, 'DELETION_WARNING')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, host.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getDeletionWarningEmailTemplate('HOSTING', host.planName, host.expiryDate ? host.expiryDate.toISOString().split('T')[0] : '', deletionDate.toISOString().split('T')[0])
          await db.insert(emailNotifications).values({
            customerId: host.customerId,
            serviceId: host.id,
            serviceType: 'HOSTING',
            notificationType: 'DELETION_WARNING',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    // Check VPS that expired 7 days ago
    const vpsToDelete = await db.select().from(vps).where(
      and(
        eq(vps.status, 'ACTIVE'),
        isNotNull(vps.expiryDate),
        lte(vps.expiryDate, new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
      )
    )

    for (const v of vpsToDelete) {
      if (!v.customerId || !v.expiryDate) continue

      const exists = await checkExistingNotification(v.customerId, v.id, 'DELETION_WARNING')
      if (!exists) {
        const customer = await db.select().from(customers).where(eq(customers.id, v.customerId)).limit(1)
        if (customer.length > 0) {
          const template = getDeletionWarningEmailTemplate('VPS', v.planName, v.expiryDate ? v.expiryDate.toISOString().split('T')[0] : '', deletionDate.toISOString().split('T')[0])
          await db.insert(emailNotifications).values({
            customerId: v.customerId,
            serviceId: v.id,
            serviceType: 'VPS',
            notificationType: 'DELETION_WARNING',
            subject: template.subject,
            content: template.content,
            recipientEmail: customer[0].email,
            status: 'PENDING',
            scheduledAt: now,
          })
          scheduled++
        }
      }
    }

    return { scheduled, message: `Scheduled ${scheduled} deletion warning emails` }
  } catch (error) {
    console.error('Error scheduling deletion warning emails:', error)
    throw error
  }
}

// Schedule deleted emails (after service is actually deleted)
export async function scheduleDeletedEmails(serviceType: 'DOMAIN' | 'HOSTING' | 'VPS', serviceId: number, serviceName: string, customerId: number, expiryDate: string) {
  try {
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1)

    let settingsValue: any = settingsData.length > 0 ? settingsData[0].value : null
    if (settingsValue && typeof settingsValue === 'string') {
      try {
        settingsValue = JSON.parse(settingsValue)
      } catch {
        settingsValue = null
      }
    }

    const serviceExpiryEmailNotifications = settingsValue?.serviceExpiryEmailNotifications ?? true

    if (!serviceExpiryEmailNotifications) {
      return { scheduled: 0, message: 'Service expiry email notifications are disabled' }
    }

    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
    if (customer.length === 0) {
      return { scheduled: 0, message: 'Customer not found' }
    }

    const now = new Date()
    const deletionDate = now.toISOString().split('T')[0]

    const exists = await checkExistingNotification(customerId, serviceId, 'DELETED')
    if (!exists) {
      const template = getDeletedEmailTemplate(serviceType, serviceName, expiryDate, deletionDate)
      await db.insert(emailNotifications).values({
        customerId,
        serviceId,
        serviceType,
        notificationType: 'DELETED',
        subject: template.subject,
        content: template.content,
        recipientEmail: customer[0].email,
        status: 'PENDING',
        scheduledAt: now,
      })
      return { scheduled: 1, message: 'Scheduled deleted email' }
    }

    return { scheduled: 0, message: 'Email already exists' }
  } catch (error) {
    console.error('Error scheduling deleted email:', error)
    throw error
  }
}

