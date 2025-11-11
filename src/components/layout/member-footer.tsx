'use client'

import { useState, useEffect, type SVGProps } from 'react'
import { Globe, Mail, Phone, MapPin, Facebook, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBrandName } from '@/lib/utils'

interface FooterSettings {
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyAddress?: string
  footerDescription?: string
  footerTicketSupportLink?: string
  footerLiveChatLink?: string
  footerNewsLink?: string
  footerHelpCenterLink?: string
  footerRecruitmentLink?: string
  footerSslCertificateLink?: string
  footerEmailHostingLink?: string
  footerBackupServiceLink?: string
  footerUserGuideLink?: string
  footerFaqLink?: string
  footerContactLink?: string
  footerAboutLink?: string
  footerPartnersLink?: string
  footerPrivacyPolicyLink?: string
  footerTermsLink?: string
  footerFacebookLink?: string
  footerTwitterLink?: string
  footerTiktokLink?: string
}

const FOOTER_DESCRIPTION_DEFAULT =
  'Nhà cung cấp dịch vụ hosting, domain và VPS hàng đầu Việt Nam. Cam kết mang đến giải pháp công nghệ tốt nhất cho doanh nghiệp.'

const FOOTER_LINK_DEFAULTS = {
  footerTicketSupportLink: '/support/ticket',
  footerLiveChatLink: '/support/live-chat',
  footerNewsLink: '/news',
  footerHelpCenterLink: '/support/help-center',
  footerRecruitmentLink: '/careers',
  footerSslCertificateLink: '/services/ssl-certificate',
  footerEmailHostingLink: '/services/email-hosting',
  footerBackupServiceLink: '/services/backup-service',
  footerUserGuideLink: '/support/user-guide',
  footerFaqLink: '/support/faq',
  footerContactLink: '/support/contact',
  footerAboutLink: '/about',
  footerPartnersLink: '/partners',
  footerPrivacyPolicyLink: '/privacy-policy',
  footerTermsLink: '/terms',
  footerFacebookLink: '#',
  footerTwitterLink: '#',
  footerTiktokLink: '#',
}

function TikTokIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M14.5 2a1 1 0 0 1 1 1c0 2.53 1.97 4.5 4.5 4.5a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1 7 7 0 0 1-4-1.25v6.5a6.75 6.75 0 1 1-6.75-6.75H10.5a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1 2.25 2.25 0 1 0 2.25 2.25V3a1 1 0 0 1 1-1h0.75Z" />
    </svg>
  )
}

