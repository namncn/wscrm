import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { users } from '@/lib/schema'
import { eq, and, gt } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendPasswordResetConfirmationEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return createErrorResponse('Token và mật khẩu mới là bắt buộc', 400)
    }

    if (password.length < 6) {
      return createErrorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400)
    }

    // Find user by reset token
    const userList = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry!, new Date()) // Token must not be expired
        )
      )
      .limit(1)

    if (!userList[0]) {
      return createErrorResponse('Token không hợp lệ hoặc đã hết hạn', 400)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.id, userList[0].id))

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(userList[0].email, userList[0].name)
    } catch (emailError) {
      console.error('Error sending password reset confirmation email:', emailError)
      // Don't fail password reset if email fails, but log it
    }

    return createSuccessResponse(null, 'Đặt lại mật khẩu thành công')
  } catch (error) {
    console.error('Error in reset password:', error)
    return createErrorResponse('Không thể đặt lại mật khẩu')
  }
}

