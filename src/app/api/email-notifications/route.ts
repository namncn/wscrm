import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { emailNotifications } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

// GET /api/email-notifications - Get all email notifications with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or user (both can access)
    const userRole = (session.user as any).role
    if (userRole !== 'ADMIN' && userRole !== 'USER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or User access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // PENDING, SENDING, SENT, FAILED, CANCELLED
    const notificationType = searchParams.get('notificationType')
    const serviceType = searchParams.get('serviceType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query conditions
    const conditions = []
    if (status) {
      conditions.push(eq(emailNotifications.status, status as any))
    }
    if (notificationType) {
      conditions.push(eq(emailNotifications.notificationType, notificationType as any))
    }
    if (serviceType) {
      conditions.push(eq(emailNotifications.serviceType, serviceType as any))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const notifications = await db
      .select()
      .from(emailNotifications)
      .where(whereClause)
      .orderBy(desc(emailNotifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    const total = await db
      .select()
      .from(emailNotifications)
      .where(whereClause)

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching email notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email notifications' },
      { status: 500 }
    )
  }
}

// POST /api/email-notifications - Create new email notification
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
        { success: false, error: 'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể thực hiện hành động này.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      customerId,
      serviceId,
      serviceType,
      notificationType,
      subject,
      content,
      recipientEmail,
      scheduledAt,
      metadata,
    } = body

    if (!customerId || !serviceId || !serviceType || !notificationType || !subject || !content || !recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newNotification = await db.insert(emailNotifications).values({
      customerId,
      serviceId,
      serviceType,
      notificationType,
      subject,
      content,
      recipientEmail,
      status: 'PENDING',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      metadata: metadata || null,
    })

    return NextResponse.json({
      success: true,
      message: 'Email notification created successfully',
      data: newNotification,
    })
  } catch (error) {
    console.error('Error creating email notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create email notification' },
      { status: 500 }
    )
  }
}

// PUT /api/email-notifications - Update email notification
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can update email notifications
    const userRole = (session.user as any).role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể thực hiện hành động này.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status, subject, content, scheduledAt, errorMessage } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (status !== undefined) updateData.status = status
    if (subject !== undefined) updateData.subject = subject
    if (content !== undefined) updateData.content = content
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage
    if (status === 'SENT') updateData.sentAt = new Date()

    await db
      .update(emailNotifications)
      .set(updateData)
      .where(eq(emailNotifications.id, parseInt(String(id))))

    const updated = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.id, parseInt(String(id))))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Email notification updated successfully',
      data: updated[0],
    })
  } catch (error) {
    console.error('Error updating email notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update email notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/email-notifications - Delete email notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can delete email notifications
    const userRole = (session.user as any).role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể thực hiện hành động này.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.id, parseInt(id)))

    return NextResponse.json({
      success: true,
      message: 'Email notification deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting email notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete email notification' },
      { status: 500 }
    )
  }
}

