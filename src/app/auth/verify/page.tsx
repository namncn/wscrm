'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Mail, CheckCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [origin, setOrigin] = useState<string>('')

  useEffect(() => {
    // Set origin only on client side to avoid hydration mismatch
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
    
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setIsVerifying(true)
      verifyEmail(tokenParam)
    }
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Token không hợp lệ')
      }

      setVerified(true)
      setSuccess(true)
      toastSuccess(data.message || 'Xác nhận email thành công!')
    } catch (error: any) {
      setError(error.message || 'Không thể xác nhận email')
      toastError(error.message || 'Token không hợp lệ hoặc đã hết hạn')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendVerification = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi email xác nhận')
      }

      setSuccess(true)
      toastSuccess(data.message || 'Email xác nhận đã được gửi thành công')

      // In development, show the verification token
      if (data.data?.verificationToken && process.env.NODE_ENV === 'development') {
        setVerificationToken(data.data.verificationToken)
      }
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi, vui lòng thử lại')
      toastError(error.message || 'Không thể gửi email xác nhận')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">Đang xác nhận email...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Xác nhận email thành công!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Email của bạn đã được xác nhận thành công. Bạn có thể đăng nhập ngay bây giờ.
                  </p>
                </div>
                <Button onClick={() => router.push('/auth/signin')} className="w-full">
                  Đăng nhập ngay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Xác nhận tài khoản
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Gửi lại email xác nhận tài khoản
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Gửi email xác nhận</span>
            </CardTitle>
            <CardDescription>
              Nhập email để nhận link xác nhận tài khoản
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-md">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    Email xác nhận đã được gửi thành công! Vui lòng kiểm tra hộp thư của bạn.
                  </p>
                </div>
                
                {verificationToken && (
                  <div className="bg-blue-50 p-4 rounded-md space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      Development Mode - Verification Link:
                    </p>
                    <div className="break-all text-xs text-blue-700 bg-white p-2 rounded border">
                      <Link 
                        href={`/auth/verify?token=${verificationToken}`}
                        className="text-blue-600 hover:underline"
                      >
                        {origin 
                          ? `${origin}/auth/verify?token=${verificationToken}`
                          : `/auth/verify?token=${verificationToken}`
                        }
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
                      setVerificationToken(null)
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
              <form onSubmit={handleResendVerification} className="space-y-4">
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
                      Gửi email xác nhận
                    </>
                  )}
                </Button>
              </form>
            )}
            
            <div className="mt-6 text-center space-y-2">
              <Link 
                href="/auth/signin" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium block"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">Đang tải...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}

