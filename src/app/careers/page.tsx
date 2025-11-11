'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const openPositions = [
  {
    title: 'Chuyên viên kinh doanh (B2B)',
    location: 'TP. Hồ Chí Minh',
    type: 'Full-time',
    description:
      'Tìm kiếm, tư vấn và chăm sóc khách hàng doanh nghiệp sử dụng dịch vụ domain, hosting và VPS.',
  },
  {
    title: 'Kỹ sư hệ thống',
    location: 'Hà Nội',
    type: 'Full-time',
    description:
      'Vận hành, giám sát hạ tầng máy chủ, tối ưu hiệu suất và bảo mật cho hệ thống.',
  },
  {
    title: 'Chuyên viên chăm sóc khách hàng',
    location: 'TP. Hồ Chí Minh',
    type: 'Full-time',
    description:
      'Tiếp nhận và giải quyết các yêu cầu hỗ trợ của khách hàng qua email, điện thoại và live chat.',
  },
  {
    title: 'Product Manager',
    location: 'Remote',
    type: 'Full-time',
    description:
      'Phối hợp cùng đội ngũ kỹ thuật và kinh doanh để phát triển sản phẩm mới, xây dựng roadmap và đo lường hiệu quả.',
  },
]

export default function CareersPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Tuyển dụng</h1>
            <p className="text-gray-600">
              Gia nhập đội ngũ {brandName} để cùng xây dựng hạ tầng Internet bền vững.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {openPositions.map((position) => (
              <Card key={position.title} className="flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{position.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {position.location} · {position.type}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{position.description}</p>
                  <Button className="mt-auto" variant="outline" asChild>
                    <a href="mailto:hr@crmportal.com">Ứng tuyển ngay</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

