'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  ArrowLeft,
  Download,
  Mail,
  Clock,
  CalendarRange,
  AlertTriangle,
  Check,
  PenSquare,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type InvoiceDetail = {
  id: number
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'OVERDUE' | 'PAID'
  issueDate: string
  dueDate: string
  currency: string
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | null
  notes: string | null
  customer: {
    id: number
    name: string
    email?: string | null
    company?: string | null
    phone?: string | null
    address?: string | null
    taxCode?: string | null
  }
  totals: {
    subtotal: number
    tax: number
    total: number
    paid: number
    balance: number
  }
  items: Array<{
    id: number
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
  }>
  payments: Array<{
    id: number
    amount: number
    method: string
    note?: string | null
    paidAt: string
  }>
  schedule?: {
    enabled: boolean
    frequency: string
    sendTime: string
    startDate: string
    intervalDays?: number
    daysBeforeDue?: number
    ccAccountingTeam?: boolean
    lastSentAt?: string
  } | null
}

const statusConfig: Record<
  InvoiceDetail['status'],
  { label: string; variant: string; description: string }
> = {
  DRAFT: {
    label: 'Nháp',
    variant: 'bg-slate-100 text-slate-700',
    description: 'Hoá đơn đang ở dạng nháp, chưa gửi cho khách hàng.',
  },
  SENT: {
    label: 'Đã gửi',
    variant: 'bg-blue-100 text-blue-700',
    description: 'Hoá đơn đã gửi cho khách hàng và đang chờ thanh toán.',
  },
  PARTIAL: {
    label: 'Thanh toán một phần',
    variant: 'bg-amber-100 text-amber-700',
    description: 'Khách hàng đã thanh toán một phần hoá đơn.',
  },
  OVERDUE: {
    label: 'Quá hạn',
    variant: 'bg-red-100 text-red-700',
    description: 'Hoá đơn đã đến hạn nhưng chưa được thanh toán đủ.',
  },
  PAID: {
    label: 'Đã thanh toán',
    variant: 'bg-emerald-100 text-emerald-700',
    description: 'Hoá đơn đã được thanh toán đầy đủ.',
  },
}

const paymentMethodLabels: Record<string, string> = {
  MANUAL_CONFIRMATION: 'Xác nhận thủ công',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  CASH: 'Tiền mặt',
  CREDIT_CARD: 'Thẻ tín dụng',
  E_WALLET: 'Ví điện tử',
}

