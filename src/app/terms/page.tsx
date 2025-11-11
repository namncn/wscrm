'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function TermsPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Điều khoản sử dụng</h1>
            <p className="text-gray-600">
              Vui lòng đọc kỹ điều khoản để đảm bảo việc sử dụng dịch vụ của {brandName} diễn ra suôn sẻ.
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <article className="max-w-none text-gray-700 space-y-8">
                <section className="space-y-4">
                  <p className="text-base leading-relaxed">
                    Các điều khoản sử dụng này điều chỉnh mối quan hệ giữa {brandName} và khách hàng khi truy cập hoặc sử
                    dụng bất kỳ dịch vụ nào của chúng tôi. Bằng việc đăng ký tài khoản, thanh toán hoặc tiếp tục sử dụng
                    hệ thống, bạn xác nhận đã đọc, hiểu và đồng ý với toàn bộ điều khoản.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">1. Phạm vi dịch vụ</h2>
                  <p className="text-base leading-relaxed">
                    Chúng tôi cung cấp các dịch vụ hạ tầng số như tên miền, hosting, VPS, email và các dịch vụ liên quan.
                    Mọi thông tin mô tả được công bố trên website nhằm mục đích tham khảo và có thể thay đổi tùy theo gói
                    dịch vụ. Khi đăng ký, bạn sẽ nhận được thông tin chi tiết kèm điều kiện sử dụng cụ thể cho từng sản
                    phẩm.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">2. Trách nhiệm của khách hàng</h2>
                  <p className="text-base leading-relaxed">
                    Khách hàng chịu trách nhiệm bảo mật tài khoản, mật khẩu và các thông tin quản trị được cung cấp. Bạn
                    cần đảm bảo nội dung, dữ liệu lưu trữ trên hệ thống không vi phạm pháp luật, không gây ảnh hưởng đến
                    quyền và lợi ích hợp pháp của bên thứ ba. Mọi hành vi sử dụng dịch vụ để tấn công, phát tán mã độc hoặc
                    thư rác đều bị nghiêm cấm.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">3. Thanh toán và gia hạn</h2>
                  <p className="text-base leading-relaxed">
                    Dịch vụ chỉ được kích hoạt sau khi chúng tôi xác nhận thanh toán thành công. Việc gia hạn cần thực
                    hiện trước ngày hết hạn để tránh gián đoạn. Trường hợp quá hạn, hệ thống có thể tạm ngưng hoặc xóa dữ
                    liệu theo chính sách từng dịch vụ. Các khoản phí đã thanh toán sẽ không được hoàn lại, trừ khi quy
                    định pháp luật bắt buộc hoặc do lỗi phát sinh từ phía {brandName}.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">4. Giới hạn trách nhiệm</h2>
                  <p className="text-base leading-relaxed">
                    {brandName} nỗ lực bảo đảm dịch vụ hoạt động ổn định nhưng không chịu trách nhiệm đối với các thiệt
                    hại gián tiếp, mất dữ liệu hay lợi nhuận do sự cố ngoài tầm kiểm soát hợp lý (thiên tai, chiến tranh,
                    sự cố hạ tầng của đối tác, tấn công mạng quy mô lớn...). Trong mọi trường hợp, trách nhiệm bồi thường
                    tối đa không vượt quá tổng giá trị dịch vụ khách hàng đã thanh toán trong vòng 12 tháng gần nhất.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">5. Chấm dứt và tạm ngưng</h2>
                  <p className="text-base leading-relaxed">
                    Chúng tôi có quyền tạm ngưng hoặc chấm dứt dịch vụ nếu phát hiện vi phạm điều khoản, không thanh toán
                    đúng hạn hoặc có yêu cầu từ cơ quan quản lý nhà nước. Khách hàng cũng có thể chủ động chấm dứt bằng
                    cách gửi thông báo bằng văn bản. Mọi dữ liệu sẽ được giữ tối đa 07 ngày kể từ thời điểm chấm dứt, trừ
                    khi pháp luật yêu cầu lưu trữ lâu hơn.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">6. Sửa đổi điều khoản</h2>
                  <p className="text-base leading-relaxed">
                    Điều khoản sử dụng có thể được cập nhật nhằm phản ánh thay đổi trong chính sách pháp lý hoặc sản phẩm.
                    Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trước ít nhất 07 ngày qua email hoặc trên trang
                    thông báo của hệ thống. Việc tiếp tục sử dụng dịch vụ sau thời điểm cập nhật đồng nghĩa với việc bạn
                    chấp nhận nội dung mới.
                  </p>
                </section>

                <section className="space-y-3">
                  <p className="text-base leading-relaxed">
                    Nếu bạn có câu hỏi hoặc cần làm rõ bất kỳ điểm nào trong điều khoản, vui lòng liên hệ bộ phận hỗ trợ
                    của {brandName} để được giải đáp kịp thời.
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

