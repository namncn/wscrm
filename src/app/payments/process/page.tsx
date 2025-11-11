'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

function PaymentProcessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string | null>(null)

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId')
    const amountParam = searchParams.get('amount')
    
    setOrderId(orderIdParam)
    setAmount(amountParam)

    if (orderIdParam) {
      // Simulate payment processing
      setTimeout(() => {
        // For demo purposes, simulate successful payment
        simulatePaymentSuccess(orderIdParam)
      }, 2000)
    } else {
      setStatus('failed')
    }
  }, [searchParams])

  const simulatePaymentSuccess = async (orderId: string) => {
    try {
      // Simulate a successful payment
      setStatus('success')
      toastSuccess('Thanh toán thành công!')
      
      // Redirect to orders page after 3 seconds
      setTimeout(() => {
        router.push('/orders')
      }, 3000)
    } catch (error: any) {
      console.error('Payment processing error:', error)
      setStatus('failed')
      toastError('Có lỗi xảy ra khi xử lý thanh toán')
    }
  }

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '0 VND'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num)
  }

  return (
    <MemberLayout title="Xử lý thanh toán">
      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Đang xử lý thanh toán...
                </h2>
                <p className="text-gray-600 mb-4">
                  Vui lòng đợi trong giây lát
                </p>
                {orderId && (
                  <p className="text-sm text-gray-500">
                    Mã đơn hàng: {orderId}
                  </p>
                )}
                {amount && (
                  <p className="text-sm text-gray-500 mt-1">
                    Số tiền: {formatCurrency(amount)}
                  </p>
                )}
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thanh toán thành công!
                </h2>
                <p className="text-gray-600 mb-4">
                  Đơn hàng của bạn đã được thanh toán thành công
                </p>
                {orderId && (
                  <p className="text-sm text-gray-500 mb-4">
                    Mã đơn hàng: {orderId}
                  </p>
                )}
                <Button onClick={() => router.push('/orders')}>
                  Xem đơn hàng
                </Button>
                <p className="text-xs text-gray-400 mt-4">
                  Đang chuyển hướng...
                </p>
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thanh toán thất bại
                </h2>
                <p className="text-gray-600 mb-4">
                  Đã có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.
                </p>
                <div className="space-y-2">
                  <Button onClick={() => router.push('/cart')}>
                    Quay lại giỏ hàng
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/orders')}>
                    Xem đơn hàng
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}

export default function PaymentProcessPage() {
  return (
    <Suspense fallback={
      <MemberLayout title="Xử lý thanh toán">
        <div className="flex items-center justify-center min-h-[500px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đang tải...
              </h2>
            </CardContent>
          </Card>
        </div>
      </MemberLayout>
    }>
      <PaymentProcessContent />
    </Suspense>
  )
}

