import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { customers, orders, orderItems, hosting, hostingPackages, users } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { createServicesFromOrder } from '@/lib/order-service'

/**
 * API endpoint để test flow mua hosting và thanh toán
 * POST /api/test/hosting-flow
 * Body: { scenario: 'existing' | 'new', customerEmail?: string, customerName?: string }
 */
export async function POST(req: NextRequest) {
  // Chỉ ADMIN mới có thể chạy test
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createErrorResponse('Chưa đăng nhập', 401)
  }

  const userRole = (session.user as any)?.role
  if (userRole !== 'ADMIN') {
    return createErrorResponse('Chỉ quản trị viên mới có thể chạy test', 403)
  }

  try {
    const body = await req.json()
    const { scenario, customerEmail, customerName } = body

    if (!scenario || !['existing', 'new'].includes(scenario)) {
      return createErrorResponse('scenario phải là "existing" hoặc "new"', 400)
    }

    const results: any = {
      scenario,
      steps: [],
      customer: null,
      order: null,
      hosting: null,
      errors: [],
    }

    // Step 1: Kiểm tra hoặc tạo customer
    results.steps.push({ step: 1, name: 'Kiểm tra/tạo customer', status: 'processing' })
    
    let customerId: number
    let customerExternalId: string | null = null

    if (scenario === 'existing') {
      // Tìm customer đã có sẵn
      const email = customerEmail || 'existing.customer@test.com'
      const existingCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1)

      if (existingCustomers.length === 0) {
        return createErrorResponse(`Không tìm thấy customer với email: ${email}. Vui lòng tạo customer trước.`, 404)
      }

      customerId = existingCustomers[0].id
      customerExternalId = existingCustomers[0].externalAccountId || null
      results.customer = {
        id: customerId,
        email: existingCustomers[0].email,
        name: existingCustomers[0].name,
        externalAccountId: customerExternalId,
      }
      results.steps[0].status = 'success'
      results.steps[0].message = `Customer đã tồn tại: ID=${customerId}, externalAccountId=${customerExternalId || 'NULL'}`
    } else {
      // Tạo customer mới
      const timestamp = Date.now()
      const email = customerEmail || `test.customer.${timestamp}@test.com`
      const name = customerName || `Test Customer ${timestamp}`

      // Lấy userId đầu tiên
      const firstUser = await db.select({ id: users.id }).from(users).limit(1)
      if (!firstUser[0]) {
        return createErrorResponse('Không tìm thấy user trong database', 400)
      }

      // Tạo customer mới
      await db.insert(customers).values({
        name,
        email,
        password: 'TEST_PASSWORD',
        userId: firstUser[0].id,
      })

      // Lấy customer vừa tạo
      const newCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1)

      customerId = newCustomers[0].id
      results.customer = {
        id: customerId,
        email,
        name,
        externalAccountId: null,
      }
      results.steps[0].status = 'success'
      results.steps[0].message = `Đã tạo customer mới: ID=${customerId}`
    }

    // Step 2: Lấy hosting package
    results.steps.push({ step: 2, name: 'Lấy hosting package', status: 'processing' })
    
    const packages = await db
      .select()
      .from(hostingPackages)
      .where(eq(hostingPackages.status, 'ACTIVE'))
      .limit(1)

    if (packages.length === 0) {
      return createErrorResponse('Không tìm thấy hosting package nào', 404)
    }

    const hostingPackage = packages[0]
    results.steps[1].status = 'success'
    results.steps[1].message = `Hosting package: ${hostingPackage.planName} (ID=${hostingPackage.id})`

    // Step 3: Tạo order
    results.steps.push({ step: 3, name: 'Tạo order', status: 'processing' })
    
    const firstUser = await db.select({ id: users.id }).from(users).limit(1)
    if (!firstUser[0]) {
      return createErrorResponse('Không tìm thấy user trong database', 400)
    }

    // Tạo order
    const orderResult = await db.insert(orders).values({
      customerId,
      userId: firstUser[0].id,
      totalAmount: hostingPackage.price.toString(),
      status: 'PENDING',
    })

    // Lấy order ID (cần query lại vì insert không trả về ID trực tiếp trong drizzle)
    const createdOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(1)

    const orderId = createdOrders[0].id

    // Tạo order item
    await db.insert(orderItems).values({
      orderId,
      serviceId: hostingPackage.id,
      serviceType: 'HOSTING',
      quantity: 1,
      price: hostingPackage.price.toString(),
    })

    results.order = {
      id: orderId,
      customerId,
      totalAmount: hostingPackage.price.toString(),
      status: 'PENDING',
    }
    results.steps[2].status = 'success'
    results.steps[2].message = `Đã tạo order: ID=${orderId}`

    // Step 4: Simulate thanh toán thành công (update order status = COMPLETED)
    results.steps.push({ step: 4, name: 'Simulate thanh toán thành công', status: 'processing' })
    
    await db
      .update(orders)
      .set({ status: 'COMPLETED' })
      .where(eq(orders.id, orderId))

    results.order.status = 'COMPLETED'
    results.steps[3].status = 'success'
    results.steps[3].message = 'Đã cập nhật order status = COMPLETED'

    // Step 5: Gọi createServicesFromOrder để trigger flow tự động
    results.steps.push({ step: 5, name: 'Tạo hosting và sync lên Enhance', status: 'processing' })
    
    try {
      await createServicesFromOrder(orderId)
      results.steps[4].status = 'success'
      results.steps[4].message = 'Đã gọi createServicesFromOrder thành công'
    } catch (error: any) {
      results.steps[4].status = 'error'
      results.steps[4].message = `Lỗi: ${error.message}`
      results.errors.push(`createServicesFromOrder: ${error.message}`)
    }

    // Step 6: Kiểm tra kết quả
    results.steps.push({ step: 6, name: 'Kiểm tra kết quả', status: 'processing' })
    
    // Kiểm tra customer có externalAccountId chưa
    const updatedCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1)

    if (updatedCustomers[0]) {
      results.customer.externalAccountId = updatedCustomers[0].externalAccountId
    }

    // Kiểm tra hosting đã được tạo chưa
    const hostings = await db
      .select()
      .from(hosting)
      .where(eq(hosting.customerId, customerId))
      .orderBy(desc(hosting.createdAt))
      .limit(1)

    if (hostings.length > 0) {
      results.hosting = {
        id: hostings[0].id,
        customerId: hostings[0].customerId,
        hostingTypeId: hostings[0].hostingTypeId,
        syncStatus: hostings[0].syncStatus,
        subscriptionId: hostings[0].subscriptionId,
        syncError: hostings[0].syncError,
      }
    }

    // Đánh giá kết quả
    const checks = {
      customerCreated: customerId !== null,
      customerHasExternalId: results.customer.externalAccountId !== null,
      hostingCreated: hostings.length > 0,
      hostingSynced: hostings.length > 0 && hostings[0].syncStatus === 'SYNCED',
      subscriptionCreated: hostings.length > 0 && hostings[0].subscriptionId !== null,
    }

    results.checks = checks
    results.allPassed = Object.values(checks).every(v => v === true)

    results.steps[5].status = results.allPassed ? 'success' : 'warning'
    results.steps[5].message = results.allPassed 
      ? 'Tất cả kiểm tra đã pass!' 
      : 'Một số kiểm tra chưa pass. Xem chi tiết trong checks.'

    return createSuccessResponse(results, `Test ${scenario === 'existing' ? 'customer có sẵn' : 'customer mới'} hoàn tất`)
  } catch (error: any) {
    console.error('[Test Hosting Flow] Error:', error)
    return createErrorResponse(`Lỗi khi chạy test: ${error.message}`)
  }
}

