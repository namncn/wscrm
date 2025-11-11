import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { emailNotifications, settings } from '@/lib/schema'
import { eq, and, or, lte, isNull } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'

const SETTINGS_KEY = 'general'

// POST /api/email-notifications/cron-process - Process pending emails (for cron jobs)
// This endpoint is public but requires a secret token for security
export async function POST(request: NextRequest) {
  try {
    // Check for secret token
    const authHeader = request.headers.get('authorization')
    const secretToken = process.env.EMAIL_CRON_SECRET || 'change-me-in-production'
    
    let providedToken: string | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.substring(7)
    } else {
      const { searchParams } = new URL(request.url)
      providedToken = searchParams.get('token')
    }

    if (!providedToken || providedToken !== secretToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid secret token' },
        { status: 401 }
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
      .limit(50) // Process 50 emails at a time

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
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing email notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process email notifications' },
      { status: 500 }
    )
  }
}

// GET endpoint for easier cron job setup
export async function GET(request: NextRequest) {
  return POST(request)
}

