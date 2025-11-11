'use client'

import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function ContactPage() {
  const { settings } = usePublicSettings()
  const brandName = settings.companyName
  const contactChannels = [
    settings.companyEmail && {
      icon: Mail,
      label: 'Email',
      value: settings.companyEmail,
      href: `mailto:${settings.companyEmail}`,
    },
    settings.companyPhone && {
      icon: Phone,
      label: 'Hotline',
      value: settings.companyPhone,
      href: `tel:${settings.companyPhone.replace(/\s/g, '')}`,
    },
    settings.companyAddress && {
      icon: MapPin,
      label: 'Văn phòng',
      value: settings.companyAddress,
    },
    {
      icon: Clock,
      label: 'Giờ làm việc',
      value: 'Thứ 2 - Thứ 6: 8h00 - 18h00 | Thứ 7: 8h00 - 12h00',
    },
  ].filter(Boolean) as Array<{
    icon: LucideIcon
    label: string
    value: string
    href?: string
  }>

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Liên hệ</h1>
            <p className="text-gray-600">
              Đội ngũ {brandName} luôn sẵn sàng hỗ trợ bạn qua nhiều kênh liên lạc khác nhau.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-5">
              {contactChannels.map((channel) => (
                <div key={channel.label} className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                    <channel.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{channel.label}</p>
                    {channel.href ? (
                      <a href={channel.href} className="text-sm text-blue-600 hover:underline">
                        {channel.value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600">{channel.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

