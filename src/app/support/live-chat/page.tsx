'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function LiveChatSupportPage() {
  const { settings } = usePublicSettings()
  const supportEmail = settings.companyEmail
  const supportPhone = settings.companyPhone

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Live chat</h1>
            <p className="text-gray-600">
              Trao đổi trực tiếp với đội ngũ hỗ trợ của chúng tôi. Live chat sẽ sớm được kích hoạt trên toàn hệ thống.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-4 p-6 text-gray-700 leading-relaxed">
              <p>
                Tính năng live chat hiện đang trong giai đoạn thử nghiệm nội bộ. Vui lòng quay lại sau hoặc sử dụng kênh
                hỗ trợ khác để được trợ giúp ngay lập tức.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                {supportEmail && (
                  <li>
                    Gửi email đến{' '}
                    <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>
                      {supportEmail}
                    </a>
                  </li>
                )}
                {supportPhone && <li>Gọi hotline {supportPhone} (24/7)</li>}
                <li>Mở ticket hỗ trợ để chúng tôi theo dõi tốt hơn</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

