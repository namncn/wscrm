'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const mockNews = [
  {
    title: 'Ra mắt trung tâm khách hàng mới',
    date: '08/11/2025',
    description:
      'Chúng tôi cập nhật giao diện trung tâm khách hàng với nhiều công cụ quản lý dịch vụ và hóa đơn tiện lợi hơn.',
  },
  {
    title: 'Tăng băng thông miễn phí cho gói hosting Business',
    date: '15/10/2025',
    description:
      'Khách hàng thuộc gói Business sẽ được nâng cấp băng thông không giới hạn hoàn toàn miễn phí từ tháng 11.',
  },
  {
    title: 'Tích hợp cổng thanh toán mới',
    date: '30/09/2025',
    description:
      'Hệ thống hiện đã hỗ trợ thêm nhiều phương thức thanh toán linh hoạt gồm QR ngân hàng và ví điện tử.',
  },
  {
    title: 'Nâng cấp dịch vụ backup tự động',
    date: '12/08/2025',
    description:
      'Dịch vụ sao lưu được bổ sung tùy chọn lưu trữ đa vùng giúp tăng khả năng phục hồi khi xảy ra sự cố.',
  },
]

export default function NewsPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Tin tức</h1>
            <p className="text-gray-600">
              Cập nhật thông tin mới nhất về sản phẩm, dịch vụ và các hoạt động của {brandName}.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {mockNews.map((item) => (
              <Card key={item.title} className="h-full">
                <CardContent className="p-6 space-y-3">
                  <span className="text-sm font-medium text-blue-600">{item.date}</span>
                  <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

