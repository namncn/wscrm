'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    if (!email.trim()) {
      setError('Vui lòng nhập email')
      setIsLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi email đặt lại mật khẩu')
      }

      setSuccess(true)
      toastSuccess(data.message || 'Email đã được gửi thành công')

      // In development, show the reset token
      if (data.data?.resetToken && process.env.NODE_ENV === 'development') {
        setResetToken(data.data.resetToken)
      }
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi, vui lòng thử lại')
      toastError(error.message || 'Không thể gửi email đặt lại mật khẩu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Quên mật khẩu
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Nhập email để nhận link đặt lại mật khẩu
          </p>
        </div>
        
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Đặt lại mật khẩu</span>
            </CardTitle>
            <CardDescription>
              Chúng tôi sẽ gửi link đặt lại mật khẩu đến email của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-md">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    Email đã được gửi thành công! Vui lòng kiểm tra hộp thư của bạn.
                  </p>
                </div>
                
                {resetToken && (
                  <div className="bg-blue-50 p-4 rounded-md space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      Development Mode - Reset Link:
                    </p>
                    <div className="break-all text-xs text-blue-700 bg-white p-2 rounded border">
                      <Link 
                        href={`/auth/reset-password?token=${resetToken}`}
                        className="text-blue-600 hover:underline"
                      >
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password?token=${resetToken}`}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                      setResetToken(null)
                    }}
                    className="flex-1"
                  >
                    Gửi lại email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/auth/signin')}
                    className="flex-1"
                  >
                    Quay lại đăng nhập
                  </Button>
                </div>
              </div>
            ) : (
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
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Gửi email đặt lại mật khẩu
                    </>
                  )}
                </Button>
              </form>
            )}
            
            <div className="mt-6 text-center">
              <Link 
                href="/auth/signin" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

