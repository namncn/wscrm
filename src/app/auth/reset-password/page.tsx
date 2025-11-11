'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Lock, ArrowLeft, CheckCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('Token không hợp lệ')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      setIsLoading(false)
      return
    }

    if (!token) {
      setError('Token không hợp lệ')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Không thể đặt lại mật khẩu')
      }

      setSuccess(true)
      toastSuccess('Đặt lại mật khẩu thành công!')

      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi, vui lòng thử lại')
      toastError(error.message || 'Không thể đặt lại mật khẩu')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
                    Đặt lại mật khẩu thành công!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Mật khẩu của bạn đã được đặt lại thành công. Đang chuyển hướng đến trang đăng nhập...
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
            Đặt lại mật khẩu
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Mật khẩu mới</span>
            </CardTitle>
            <CardDescription>
              Mật khẩu phải có ít nhất 6 ký tự
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
                <Label htmlFor="password">Mật khẩu mới *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Đặt lại mật khẩu
                  </>
                )}
              </Button>
            </form>
            
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

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}

