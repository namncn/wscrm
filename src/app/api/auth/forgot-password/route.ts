import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendResetPasswordEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return createErrorResponse('Email là bắt buộc', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Email không hợp lệ', 400)
    }

    // Find user by email
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!userList[0]) {
      // Don't reveal if email exists or not for security
      return createSuccessResponse(
        null,
        'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn'
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // Token expires in 1 hour

    // Save reset token to database
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.id, userList[0].id))

    // Send email with reset link
    try {
      await sendResetPasswordEmail(email, resetToken)
    } catch (emailError) {
      console.error('Error sending reset password email:', emailError)
      // Still return success to not reveal if email exists
      // In production, you might want to log this error for monitoring
    }

    return createSuccessResponse(
      {
        // For development only - remove in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn'
      },
      'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn'
    )
  } catch (error) {
    console.error('Error in forgot password:', error)
    return createErrorResponse('Không thể xử lý yêu cầu đặt lại mật khẩu')
  }
}

