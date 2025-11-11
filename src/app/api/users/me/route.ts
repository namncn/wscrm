import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.error('[GET /api/users/me] No session found')
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const sessionUserId = (session.user as any)?.id
    const sessionUserEmail = session.user.email

    console.log('[GET /api/users/me] Fetching user by ID:', sessionUserId, 'or email:', sessionUserEmail)

    // Get user by ID first (ID is fixed and never changes, email can change)
    // Fallback to email only if ID is not available in session
    try {
      let user = null
      
      // Try by ID first (most reliable)
      if (sessionUserId) {
        user = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            phone: users.phone,
            company: users.company,
            address: users.address,
            bio: users.bio,
            emailVerified: users.emailVerified,
            pendingEmail: users.pendingEmail,
            pendingEmailRequestedAt: users.pendingEmailRequestedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.id, sessionUserId))
          .limit(1)
      }
      
      // Fallback to email only if ID not found or not available
      if (!user?.[0] && sessionUserEmail) {
        console.log('[GET /api/users/me] User not found by ID, trying by email:', sessionUserEmail)
        user = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            phone: users.phone,
            company: users.company,
            address: users.address,
            bio: users.bio,
            emailVerified: users.emailVerified,
            pendingEmail: users.pendingEmail,
            pendingEmailRequestedAt: users.pendingEmailRequestedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.email, sessionUserEmail))
          .limit(1)
      }

      if (!user?.[0]) {
        console.error('[GET /api/users/me] User not found for ID:', sessionUserId, 'or email:', sessionUserEmail)
        return createErrorResponse('Không tìm thấy thông tin user', 404)
      }

      // If emailVerified doesn't exist in result, add default
      const result = user[0] as any
      if (!result.emailVerified) {
        result.emailVerified = 'NO'
      }

      console.log('[GET /api/users/me] Success:', result.id)
      return createSuccessResponse(result, 'Tải thông tin user')
    } catch (dbError: any) {
      // If emailVerified or pendingEmail columns don't exist, try without them
      if (
        dbError?.message?.includes('emailVerified') ||
        dbError?.message?.includes('pendingEmail') ||
        dbError?.code === 'ER_BAD_FIELD_ERROR'
      ) {
        console.warn('[GET /api/users/me] emailVerified column not found, trying without it')
        try {
          let user = null
          
          // Try by ID first (most reliable)
          if (sessionUserId) {
            user = await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                phone: users.phone,
                company: users.company,
                address: users.address,
                bio: users.bio,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
              })
              .from(users)
              .where(eq(users.id, sessionUserId))
              .limit(1)
          }
          
          // Fallback to email only if ID not found or not available
          if (!user?.[0] && sessionUserEmail) {
            console.log('[GET /api/users/me] User not found by ID (fallback), trying by email:', sessionUserEmail)
            user = await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                phone: users.phone,
                company: users.company,
                address: users.address,
                bio: users.bio,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
              })
              .from(users)
              .where(eq(users.email, sessionUserEmail))
              .limit(1)
          }

          if (!user?.[0]) {
            return createErrorResponse('Không tìm thấy thông tin user', 404)
          }

          // Add default emailVerified
          const result = { ...user[0], emailVerified: 'NO', pendingEmail: null, pendingEmailRequestedAt: null }
          return createSuccessResponse(result, 'Tải thông tin user')
        } catch (fallbackError: any) {
          console.error('[GET /api/users/me] Fallback query error:', fallbackError)
          return createErrorResponse(`Không thể tải thông tin user: ${fallbackError?.message || 'Unknown error'}`)
        }
      }
      throw dbError
    }
  } catch (error: any) {
    console.error('[GET /api/users/me] Unexpected error:', error)
    return createErrorResponse(`Không thể tải thông tin user: ${error?.message || 'Unknown error'}`)
  }
}

