'use client'

import Link from 'next/link'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePublicSettings } from '@/hooks/usePublicSettings'

export default function SupportTicketPage() {
  const { settings } = usePublicSettings()
  const supportEmail = settings.companyEmail
  const supportPhone = settings.companyPhone
  const brandName = settings.companyName

  return (
    <MemberLayout>
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Ticket hỗ trợ</h1>
            <p className="text-gray-600">
              Gửi yêu cầu hỗ trợ đến đội ngũ kỹ thuật của chúng tôi để được giải quyết nhanh chóng.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-6 p-6">
              <p className="text-gray-700 leading-relaxed">
                Chúng tôi đang hoàn thiện hệ thống ticket trực tuyến. Trong thời gian này, vui lòng liên hệ qua{' '}
                {supportEmail ? (
                  <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>
                    email hỗ trợ
                  </a>
                ) : (
                  'email hỗ trợ'
                )}
                {supportPhone && (
                  <>
                    {' '}hoặc{' '}
                    <a className="text-blue-600 hover:underline" href={`tel:${supportPhone.replace(/\s/g, '')}`}>
                      hotline {supportPhone}
                    </a>
                  </>
                )}{' '}
                để được hỗ trợ. Nhân viên của {brandName} sẽ phản hồi trong vòng 24 giờ làm việc.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                {supportEmail && (
                  <p>
                    Email:{' '}
                    <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>
                      {supportEmail}
                    </a>
                  </p>
                )}
                {supportPhone && (
                  <p>
                    Hotline:{' '}
                    <a className="text-blue-600 hover:underline" href={`tel:${supportPhone.replace(/\s/g, '')}`}>
                      {supportPhone}
                    </a>
                  </p>
                )}
              </div>
              {supportEmail && (
                <div className="flex justify-center">
                  <Button asChild>
                    <Link href={`mailto:${supportEmail}`}>Gửi email hỗ trợ</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}

