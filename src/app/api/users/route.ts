import { NextRequest } from 'next/server'
import { db } from '@/lib/database'
import { users } from '@/lib/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { sendAdminVerificationEmail, sendEmailChangeVerificationEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
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

// Helper function to check if user is ADMIN or USER
async function checkAdminOrUserRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN' || userRole === 'USER'
}

export async function GET() {
  // ADMIN and USER can view members list
  const canAccess = await checkAdminOrUserRole()
  if (!canAccess) {
    return createErrorResponse('Chưa đăng nhập hoặc không có quyền truy cập', 403)
  }

  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))

    return createSuccessResponse(allUsers, 'Tải danh sách thành viên')
  } catch (error: any) {
    console.error('Error fetching users:', error)
    // If emailVerified column doesn't exist, try without it
    if (error?.message?.includes('emailVerified')) {
      try {
        const allUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
        
        // Add emailVerified default value
        const usersWithDefault = allUsers.map((u: any) => ({
          ...u,
          emailVerified: 'NO'
        }))
        
        return createSuccessResponse(usersWithDefault, 'Tải danh sách thành viên')
      } catch (fallbackError) {
        console.error('Error fetching users (fallback):', fallbackError)
        return createErrorResponse('Không thể tải danh sách thành viên')
      }
    }
    return createErrorResponse('Không thể tải danh sách thành viên')
  }
}

export async function POST(request: NextRequest) {
  // Only ADMIN can create members
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể tạo thành viên.', 403)
  }

  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return createErrorResponse('Tên, email và mật khẩu là bắt buộc', 400)
    }

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return createErrorResponse('Role không hợp lệ', 400)
    }

    // Check if user already exists
    const existingUser = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser[0]) {
      return createErrorResponse('Email đã tồn tại', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user using raw SQL to avoid issues with optional columns
    // This ensures we only insert the columns that definitely exist
    try {
      await db.execute(sql`
        INSERT INTO users (name, email, password, role)
        VALUES (${name}, ${email}, ${hashedPassword}, ${role})
      `)
    } catch (insertError: any) {
      // If raw SQL fails, try with Drizzle (might work if schema matches)
      if (insertError?.code === 'ER_BAD_FIELD_ERROR' || insertError?.errno === 1054) {
        // Try with Drizzle insert
        await db.insert(users).values({
          name,
          email,
          password: hashedPassword,
          role,
        } as any)
      } else {
        throw insertError
      }
    }

    // Get the created user (without password)
    const createdUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return createCreatedResponse(createdUser[0], 'Tạo thành viên')
  } catch (error) {
    console.error('Error creating user:', error)
    return createErrorResponse('Không thể tạo thành viên')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Chưa đăng nhập', 401)
    }

    const currentUserId = (session.user as any)?.id
    const currentUserRole = (session.user as any)?.role
    const isAdmin = currentUserRole === 'ADMIN'

    const body = await request.json()
    const { id, name, email, role, password, phone, company, address, bio } = body

    if (!id) {
      return createErrorResponse('ID thành viên là bắt buộc', 400)
    }

    if (!name || !email) {
      return createErrorResponse('Tên và email là bắt buộc', 400)
    }

    // Check if user exists
    const existingUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!existingUser[0]) {
      return createErrorResponse('Không tìm thấy thành viên', 404)
    }

    // Check permissions:
    // - Users can update their own profile (but cannot change role)
    // - Only ADMIN can update other users and change roles
    const isUpdatingSelf = id === currentUserId
    
    if (!isUpdatingSelf && !isAdmin) {
      return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể cập nhật thông tin thành viên khác.', 403)
    }

    // Users cannot change their own role
    if (isUpdatingSelf && role && role !== existingUser[0].role) {
      return createErrorResponse('Bạn không thể thay đổi quyền của chính mình', 403)
    }

    // Only ADMIN can change roles
    if (!isAdmin && role && role !== existingUser[0].role) {
      return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể thay đổi quyền của thành viên.', 403)
    }

    if (role && !['ADMIN', 'USER'].includes(role)) {
      return createErrorResponse('Role không hợp lệ', 400)
    }

    // Check if email is already used by another user
    const emailCheck = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (emailCheck[0] && emailCheck[0].id !== id) {
      return createErrorResponse('Email đã được sử dụng bởi thành viên khác', 400)
    }

    // Prepare update data
    const updateData: any = {
      name,
      updatedAt: new Date(),
    }

    if (role) {
      updateData.role = role
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Add optional profile fields
    if (phone !== undefined) {
      updateData.phone = phone || null
    }
    if (company !== undefined) {
      updateData.company = company || null
    }
    if (address !== undefined) {
      updateData.address = address || null
    }
    if (bio !== undefined) {
      updateData.bio = bio || null
    }

    const emailChanged = email !== existingUser[0].email
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
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
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
          existingUser[0].name || 'User',
          pendingEmailToken,
          'user',
          { oldEmail: existingUser[0].email }
        )
      } catch (emailError) {
        console.error('Error sending email change verification email:', emailError)
        // Reset pending email fields if email sending fails
        await db
          .update(users)
          .set({
            pendingEmail: null,
            pendingEmailToken: null,
            pendingEmailRequestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
        return createErrorResponse('Không thể gửi email xác nhận đến địa chỉ mới. Vui lòng thử lại sau.', 500)
      }
    }

    // Get the updated user
    const updatedUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        company: users.company,
        address: users.address,
        bio: users.bio,
        pendingEmail: users.pendingEmail,
        pendingEmailRequestedAt: users.pendingEmailRequestedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    const message = emailChanged
      ? 'Đã gửi email xác thực đến địa chỉ mới. Vui lòng kiểm tra hộp thư để hoàn tất thay đổi.'
      : 'Cập nhật thành viên'

    return createSuccessResponse(
      {
        ...updatedUser[0],
        emailChangePending: emailChanged,
      },
      message
    )
  } catch (error) {
    console.error('Error updating user:', error)
    return createErrorResponse('Không thể cập nhật thành viên')
  }
}

