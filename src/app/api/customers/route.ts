import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { customers, users } from '@/lib/schema'
import { eq, desc, and, ne } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { sendAdminVerificationEmail, sendEmailChangeVerificationEmail } from '@/lib/email'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  const userType = (session.user as any)?.userType
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'
  const isCustomer = userType === 'customer'

  // ADMIN and USER can view all customers, CUSTOMER can only view their own
  if (!isAdmin && !isUser && !isCustomer) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    // For customers, only return their own data
    const baseQuery = db
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
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        userName: users.name,
      })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))

    // If customer, filter by their email
    let customersWithUsers
    if (isCustomer) {
      if (!session.user.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }
      customersWithUsers = await baseQuery
        .where(eq(customers.email, session.user.email))
        .orderBy(desc(customers.createdAt))
    } else {
      customersWithUsers = await baseQuery.orderBy(desc(customers.createdAt))
    }

    // If emailVerified doesn't exist, add default
    const processedData = customersWithUsers.map((c: any) => ({
      ...c,
      emailVerified: c.emailVerified || 'NO'
    }))

    return createSuccessResponse(processedData, 'Tải danh sách khách hàng')
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    // If emailVerified column doesn't exist, try without it
    if (error?.message?.includes('emailVerified')) {
      try {
        const customersWithUsers = await db
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
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
            userName: users.name,
          })
          .from(customers)
          .leftJoin(users, eq(customers.userId, users.id))
          .orderBy(desc(customers.createdAt))
        
        const processedData = customersWithUsers.map((c: any) => ({
          ...c,
          emailVerified: 'NO'
        }))
        
        return createSuccessResponse(processedData, 'Tải danh sách khách hàng')
      } catch (fallbackError) {
        console.error('Error fetching customers (fallback):', fallbackError)
        return createErrorResponse('Không thể tải danh sách khách hàng')
      }
    }
    return createErrorResponse('Không thể tải danh sách khách hàng')
  }
}

export async function POST(request: NextRequest) {
  // Only ADMIN can create customers
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo khách hàng.', 403)
  }

  try {
    const body = await request.json()
    const { name, email, phone, address, company, taxCode, companyEmail, companyAddress, companyPhone, companyTaxCode } = body

    if (!name || !email) {
      return createErrorResponse('Tên và email là bắt buộc', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Email không hợp lệ', 400)
    }

    // Check if email already exists in customers table
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1)

    if (existingCustomer[0]) {
      return createErrorResponse('Email này đã được sử dụng bởi khách hàng khác', 400)
    }

    // Check if email already exists in users table (admin/member)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser[0]) {
      return createErrorResponse('Email này đã được sử dụng bởi tài khoản quản trị. Vui lòng sử dụng email khác.', 400)
    }

    // Get the first user from database
    const firstUser = await db.select({ id: users.id }).from(users).limit(1)
    if (!firstUser[0]) {
      return createErrorResponse('Không tìm thấy user trong database', 400)
    }

    // Generate a random password and hash it (customer will need to reset password to access)
    const randomPassword = crypto.randomBytes(32).toString('hex')
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    const newCustomer = await db.insert(customers).values({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      address: address || null,
      company: company || null,
      taxCode: taxCode || null,
      companyEmail: companyEmail || null,
      companyAddress: companyAddress || null,
      companyPhone: companyPhone || null,
      companyTaxCode: companyTaxCode || null,
      userId: firstUser[0].id,
    })

    // Get the inserted customer
    const insertedCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1)

    // Try to sync customer to control panel (Enhance) asynchronously
    // Don't block the response if sync fails
    if (insertedCustomer[0]) {
      const { ControlPanelSyncService } = await import('@/lib/control-panel-sync/sync-service')
      ControlPanelSyncService.syncCustomerToControlPanel({
        name: insertedCustomer[0].name,
        email: insertedCustomer[0].email,
        phone: insertedCustomer[0].phone,
        company: insertedCustomer[0].company,
      }).catch((syncError) => {
        console.error('[Customer Create] Failed to sync customer to control panel:', syncError)
        // Don't throw - customer was created successfully in database
      })
    }

    return createCreatedResponse(insertedCustomer[0], 'Tạo khách hàng')
  } catch (error: any) {
    console.error('Error creating customer:', error)
    
    // Handle duplicate entry error from database
    if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
      if (error?.message?.includes('email')) {
        return createErrorResponse('Email này đã được sử dụng. Vui lòng chọn email khác.', 400)
      }
      return createErrorResponse('Dữ liệu bị trùng lặp. Vui lòng kiểm tra lại thông tin.', 400)
    }
    
    return createErrorResponse(error?.message || 'Không thể tạo khách hàng')
  }
}

