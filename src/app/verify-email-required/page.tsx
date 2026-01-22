'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, LogOut, CheckCircle } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

export default function VerifyEmailRequiredPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [canResend, setCanResend] = useState(true)

  useEffect(() => {
    // Check if email is already verified
    if (status === 'authenticated') {
      const emailVerified = (session?.user as any)?.emailVerified
      if (emailVerified === 'YES') {
        router.push('/')
        return
      }
    }

    // Check cooldown status
    const checkCooldown = async () => {
      try {
        const response = await fetch('/api/auth/resend-verification')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCanResend(data.data.canResend)
            if (!data.data.canResend && data.data.remainingSeconds) {
              setCooldown(data.data.remainingSeconds)
            }
          }
        }
      } catch (error) {
        console.error('Error checking cooldown:', error)
      }
    }

    checkCooldown()

    // Update cooldown countdown
    const interval = setInterval(() => {
      if (cooldown > 0) {
        setCooldown(prev => {
          const newCooldown = prev - 1
          if (newCooldown <= 0) {
            setCanResend(true)
            return 0
          }
          return newCooldown
        })
      } else {
        checkCooldown()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session, status, router, cooldown])

  const handleResend = async () => {
    if (!canResend || isResending) return

    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toastSuccess('Email xác nhận đã được gửi lại! Vui lòng kiểm tra hộp thư của bạn.')
        setCanResend(false)
        setCooldown(60) // Reset to 60 seconds
      } else {
        toastError(data.error || 'Không thể gửi lại email xác nhận')
        if (data.error?.includes('đợi')) {
          // Extract remaining seconds from error message
          const match = data.error.match(/(\d+)\s*giây/)
          if (match) {
            setCooldown(parseInt(match[1]))
            setCanResend(false)
          }
        }
      }
    } catch (error: any) {
      toastError('Có lỗi xảy ra khi gửi lại email xác nhận')
      console.error('Error resending verification:', error)
    } finally {
      setIsResending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleCheckVerification = async () => {
    // Refresh session to check if email is verified
    await update()
    
    // Check again after a short delay
    setTimeout(() => {
      const emailVerified = (session?.user as any)?.emailVerified
      if (emailVerified === 'YES') {
        toastSuccess('Email đã được xác nhận! Đang chuyển hướng...')
        router.push('/')
      } else {
        toastError('Email chưa được xác nhận. Vui lòng kiểm tra email và click vào link xác nhận.')
      }
    }, 500)
  }

  if (status === 'loading') {
    return (
      <MemberLayout title="Xác nhận email">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MemberLayout>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const email = session.user?.email || ''

  return (
    <MemberLayout title="Xác nhận email">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Xác nhận email của bạn</CardTitle>
            <CardDescription className="text-base mt-2">
              Chúng tôi đã gửi email xác nhận đến <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Vui lòng làm theo các bước sau:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Kiểm tra hộp thư đến của email <strong>{email}</strong></li>
                <li>Tìm email có tiêu đề "Xác nhận email của bạn"</li>
                <li>Click vào link xác nhận trong email</li>
                <li>Quay lại trang này và bấm nút "Đã xác nhận email"</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleResend}
                disabled={!canResend || isResending || cooldown > 0}
                className="flex-1 gap-2"
                variant="default"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : cooldown > 0 ? (
                  `Gửi lại sau (${cooldown}s)`
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Gửi lại email xác nhận
                  </>
                )}
              </Button>

              <Button
                onClick={handleCheckVerification}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Đã xác nhận email
              </Button>
            </div>

            {cooldown > 0 && (
              <div className="text-center text-sm text-gray-500">
                Bạn có thể gửi lại email sau <strong>{cooldown}</strong> giây
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full hover:bg-gray-50 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}

