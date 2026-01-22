import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

// Rate limiting: 60 seconds between resend attempts
const RESEND_COOLDOWN = 60 * 1000 // 60 seconds in milliseconds

// In-memory store for rate limiting (in production, use Redis or database)
const resendAttempts = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Chỉ khách hàng mới có thể gửi lại email xác nhận', 403)
    }

    const email = session.user.email
    if (!email) {
      return createErrorResponse('Không tìm thấy email', 400)
    }

    // Check rate limiting
    const lastAttempt = resendAttempts.get(email)
    const now = Date.now()
    
    if (lastAttempt && (now - lastAttempt) < RESEND_COOLDOWN) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN - (now - lastAttempt)) / 1000)
      return createErrorResponse(
        `Vui lòng đợi ${remainingSeconds} giây trước khi gửi lại email xác nhận`,
        429
      )
    }

    // Find customer by email
    const customerList = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1)

    if (!customerList[0]) {
      return createErrorResponse('Không tìm thấy khách hàng', 404)
    }

    const customer = customerList[0]

    // Check if already verified
    if (customer.emailVerified === 'YES') {
      return createSuccessResponse(null, 'Email đã được xác nhận')
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    
    await db
      .update(customers)
      .set({
        verificationToken,
      })
      .where(eq(customers.id, customer.id))

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, 'customer')
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return createErrorResponse('Không thể gửi email xác nhận. Vui lòng thử lại sau.')
    }

    // Update rate limiting
    resendAttempts.set(email, now)

    // Clean up old entries (older than 5 minutes)
    setTimeout(() => {
      resendAttempts.delete(email)
    }, 5 * 60 * 1000)

    return createSuccessResponse(
      {
        // For development only - remove in production
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
        cooldownSeconds: RESEND_COOLDOWN / 1000,
        nextResendAt: now + RESEND_COOLDOWN,
      },
      'Email xác nhận đã được gửi đến địa chỉ email của bạn'
    )
  } catch (error) {
    console.error('Error resending verification email:', error)
    return createErrorResponse('Không thể gửi email xác nhận')
  }
}

// GET endpoint to check cooldown status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      return createErrorResponse('Chỉ khách hàng mới có thể kiểm tra trạng thái', 403)
    }

    const email = session.user.email
    if (!email) {
      return createErrorResponse('Không tìm thấy email', 400)
    }

    const lastAttempt = resendAttempts.get(email)
    const now = Date.now()
    
    if (!lastAttempt || (now - lastAttempt) >= RESEND_COOLDOWN) {
      return createSuccessResponse({
        canResend: true,
        remainingSeconds: 0,
        nextResendAt: null,
      })
    }

    const remainingSeconds = Math.ceil((RESEND_COOLDOWN - (now - lastAttempt)) / 1000)
    
    return createSuccessResponse({
      canResend: false,
      remainingSeconds,
      nextResendAt: lastAttempt + RESEND_COOLDOWN,
    })
  } catch (error) {
    console.error('Error checking resend status:', error)
    return createErrorResponse('Không thể kiểm tra trạng thái')
  }
}

