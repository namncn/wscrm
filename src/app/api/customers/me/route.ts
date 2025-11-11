import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const sessionUserId = (session.user as any)?.id
    const sessionUserEmail = session.user.email

    console.log('[GET /api/customers/me] Fetching customer by ID:', sessionUserId, 'or email:', sessionUserEmail)

    // Get customer by ID first (ID is fixed and never changes, email can change)
    // Fallback to email only if ID is not available in session
    let customerData = null
    
    // Try by ID first (most reliable)
    if (sessionUserId) {
      customerData = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          company: customers.company,
          taxCode: customers.taxCode,
          companyEmail: customers.companyEmail,
          companyAddress: customers.companyAddress,
          companyPhone: customers.companyPhone,
          companyTaxCode: customers.companyTaxCode,
          status: customers.status,
          userId: customers.userId,
          emailVerified: customers.emailVerified,
          pendingEmail: customers.pendingEmail,
          pendingEmailRequestedAt: customers.pendingEmailRequestedAt,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(eq(customers.id, sessionUserId))
        .limit(1)
    }
    
    // Fallback to email only if ID not found or not available
    if (!customerData?.[0] && sessionUserEmail) {
      console.log('[GET /api/customers/me] Customer not found by ID, trying by email:', sessionUserEmail)
      customerData = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          company: customers.company,
          taxCode: customers.taxCode,
          companyEmail: customers.companyEmail,
          companyAddress: customers.companyAddress,
          companyPhone: customers.companyPhone,
          companyTaxCode: customers.companyTaxCode,
          status: customers.status,
          userId: customers.userId,
          emailVerified: customers.emailVerified,
          pendingEmail: customers.pendingEmail,
          pendingEmailRequestedAt: customers.pendingEmailRequestedAt,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(eq(customers.email, sessionUserEmail))
        .limit(1)
    }

    if (!customerData?.[0]) {
      console.error('[GET /api/customers/me] Customer not found for ID:', sessionUserId, 'or email:', sessionUserEmail)
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
    }

    const customer = customerData[0] as any
    // If emailVerified doesn't exist, set default
    if (!customer.emailVerified) {
      customer.emailVerified = 'NO'
    }
    if (customer.pendingEmail === undefined) {
      customer.pendingEmail = null
      customer.pendingEmailRequestedAt = null
    }

    return createSuccessResponse(customer, 'Tải thông tin khách hàng')
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    // If emailVerified or pendingEmail column doesn't exist, try without it
    if (error?.message?.includes('emailVerified') || error?.message?.includes('pendingEmail')) {
      try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
          return createErrorResponse('Chưa đăng nhập', 401)
        }

        const sessionUserId = (session.user as any)?.id
        const sessionUserEmail = session.user.email

        let customer = null
        
        // Try by ID first (most reliable)
        if (sessionUserId) {
          customer = await db
            .select({
              id: customers.id,
              name: customers.name,
              email: customers.email,
              phone: customers.phone,
              address: customers.address,
              company: customers.company,
              taxCode: customers.taxCode,
              status: customers.status,
              userId: customers.userId,
              createdAt: customers.createdAt,
              updatedAt: customers.updatedAt,
            })
            .from(customers)
            .where(eq(customers.id, sessionUserId))
            .limit(1)
        }
        
        // Fallback to email only if ID not found or not available
        if (!customer?.[0] && sessionUserEmail) {
          console.log('[GET /api/customers/me] Customer not found by ID (fallback), trying by email:', sessionUserEmail)
          customer = await db
            .select({
              id: customers.id,
              name: customers.name,
              email: customers.email,
              phone: customers.phone,
              address: customers.address,
              company: customers.company,
              taxCode: customers.taxCode,
              status: customers.status,
              userId: customers.userId,
              createdAt: customers.createdAt,
              updatedAt: customers.updatedAt,
            })
            .from(customers)
            .where(eq(customers.email, sessionUserEmail))
            .limit(1)
        }

        if (!customer?.[0]) {
          return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
        }

        // Add default emailVerified
        const result = { ...customer[0], emailVerified: 'NO', pendingEmail: null, pendingEmailRequestedAt: null }
        return createSuccessResponse(result, 'Tải thông tin khách hàng')
      } catch (fallbackError) {
        console.error('Error fetching customer (fallback):', fallbackError)
        return createErrorResponse('Không thể tải thông tin khách hàng')
      }
    }
    return createErrorResponse('Không thể tải thông tin khách hàng')
  }
}

