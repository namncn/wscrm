import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { emailNotifications, settings } from '@/lib/schema'
import { eq, and, or, lte, isNull } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'

const SETTINGS_KEY = 'general'

// POST /api/email-notifications/process - Process pending emails
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      )
    }

    // Check admin role - only ADMIN can process emails
    const userRole = (session.user as any)?.role
    const userType = (session.user as any)?.userType
    
    if (userType !== 'admin' || userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Chỉ quản trị viên mới có quyền thực hiện hành động này' },
        { status: 403 }
      )
    }

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
      return NextResponse.json({
        success: true,
        message: 'Service expiry email notifications are disabled',
        processed: 0,
      })
    }

    // Get pending emails that are scheduled to be sent now or earlier
    const now = new Date()
    const pendingEmails = await db
      .select()
      .from(emailNotifications)
      .where(
        and(
          eq(emailNotifications.status, 'PENDING'),
          or(
            lte(emailNotifications.scheduledAt, now),
            isNull(emailNotifications.scheduledAt)
          )
        )
      )
      .limit(10) // Process 10 emails at a time

    let processed = 0
    let failed = 0

    for (const emailNotification of pendingEmails) {
      try {
        // Update status to SENDING
        await db
          .update(emailNotifications)
          .set({ status: 'SENDING', updatedAt: new Date() })
          .where(eq(emailNotifications.id, emailNotification.id))

        // Send email
        await sendEmail({
          to: emailNotification.recipientEmail,
          subject: emailNotification.subject,
          html: emailNotification.content,
        })

        // Update status to SENT
        await db
          .update(emailNotifications)
          .set({
            status: 'SENT',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailNotifications.id, emailNotification.id))

        processed++
      } catch (error: any) {
        failed++
        const errorMessage = error?.message || 'Failed to send email'
        
        // Update status to FAILED and increment retry count
        await db
          .update(emailNotifications)
          .set({
            status: 'FAILED',
            errorMessage: errorMessage,
            retryCount: (emailNotification.retryCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(emailNotifications.id, emailNotification.id))
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} emails, ${failed} failed`,
      processed,
      failed,
    })
  } catch (error) {
    console.error('Error processing email notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process email notifications' },
      { status: 500 }
    )
  }
}

