'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const features = [
  'Chứng chỉ DV, OV, EV từ các nhà cung cấp uy tín',
  'Cấp phát và cài đặt trong vòng 24 giờ',
  'Hỗ trợ tích hợp trên mọi nền tảng web phổ biến',
  'Gia hạn tự động và nhắc nhở trước hạn',
]

export default function SslCertificatePage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">SSL Certificate</h1>
            <p className="text-gray-600">
              Bảo vệ website của bạn với chứng chỉ SSL chuẩn quốc tế, tăng độ tin cậy và thứ hạng SEO.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Dịch vụ SSL của {brandName} hỗ trợ nhiều gói chứng chỉ với mức giá linh hoạt,
                phù hợp cho cả website cá nhân và doanh nghiệp.
              </p>
              <div className="grid gap-3">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start space-x-3 text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>{feature}</span>
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

