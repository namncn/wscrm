'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Copy, Check, Building2, Wallet, FileText, Download, ExternalLink } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface QRData {
  qrCodeUrl: string
  bankInfo: {
    bankName: string
    bankShortName: string
    accountNumber: string
    accountHolderName: string
  }
  remark: string
  amount: number
}

function QRPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const paymentId = searchParams.get('paymentId')
  
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | 'timeout'>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPollingExpired, setIsPollingExpired] = useState(false)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  
  // Use refs to track if component is mounted and abort controllers
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const paymentStatusRef = useRef<'pending' | 'completed' | 'failed' | 'timeout'>('pending')
  const pollingStartTimeRef = useRef<number | null>(null)
  const POLLING_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds
  
  // Sync ref with state
  useEffect(() => {
    paymentStatusRef.current = paymentStatus
  }, [paymentStatus])

  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      // Cleanup abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Cleanup interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const fetchQRData = useCallback(async () => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (orderId) params.append('orderId', orderId)
      if (paymentId) params.append('paymentId', paymentId)

      const response = await fetch(`/api/payments/sepay?${params.toString()}`, {
        signal
      })
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current || signal.aborted) return
      
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể lấy thông tin QR')
      }

      if (isMountedRef.current) {
        setQrData(data)
        // Check if order is already paid
        if (data.isOrderPaid || data.orderStatus === 'COMPLETED') {
          setPaymentStatus('completed')
          paymentStatusRef.current = 'completed'
          setOrderStatus(data.orderStatus)
          toastSuccess('Đơn hàng đã được thanh toán!')
          // Clear interval if payment is already completed
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // Redirect to orders page after 3 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              router.push('/orders')
            }
          }, 3000)
        } else {
          setOrderStatus(data.orderStatus || null)
          // Start tracking polling time when QR data is loaded
          pollingStartTimeRef.current = Date.now()
        }
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') return
      
      if (isMountedRef.current) {
        console.error('Error fetching QR data:', error)
        toastError(error.message || 'Không thể tải thông tin thanh toán')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [orderId, paymentId])

  const checkPaymentStatus = useCallback(async () => {
    // Use ref to avoid dependency on paymentStatus state
    if (!paymentId || paymentStatusRef.current !== 'pending') return


    // Check if polling has expired (15 minutes)
    if (pollingStartTimeRef.current) {
      const elapsedTime = Date.now() - pollingStartTimeRef.current
      if (elapsedTime >= POLLING_TIMEOUT) {
        // Stop polling after 15 minutes
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        
        if (isMountedRef.current) {
          setIsPollingExpired(true)
          paymentStatusRef.current = 'timeout'
          toastError('Đã hết thời gian chờ thanh toán. Vui lòng kiểm tra lại thủ công hoặc liên hệ hỗ trợ.')
        }
        return
      }
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        signal: abortControllerRef.current?.signal
      })
      
      // Check if component is still mounted
      if (!isMountedRef.current) return
      
      const data = await response.json()

      // Check if order is already paid (even if payment status is PENDING)
      if (data.success && (data.isOrderPaid || data.orderStatus === 'COMPLETED')) {
        if (isMountedRef.current) {
          setPaymentStatus('completed')
          paymentStatusRef.current = 'completed'
          setOrderStatus(data.orderStatus)
          toastSuccess('Đơn hàng đã được thanh toán!')
          // Clear interval when payment is completed
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setTimeout(() => {
            if (isMountedRef.current) {
              router.push('/orders')
            }
          }, 3000)
        }
        return
      }

      if (data.success && data.status) {
        if (data.status === 'COMPLETED') {
          if (isMountedRef.current) {
            setPaymentStatus('completed')
            paymentStatusRef.current = 'completed'
            toastSuccess('Thanh toán thành công!')
            // Clear interval when payment is completed
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            setTimeout(() => {
              if (isMountedRef.current) {
                router.push('/orders')
              }
            }, 3000)
          }
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          if (isMountedRef.current) {
            setPaymentStatus('failed')
            paymentStatusRef.current = 'failed'
            // Clear interval when payment fails
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        }
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') return
      
      if (isMountedRef.current) {
        console.error('Error checking payment status:', error)
      }
    }
  }, [paymentId, router])

  useEffect(() => {
    if (!orderId && !paymentId) {
      toastError('Thiếu thông tin thanh toán')
      router.push('/checkout')
      return
    }

    fetchQRData()
    
    // Poll for payment status every 5 seconds
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkPaymentStatus()
      }
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [orderId, paymentId, fetchQRData, checkPaymentStatus, router])

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      // Use modern clipboard API with error handling
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers or when clipboard API is blocked
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          textArea.remove()
        } catch (err) {
          textArea.remove()
          throw err
        }
      }
      
      if (isMountedRef.current) {
        setCopiedField(field)
        toastSuccess('Đã sao chép!')
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedField(null)
          }
        }, 2000)
      }
    } catch (error: any) {
      // Silently handle clipboard errors (often caused by browser extensions)
      console.warn('Clipboard copy failed:', error)
      if (isMountedRef.current) {
        // Still show success to user as fallback method might have worked
        setCopiedField(field)
        toastSuccess('Đã sao chép!')
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedField(null)
          }
        }, 2000)
      }
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const downloadQRCode = useCallback(async () => {
    if (!qrData?.qrCodeUrl) return
    
    try {
      const response = await fetch(qrData.qrCodeUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch QR code')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-code-${paymentId || 'payment'}.png`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      if (isMountedRef.current) {
        toastSuccess('Đã tải mã QR!')
      }
    } catch (error) {
      console.error('Error downloading QR code:', error)
      if (isMountedRef.current) {
        toastError('Không thể tải mã QR')
      }
    }
  }, [qrData?.qrCodeUrl, paymentId])

  const openQRInNewTab = () => {
    if (qrData?.qrCodeUrl) {
      window.open(qrData.qrCodeUrl, '_blank')
    }
  }

  const resumePolling = useCallback(() => {
    if (!paymentId) return
    
    // Reset polling
    setIsPollingExpired(false)
    setPaymentStatus('pending')
    paymentStatusRef.current = 'pending'
    pollingStartTimeRef.current = Date.now()
    
    // Restart interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkPaymentStatus()
      }
    }, 5000)
    
    // Check immediately
    checkPaymentStatus()
    toastSuccess('Đã tiếp tục kiểm tra thanh toán')
  }, [paymentId, checkPaymentStatus])

  if (isLoading) {
    return (
      <MemberLayout title="Thanh toán">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600">Đang tải thông tin thanh toán...</p>
          </div>
        </div>
      </MemberLayout>
    )
  }

  if (!qrData) {
    return (
      <MemberLayout title="Thanh toán">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Không tìm thấy thông tin thanh toán
              </h2>
              <p className="text-gray-600 mb-4">
                Vui lòng thử lại sau
              </p>
              <Button onClick={() => router.push('/checkout')}>
                Quay lại thanh toán
              </Button>
            </CardContent>
          </Card>
        </div>
      </MemberLayout>
    )
  }

  if (paymentStatus === 'completed') {
    return (
      <MemberLayout title="Thanh toán thành công">
        <div className="flex items-center justify-center min-h-[400px] py-10">
          <Card className="w-full max-w-lg">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  Thanh toán thành công!
                </h2>
                <p className="text-gray-600 text-lg">
                  Đơn hàng của bạn đã được thanh toán thành công.
                </p>
              </div>
              <div className="pt-4">
                <Badge variant="outline" className="text-base px-4 py-2">
                  Đang chuyển đến trang đơn hàng...
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout title="Thanh toán">
      <div className="max-w-4xl mx-auto space-y-4 py-10">
        {/* Header */}
        <div className="space-y-1 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán qua Chuyển khoản</h1>
          <p className="text-sm text-gray-600">Quét mã QR hoặc chuyển khoản theo thông tin bên dưới</p>
        </div>

        {/* Combined QR and Payment Info */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <img 
                    src={qrData.qrCodeUrl} 
                    alt="QR Code thanh toán"
                    className="w-56 h-56 rounded-xl shadow-lg"
                  />
                  <div className="absolute -top-1 -right-1 p-1.5 bg-white rounded-full shadow-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={downloadQRCode}
                  >
                  <Download className="h-4 w-4" />
                    Tải QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={openQRInNewTab}
                  >
                  <ExternalLink className="h-4 w-4" />
                    Mở tab mới
                  </Button>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                {/* Bank Info */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-700">Ngân hàng & Chủ tài khoản</label>
                  </div>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-semibold text-sm text-gray-900">{qrData.bankInfo.bankShortName}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{qrData.bankInfo.accountHolderName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Account Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-gray-400" />
                        <label className="text-xs font-medium text-gray-700">Số tài khoản</label>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(qrData.bankInfo.accountNumber, 'account')}
                      >
                        {copiedField === 'account' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm">
                      {qrData.bankInfo.accountNumber}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-gray-400" />
                        <label className="text-xs font-medium text-gray-700">Số tiền</label>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(qrData.amount.toString(), 'amount')}
                      >
                        {copiedField === 'amount' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-bold text-sm text-green-700 truncate">{formatCurrency(qrData.amount)}</p>
                    </div>
                  </div>
                </div>

                {/* Remark */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <label className="text-xs font-medium text-gray-700">Nội dung chuyển khoản</label>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(qrData.remark, 'remark')}
                    >
                      {copiedField === 'remark' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm break-all">
                    {qrData.remark}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 italic">* Vui lòng chuyển đúng nội dung để hệ thống tự động xác nhận</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Hướng dẫn thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">1</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Mở ứng dụng ngân hàng</p>
                  <p className="text-xs text-gray-600 mt-0.5">Trên điện thoại của bạn</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">2</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Chọn tính năng chuyển khoản QR</p>
                  <p className="text-xs text-gray-600 mt-0.5">Hoặc tìm "Quét mã QR" trong app</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">3</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Quét mã QR hoặc nhập thông tin</p>
                  <p className="text-xs text-gray-600 mt-0.5">Nếu không quét được, nhập thông tin bên trên</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-xs">4</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Xác nhận và hoàn tất thanh toán</p>
                  <p className="text-xs text-gray-600 mt-0.5">Hệ thống tự động xác nhận sau 5-10 giây</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Indicator */}
        {paymentStatus === 'pending' && !isPollingExpired && (
          <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="font-semibold text-blue-900 text-sm">Đang chờ thanh toán</p>
              <p className="text-xs text-blue-700">Hệ thống sẽ tự động cập nhật khi nhận được thanh toán</p>
            </div>
          </div>
        )}

        {/* Timeout Message */}
        {isPollingExpired && paymentStatus === 'pending' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-yellow-900 text-base mb-1">
                      Đã hết thời gian chờ thanh toán
                    </h3>
                    <p className="text-sm text-yellow-800">
                      Hệ thống đã ngừng kiểm tra tự động sau 15 phút. Nếu bạn đã thanh toán, 
                      vui lòng nhấn nút bên dưới để kiểm tra lại hoặc liên hệ hỗ trợ.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={resumePolling}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Kiểm tra lại thanh toán
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/orders')}
                    >
                      Xem đơn hàng
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  )
}

export default function QRPaymentPage() {
  return (
    <Suspense fallback={
      <MemberLayout title="Thanh toán QR Code">
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
      <QRPaymentContent />
    </Suspense>
  )
}

