import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { customers, controlPanels } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { ControlPanelFactory } from '@/lib/control-panels/factory'
import { ControlPanelType } from '@/lib/control-panels/base/types'

// Helper function to check if user is ADMIN
async function checkAdminRole() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const userRole = (session.user as any)?.role
  return userRole === 'ADMIN'
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return createErrorResponse('Bạn không có quyền thực hiện hành động này. Chỉ quản trị viên mới có thể sync customers.', 403)
  }

  try {
    const body = await req.json()
    const { customerId, controlPanelId } = body

    if (!customerId) {
      return createErrorResponse('Customer ID là bắt buộc', 400)
    }

    // Get customer from database
    const customerRecords = await db.select()
      .from(customers)
      .where(eq(customers.id, parseInt(customerId)))
      .limit(1)

    if (customerRecords.length === 0) {
      return createErrorResponse('Không tìm thấy customer', 404)
    }

    const customer = customerRecords[0]

    // Get control panel (default or specified)
    let cpId = controlPanelId
    if (!cpId) {
      const defaultCp = await db.select()
        .from(controlPanels)
        .where(and(
          eq(controlPanels.enabled, 'YES'),
          eq(controlPanels.type, 'ENHANCE')
        ))
        .limit(1)
      
      if (defaultCp.length === 0) {
        return createErrorResponse('Không tìm thấy control panel được kích hoạt', 404)
      }
      cpId = defaultCp[0].id
    }

    // Get control panel config
    const cpRecord = await db.select()
      .from(controlPanels)
      .where(eq(controlPanels.id, cpId))
      .limit(1)

    if (cpRecord.length === 0) {
      return createErrorResponse('Không tìm thấy control panel', 404)
    }

    let config: any = cpRecord[0].config
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (parseError) {
        console.error('[Customer Sync] Error parsing config JSON:', parseError)
        config = {}
      }
    }

    if (!config.orgId && process.env.ENHANCE_ORG_ID) {
      config.orgId = process.env.ENHANCE_ORG_ID
    }

    if (!config.orgId) {
      return createErrorResponse('orgId là bắt buộc. Vui lòng cấu hình orgId trong Control Panels settings hoặc ENHANCE_ORG_ID environment variable.', 400)
    }

    // Create control panel instance
    const controlPanelInstance = ControlPanelFactory.create(cpRecord[0].type as ControlPanelType, config)
    const enhanceAdapter = controlPanelInstance as any

    if (!enhanceAdapter) {
      return createErrorResponse('Không thể tạo control panel instance', 500)
    }

    let action: 'created' | 'updated' | 'synced' = 'synced'
    let externalAccountId: string | undefined = customer.externalAccountId || undefined

    // Logic mới: Nếu có externalAccountId, lấy thông tin từ Enhance và cập nhật database
    if (externalAccountId) {
      const getCustomerResult = await enhanceAdapter.getCustomer(externalAccountId)
      
      if (getCustomerResult.success && getCustomerResult.data) {
        const enhanceCustomer = getCustomerResult.data
        
        // So sánh thông tin từ Enhance với database
        // Note: enhanceCustomer đã được parse, có name, email trực tiếp hoặc trong metadata
        const enhanceName = enhanceCustomer.name || enhanceCustomer.metadata?.name || ''
        const enhanceEmail = enhanceCustomer.email || enhanceCustomer.metadata?.ownerEmail || enhanceCustomer.metadata?.email || ''
        const enhancePhone = enhanceCustomer.metadata?.phone || enhanceCustomer.metadata?.phoneNumber || null
        const enhanceCompany = enhanceCustomer.metadata?.company || enhanceCustomer.metadata?.organization || null
        
        // Kiểm tra thay đổi cho tất cả các trường
        const nameChanged = enhanceName && enhanceName.trim() !== (customer.name || '').trim()
        const emailChanged = enhanceEmail && enhanceEmail.trim() !== (customer.email || '').trim()
        const phoneChanged = enhancePhone && enhancePhone !== (customer.phone || null)
        const companyChanged = enhanceCompany && enhanceCompany !== (customer.company || null)
        
        const hasChanges = nameChanged || emailChanged || phoneChanged || companyChanged

        if (hasChanges) {
          // Cập nhật database với thông tin từ Enhance
          const updateData: any = {
            updatedAt: new Date(),
          }

          if (nameChanged) {
            updateData.name = enhanceName.trim()
          }
          if (emailChanged) {
            updateData.email = enhanceEmail.trim()
          }
          if (phoneChanged) {
            updateData.phone = enhancePhone
          }
          if (companyChanged) {
            updateData.company = enhanceCompany
          }

          await db.update(customers)
            .set(updateData)
            .where(eq(customers.id, customer.id))

          action = 'updated'
        }
      } else {
        // Customer không tồn tại trên Enhance, tạo mới
        externalAccountId = undefined // Reset để tạo mới
      }
    }

    // Nếu không có externalAccountId hoặc không tìm thấy trên Enhance, tạo customer mới
    if (!externalAccountId) {
      const createResult = await enhanceAdapter.findOrCreateCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        company: customer.company || undefined,
      })

      if (!createResult.success || !createResult.data) {
        return createErrorResponse(
          `Không thể tạo customer trên Enhance: ${createResult.error || 'Unknown error'}`,
          500
        )
      }

      externalAccountId = createResult.data.id
      action = 'created'

      // Lưu externalAccountId vào database
      await db.update(customers)
        .set({
          externalAccountId: externalAccountId,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
    }

    // Map action to Vietnamese message
    let message = 'Đồng bộ customer thành công'
    if (action === 'created') {
      message = 'Đã tạo customer mới trên Enhance Control Panel và lưu SYNC Customer ID thành công'
    } else if (action === 'updated') {
      message = 'Đã cập nhật thông tin customer từ Enhance Control Panel vào database thành công'
    } else {
      message = 'Đã đồng bộ customer thành công. Không có thay đổi cần cập nhật.'
    }

    return createSuccessResponse({
      customerId: customer.id,
      externalAccountId: externalAccountId,
      action: action,
    }, message)
  } catch (error: any) {
    console.error('[Customer Sync API] Error:', error)
    return createErrorResponse(`Có lỗi xảy ra: ${error.message || 'Unknown error'}`)
  }
}

