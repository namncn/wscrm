'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, MailCheck } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'

function VerifyEmailChangeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [accountType, setAccountType] = useState<'user' | 'customer' | undefined>(undefined)

  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type') || undefined
    if (type === 'user' || type === 'customer') {
      setAccountType(type)
    }

    if (!token) {
      setStatus('error')
      setMessage('Token xác nhận không hợp lệ hoặc đã hết hạn.')
      return
    }

    const verify = async () => {
      setStatus('verifying')
      try {
        const url = new URL(window.location.origin + '/api/auth/verify-email-change')
        url.searchParams.set('token', token)
        if (type) {
          url.searchParams.set('type', type)
        }

        const response = await fetch(url.toString())
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Không thể xác nhận thay đổi email')
        }

        setStatus('success')
        setMessage(
          data.message ||
            'Thay đổi email thành công. Email cũ không còn hiệu lực và bạn có thể đăng nhập bằng email mới.'
        )
        toastSuccess(data.message || 'Thay đổi email thành công!')
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || 'Không thể xác nhận thay đổi email. Vui lòng thử lại.')
        toastError(error.message || 'Không thể xác nhận thay đổi email.')
      }
    }

    verify()
  }, [searchParams])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">Đang xác nhận thay đổi email...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-sky-50 to-emerald-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-8 pb-10 px-6">
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <MailCheck className="h-16 w-16 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Thay đổi email thành công!
                  </h2>
                  <p className="text-sm text-gray-600">{message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => router.push('/auth/signin')} className="w-full">
                    Đăng nhập bằng email mới
                  </Button>
                  {accountType === 'customer' && (
                    <Button variant="outline" onClick={() => router.push('/profile')} className="w-full">
                      Về trang hồ sơ
                    </Button>
                  )}
                  {accountType === 'user' && (
                    <Button variant="outline" onClick={() => router.push('/admin/profile')} className="w-full">
                      Về trang hồ sơ
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-8 pb-10 px-6">
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <AlertCircle className="h-16 w-16 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900">Không thể xác nhận email</h2>
                  <p className="text-sm text-gray-600">{message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => router.push('/auth/signin')} className="w-full">
                    Quay lại đăng nhập
                  </Button>
                  <Button variant="link" onClick={() => router.push('/profile')} className="w-full">
                    Về trang hồ sơ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailChangeContent />
    </Suspense>
  )
}


