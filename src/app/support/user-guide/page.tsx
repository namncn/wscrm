'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const steps = [
  {
    title: 'Đăng nhập vào trung tâm khách hàng',
    description: 'Sử dụng email và mật khẩu đã đăng ký để truy cập dashboard quản lý dịch vụ.',
  },
  {
    title: 'Quản lý dịch vụ',
    description: 'Tại menu chính, chọn mục tương ứng như Tên miền, Hosting hoặc VPS để xem và thao tác.',
  },
  {
    title: 'Thanh toán và gia hạn',
    description: 'Vào phần Đơn hàng của tôi để xem hóa đơn, tải PDF hoặc thanh toán trực tuyến.',
  },
]

export default function UserGuidePage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Hướng dẫn sử dụng</h1>
            <p className="text-gray-600">
              Các bước cơ bản để sử dụng hiệu quả hệ thống quản lý khách hàng của {brandName}.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-6">
              {steps.map((step, index) => (
                <div key={step.title} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <span className="text-sm font-medium text-blue-600">Bước {index + 1}</span>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900">{step.title}</h2>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
              <p className="text-sm text-gray-500">
                Nếu bạn cần hướng dẫn chi tiết hơn, vui lòng liên hệ đội ngũ hỗ trợ để được trợ giúp.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