export async function PUT(request: NextRequest) {
  // Check authentication first
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userType = (session.user as any)?.userType
  const userRole = (session.user as any)?.role
  const isAdmin = userRole === 'ADMIN'

  try {
    const body = await request.json()
    const { id, name, email, phone, address, company, taxCode, companyEmail, companyAddress, companyPhone, companyTaxCode, status, password } = body

    if (!id) {
      return createErrorResponse('ID khách hàng là bắt buộc', 400)
    }

    if (!name || !email) {
      return createErrorResponse('Tên và email là bắt buộc', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Email không hợp lệ', 400)
    }

    // Get session to check permissions
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const userType = (session.user as any)?.userType
    const userRole = (session.user as any)?.role

    // Check if customer exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)

    if (!existingCustomer[0]) {
      return createErrorResponse('Không tìm thấy khách hàng', 404)
    }

    // Permission check: 
    // - ADMIN can update any customer
    // - USER (thành viên thường) cannot update customers (only ADMIN can)
    // - customer can only update their own profile (handled separately)
    if (userType === 'customer') {
      // For customers, check if they're updating their own profile
      if (existingCustomer[0].email !== session.user.email) {
        return createErrorResponse('Không có quyền cập nhật thông tin của khách hàng khác', 403)
      }
      // Also check if the provided ID matches the customer's ID
      const currentCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)
      
      if (currentCustomer[0] && currentCustomer[0].id !== id) {
        return createErrorResponse('Không có quyền cập nhật thông tin của khách hàng khác', 403)
      }
    } else if (userType === 'admin') {
      // Only ADMIN can update other customers, USER cannot
      if (userRole !== 'ADMIN') {
        return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật thông tin khách hàng khác.', 403)
      }
    } else {
      return createErrorResponse('Không có quyền truy cập', 403)
    }

    // Validate email if it has changed
    if (email !== existingCustomer[0].email) {
      // Check if email already exists in customers table (different customer)
      const duplicateCustomer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.email, email),
            ne(customers.id, id)
          )
        )
        .limit(1)

      if (duplicateCustomer[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi khách hàng khác', 400)
      }

      // Check if email already exists in users table (admin/member)
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser[0]) {
        return createErrorResponse('Email này đã được sử dụng bởi tài khoản quản trị. Vui lòng sử dụng email khác.', 400)
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      phone: phone || null,
      address: address || null,
      company: company || null,
      taxCode: taxCode || null,
      companyEmail: companyEmail || null,
      companyAddress: companyAddress || null,
      companyPhone: companyPhone || null,
      companyTaxCode: companyTaxCode || null,
      updatedAt: new Date(),
    }

    // Only allow status update for admin
    if (userType === 'admin' && userRole === 'ADMIN') {
      updateData.status = status || 'ACTIVE'
    }

    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const emailChanged = email !== existingCustomer[0].email
    let pendingEmailToken: string | null = null

    if (!emailChanged) {
      updateData.email = email
    }

    if (emailChanged) {
      pendingEmailToken = crypto.randomBytes(32).toString('hex')
      updateData.pendingEmail = email
      updateData.pendingEmailToken = pendingEmailToken
      updateData.pendingEmailRequestedAt = new Date()
    }

    try {
      await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, id))
    } catch (updateError: any) {
      if (updateError?.message?.includes('pendingEmail')) {
        return createErrorResponse('Column pendingEmail hoặc pendingEmailToken không tồn tại. Vui lòng chạy migration để thêm cột mới.', 500)
      }
      throw updateError
    }

    if (emailChanged && pendingEmailToken) {
      try {
        await sendEmailChangeVerificationEmail(
          email,
          existingCustomer[0].name || 'Khách hàng',
          pendingEmailToken,
          'customer',
          { oldEmail: existingCustomer[0].email }
        )
      } catch (emailError) {
        console.error('Error sending customer email change verification email:', emailError)
        await db
          .update(customers)
          .set({
            pendingEmail: null,
            pendingEmailToken: null,
            pendingEmailRequestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, id))
        return createErrorResponse('Không thể gửi email xác nhận đến địa chỉ mới. Vui lòng thử lại sau.', 500)
      }
    }

    // Get the updated customer
    const updatedCustomer = await db
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
        pendingEmail: customers.pendingEmail,
        pendingEmailRequestedAt: customers.pendingEmailRequestedAt,
        updatedAt: customers.updatedAt,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)

    // Try to sync customer to control panel (Enhance) asynchronously
    // Use the original email for sync (not pendingEmail) since email change is pending verification
    const emailForSync = emailChanged ? existingCustomer[0].email : email
    if (emailForSync) {
      const { ControlPanelSyncService } = await import('@/lib/control-panel-sync/sync-service')
      ControlPanelSyncService.syncCustomerToControlPanel({
        name: updatedCustomer[0].name,
        email: emailForSync,
        phone: updatedCustomer[0].phone,
        company: updatedCustomer[0].company,
      }).catch((syncError) => {
        console.error('[Customer Update] Failed to sync customer to control panel:', syncError)
        // Don't throw - customer was updated successfully in database
      })
    }

    const message = emailChanged
      ? 'Đã gửi email xác thực đến địa chỉ mới. Vui lòng kiểm tra hộp thư để hoàn tất thay đổi.'
      : 'Cập nhật khách hàng'

    return createSuccessResponse(
      {
        ...updatedCustomer[0],
        emailChangePending: emailChanged,
      },
      message
    )
  } catch (error: any) {
    console.error('Error updating customer:', error)
    
    // Handle duplicate entry error from database
    if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
      if (error?.message?.includes('email')) {
        return createErrorResponse('Email này đã được sử dụng. Vui lòng chọn email khác.', 400)
      }
      return createErrorResponse('Dữ liệu bị trùng lặp. Vui lòng kiểm tra lại thông tin.', 400)
    }
    
    return createErrorResponse(error?.message || 'Không thể cập nhật khách hàng')
  }
}

