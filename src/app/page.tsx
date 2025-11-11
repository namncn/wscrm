'use client'

import { getBrandName } from '@/lib/utils'
import Link from 'next/link'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Globe, 
  Server,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap
} from 'lucide-react'

export default function HomePage() {
  // Use NEXT_PUBLIC_BRAND_NAME so both server and client get the same value
  const brandName = getBrandName()

  // Homepage is public - no authentication required
  // Users can view homepage without being logged in

  const services = [
    {
      title: 'Tên Miền',
      description: 'Đăng ký tên miền với giá cả cạnh tranh',
      icon: Globe,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      href: '/domain',
      features: ['Đăng ký .com, .vn, .net', 'Gia hạn tự động', 'DNS quản lý']
    },
    {
      title: 'Hosting',
      description: 'Hosting chất lượng cao với tốc độ nhanh',
      icon: Server,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      href: '/hosting',
      features: ['SSD Storage', 'Bandwidth không giới hạn', 'SSL miễn phí']
    },
    {
      title: 'VPS',
      description: 'Máy chủ ảo mạnh mẽ cho doanh nghiệp',
      icon: Server,
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      href: '/vps',
      features: ['Root access', 'Tùy chỉnh cấu hình', 'Backup tự động']
    }
  ]

  const benefits = [
    {
      icon: Shield,
      title: 'Bảo mật cao',
      description: 'Hệ thống bảo mật đa lớp, đảm bảo an toàn tuyệt đối'
    },
    {
      icon: Zap,
      title: 'Tốc độ nhanh',
      description: 'Công nghệ SSD và CDN giúp website load cực nhanh'
    },
    {
      icon: CheckCircle,
      title: 'Hỗ trợ 24/7',
      description: 'Đội ngũ kỹ thuật hỗ trợ bạn mọi lúc, mọi nơi'
    }
  ]

  return (
    <MemberLayout>
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Chào mừng đến với {brandName}
              </h1>
              <p className="text-lg md:text-xl mb-6 text-blue-100">
                Khám phá các dịch vụ hosting, domain và VPS chất lượng cao với giá cả cạnh tranh
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  href="/domain"
                  className="inline-flex items-center justify-center px-6 py-2 border border-white text-white rounded-md font-medium hover:bg-white hover:text-blue-600 transition-colors space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>Đăng ký tên miền</span>
                </Link>
                <Link 
                  href="/hosting"
                  className="inline-flex items-center justify-center px-6 py-2 border border-white text-white rounded-md font-medium hover:bg-white hover:text-blue-600 transition-colors space-x-2"
                >
                  <Server className="h-4 w-4" />
                  <span>Thuê hosting</span>
                </Link>
                <Link 
                  href="/vps"
                  className="inline-flex items-center justify-center px-6 py-2 border border-white text-white rounded-md font-medium hover:bg-white hover:text-blue-600 transition-colors space-x-2"
                >
                  <Server className="h-4 w-4" />
                  <span>Thuê VPS</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Services Grid */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Dịch vụ của chúng tôi
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Cung cấp giải pháp công nghệ toàn diện cho doanh nghiệp
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card key={service.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${service.color}`}>
                        <service.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{service.title}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Link 
                      href={service.href}
                      className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Khám phá ngay
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="relative mb-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.4) 0%, transparent 55%), radial-gradient(circle at 80% 30%, rgba(168,85,247,0.3) 0%, transparent 50%), radial-gradient(circle at 30% 75%, rgba(14,165,233,0.35) 0%, transparent 60%)',
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle,_#ffffff_1px,_transparent_1px)] [background-size:32px_32px] opacity-[0.3]" />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.12)_0%,rgba(236,72,153,0.08)_50%,rgba(124,58,237,0.12)_100%)] mix-blend-screen" />
            </div>
            <div className="relative rounded-3xl border border-blue-100/50 backdrop-blur-sm p-10">
              <div className="absolute -top-3 left-10 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/40 to-indigo-500/20 blur-xl pointer-events-none" />
              <div className="absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/30 blur-2xl pointer-events-none" />
              <h3 className="text-2xl font-bold text-center mb-10">
                <span className="relative inline-flex items-center">
                  <span className="absolute inset-x-0 -bottom-1 h-3 bg-gradient-to-r from-blue-200/60 via-purple-200/50 to-pink-200/60 blur-sm rounded-full" />
                  <span className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    Tại sao chọn chúng tôi?
                  </span>
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="group relative rounded-2xl border border-white/60 bg-white/70 p-6 text-center shadow-[0_20px_45px_-20px_rgba(59,130,246,0.35)] backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_60px_-20px_rgba(59,130,246,0.45)] flex flex-col items-center"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-lg ring-4 ring-white/70 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <benefit.icon className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="relative text-lg font-semibold mb-3 text-gray-800">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {benefit.title}
                      </span>
                    </h4>
                    <p className="relative text-sm text-gray-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">1000+</div>
                <div className="text-gray-600">Khách hàng tin tưởng</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">99.9%</div>
                <div className="text-gray-600">Uptime đảm bảo</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">24/7</div>
                <div className="text-gray-600">Hỗ trợ kỹ thuật</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">5+</div>
                <div className="text-gray-600">Năm kinh nghiệm</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}