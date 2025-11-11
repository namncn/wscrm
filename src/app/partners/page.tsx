'use client'

import MemberLayout from '@/components/layout/member-layout'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const partners = [
  {
    name: 'Global DNS Network',
    initials: 'GDN',
    tagline: 'DNS Anycast toàn cầu',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'SecureCloud',
    initials: 'SC',
    tagline: 'Hạ tầng cloud đạt chuẩn ISO 27001',
    color: 'from-emerald-500 to-green-500',
  },
  {
    name: 'MailPro Suite',
    initials: 'MP',
    tagline: 'Giải pháp email doanh nghiệp',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    name: 'EdgeShield CDN',
    initials: 'ES',
    tagline: 'Mạng CDN tốc độ cao',
    color: 'from-orange-500 to-red-500',
  },
  {
    name: 'BackupSafe',
    initials: 'BS',
    tagline: 'Sao lưu dữ liệu đa vùng',
    color: 'from-slate-600 to-gray-800',
  },
  {
    name: 'PayLink',
    initials: 'PL',
    tagline: 'Thanh toán trực tuyến an toàn',
    color: 'from-pink-500 to-rose-500',
  },
]

export default function PartnersPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Đối tác</h1>
            <p className="text-gray-600">
              {brandName} hợp tác với nhiều nhà cung cấp hàng đầu để xây dựng hệ sinh thái dịch vụ toàn diện.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-sm transition hover:shadow-lg"
              >
                <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${partner.color} text-white shadow-lg transition group-hover:scale-105`}>
                  <span className="text-2xl font-bold tracking-wide">{partner.initials}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{partner.name}</h2>
                <p className="mt-2 text-sm text-gray-500">{partner.tagline}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            Danh sách đối tác được cập nhật định kỳ khi {brandName} mở rộng hệ sinh thái sản phẩm và dịch vụ.
          </p>
        </div>
      </div>
    </MemberLayout>
  )
}

