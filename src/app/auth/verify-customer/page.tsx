'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

function VerifyCustomerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setIsVerifying(true)
      verifyEmail(tokenParam)
    }
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/customers/verify?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Token không hợp lệ')
      }

      setVerified(true)
      toastSuccess(data.message || 'Xác nhận email thành công!')
    } catch (error: any) {
      toastError(error.message || 'Token không hợp lệ hoặc đã hết hạn')
    } finally {
      setIsVerifying(false)
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
                    Email của bạn đã được xác nhận thành công.
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
        </div>
      </div>
    </div>
  )
}

export default function VerifyCustomerPage() {
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
      <VerifyCustomerContent />
    </Suspense>
  )
}