export default function MemberFooter() {
  const currentYear = new Date().getFullYear()
  const brandName = getBrandName()
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    companyName: brandName,
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    footerDescription: FOOTER_DESCRIPTION_DEFAULT,
    ...FOOTER_LINK_DEFAULTS,
  })
  const [, setIsLoading] = useState(true)

  // Fetch company info from settings API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/settings', {
          cache: 'no-store', // Ensure fresh data
        })

        if (!response.ok) {
          console.error('Failed to fetch settings:', response.status)
          return
        }

        const result = await response.json()
        if (result.success && result.data) {
          setFooterSettings((prev) => ({
            ...prev,
            companyName: result.data.companyName || prev.companyName || brandName,
            companyEmail: result.data.companyEmail || '',
            companyPhone: result.data.companyPhone || '',
            companyAddress: result.data.companyAddress || '',
            footerDescription: result.data.footerDescription ?? prev.footerDescription ?? FOOTER_DESCRIPTION_DEFAULT,
            footerTicketSupportLink: result.data.footerTicketSupportLink || prev.footerTicketSupportLink || '#',
            footerLiveChatLink: result.data.footerLiveChatLink || prev.footerLiveChatLink || '#',
            footerNewsLink: result.data.footerNewsLink || prev.footerNewsLink || '#',
            footerHelpCenterLink: result.data.footerHelpCenterLink || prev.footerHelpCenterLink || '#',
            footerRecruitmentLink: result.data.footerRecruitmentLink || prev.footerRecruitmentLink || '#',
            footerSslCertificateLink: result.data.footerSslCertificateLink || prev.footerSslCertificateLink || '#',
            footerEmailHostingLink: result.data.footerEmailHostingLink || prev.footerEmailHostingLink || '#',
            footerBackupServiceLink: result.data.footerBackupServiceLink || prev.footerBackupServiceLink || '#',
            footerUserGuideLink: result.data.footerUserGuideLink || prev.footerUserGuideLink || '#',
            footerFaqLink: result.data.footerFaqLink || prev.footerFaqLink || '#',
            footerContactLink: result.data.footerContactLink || prev.footerContactLink || '#',
            footerAboutLink: result.data.footerAboutLink || prev.footerAboutLink || '#',
            footerPartnersLink: result.data.footerPartnersLink || prev.footerPartnersLink || '#',
            footerPrivacyPolicyLink: result.data.footerPrivacyPolicyLink || prev.footerPrivacyPolicyLink || '#',
            footerTermsLink: result.data.footerTermsLink || prev.footerTermsLink || '#',
            footerFacebookLink: result.data.footerFacebookLink || prev.footerFacebookLink || '#',
            footerTwitterLink: result.data.footerTwitterLink || prev.footerTwitterLink || '#',
            footerTiktokLink: result.data.footerTiktokLink || prev.footerTiktokLink || '#',
          }))
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
        // Keep default values on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [brandName])

  const services = [
    { name: 'Tên miền', href: '/domain' },
    { name: 'Hosting', href: '/hosting' },
    { name: 'VPS', href: '/vps' },
    { name: 'SSL Certificate', href: footerSettings.footerSslCertificateLink || '#' },
    { name: 'Email Hosting', href: footerSettings.footerEmailHostingLink || '#' },
    { name: 'Backup Service', href: footerSettings.footerBackupServiceLink || '#' },
  ]

  const support = [
    { name: 'Trung tâm hỗ trợ', href: footerSettings.footerHelpCenterLink || '#' },
    { name: 'Hướng dẫn sử dụng', href: footerSettings.footerUserGuideLink || '#' },
    { name: 'FAQ', href: footerSettings.footerFaqLink || '#' },
    { name: 'Liên hệ', href: footerSettings.footerContactLink || '#' },
    { name: 'Ticket hỗ trợ', href: footerSettings.footerTicketSupportLink || '#' },
    { name: 'Live Chat', href: footerSettings.footerLiveChatLink || '#' },
  ]

  const company = [
    { name: 'Về chúng tôi', href: footerSettings.footerAboutLink || '#' },
    { name: 'Tin tức', href: footerSettings.footerNewsLink || '#' },
    { name: 'Tuyển dụng', href: footerSettings.footerRecruitmentLink || '#' },
    { name: 'Đối tác', href: footerSettings.footerPartnersLink || '#' },
    { name: 'Chính sách bảo mật', href: footerSettings.footerPrivacyPolicyLink || '#' },
    { name: 'Điều khoản sử dụng', href: footerSettings.footerTermsLink || '#' },
  ]

  const socialLinks = [
    { name: 'Facebook', href: footerSettings.footerFacebookLink || '#', icon: Facebook },
    { name: 'Twitter', href: footerSettings.footerTwitterLink || '#', icon: Twitter },
    { name: 'Tiktok', href: footerSettings.footerTiktokLink || '#', icon: TikTokIcon },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">{brandName}</h3>
            </div>
            <p className="text-gray-300 mb-6">
              {footerSettings.footerDescription || FOOTER_DESCRIPTION_DEFAULT}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              {footerSettings.companyEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <a href={`mailto:${footerSettings.companyEmail}`} className="text-sm text-gray-300 hover:text-blue-400 transition-colors">
                    {footerSettings.companyEmail}
                  </a>
                </div>
              )}
              {footerSettings.companyPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-blue-400" />
                  <a href={`tel:${footerSettings.companyPhone.replace(/\s/g, '')}`} className="text-sm text-gray-300 hover:text-blue-400 transition-colors">
                    {footerSettings.companyPhone}
                  </a>
                </div>
              )}
              {footerSettings.companyAddress && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{footerSettings.companyAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Dịch vụ</h4>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.name}>
                  <a 
                    href={service.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                  >
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2">
              {support.map((item) => (
                <li key={item.name}>
                  <a 
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Công ty</h4>
            <ul className="space-y-2">
              {company.map((item) => (
                <li key={item.name}>
                  <a 
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription (temporarily hidden) */}
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Copyright */}
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} {brandName}. Tất cả quyền được bảo lưu.
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">Theo dõi chúng tôi:</span>
              <div className="flex space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-8 h-8 bg-gray-800 text-gray-300 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}
