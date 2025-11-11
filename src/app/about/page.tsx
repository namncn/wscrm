'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const story = [
  'Từ năm 2015, chúng tôi đã chọn con đường trở thành đối tác đồng hành chiến lược của doanh nghiệp Việt Nam trên hành trình chuyển đổi số. Bắt đầu từ dịch vụ lưu trữ web, {brandName} hiện cung cấp hệ sinh thái toàn diện gồm domain, hosting, VPS, email doanh nghiệp, giải pháp bảo mật và các tiện ích vận hành chuyên sâu.',
  'Ngay từ những ngày đầu, chúng tôi xây dựng triết lý lấy khách hàng làm trung tâm, đặt tính minh bạch và độ tin cậy lên hàng đầu. Các sản phẩm, tính năng mới đều được phát triển dựa trên phản hồi thực tế nhằm giải quyết những “nỗi đau” trong quản trị hạ tầng và vận hành dịch vụ số.',
  '{brandName} sở hữu đội ngũ kỹ sư hơn 50 thành viên với kinh nghiệm triển khai hạ tầng cho hàng nghìn doanh nghiệp trên toàn quốc. Tinh thần tận tâm, minh bạch và sáng tạo là kim chỉ nam giúp chúng tôi xây dựng niềm tin, đồng thời giữ vững tốc độ tăng trưởng hai chữ số mỗi năm.',
  'Chúng tôi tin rằng công nghệ chỉ thật sự có ý nghĩa khi tạo ra giá trị hữu hình cho doanh nghiệp. Vì vậy, {brandName} luôn đầu tư song song vào hạ tầng, con người và quy trình để đảm bảo mỗi dịch vụ bàn giao cho khách hàng đều ở mức sẵn sàng cao nhất.',
]

const pillars = [
  {
    title: 'Hạ tầng đáng tin cậy',
    body:
      'Hệ thống máy chủ đặt tại các trung tâm dữ liệu đạt chuẩn Tier III với khả năng mở rộng linh hoạt. Chúng tôi liên tục đầu tư vào công nghệ mới nhằm đảm bảo hiệu năng vượt trội và thời gian hoạt động ổn định 99.99%.',
  },
  {
    title: 'Bảo mật đa lớp',
    body:
      'Mọi dịch vụ đều được bảo vệ bằng các giải pháp tường lửa, chống DDoS, quét mã độc tự động và cơ chế sao lưu dự phòng. Quy trình vận hành tuân thủ tiêu chuẩn ISO/IEC 27001 giúp khách hàng yên tâm tập trung phát triển kinh doanh.',
  },
  {
    title: 'Con người & văn hóa',
    body:
      'Đội ngũ chuyên gia của {brandName} không ngừng học hỏi để mang lại trải nghiệm tốt nhất. Mỗi thành viên đều được trao quyền chủ động, khuyến khích sáng tạo và cam kết đồng hành cùng khách hàng đến cùng kết quả.',
  },
]

const stats = [
  { label: 'Khách hàng đang hoạt động', value: '12.000+' },
  { label: 'Máy chủ quản lý', value: '3.500+' },
  { label: 'Mức uptime cam kết', value: '99.99%' },
  { label: 'Đội ngũ kỹ sư', value: '50+' },
]

