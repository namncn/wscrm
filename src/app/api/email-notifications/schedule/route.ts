import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  scheduleExpiringEmails,
  scheduleExpiredEmails,
  scheduleDeletionWarningEmails,
} from '@/lib/email-service'

// POST /api/email-notifications/schedule - Schedule email notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = (session.user as any).role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

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
    })
  } catch (error) {
    console.error('Error scheduling email notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to schedule email notifications' },
      { status: 500 }
    )
  }
}

