import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { sendEmailVerifiedConfirmationEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return createErrorResponse('Token xác nhận là bắt buộc', 400)
    }

    // Find customer by verification token
    const customerList = await db
      .select()
      .from(customers)
      .where(eq(customers.verificationToken, token))
      .limit(1)

    if (!customerList[0]) {
      return createErrorResponse('Token xác nhận không hợp lệ', 400)
    }

    // Check if already verified
    if (customerList[0].emailVerified === 'YES') {
      return createSuccessResponse(null, 'Email đã được xác nhận trước đó')
    }

    // Verify email
    try {
      await db
        .update(customers)
        .set({
          emailVerified: 'YES' as 'YES' | 'NO',
          verificationToken: null,
        })
        .where(eq(customers.id, customerList[0].id))
    } catch (updateError: any) {
      // If emailVerified column doesn't exist
      if (updateError?.message?.includes('emailVerified')) {
        return createErrorResponse('Column emailVerified không tồn tại trong database. Vui lòng chạy migration.', 500)
      }
      throw updateError
    }

    // Send confirmation email
    try {
      await sendEmailVerifiedConfirmationEmail(customerList[0].email, customerList[0].name)
    } catch (emailError) {
      console.error('Error sending email verified confirmation email:', emailError)
      // Don't fail verification if email fails, but log it
    }

    return createSuccessResponse(null, 'Xác nhận email thành công')
  } catch (error: any) {
    console.error('Error in verify customer email:', error)
    return createErrorResponse(`Không thể xác nhận email: ${error?.message || 'Unknown error'}`)
  }
}

