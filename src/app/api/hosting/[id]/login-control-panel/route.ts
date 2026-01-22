import { db } from '@/lib/database'
import { hosting, customers, controlPanels } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ControlPanelFactory } from '@/lib/control-panels/factory'
import { ControlPanelType } from '@/lib/control-panels/base/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return createErrorResponse('Bạn cần đăng nhập để truy cập', 401)
  }

  try {
    const { id } = await params
    const hostingId = parseInt(id, 10)
    if (isNaN(hostingId)) {
      return createErrorResponse('ID hosting không hợp lệ', 400)
    }

    // Get hosting with customer info
    const hostingData = await db
      .select({
        hosting: hosting,
        customer: customers,
      })
      .from(hosting)
      .leftJoin(customers, eq(hosting.customerId, customers.id))
      .where(eq(hosting.id, hostingId))
      .limit(1)

    if (hostingData.length === 0 || !hostingData[0].hosting) {
      return createErrorResponse('Không tìm thấy hosting', 404)
    }

    const hostingRecord = hostingData[0].hosting
    const customer = hostingData[0].customer

    if (!customer) {
      return createErrorResponse('Không tìm thấy thông tin khách hàng', 404)
    }

    // Check permission: customer can only access their own hosting
    const userType = (session.user as any)?.userType
    if (userType === 'customer') {
      if (!session.user.email) {
        return createErrorResponse('Không tìm thấy thông tin email', 400)
      }

      const currentCustomer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1)

      if (!currentCustomer || currentCustomer.length === 0 || hostingRecord.customerId !== currentCustomer[0].id) {
        return createErrorResponse('Bạn không có quyền truy cập hosting này', 403)
      }
    }

    // Check if customer has externalAccountId
    if (!customer.externalAccountId) {
      return createErrorResponse('Khách hàng chưa được đồng bộ với Control Panel', 400)
    }

    // Get control panel config
    const controlPanel = await db
      .select()
      .from(controlPanels)
      .where(and(
        eq(controlPanels.enabled, 'YES'),
        eq(controlPanels.type, 'ENHANCE')
      ))
      .limit(1)

    if (controlPanel.length === 0) {
      return createErrorResponse('Control Panel chưa được cấu hình', 404)
    }

    let config: any = controlPanel[0].config
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (parseError) {
        return createErrorResponse('Cấu hình Control Panel không hợp lệ', 500)
      }
    }

    if (!config.orgId && process.env.ENHANCE_ORG_ID) {
      config.orgId = process.env.ENHANCE_ORG_ID
    }

    if (!config.baseUrl) {
      return createErrorResponse('Cấu hình Control Panel thiếu baseUrl', 500)
    }

    // Create Enhance adapter instance
    const controlPanelInstance = ControlPanelFactory.create(controlPanel[0].type as ControlPanelType, config)
    const enhanceAdapter = controlPanelInstance as any
    const enhanceClient = enhanceAdapter.client

    if (!enhanceClient) {
      return createErrorResponse('Không thể khởi tạo Enhance client', 500)
    }

    const customerOrgId = customer.externalAccountId

    // Step 1: Get members of the customer organization
    const membersResult = await enhanceClient.getMembers(customerOrgId)
    
    if (!membersResult.success || !membersResult.data) {
      return createErrorResponse(
        `Không thể lấy danh sách members: ${membersResult.error || 'Unknown error'}`,
        500
      )
    }

    // Step 2: Find member with OWNER role (or first member if no OWNER found)
    const members = Array.isArray(membersResult.data) 
      ? membersResult.data 
      : (membersResult.data.items || [])
    
    if (members.length === 0) {
      return createErrorResponse('Không tìm thấy member trong organization', 404)
    }

    // Try to find OWNER member first
    let targetMember = members.find((m: any) => {
      const roles = m.roles || []
      return roles.includes('OWNER') || roles.includes('Owner') || roles.includes('owner')
    })

    // If no OWNER found, use first member
    if (!targetMember) {
      targetMember = members[0]
    }

    const memberId = targetMember.id
    if (!memberId) {
      return createErrorResponse('Member không có ID', 500)
    }

    // Step 3: Get SSO One-Time-Password link
    const ssoResult = await enhanceClient.getMemberSSO(customerOrgId, memberId)
    
    if (!ssoResult.success) {
      return createErrorResponse(
        `Không thể tạo SSO link: ${ssoResult.error || 'Unknown error'}`,
        500
      )
    }

    // Try to get link from different possible fields
    const loginUrl = ssoResult.data?.link || ssoResult.data?.url || ssoResult.data?.loginUrl
    
    if (!loginUrl) {
      return createErrorResponse(
        `SSO response không chứa link`,
        500
      )
    }

    return createSuccessResponse(
      { loginUrl, customerOrgId, memberId },
      'Tạo login URL thành công'
    )
  } catch (error) {
    console.error('Error generating login URL:', error)
    return createErrorResponse('Không thể tạo login URL')
  }
}

