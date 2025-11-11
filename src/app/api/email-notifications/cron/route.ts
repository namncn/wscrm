import { NextRequest, NextResponse } from 'next/server'
import {
  scheduleExpiringEmails,
  scheduleExpiredEmails,
  scheduleDeletionWarningEmails,
} from '@/lib/email-service'

// POST /api/email-notifications/cron - Schedule email notifications (for cron jobs)
// This endpoint is public but requires a secret token for security
export async function POST(request: NextRequest) {
  try {
    // Check for secret token in header or query param
    const authHeader = request.headers.get('authorization')
    const secretToken = process.env.EMAIL_CRON_SECRET || 'change-me-in-production'
    
    // Get token from Authorization header (Bearer token) or query param
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

    // Schedule all email types
    const results = {
      expiring: await scheduleExpiringEmails(),
      expired: await scheduleExpiredEmails(),
      deletionWarning: await scheduleDeletionWarningEmails(),
    }

    const totalScheduled =
      results.expiring.scheduled +
      results.expired.scheduled +
      results.deletionWarning.scheduled

    return NextResponse.json({
      success: true,
      message: `Scheduled ${totalScheduled} email notifications`,
      results,
      totalScheduled,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error scheduling email notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to schedule email notifications' },
      { status: 500 }
    )
  }
}

// GET endpoint for easier cron job setup (with token in query)
export async function GET(request: NextRequest) {
  return POST(request)
}

