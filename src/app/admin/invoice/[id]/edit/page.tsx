'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toastError, toastSuccess } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Loader2, Plus, RefreshCw, Save, Trash2, Zap } from 'lucide-react'

type CustomerOption = {
  id: number
  name: string
  email?: string | null
  company?: string | null
}

type InvoiceLineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxLabel?: 'KCT'
}

type InvoiceScheduleForm = {
  enabled: boolean
  frequency: string
  sendTime: string
  startDate: string
  daysBeforeDue: number | null
  ccAccountingTeam: boolean
}

type InvoiceDetailResponse = {
  id: number
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'OVERDUE' | 'PAID'
  issueDate: string
  dueDate: string
  currency: string
  paymentTerms: string | null
  notes: string | null
  customer: {
    id: number
    name: string
    email?: string | null
    company?: string | null
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
    taxLabel: string | null
  }>
  schedule: {
    enabled: boolean
    frequency: string
    intervalDays?: number
    sendTime?: string
    startDate?: string
    daysBeforeDue?: number
    ccAccountingTeam?: boolean
    lastSentAt?: string
  } | null
}

const defaultLineItem = (): InvoiceLineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
})

const reminderFrequencies = [
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'biweekly', label: '2 tuần/lần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'quarterly', label: 'Hàng quý' },
  { value: 'yearly', label: 'Hàng năm' },
  { value: 'custom', label: 'Tùy chỉnh' },
]

const statusConfig: Record<
  InvoiceDetailResponse['status'],
  { label: string; variant: string; description: string }
