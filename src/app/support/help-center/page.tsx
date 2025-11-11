'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function HelpCenterPage() {
  const { settings } = usePublicSettings()
  const hotline = settings.companyPhone
  const faqs = [
    {
      question: 'Tôi có thể quản lý dịch vụ ở đâu?',
      answer:
        'Bạn có thể truy cập mục Quản lý dịch vụ trong trang dashboard để xem thông tin domain, hosting và VPS.',
    },
    {
      question: 'Làm thế nào để gia hạn dịch vụ?',
      answer:
        'Hệ thống sẽ gửi thông báo qua email trước khi dịch vụ hết hạn. Bạn cũng có thể chủ động gia hạn tại trang Quản lý đơn hàng.',
    },
    {
      question: 'Tôi cần hỗ trợ kỹ thuật thì làm sao?',
      answer: hotline
        ? `Hãy gửi ticket hỗ trợ hoặc liên hệ hotline ${hotline} để được hỗ trợ ngay lập tức.`
        : 'Hãy gửi ticket hỗ trợ để đội ngũ kỹ thuật phản hồi trong thời gian sớm nhất.',
    },
  ]

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Trung tâm hỗ trợ</h1>
            <p className="text-gray-600">
              Tìm câu trả lời nhanh cho những câu hỏi thường gặp và các hướng dẫn sử dụng dịch vụ.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                {faqs.map((faq) => (
                  <div key={faq.question} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">{faq.question}</h2>
                    <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Không tìm thấy câu trả lời? Vui lòng liên hệ đội ngũ hỗ trợ để được trợ giúp chi tiết.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

