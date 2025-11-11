import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { users, customers } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createErrorResponse, createCreatedResponse } from '@/lib/api-response'
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, userType, phone, address, company, taxCode } = body

    if (!name || !email || !password || !userType) {
      return createErrorResponse('Tên, email, mật khẩu và loại tài khoản là bắt buộc', 400)
    }

    // Only allow customer registration from public registration page
    // Admin accounts must be created from admin panel
    if (userType !== 'customer') {
      return createErrorResponse('Chỉ cho phép đăng ký tài khoản khách hàng. Tài khoản admin phải được tạo từ trang quản trị.', 403)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Email không hợp lệ', 400)
    }

    // Validate password length
    if (password.length < 6) {
      return createErrorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400)
    }

    // Check if email already exists in users table (admin/member accounts)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser[0]) {
      return createErrorResponse('Email này đã được sử dụng bởi tài khoản quản trị. Vui lòng sử dụng email khác.', 400)
    }

    // Check if customer already exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1)

    if (existingCustomer[0]) {
      return createErrorResponse('Email khách hàng đã tồn tại', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Customer registration-only: create customer with own password, no users row
    await db.insert(customers).values({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      company: company || '',
      taxCode: taxCode || '',
      status: 'ACTIVE',
      userId: null,
      emailVerified: 'NO',
      verificationToken,
    })

    // Send welcome email
    try {
      await sendWelcomeEmail(email, name)
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail registration if email fails, but log it
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, 'customer')
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail registration if email fails, but log it
    }

    return createCreatedResponse(
      {
        userType: 'customer',
        // For development only - remove in production
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      },
      'Đăng ký khách hàng thành công. Vui lòng kiểm tra email để xác nhận tài khoản.'
    )
  } catch (error) {
    console.error('Error registering user:', error)
    return createErrorResponse('Không thể đăng ký tài khoản')
  }
}

