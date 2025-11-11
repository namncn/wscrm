'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'
import { getBrandName } from '@/lib/utils'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const brandName = getBrandName()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Try admin login first
      let result = await signIn('admin', {
        email,
        password,
        redirect: false,
      })

      // If admin login successful
      if (!result?.error) {
        const session = await getSession()
        if (session?.user) {
          const userType = (session.user as any).userType
          if (userType === 'admin') {
            router.push('/admin')
            return
          }
        }
      }

      // If admin login failed, try customer login
      result = await signIn('customer', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Check for specific error codes
        if (result.error === 'EMAIL_NOT_VERIFIED' || result.error?.includes?.('EMAIL_NOT_VERIFIED')) {
          setError('Tài khoản chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập. Nếu chưa nhận được email, vui lòng liên hệ quản trị viên để gửi lại email xác thực.')
        } else {
          setError('Email hoặc mật khẩu không đúng')
        }
      } else {
        // Get session to check user type and redirect accordingly
        const session = await getSession()
        if (session?.user) {
          const userType = (session.user as any).userType
          if (userType === 'customer') {
            router.push('/profile')
          } else {
            router.push('/')
          }
        }
      }
    } catch (error) {
      setError('Đã xảy ra lỗi, vui lòng thử lại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Đăng nhập {brandName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Quản lý Tên miền, Hosting, VPS và Khách hàng
          </p>
        </div>
        
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LogIn className="h-5 w-5" />
              <span>Đăng nhập</span>
            </CardTitle>
            <CardDescription>
              Nhập thông tin đăng nhập của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Chưa có tài khoản?{' '}
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                  Đăng ký ngay
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-800">
                  Quên mật khẩu?
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
