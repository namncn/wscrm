import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { users, customers, type User, type Customer } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendVerificationEmail, sendEmailVerifiedConfirmationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return createErrorResponse('Token xác nhận là bắt buộc', 400)
    }

    // Find user or customer by verification token
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1)

    let account: User | Customer | undefined = userList[0]
    let accountType: 'user' | 'customer' = 'user'

    if (!account) {
      const customerList = await db
        .select()
        .from(customers)
        .where(eq(customers.verificationToken, token))
        .limit(1)

      if (customerList[0]) {
        account = customerList[0]
        accountType = 'customer'
      }
    }

    if (!account) {
      return createErrorResponse('Token xác nhận không hợp lệ', 400)
    }

    // Check if already verified
    if (account.emailVerified === 'YES') {
      return createSuccessResponse(null, 'Email đã được xác nhận trước đó')
    }

    // Verify email
    if (accountType === 'user') {
      await db
        .update(users)
        .set({
          emailVerified: 'YES',
          verificationToken: null,
        })
        .where(eq(users.id, account.id))
    } else {
      await db
        .update(customers)
        .set({
          emailVerified: 'YES' as 'YES' | 'NO',
          verificationToken: null,
        })
        .where(eq(customers.id, account.id))
    }

    // Send confirmation email
    try {
      await sendEmailVerifiedConfirmationEmail(account.email, account.name)
    } catch (emailError) {
      console.error('Error sending email verified confirmation email:', emailError)
      // Don't fail verification if email fails, but log it
    }

    return createSuccessResponse(null, 'Xác nhận email thành công')
  } catch (error) {
    console.error('Error in verify email:', error)
    return createErrorResponse('Không thể xác nhận email')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return createErrorResponse('Email là bắt buộc', 400)
    }

    // Find user by email
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!userList[0]) {
      return createErrorResponse('Email không tồn tại', 400)
    }

    // Check if already verified
    if (userList[0].emailVerified === 'YES') {
      return createSuccessResponse(null, 'Email đã được xác nhận')
    }

    // Generate verification token (if not exists)
    let verificationToken = userList[0].verificationToken
    if (!verificationToken) {
      verificationToken = crypto.randomBytes(32).toString('hex')
      
      await db
        .update(users)
        .set({
          verificationToken,
        })
        .where(eq(users.id, userList[0].id))
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken)
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Still return success, but log the error
    }

    return createSuccessResponse(
      {
        // For development only - remove in production
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
        message: 'Email xác nhận đã được gửi đến địa chỉ email của bạn'
      },
      'Email xác nhận đã được gửi đến địa chỉ email của bạn'
    )
  } catch (error) {
    console.error('Error sending verification email:', error)
    return createErrorResponse('Không thể gửi email xác nhận')
  }
}