const scheduleFrequencyLabels: Record<string, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  biweekly: '2 tuần/lần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const invoiceId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = userRole === 'ADMIN'

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [confirmAmount, setConfirmAmount] = useState<number>(0)
  const [sendReceiptEmail, setSendReceiptEmail] = useState<boolean>(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER')

  useEffect(() => {
    if (!invoiceId) return
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/invoice/${invoiceId}`)
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`)
      }
      const result = await response.json()
      if (result.success && result.data) {
        const invoiceData = result.data as InvoiceDetail
        setInvoice(invoiceData)
        const outstanding = invoiceData.totals.balance ?? invoiceData.totals.total
        setConfirmAmount(outstanding > 0 ? outstanding : 0)
        if (invoiceData.paymentMethod === 'CASH' || invoiceData.paymentMethod === 'BANK_TRANSFER') {
          setSelectedPaymentMethod(invoiceData.paymentMethod)
        } else {
          setSelectedPaymentMethod('BANK_TRANSFER')
        }
      } else {
        throw new Error(result.message || 'Không thể tải chi tiết hoá đơn')
      }
    } catch (error: any) {
      console.error('Error fetching invoice detail:', error)
      toastError(error.message || 'Không thể tải chi tiết hoá đơn')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvoice = async (mode: 'now' | 'reminder') => {
    if (!isAdmin) {
      toastError(
        mode === 'now' ? 'Bạn không có quyền gửi hoá đơn cho khách hàng' : 'Bạn không có quyền gửi email nhắc nhở'
      )
      return
    }
    try {
      setIsSending(true)
      const endpoint = mode === 'now' ? 'send' : 'reminder'
      const response = await fetch(`/api/invoice/${invoiceId}/${endpoint}`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể gửi email hoá đơn')
      }
      toastSuccess(mode === 'now' ? 'Đã gửi email hoá đơn cho khách hàng' : 'Đã gửi email nhắc nhở thanh toán')
    } catch (error: any) {
      console.error('Error sending invoice email:', error)
      toastError(error.message || 'Không thể gửi email hoá đơn')
    } finally {
      setIsSending(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!isAdmin) {
      toastError('Bạn không có quyền tải PDF hoá đơn')
      return
    }
    try {
      setIsDownloading(true)
      const response = await fetch(`/api/invoice/${invoiceId}/pdf`)
      if (!response.ok) {
        throw new Error('Không thể tải file PDF')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice?.invoiceNumber || 'invoice'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Error downloading invoice pdf:', error)
      toastError(error.message || 'Không thể tải file PDF hoá đơn')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!isAdmin) {
      toastError('Bạn không có quyền cập nhật trạng thái hoá đơn')
      return
    }
    if (!invoice) return
    const totalAmount = Number(invoice.totals.total) || 0
    const amount = confirmAmount > 0 ? confirmAmount : totalAmount
    if (amount <= 0) {
      toastError('Số tiền xác nhận phải lớn hơn 0')
      return
    }
    const isPartial = amount < totalAmount
    const nextStatus: 'PARTIAL' | 'PAID' = isPartial ? 'PARTIAL' : 'PAID'

    try {
      setIsUpdatingStatus(true)
      const response = await fetch(`/api/invoice/${invoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          paidAmount: amount,
          sendEmail: sendReceiptEmail,
          paymentMethod: selectedPaymentMethod,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật trạng thái hoá đơn')
      }

      toastSuccess(
        isPartial
          ? `Đã ghi nhận khách hàng thanh toán một phần (${formatCurrency(amount)}).`
          : 'Đã xác nhận khách hàng thanh toán đầy đủ.'
      )
      fetchInvoice()
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      toastError(error.message || 'Không thể cập nhật trạng thái thanh toán')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="flex min-height-[60vh] flex-col items-center justify-center space-y-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold">Không tìm thấy hoá đơn</h1>
            <p className="text-sm text-muted-foreground">
              Hoá đơn bạn đang tìm có thể đã bị xoá hoặc không tồn tại. Vui lòng kiểm tra lại.
            </p>
          </div>
          <Button onClick={() => router.push('/admin/invoices')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách hoá đơn
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const status = statusConfig[invoice.status]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/invoices')}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <Badge className={status.variant}>{status.label}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-600">{status.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              if (!isAdmin) {
                toastError('Bạn không có quyền chỉnh sửa hoá đơn')
                return
              }
              router.push(`/admin/invoice/${invoiceId}/edit`)
            }}
          >
            <PenSquare className="h-4 w-4" />
            Chỉnh sửa
          </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Tải PDF
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => handleSendInvoice('reminder')} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Gửi nhắc nhở
            </Button>
            <Button className="flex items-center gap-2" onClick={() => handleSendInvoice('now')} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Gửi hoá đơn
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Khách hàng</CardTitle>
                <CardDescription>Thông tin khách hàng nhận hoá đơn.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Tên khách hàng</p>
                  <p className="font-semibold text-slate-800">{invoice.customer.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Email</p>
                  <p className="text-slate-700">{invoice.customer.email || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Công ty</p>
                  <p className="text-slate-700">{invoice.customer.company || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Mã số thuế</p>
                  <p className="text-slate-700">{invoice.customer.taxCode || 'Chưa cập nhật'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase text-muted-foreground mb-1">Địa chỉ</p>
                  <p className="text-slate-700">{invoice.customer.address || 'Chưa cập nhật'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dòng sản phẩm/dịch vụ</CardTitle>
                <CardDescription>Các khoản phí và thuế được áp dụng trên hoá đơn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Mô tả</th>
                        <th className="px-4 py-3 font-medium text-right">Số lượng</th>
                        <th className="px-4 py-3 font-medium text-right">Đơn giá</th>
                        <th className="px-4 py-3 font-medium text-right">Thuế</th>
                        <th className="px-4 py-3 font-medium text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => {
                        const amount = item.quantity * item.unitPrice
                        const tax = (amount * item.taxRate) / 100
                        const total = amount + tax
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{item.description}</div>
                              <div className="text-xs text-muted-foreground">Thuế {item.taxRate}%</div>
                            </td>
                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(tax)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <span className="font-medium">{formatCurrency(invoice.totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế</span>
                    <span className="font-medium">{formatCurrency(invoice.totals.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold text-slate-900">
                    <span>Tổng thanh toán</span>
                    <span>{formatCurrency(invoice.totals.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Đã thanh toán</span>
                    <span>{formatCurrency(invoice.totals.paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-blue-600">
                    <span>Còn lại</span>
                    <span>{formatCurrency(invoice.totals.balance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {invoice.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Ghi chú trên hoá đơn</CardTitle>
                  <CardDescription>Nội dung đi kèm hoá đơn khi gửi cho khách hàng.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Lịch sử thanh toán</CardTitle>
                <CardDescription>Theo dõi các khoản thanh toán đã nhận cho hoá đơn này.</CardDescription>
              </CardHeader>
              <CardContent>
                {invoice.payments.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-muted-foreground">
                    Chưa ghi nhận thanh toán nào cho hoá đơn này.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-800">{formatCurrency(payment.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(payment.paidAt).toLocaleString('vi-VN')}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {payment.method
                              ? paymentMethodLabels[payment.method] ?? payment.method
                              : 'Không xác định'}
                          </Badge>
                        </div>
                        {payment.note && <p className="mt-2 text-xs text-muted-foreground">{payment.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cập nhật trạng thái thanh toán</CardTitle>
                <CardDescription>Xác nhận nhanh khi khách hàng thanh toán một phần hoặc toàn bộ.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmAmount" className="text-sm font-medium text-slate-700">
                    Số tiền thanh toán
                  </Label>
                  <input
                    id="confirmAmount"
                    type="number"
                    min={0}
                    max={invoice.totals.total}
                    step={1000}
                    value={confirmAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0
                      const maxAllowed =
                        invoice.totals.balance > 0 ? invoice.totals.balance : invoice.totals.total
                      const normalized = Math.min(Math.max(value, 0), maxAllowed)
                      setConfirmAmount(normalized)
                    }}
                    className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Giữ nguyên số tiền nếu đã thanh toán đủ. Số dư hiện tại: {formatCurrency(invoice.totals.balance)}.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Hình thức thanh toán</Label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={(value) => setSelectedPaymentMethod(value as 'CASH' | 'BANK_TRANSFER')}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="h-11 w-full border-slate-200">
                      <SelectValue placeholder="Chọn hình thức thanh toán" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Chuyển khoản ngân hàng</SelectItem>
                      <SelectItem value="CASH">Tiền mặt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-slate-700">Gửi email xác nhận</Label>
                    <p className="text-xs text-muted-foreground">
                      Tự động gửi email xác nhận cho khách hàng khi cập nhật thanh toán.
                    </p>
                  </div>
                  <Switch checked={sendReceiptEmail} onCheckedChange={setSendReceiptEmail} />
                </div>

                <Button
                  className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleConfirmPayment}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Xác nhận thanh toán
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin hạn thanh toán</CardTitle>
                <CardDescription>Kiểm tra tiến độ thanh toán và các mốc quan trọng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                  <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-800">Ngày phát hành</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.issueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-slate-800">Ngày đến hạn</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <p className="font-medium text-slate-800">Trạng thái</p>
                  <p className="text-sm text-muted-foreground">
                    {status.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {invoice.schedule ? (
              <Card>
                <CardHeader>
                  <CardTitle>Thiết lập gửi email định kỳ</CardTitle>
                  <CardDescription>Thông tin lịch gửi email hoá đơn tự động.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span>Tình trạng</span>
                    <Badge variant={invoice.schedule.enabled ? 'default' : 'outline'}>
                      {invoice.schedule.enabled ? 'Đang hoạt động' : 'Tạm tắt'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tần suất</span>
                    <span className="font-medium text-slate-800">
                      {invoice.schedule.frequency === 'custom'
                        ? `Tùy chỉnh mỗi ${invoice.schedule.intervalDays ?? 1} ngày`
                        : scheduleFrequencyLabels[invoice.schedule.frequency] ||
                          invoice.schedule.frequency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian gửi</span>
                    <span className="font-medium text-slate-800">{invoice.schedule.sendTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bắt đầu từ</span>
                    <span className="font-medium text-slate-800">
                      {new Date(invoice.schedule.startDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {invoice.schedule.daysBeforeDue !== undefined ? (
                    <div className="flex justify-between">
                      <span>Nhắc trước hạn</span>
                      <span className="font-medium text-slate-800">
                        {invoice.schedule.daysBeforeDue} ngày
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>CC phòng kế toán</span>
                    <span className="font-medium text-slate-800">
                      {invoice.schedule.ccAccountingTeam ? 'Có' : 'Không'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

