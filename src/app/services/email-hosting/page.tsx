'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const benefits = [
  'Hộp thư theo tên miền doanh nghiệp',
  'Dung lượng linh hoạt, mở rộng dễ dàng',
  'Bộ lọc spam và chống virus nâng cao',
  'Sao lưu dữ liệu định kỳ và khôi phục nhanh',
]

export default function EmailHostingPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Email Hosting</h1>
            <p className="text-gray-600">
              Giải pháp email chuyên nghiệp cho doanh nghiệp, đảm bảo tính ổn định và bảo mật toàn diện.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Hệ thống email hosting của {brandName} được triển khai trên hạ tầng hiện đại,
                cho phép truy cập mọi lúc mọi nơi, tích hợp Outlook, Google Workspace và nhiều ứng dụng phổ biến khác.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start space-x-3 text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