export async function DELETE(request: NextRequest) {
  // Only ADMIN can delete members
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể xóa thành viên.', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('ID thành viên là bắt buộc', 400)
    }

    const userId = parseInt(id)

    // Check if user exists
    const existingUser = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!existingUser[0]) {
      return createErrorResponse('Không tìm thấy thành viên', 404)
    }

    // Delete user
    await db.delete(users).where(eq(users.id, userId))

    return createSuccessResponse(null, 'Xóa thành viên')
  } catch (error) {
    console.error('Error deleting user:', error)
    return createErrorResponse('Không thể xóa thành viên')
  }
}

// Send verification email to user (admin-initiated)
export async function PATCH(request: NextRequest) {
  // Only ADMIN can send verification emails
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể gửi email xác thực.', 403)
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return createErrorResponse('ID thành viên là bắt buộc', 400)
    }

    // Check if user exists
    const existingUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!existingUser[0]) {
      return createErrorResponse('Không tìm thấy thành viên', 404)
    }

    // Check if already verified
    if (existingUser[0].emailVerified === 'YES') {
      return createErrorResponse('Tài khoản đã được xác thực', 400)
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Update user with verification token
    try {
      await db
        .update(users)
        .set({
          verificationToken,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
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
        existingUser[0].email,
        existingUser[0].name || 'User',
        verificationToken
      )
    } catch (emailError: any) {
      console.error('Error sending verification email:', emailError)
      return createErrorResponse(`Đã tạo token nhưng không thể gửi email: ${emailError?.message || 'Unknown error'}`)
    }

    return createSuccessResponse(
      {
        message: 'Email xác thực đã được gửi đến địa chỉ email của thành viên'
      },
      'Email xác thực đã được gửi'
    )
  } catch (error: any) {
    console.error('Error sending verification email:', error)
    return createErrorResponse(`Không thể gửi email xác thực: ${error?.message || 'Unknown error'}`)
  }
}
