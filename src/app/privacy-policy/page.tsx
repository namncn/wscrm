'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function PrivacyPolicyPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName
  const supportEmail = settings.companyEmail

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Chính sách bảo mật</h1>
            <p className="text-gray-600">
              Chính sách này giải thích cách {brandName} thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <article className="max-w-none text-gray-700 space-y-8">
                <section className="space-y-4">
                  <p className="text-base leading-relaxed">
                    Chính sách bảo mật này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của khách
                    hàng khi sử dụng các dịch vụ do {brandName} cung cấp. Bằng việc tiếp tục sử dụng hệ thống, bạn đồng ý
                    với các nội dung được trình bày dưới đây.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">1. Thông tin chúng tôi thu thập</h2>
                  <p className="text-base leading-relaxed">
                    Chúng tôi chỉ thu thập những dữ liệu cần thiết để vận hành dịch vụ, bao gồm: họ tên, địa chỉ email,
                    số điện thoại, thông tin hóa đơn và lịch sử giao dịch. Đối với khách hàng doanh nghiệp, hệ thống có
                    thể yêu cầu thêm mã số thuế, địa chỉ công ty và thông tin đại diện theo pháp luật.
                  </p>
                  <p className="text-base leading-relaxed">
                    Ngoài ra, chúng tôi ghi nhận dữ liệu kỹ thuật như địa chỉ IP, loại thiết bị và nhật ký truy cập nhằm
                    mục đích đảm bảo an toàn hệ thống và cải thiện trải nghiệm người dùng.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">2. Cách chúng tôi sử dụng thông tin</h2>
                  <p className="text-base leading-relaxed">
                    Dữ liệu cá nhân được sử dụng để cung cấp và gia hạn dịch vụ, gửi thông báo nhắc nhở, hỗ trợ khách hàng
                    và xử lý yêu cầu phát sinh. Thông tin cũng có thể được dùng để phân tích, nâng cấp sản phẩm và đề xuất
                    các gói dịch vụ phù hợp hơn, song luôn trong khuôn khổ pháp luật hiện hành.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">3. Chia sẻ dữ liệu</h2>
                  <p className="text-base leading-relaxed">
                    {brandName} cam kết không bán hoặc trao đổi dữ liệu cá nhân với bên thứ ba vì mục đích thương mại.
                    Thông tin chỉ được chia sẻ với đối tác kỹ thuật hoặc cơ quan nhà nước có thẩm quyền khi có yêu cầu
                    hợp lệ. Khi làm việc với đối tác, chúng tôi áp dụng các điều khoản ràng buộc nhằm đảm bảo dữ liệu của
                    bạn được bảo vệ ở mức cao nhất.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">4. Bảo mật thông tin</h2>
                  <p className="text-base leading-relaxed">
                    Hệ thống hạ tầng của chúng tôi tuân thủ các chuẩn bảo mật quốc tế. Dữ liệu được mã hóa trong quá
                    trình truyền tải, lưu trữ tại trung tâm dữ liệu an toàn và chỉ nhân sự thẩm quyền mới có thể truy cập.
                    Chúng tôi duy trì chính sách kiểm soát truy cập, sao lưu định kỳ và đánh giá bảo mật thường xuyên.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">5. Quyền của khách hàng</h2>
                  <p className="text-base leading-relaxed">
                    Bạn có quyền yêu cầu xem lại, chỉnh sửa hoặc xóa dữ liệu cá nhân. Nếu muốn rút lại sự đồng ý hay có
                    thắc mắc về cách xử lý thông tin, vui lòng liên hệ bộ phận hỗ trợ
                    {supportEmail ? (
                      <>
                        {' '}qua email{' '}
                        <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>
                          {supportEmail}
                        </a>
                      </>
                    ) : (
                      ' của chúng tôi'
                    )}
                    . Mọi yêu cầu hợp lệ sẽ được phản hồi trong vòng 07 ngày làm việc.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">6. Lưu trữ và cập nhật</h2>
                  <p className="text-base leading-relaxed">
                    Dữ liệu được lưu trữ trong thời gian bạn sử dụng dịch vụ và 12 tháng sau khi chấm dứt nhằm đáp ứng
                    yêu cầu hậu kiểm hoặc giải quyết tranh chấp. Chính sách bảo mật có thể được cập nhật định kỳ để phản
                    ánh sự thay đổi trong quy định hoặc sản phẩm. Khi đó, chúng tôi sẽ thông báo trên website và gửi email
                    đến khách hàng bị ảnh hưởng.
                  </p>
                </section>

                <section className="space-y-3">
                  <p className="text-base leading-relaxed">
                    Nếu bạn có bất kỳ câu hỏi nào liên quan đến chính sách bảo mật, hãy liên hệ với chúng tôi
                    {supportEmail ? (
                      <>
                        {' '}qua{' '}
                        <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>
                          {supportEmail}
                        </a>
                      </>
                    ) : null}{' '}
                    để được hỗ trợ chi tiết.
                  </p>
                </section>
              </article>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

