'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const highlights = [
  'Sao lưu tự động hàng ngày, hàng tuần hoặc tùy chỉnh',
  'Lưu trữ dữ liệu trên hạ tầng đám mây bảo mật cao',
  'Khôi phục chỉ với vài cú nhấp chuột',
  'Theo dõi trạng thái backup ngay trong dashboard khách hàng',
]

export default function BackupServicePage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Backup Service</h1>
            <p className="text-gray-600">
              Bảo vệ toàn bộ dữ liệu website và máy chủ với giải pháp sao lưu tự động, an toàn và tiết kiệm.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Backup Service của {brandName} giúp bạn chủ động trước mọi sự cố. Dữ liệu được mã hóa và lưu tại nhiều vùng
                dự phòng nhằm đảm bảo khả năng khôi phục nhanh chóng.
              </p>
              <div className="space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start space-x-3 text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>{item}</span>
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

