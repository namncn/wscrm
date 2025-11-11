'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function FaqPage() {
  const { settings } = usePublicSettings()
  const supportEmail = settings.companyEmail
  const faqs = [
    {
      question: 'Tôi có thể đổi gói dịch vụ không?',
      answer:
        'Bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào từ dashboard khách hàng. Phí chênh lệch sẽ được hệ thống tính tự động.',
    },
    {
      question: 'Làm sao để khởi tạo ticket hỗ trợ?',
      answer: supportEmail
        ? `Truy cập mục Ticket hỗ trợ tại chân trang hoặc gửi email đến ${supportEmail}. Vui lòng mô tả chi tiết vấn đề.`
        : 'Truy cập mục Ticket hỗ trợ tại chân trang và mô tả chi tiết vấn đề để chúng tôi hỗ trợ nhanh chóng.',
    },
    {
      question: 'Thanh toán có an toàn không?',
      answer:
        'Chúng tôi sử dụng cổng thanh toán được mã hóa SSL và tuân thủ các tiêu chuẩn bảo mật PCI-DSS. Mọi thông tin đều được bảo vệ.',
    },
  ]

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">FAQ</h1>
            <p className="text-gray-600">Những câu hỏi thường gặp khi sử dụng hệ thống và dịch vụ của chúng tôi.</p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">{faq.question}</h2>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
              <p className="text-sm text-gray-500">
                Không tìm thấy câu trả lời phù hợp? Vui lòng liên hệ đội ngũ hỗ trợ để được giải đáp nhanh chóng.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

