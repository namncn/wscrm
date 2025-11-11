'use server'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { db } from '@/lib/database'
import { users, customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { sendEmailChangeVerificationEmail } from '@/lib/email'

const TOKEN_EXPIRY_HOURS = 24
const RESEND_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const { type: requestedType } = await request
      .json()
      .catch(() => ({ type: undefined as 'user' | 'customer' | undefined }))

    const sessionUserType = (session.user as any)?.userType
    const sessionUserId = (session.user as any)?.id
    const sessionEmail = session.user.email

    const accountType: 'user' | 'customer' =
      requestedType ??
      (sessionUserType === 'customer' ? 'customer' : 'user')

    if (accountType === 'user') {
      if (!sessionUserId && !sessionEmail) {
        return createErrorResponse('Không tìm thấy thông tin tài khoản', 400)
      }

      const [account] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          pendingEmail: users.pendingEmail,
          pendingEmailToken: users.pendingEmailToken,
          pendingEmailRequestedAt: users.pendingEmailRequestedAt,
        })
        .from(users)
        .where(sessionUserId ? eq(users.id, sessionUserId) : eq(users.email, sessionEmail!))
        .limit(1)

      if (!account) {
        return createErrorResponse('Không tìm thấy thông tin tài khoản', 404)
      }

      if (!account.pendingEmail) {
        return createErrorResponse('Không có yêu cầu thay đổi email nào đang chờ xác nhận', 400)
      }

      let token = account.pendingEmailToken
      let requestedAt = account.pendingEmailRequestedAt ? new Date(account.pendingEmailRequestedAt) : null

      const isTokenExpired =
        !token ||
        !requestedAt ||
        requestedAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000 < Date.now()

      if (!isTokenExpired) {
        if (requestedAt && Date.now() - requestedAt.getTime() < RESEND_COOLDOWN_MS) {
          const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - requestedAt.getTime())) / 1000)
          return createErrorResponse(
            `Bạn vừa yêu cầu gửi lại email. Vui lòng thử lại sau ${waitSeconds} giây.`,
            429
          )
        }
      } else {
        token = crypto.randomBytes(32).toString('hex')
        requestedAt = new Date()

        await db
          .update(users)
          .set({
            pendingEmailToken: token,
            pendingEmailRequestedAt: requestedAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, account.id))
      }

      await sendEmailChangeVerificationEmail(
        account.pendingEmail,
        account.name || 'Người dùng',
        token!,
        'user',
        { oldEmail: account.email }
      )

      await db
        .update(users)
        .set({
          pendingEmailRequestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, account.id))

      console.info('[ResendEmailChange] User request', {
        userId: account.id,
        oldEmail: account.email,
        pendingEmail: account.pendingEmail,
        timestamp: new Date().toISOString(),
      })

      return createSuccessResponse(
        null,
        'Đã gửi lại email xác nhận đến địa chỉ mới. Vui lòng kiểm tra hộp thư của bạn.'
      )
    }

    if (!sessionUserId && !sessionEmail) {
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 400)
    }

    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        pendingEmail: customers.pendingEmail,
        pendingEmailToken: customers.pendingEmailToken,
        pendingEmailRequestedAt: customers.pendingEmailRequestedAt,
      })
      .from(customers)
      .where(sessionUserId ? eq(customers.id, sessionUserId) : eq(customers.email, sessionEmail!))
      .limit(1)

    if (!customer) {
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
    }

    if (!customer.pendingEmail) {
      return createErrorResponse('Không có yêu cầu thay đổi email nào đang chờ xác nhận', 400)
    }

    let token = customer.pendingEmailToken
    let requestedAt = customer.pendingEmailRequestedAt ? new Date(customer.pendingEmailRequestedAt) : null

    const isTokenExpired =
      !token ||
      !requestedAt ||
      requestedAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000 < Date.now()

    if (!isTokenExpired) {
      if (requestedAt && Date.now() - requestedAt.getTime() < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - requestedAt.getTime())) / 1000)
        return createErrorResponse(
          `Bạn vừa yêu cầu gửi lại email. Vui lòng thử lại sau ${waitSeconds} giây.`,
          429
        )
      }
    } else {
      token = crypto.randomBytes(32).toString('hex')
      requestedAt = new Date()

      await db
        .update(customers)
        .set({
          pendingEmailToken: token,
          pendingEmailRequestedAt: requestedAt,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
    }

    await sendEmailChangeVerificationEmail(
      customer.pendingEmail,
      customer.name || 'Khách hàng',
      token!,
      'customer',
      { oldEmail: customer.email }
    )

    await db
      .update(customers)
      .set({
        pendingEmailRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id))

    console.info('[ResendEmailChange] Customer request', {
      customerId: customer.id,
      oldEmail: customer.email,
      pendingEmail: customer.pendingEmail,
      timestamp: new Date().toISOString(),
    })

    return createSuccessResponse(
      null,
      'Đã gửi lại email xác nhận đến địa chỉ mới. Vui lòng kiểm tra hộp thư của bạn.'
    )
  } catch (error: any) {
    console.error('[POST /api/auth/resend-email-change]', error)
    return createErrorResponse(error?.message || 'Không thể gửi lại email xác nhận')
  }
}