export async function DELETE(request: NextRequest) {
  // Only ADMIN can delete customers
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa khách hàng.', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('ID khách hàng là bắt buộc', 400)
    }

    const customerId = parseInt(id)

    // Check if customer exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1)

    if (!existingCustomer[0]) {
      return createErrorResponse('Không tìm thấy khách hàng', 404)
    }

    const customer = existingCustomer[0]

    // Try to delete customer from control panel (Enhance) first
    let cpDeleteError: string | null = null
    if (customer.email) {
      const { ControlPanelSyncService } = await import('@/lib/control-panel-sync/sync-service')
      const deleteResult = await ControlPanelSyncService.deleteCustomerFromControlPanel(customer.email)
      
      if (!deleteResult.success) {
        cpDeleteError = deleteResult.error || 'Không thể xóa customer trên control panel'
        console.error('[Customer Delete] Failed to delete customer from control panel:', cpDeleteError)
      }
    }

    // Delete customer from local database
    await db.delete(customers).where(eq(customers.id, customerId))

    // If there was an error deleting from control panel, return success with warning
    if (cpDeleteError) {
      return createSuccessResponse(
        { warning: cpDeleteError },
        `Đã xóa khách hàng trong database, nhưng có lỗi khi xóa trên control panel: ${cpDeleteError}`
      )
    }

    return createSuccessResponse(null, 'Xóa khách hàng')
  } catch (error) {
    console.error('Error deleting customer:', error)
    return createErrorResponse('Không thể xóa khách hàng')
  }
}

// Send verification email to customer (admin-initiated or customer self-service)
export async function PATCH(request: NextRequest) {
  // Only ADMIN can send verification emails
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể gửi email xác thực khách hàng.', 403)
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return createErrorResponse('ID khách hàng là bắt buộc', 400)
    }

    // Check if customer exists
    const existingCustomer = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        emailVerified: customers.emailVerified,
      })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)

    if (!existingCustomer[0]) {
      return createErrorResponse('Không tìm thấy khách hàng', 404)
    }

    // Check if already verified
    if (existingCustomer[0].emailVerified === 'YES') {
      return createErrorResponse('Tài khoản đã được xác thực', 400)
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Update customer with verification token
    try {
      await db
        .update(customers)
        .set({
          verificationToken,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id))
    } catch (updateError: any) {
      // If verificationToken column doesn't exist
      if (updateError?.message?.includes('verificationToken')) {
        return createErrorResponse('Column verificationToken không tồn tại trong database. Vui lòng chạy migration.', 500)
      }
      throw updateError
    }

    // Send verification email
    try {
      await sendAdminVerificationEmail(
        existingCustomer[0].email,
        existingCustomer[0].name || 'Customer',
        verificationToken,
        'customer'
      )
    } catch (emailError: any) {
      console.error('Error sending verification email:', emailError)
      return createErrorResponse(`Đã tạo token nhưng không thể gửi email: ${emailError?.message || 'Unknown error'}`)
    }

    return createSuccessResponse(
      {
        message: 'Email xác thực đã được gửi đến địa chỉ email của khách hàng'
      },
      'Email xác thực đã được gửi'
    )
  } catch (error: any) {
    console.error('Error sending verification email:', error)
    return createErrorResponse(`Không thể gửi email xác thực: ${error?.message || 'Unknown error'}`)
  }
}
