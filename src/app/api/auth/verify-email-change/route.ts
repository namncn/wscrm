import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { users, customers } from '@/lib/schema'
import { eq, and, ne } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendEmailVerifiedConfirmationEmail } from '@/lib/email'

const TOKEN_EXPIRY_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const typeParam = searchParams.get('type')

    if (!token) {
      return createErrorResponse('Token xác nhận là bắt buộc', 400)
    }

    let accountType: 'user' | 'customer' | null = null
    let account: any = null

    if (typeParam !== 'customer') {
      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          pendingEmail: users.pendingEmail,
          pendingEmailToken: users.pendingEmailToken,
          pendingEmailRequestedAt: users.pendingEmailRequestedAt,
        })
        .from(users)
        .where(eq(users.pendingEmailToken, token))
        .limit(1)

      if (userList[0]) {
        accountType = 'user'
        account = userList[0]
      }
    }

    if (!account && typeParam !== 'user') {
      const customerList = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          pendingEmail: customers.pendingEmail,
          pendingEmailToken: customers.pendingEmailToken,
          pendingEmailRequestedAt: customers.pendingEmailRequestedAt,
        })
        .from(customers)
        .where(eq(customers.pendingEmailToken, token))
        .limit(1)

      if (customerList[0]) {
        accountType = 'customer'
        account = customerList[0]
      }
    }

    if (!account || !accountType) {
      return createErrorResponse('Token xác nhận không hợp lệ hoặc đã được sử dụng', 400)
    }

    if (!account.pendingEmail) {
      return createErrorResponse('Không tìm thấy yêu cầu thay đổi email hợp lệ', 400)
    }

    if (account.pendingEmailRequestedAt) {
      const requestedAt = new Date(account.pendingEmailRequestedAt)
      const expiresAt = requestedAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
      if (Date.now() > expiresAt) {
        // Clear pending fields due to expiration
        if (accountType === 'user') {
          await db
            .update(users)
            .set({
              pendingEmail: null,
              pendingEmailToken: null,
              pendingEmailRequestedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, account.id))
        } else {
          await db
            .update(customers)
            .set({
              pendingEmail: null,
              pendingEmailToken: null,
              pendingEmailRequestedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, account.id))
        }
        return createErrorResponse('Token xác nhận đã hết hạn. Vui lòng thực hiện lại yêu cầu thay đổi email.', 400)
      }
    }

    const newEmail = account.pendingEmail

    // Double-check email uniqueness before applying change
    if (accountType === 'user') {
      const duplicateUser = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, newEmail), ne(users.id, account.id)))
        .limit(1)
      if (duplicateUser[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi thành viên khác. Vui lòng sử dụng email khác.', 400)
      }

      const duplicateCustomer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, newEmail))
        .limit(1)
      if (duplicateCustomer[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi khách hàng khác. Vui lòng sử dụng email khác.', 400)
      }
    } else {
      const duplicateCustomer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.email, newEmail), ne(customers.id, account.id)))
        .limit(1)
      if (duplicateCustomer[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi khách hàng khác. Vui lòng sử dụng email khác.', 400)
      }

      const duplicateUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, newEmail))
        .limit(1)
      if (duplicateUser[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi tài khoản quản trị. Vui lòng sử dụng email khác.', 400)
      }
    }

    if (accountType === 'user') {
      await db
        .update(users)
        .set({
          email: newEmail,
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailRequestedAt: null,
          emailVerified: 'YES',
          updatedAt: new Date(),
        })
        .where(eq(users.id, account.id))
    } else {
      await db
        .update(customers)
        .set({
          email: newEmail,
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailRequestedAt: null,
          emailVerified: 'YES' as 'YES' | 'NO',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, account.id))
    }

    try {
      await sendEmailVerifiedConfirmationEmail(newEmail, account.name || '')
    } catch (emailError) {
      console.error('Error sending email change confirmation email:', emailError)
      // Do not fail verification if confirmation email fails
    }

    console.info('[VerifyEmailChange] Success', {
      accountType,
      accountId: account.id,
      oldEmail: account.email,
      newEmail,
      timestamp: new Date().toISOString(),
    })

    return createSuccessResponse(
      null,
      'Thay đổi email thành công. Email cũ không còn hiệu lực; bạn có thể đăng nhập bằng email mới.'
    )
  } catch (error: any) {
    console.error('Error verifying email change:', error)
    return createErrorResponse(error?.message || 'Không thể xác nhận thay đổi email')
  }
}