> = {
  DRAFT: {
    label: 'Nháp',
    variant: 'bg-slate-100 text-slate-700',
    description: 'Hoá đơn ở trạng thái nháp, chưa gửi cho khách hàng.',
  },
  SENT: {
    label: 'Đã gửi',
    variant: 'bg-blue-100 text-blue-700',
    description: 'Hoá đơn đã được gửi cho khách hàng.',
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

export default function EditInvoicePage() {
  const params = useParams<{ id: string | string[] }>()
  const invoiceId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const router = useRouter()
  const { data: session, status } = useSession()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = userRole === 'ADMIN'

  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    currency: 'VND',
    notes: '',
    paymentTerms: 'NET30',
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([defaultLineItem()])
  const [scheduleForm, setScheduleForm] = useState<InvoiceScheduleForm>({
    enabled: false,
    frequency: 'monthly',
    sendTime: '09:00',
    startDate: new Date().toISOString().split('T')[0],
    daysBeforeDue: 3,
    ccAccountingTeam: false,
  })
  const [customInterval, setCustomInterval] = useState(30)
  const [accountingEmail, setAccountingEmail] = useState('')
  const [hasShownAccessWarning, setHasShownAccessWarning] = useState(false)

  const [originalState, setOriginalState] = useState<{
    invoiceForm: typeof invoiceForm
    lineItems: InvoiceLineItem[]
    scheduleForm: InvoiceScheduleForm
    customInterval: number
  } | null>(null)

  const [invoiceMeta, setInvoiceMeta] = useState<{
    status: InvoiceDetailResponse['status']
    subtotal: number
    tax: number
    total: number
    paid: number
    balance: number
  }>({
    status: 'DRAFT',
    subtotal: 0,
    tax: 0,
    total: 0,
    paid: 0,
    balance: 0,
  })

  const invoiceSubtotal = useMemo(
    () => lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    [lineItems]
  )

  const invoiceTaxTotal = useMemo(
    () =>
      lineItems.reduce((total, item) => {
        const amount = item.quantity * item.unitPrice
        const effectiveTaxRate = item.taxLabel === 'KCT' ? 0 : item.taxRate
        return total + (amount * effectiveTaxRate) / 100
      }, 0),
    [lineItems]
  )

  const invoiceTotal = useMemo(() => invoiceSubtotal + invoiceTaxTotal, [invoiceSubtotal, invoiceTaxTotal])
  const projectedBalance = useMemo(() => Math.max(invoiceTotal - invoiceMeta.paid, 0), [invoiceMeta.paid, invoiceTotal])

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin && !hasShownAccessWarning) {
      toastError('Bạn không có quyền chỉnh sửa hoá đơn')
      setHasShownAccessWarning(true)
      router.replace(invoiceId ? `/admin/invoice/${invoiceId}` : '/admin/invoices')
    }
  }, [status, isAdmin, hasShownAccessWarning, router, invoiceId])

  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) {
      return
    }
    fetchCustomers()
    fetchAccountingEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin])

  useEffect(() => {
    if (!accountingEmail && scheduleForm.ccAccountingTeam) {
      setScheduleForm((prev) => ({ ...prev, ccAccountingTeam: false }))
    }
  }, [accountingEmail, scheduleForm.ccAccountingTeam])

  useEffect(() => {
    if (!invoiceId || status !== 'authenticated' || !isAdmin) return
    fetchInvoiceDetail(invoiceId)
  }, [invoiceId, status, isAdmin])

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true)
      const response = await fetch('/api/customers')
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name || 'Khách hàng chưa đặt tên',
          email: customer.email ?? '',
          company: customer.company,
        }))
        setCustomers(mapped)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toastError('Không thể tải danh sách khách hàng')
      setCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const fetchInvoiceDetail = async (id: string) => {
    try {
      setIsLoadingInvoice(true)
      const response = await fetch(`/api/invoice/${id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const result = await response.json()
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Không tìm thấy thông tin hoá đơn')
      }

      const invoice: InvoiceDetailResponse = result.data
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date()
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date()

      const nextInvoiceForm = {
        customerId: invoice.customer?.id ? String(invoice.customer.id) : '',
        invoiceNumber: invoice.invoiceNumber,
        issueDate: new Date(Date.UTC(issueDate.getFullYear(), issueDate.getMonth(), issueDate.getDate()))
          .toISOString()
          .split('T')[0],
        dueDate: new Date(Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()))
          .toISOString()
          .split('T')[0],
        currency: invoice.currency || 'VND',
        notes: invoice.notes ?? '',
        paymentTerms: invoice.paymentTerms ?? 'NET30',
      }

      const nextLineItems: InvoiceLineItem[] =
        invoice.items.length > 0
          ? invoice.items.map((item) => ({
              id: item.id ? String(item.id) : crypto.randomUUID(),
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxLabel === 'KCT' ? 0 : item.taxRate,
              taxLabel: item.taxLabel === 'KCT' ? 'KCT' : undefined,
            }))
          : [defaultLineItem()]

      const schedule = invoice.schedule
      const nextScheduleForm: InvoiceScheduleForm = {
        enabled: schedule?.enabled ?? false,
        frequency: schedule?.frequency ?? 'monthly',
        sendTime: schedule?.sendTime || '09:00',
        startDate:
          schedule?.startDate && schedule.startDate.length > 0
            ? new Date(schedule.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        daysBeforeDue: schedule?.daysBeforeDue ?? 3,
        ccAccountingTeam: schedule?.ccAccountingTeam ?? false,
      }

      setInvoiceForm(nextInvoiceForm)
      setLineItems(nextLineItems)
      setScheduleForm(nextScheduleForm)
      setCustomInterval(schedule?.intervalDays ?? 30)
      setInvoiceMeta({
        status: invoice.status,
        subtotal: invoice.totals.subtotal,
        tax: invoice.totals.tax,
        total: invoice.totals.total,
        paid: invoice.totals.paid,
        balance: invoice.totals.balance,
      })

      setOriginalState({
        invoiceForm: { ...nextInvoiceForm },
        lineItems: nextLineItems.map((item) => ({ ...item })),
        scheduleForm: { ...nextScheduleForm },
        customInterval: schedule?.intervalDays ?? 30,
      })
    } catch (error: any) {
      console.error('Error fetching invoice detail:', error)
      toastError(error.message || 'Không thể tải chi tiết hoá đơn')
      router.push('/admin/invoices')
    } finally {
      setIsLoadingInvoice(false)
    }
  }

  const fetchAccountingEmail = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        return
      }
      const result = await response.json()
      if (result.success && result.data) {
        setAccountingEmail(result.data.companyAccountingEmail || '')
      }
    } catch (error) {
      console.error('Error fetching accounting email:', error)
    }
  }

  const handleInvoiceFormChange = (key: keyof typeof invoiceForm, value: string) => {
    setInvoiceForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleDateChange = (key: 'issueDate' | 'dueDate', date: Date | undefined) => {
    handleInvoiceFormChange(
      key,
      date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0] : ''
    )
  }

  const handleScheduleDateChange = (date: Date | undefined) => {
    setScheduleForm((prev) => ({
      ...prev,
      startDate: date
        ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0]
        : '',
    }))
  }

  const updateLineItem = (id: string, key: keyof InvoiceLineItem, value: string | number | undefined) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === 'description'
                  ? (value as string)
                  : key === 'taxLabel'
                  ? (value as 'KCT' | undefined)
                  : Number(value) || 0,
            }
          : item
      )
    )
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, defaultLineItem()])
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)))
  }

  const resetForms = () => {
    if (!originalState) {
      return
    }
    setInvoiceForm({ ...originalState.invoiceForm })
    setLineItems(originalState.lineItems.map((item) => ({ ...item })))
    setScheduleForm({ ...originalState.scheduleForm })
    setCustomInterval(originalState.customInterval)
  }

  const handleUpdateInvoice = async () => {
    if (!isAdmin) {
      toastError('Bạn không có quyền chỉnh sửa hoá đơn')
      return
    }
    if (!invoiceId) {
      toastError('Không xác định được hoá đơn cần chỉnh sửa')
      return
    }

    if (!invoiceForm.customerId) {
      toastError('Vui lòng chọn khách hàng')
      return
    }

    if (!invoiceForm.invoiceNumber) {
      toastError('Vui lòng nhập số hoá đơn')
      return
    }

    if (!invoiceForm.dueDate) {
      toastError('Vui lòng chọn ngày đến hạn')
      return
    }

    const sanitizedItems = lineItems.filter((item) => item.description.trim())
    if (sanitizedItems.length === 0) {
      toastError('Vui lòng thêm ít nhất một dòng hàng hoá')
      return
    }

    const payload = {
      ...invoiceForm,
      customerId: Number(invoiceForm.customerId),
      items: sanitizedItems.map(({ id, ...rest }) => rest),
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật hoá đơn')
      }

      toastSuccess('Đã cập nhật thông tin hoá đơn')
      await handleScheduleUpdate(Number(invoiceId))
      router.push(`/admin/invoice/${invoiceId}`)
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      toastError(error.message || 'Không thể cập nhật hoá đơn')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScheduleUpdate = async (invoiceIdNumber: number) => {
    const frequencyPayload =
      scheduleForm.frequency === 'custom'
        ? { frequency: 'custom', intervalDays: customInterval }
        : { frequency: scheduleForm.frequency }

    const payload = {
      invoiceId: invoiceIdNumber,
      enabled: scheduleForm.enabled,
      ...frequencyPayload,
      sendTime: scheduleForm.sendTime,
      startDate: scheduleForm.startDate,
      daysBeforeDue: scheduleForm.daysBeforeDue,
      ccAccountingTeam: scheduleForm.ccAccountingTeam,
    }

    try {
      setIsScheduling(true)
      const response = await fetch('/api/invoices/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật lịch gửi hoá đơn')
      }
    } catch (error: any) {
      console.error('Error updating invoice schedule:', error)
      toastError(error.message || 'Không thể cập nhật lịch gửi hoá đơn')
    } finally {
      setIsScheduling(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (status === 'authenticated' && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 text-center">
          <h2 className="text-xl font-semibold text-slate-800">Bạn không có quyền chỉnh sửa hoá đơn</h2>
          <p className="text-sm text-slate-500">Vui lòng liên hệ quản trị viên nếu bạn cần chỉnh sửa hoá đơn này.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoadingInvoice) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  const statusDetail = statusConfig[invoiceMeta.status]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Chỉnh sửa hoá đơn</h1>
            <p className="text-slate-600">
              Cập nhật thông tin hoá đơn, điều chỉnh các dòng sản phẩm và cấu hình lịch gửi email tự động.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              asChild
              className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              disabled={isSubmitting || isScheduling}
            >
              <Link href={`/admin/invoice/${invoiceId}`}>
                <ArrowLeft className="h-4 w-4" />
                Quay lại chi tiết
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={resetForms}
              className="flex items-center gap-2 border-amber-200 text-amber-600 hover:bg-amber-50"
              disabled={isSubmitting || isScheduling}
            >
              <RefreshCw className="h-4 w-4" />
              Khôi phục
            </Button>
            <Button
              onClick={handleUpdateInvoice}
              className="flex items-center gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              disabled={isSubmitting || isScheduling}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Cập nhật hoá đơn
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin hoá đơn</CardTitle>
                <CardDescription>Cập nhật các thông tin cơ bản của hoá đơn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Khách hàng <span className="text-red-500">*</span></Label>
                    <CustomerCombobox
                      customers={customers.map((customer) => ({
                        id: customer.id,
                        name: customer.name,
                        email: customer.email || '—',
                      }))}
                      value={invoiceForm.customerId ? Number(invoiceForm.customerId) : null}
                      onValueChange={(val) => handleInvoiceFormChange('customerId', val ? String(val) : '')}
                      placeholder={isLoadingCustomers ? 'Đang tải...' : 'Chọn khách hàng'}
                      className="h-9 px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Số hoá đơn <span className="text-red-500">*</span></Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceForm.invoiceNumber}
                      onChange={(event) => handleInvoiceFormChange('invoiceNumber', event.target.value)}
                      placeholder="VD: INV-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Ngày phát hành</Label>
                    <DatePicker
                      value={invoiceForm.issueDate ? new Date(invoiceForm.issueDate) : undefined}
                      onChange={(date) => handleDateChange('issueDate', date)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Ngày đến hạn <span className="text-red-500">*</span></Label>
                    <DatePicker
                      value={invoiceForm.dueDate ? new Date(invoiceForm.dueDate) : undefined}
                      onChange={(date) => handleDateChange('dueDate', date)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Điều khoản thanh toán</Label>
                    <Select
                      value={invoiceForm.paymentTerms}
                      onValueChange={(value) => handleInvoiceFormChange('paymentTerms', value)}
                    >
                      <SelectTrigger id="paymentTerms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NET7">NET 7 - Thanh toán trong 7 ngày</SelectItem>
                        <SelectItem value="NET15">NET 15 - Thanh toán trong 15 ngày</SelectItem>
                        <SelectItem value="NET30">NET 30 - Thanh toán trong 30 ngày</SelectItem>
                        <SelectItem value="NET45">NET 45 - Thanh toán trong 45 ngày</SelectItem>
                        <SelectItem value="NET60">NET 60 - Thanh toán trong 60 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Tiền tệ</Label>
                    <Select value={invoiceForm.currency} onValueChange={(value) => handleInvoiceFormChange('currency', value)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VND">VND - Đồng Việt Nam</SelectItem>
                        <SelectItem value="USD">USD - Đô la Mỹ</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú trên hoá đơn</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={invoiceForm.notes}
                    placeholder="Nội dung hiển thị cho khách hàng: thông tin chuyển khoản, điều khoản cụ thể,..."
                    onChange={(event) => handleInvoiceFormChange('notes', event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dòng sản phẩm / dịch vụ</CardTitle>
                <CardDescription>Điều chỉnh các dịch vụ hoặc khoản phí trên hoá đơn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Mô tả</TableHead>
                        <TableHead className="w-[10%] text-right">Số lượng</TableHead>
                        <TableHead className="w-[15%] text-right">Đơn giá</TableHead>
                        <TableHead className="w-[15%] text-right">Thuế (%)</TableHead>
                        <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                        <TableHead className="w-[5%]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => {
                        const amount = item.quantity * item.unitPrice
                        const effectiveTaxRate = item.taxLabel === 'KCT' ? 0 : item.taxRate
                        const taxValue = (amount * effectiveTaxRate) / 100
                        const total = amount + taxValue
                        const presetValue =
                          item.taxLabel === 'KCT'
                            ? 'KCT'
                            : item.taxRate === 0
                            ? '0'
                            : item.taxRate === 8
                            ? '8'
                            : item.taxRate === 10
                            ? '10'
                            : 'custom'
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(event) => updateLineItem(item.id, 'description', event.target.value)}
                                placeholder="Tên dịch vụ hoặc mô tả sản phẩm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                value={item.quantity}
                                onChange={(event) => updateLineItem(item.id, 'quantity', Number(event.target.value))}
                                type="number"
                                min={0}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                value={item.unitPrice}
                                onChange={(event) => updateLineItem(item.id, 'unitPrice', Number(event.target.value))}
                                type="number"
                                min={0}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Select
                                  value={presetValue}
                                  onValueChange={(value) => {
                                    if (value === 'custom') {
                                      updateLineItem(item.id, 'taxLabel', undefined)
                                    } else if (value === 'KCT') {
                                      updateLineItem(item.id, 'taxRate', 0)
                                      updateLineItem(item.id, 'taxLabel', 'KCT')
                                    } else {
                                      updateLineItem(item.id, 'taxRate', Number(value))
                                      updateLineItem(item.id, 'taxLabel', undefined)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[110px] justify-between text-right">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="KCT">KCT</SelectItem>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="8">8%</SelectItem>
                                    <SelectItem value="10">10%</SelectItem>
                                    <SelectItem value="custom">Khác</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={
                                    item.taxLabel === 'KCT'
                                      ? 'KCT'
                                      : Number.isNaN(item.taxRate)
                                      ? ''
                                      : item.taxRate
                                  }
                                  onChange={(event) => {
                                    const raw = event.target.value
                                    if (raw.trim().toUpperCase() === 'KCT') {
                                      updateLineItem(item.id, 'taxRate', 0)
                                      updateLineItem(item.id, 'taxLabel', 'KCT')
                                      return
                                    }
                                    const numeric = Number(raw)
                                    if (Number.isNaN(numeric)) {
                                      return
                                    }
                                    updateLineItem(item.id, 'taxRate', numeric)
                                    updateLineItem(item.id, 'taxLabel', undefined)
                                  }}
                                  placeholder="Thuế (%)"
                                  className="h-9 w-20 text-right"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm text-muted-foreground">{formatCurrency(total)}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(item.id)}
                                disabled={lineItems.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Xoá dòng</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-4 border-t pt-4 text-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={addLineItem}
                      className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm dòng
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setLineItems([defaultLineItem()])}
                      className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    >
                      Đặt lại
                    </Button>
                  </div>
                  <div className="space-y-1 text-right md:text-base">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Tạm tính:</span>
                      <span className="font-medium">{formatCurrency(invoiceSubtotal)}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Thuế:</span>
                      <span className="font-medium">{formatCurrency(invoiceTaxTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-base">
                      <span className="font-semibold">Tổng thanh toán:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(invoiceTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tình trạng hoá đơn</CardTitle>
                <CardDescription>Thông tin nhanh về trạng thái hiện tại và số dư dự kiến sau chỉnh sửa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Trạng thái</span>
                  <Badge className={statusDetail.variant}>{statusDetail.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{statusDetail.description}</p>
                <div className="grid grid-cols-1 gap-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span>Tổng hoá đơn (ước tính)</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(invoiceTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Đã thanh toán</span>
                    <span>{formatCurrency(invoiceMeta.paid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-600">
                    <span>Còn lại</span>
                    <span className="font-medium">{formatCurrency(projectedBalance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lịch gửi email nhắc nhở</CardTitle>
                <CardDescription>
                  Điều chỉnh lịch gửi email tự động cho khách hàng về hoá đơn này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      Kích hoạt tự động gửi email
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hệ thống sẽ gửi email theo cấu hình bên dưới cho đến khi bạn tắt chức năng này.
                    </p>
                  </div>
                  <Switch
                    checked={scheduleForm.enabled}
                    onCheckedChange={(checked) => setScheduleForm((prev) => ({ ...prev, enabled: checked }))}
                  />
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Tần suất gửi</Label>
                    <Select
                      value={scheduleForm.frequency}
                      onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, frequency: value }))}
                      disabled={!scheduleForm.enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reminderFrequencies.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {scheduleForm.frequency === 'custom' && (
                      <div className="space-y-1">
                        <Label htmlFor="customInterval" className="text-xs text-muted-foreground">
                          Lặp lại sau số ngày
                        </Label>
                        <Input
                          id="customInterval"
                          type="number"
                          min={1}
                          value={customInterval}
                          onChange={(event) => setCustomInterval(Number(event.target.value) || 1)}
                          disabled={!scheduleForm.enabled}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sendTime">Giờ gửi email</Label>
                      <Input
                        id="sendTime"
                        type="time"
                        value={scheduleForm.sendTime}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            sendTime: event.target.value,
                          }))
                        }
                        disabled={!scheduleForm.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Bắt đầu từ ngày</Label>
                      <DatePicker
                        value={scheduleForm.startDate ? new Date(scheduleForm.startDate) : undefined}
                        onChange={handleScheduleDateChange}
                        disabled={!scheduleForm.enabled}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daysBeforeDue">Nhắc trước ngày đến hạn</Label>
                      <Input
                        id="daysBeforeDue"
                        type="number"
                        min={0}
                        value={scheduleForm.daysBeforeDue ?? ''}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            daysBeforeDue: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                        disabled={!scheduleForm.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">CC phòng kế toán</Label>
                      <div className="flex h-10 items-center justify-between rounded-md border px-3">
                      <span className="text-sm text-muted-foreground">
                        {accountingEmail ? `Gửi kèm ${accountingEmail}` : 'Chưa cấu hình email kế toán'}
                      </span>
                        <Switch
                        checked={scheduleForm.ccAccountingTeam && !!accountingEmail}
                        onCheckedChange={(checked) =>
                          setScheduleForm((prev) => ({ ...prev, ccAccountingTeam: checked && !!accountingEmail }))
                        }
                        disabled={!scheduleForm.enabled || !accountingEmail}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