const focusAreas = [
  {
    title: 'Giải pháp hạ tầng linh hoạt',
    points: [
      'Thiết kế kiến trúc theo nhu cầu từng ngành nghề, hỗ trợ mở rộng trong vài phút.',
      'Tích hợp hệ thống giám sát realtime giúp khách hàng kiểm soát hiệu năng tức thời.',
      'Cung cấp API/SDK cho phép doanh nghiệp tự động hóa quy trình vận hành nội bộ.',
    ],
  },
  {
    title: 'Dịch vụ đồng hành toàn diện',
    points: [
      'Trung tâm hỗ trợ 24/7 thông qua đa kênh email, hotline, ticket và live chat.',
      'Đội ngũ Customer Success theo dõi sát sao việc triển khai, chủ động đề xuất cải tiến.',
      'Chương trình đào tạo, workshop định kỳ giúp khách hàng nâng cao kỹ năng quản trị dịch vụ.',
    ],
  },
  {
    title: 'Cam kết bảo mật & tuân thủ',
    points: [
      'Quy trình nội bộ tuân thủ các tiêu chuẩn ISO/IEC 27001 và ISO 20000.',
      'Ký kết thoả thuận bảo mật (NDA) và thoả thuận cấp độ dịch vụ (SLA) rõ ràng.',
      'Thực hiện kiểm thử bảo mật thường xuyên, công bố minh bạch các chính sách bảo vệ dữ liệu.',
    ],
  },
]

const milestones = [
  { year: '2015', title: 'Khởi đầu', description: 'Ra mắt dịch vụ hosting đầu tiên dành cho doanh nghiệp SME.' },
  { year: '2017', title: 'Mở rộng', description: 'Triển khai trung tâm dữ liệu thứ hai và bổ sung dịch vụ VPS.' },
  {
    year: '2020',
    title: 'Tăng tốc',
    description: 'Giới thiệu nền tảng quản trị khách hàng và tự động hóa quản lý dịch vụ, phục vụ hơn 5.000 khách hàng.',
  },
  {
    year: '2023',
    title: 'Đa dạng dịch vụ',
    description: 'Bổ sung email doanh nghiệp, backup đa vùng và giải pháp bảo mật toàn diện.',
  },
  {
    year: '2025',
    title: 'Hiện tại',
    description: 'Hơn 12.000 khách hàng tin dùng, hạ tầng phủ rộng toàn quốc với đội ngũ hỗ trợ 24/7.',
  },
]

export default function AboutPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                We build reliable infrastructure
              </span>
              <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Về {brandName}</h1>
              <p className="text-gray-600 md:text-lg">
                Đối tác đồng hành của hơn 12.000 doanh nghiệp, cung cấp giải pháp hạ tầng số toàn diện với tốc độ, bảo mật
                và tính sẵn sàng cao.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-6 p-6 md:p-10">
                <div className="space-y-4">
                  {story.map((paragraph, index) => (
                    <p key={index} className="text-base leading-relaxed text-gray-700">
                      {paragraph.replace('{brandName}', brandName)}
                    </p>
                  ))}
                </div>

                <div className="grid gap-4 rounded-2xl bg-blue-50/70 p-6 text-center sm:grid-cols-2 md:grid-cols-4">
                  {stats.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-2xl font-bold text-blue-700">{item.value}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {pillars.map((pillar) => (
                    <div key={pillar.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h2 className="text-xl font-semibold text-gray-900">{pillar.title}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">
                        {pillar.body.replace('{brandName}', brandName)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Năng lực triển khai trọng tâm</h2>
                  <div className="grid gap-6 md:grid-cols-3">
                    {focusAreas.map((area) => (
                      <div key={area.title} className="rounded-2xl bg-gray-50 p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{area.title}</h3>
                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                          {area.points.map((point) => (
                            <li key={point} className="flex items-start space-x-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Cột mốc phát triển</h2>
                  <div className="relative border-l border-blue-200 pl-6">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.year} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="rounded-xl bg-blue-50/60 p-4">
                          <p className="text-sm font-semibold text-blue-600">{milestone.year}</p>
                          <p className="text-base font-semibold text-gray-900">{milestone.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{milestone.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                  <h3 className="text-xl font-semibold">Tiếp tục đồng hành cùng doanh nghiệp Việt</h3>
                  <p className="mt-2 text-sm text-blue-100">
                    Chúng tôi tin rằng hạ tầng vững chắc là nền móng cho mọi thành công bền vững. {brandName} sẽ tiếp tục đầu
                    tư vào con người và công nghệ để mang đến trải nghiệm vượt trên mong đợi.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

