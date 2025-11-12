'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { CustomerCombobox } from '@/components/ui/customer-combobox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toastError, toastSuccess } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Plus, RefreshCw, Save, Trash2, Zap, ArrowLeft } from 'lucide-react'

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

export default function CreateInvoicePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = userRole === 'ADMIN'
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [accountingEmail, setAccountingEmail] = useState('')
  const [hasShownAccessWarning, setHasShownAccessWarning] = useState(false)

  const [invoiceNumberSuggestion, setInvoiceNumberSuggestion] = useState('')

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([defaultLineItem()])

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'VND',
    notes: '',
    paymentTerms: 'NET30',
  })

  const [scheduleForm, setScheduleForm] = useState({
    enabled: true,
    frequency: 'monthly',
    sendTime: '09:00',
    startDate: new Date().toISOString().split('T')[0],
    daysBeforeDue: 3,
    ccAccountingTeam: false,
  })

  const [customInterval, setCustomInterval] = useState(30)
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false)

  const invoiceSubtotal = useMemo(() => {
    return lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }, [lineItems])

  const invoiceTaxTotal = useMemo(() => {
    return lineItems.reduce((total, item) => {
      const amount = item.quantity * item.unitPrice
      return total + (amount * item.taxRate) / 100
    }, 0)
  }, [lineItems])

  const invoiceTotal = useMemo(() => invoiceSubtotal + invoiceTaxTotal, [invoiceSubtotal, invoiceTaxTotal])

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin && !hasShownAccessWarning) {
      toastError('Bạn không có quyền tạo hoá đơn mới')
      setHasShownAccessWarning(true)
      router.replace('/admin/invoices')
    }
  }, [status, isAdmin, hasShownAccessWarning, router])

  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) {
      return
    }
    fetchCustomers()
    fetchInvoiceNumberSuggestion()
    fetchAccountingEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin])

  useEffect(() => {
    if (!accountingEmail && scheduleForm.ccAccountingTeam) {
      setScheduleForm((prev) => ({ ...prev, ccAccountingTeam: false }))
    }
  }, [accountingEmail, scheduleForm.ccAccountingTeam])

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
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const fetchInvoiceNumberSuggestion = async () => {
    try {
      setIsFetchingSuggestion(true)
      const response = await fetch('/api/invoices/next-number')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.invoiceNumber) {
          setInvoiceNumberSuggestion(result.data.invoiceNumber)
          setInvoiceForm((prev) => ({
            ...prev,
            invoiceNumber: prev.invoiceNumber || result.data.invoiceNumber,
          }))
        }
      }
    } catch (error) {
      console.error('Error suggesting invoice number:', error)
    } finally {
      setIsFetchingSuggestion(false)
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
    handleInvoiceFormChange(key, date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0] : '')
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
    prev.map((item) => {
      if (item.id !== id) {
        return item
      }

      if (key === 'description') {
        return {
          ...item,
          description: typeof value === 'string' ? value : '',
        }
      }

      if (key === 'taxLabel') {
        return {
          ...item,
          taxLabel: (value as InvoiceLineItem['taxLabel']) ?? undefined,
        }
      }

      const numericValue = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(numericValue)) {
        return item
      }

      return {
        ...item,
        [key]: numericValue,
      }
    })
  )
}

  const addLineItem = () => {
    setLineItems((prev) => [...prev, defaultLineItem()])
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)))
  }

  const resetForms = () => {
    setInvoiceForm({
      customerId: '',
      invoiceNumber: invoiceNumberSuggestion,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      currency: 'VND',
      notes: '',
      paymentTerms: 'NET30',
    })
    setLineItems([defaultLineItem()])
    setScheduleForm((prev) => ({
      ...prev,
      enabled: true,
      frequency: 'monthly',
    }))
    setCustomInterval(30)
  }

  const handleCreateInvoice = async () => {
    if (!isAdmin) {
      toastError('Bạn không có quyền tạo hoá đơn mới')
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
      totals: {
        subtotal: invoiceSubtotal,
        tax: invoiceTaxTotal,
        total: invoiceTotal,
      },
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể tạo hoá đơn')
      }

      toastSuccess('Tạo hoá đơn thành công')
      const createdId = result.data?.id as number | undefined
      if (scheduleForm.enabled) {
        await handleScheduleInvoice(createdId)
      }

      if (createdId) {
      router.push(`/admin/invoice/${createdId}`)
      } else {
        router.push('/admin/invoices')
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toastError(error.message || 'Không thể tạo hoá đơn')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScheduleInvoice = async (invoiceId?: number) => {
    if (!scheduleForm.enabled) {
      return
    }

    if (!invoiceId) {
      toastError('Không tìm thấy ID hoá đơn sau khi tạo')
      return
    }

    const frequencyPayload =
      scheduleForm.frequency === 'custom'
        ? { frequency: 'custom', intervalDays: customInterval }
        : { frequency: scheduleForm.frequency }

    const payload = {
      invoiceId,
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
        throw new Error(result.message || 'Không thể lập lịch gửi hoá đơn')
      }
    } catch (error: any) {
      console.error('Error scheduling invoice emails:', error)
      toastError(error.message || 'Không thể lập lịch gửi hoá đơn')
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
          <h2 className="text-xl font-semibold text-slate-800">Bạn không có quyền tạo hoá đơn</h2>
          <p className="text-sm text-slate-500">Vui lòng liên hệ quản trị viên nếu bạn cần tạo hoá đơn mới.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Tạo hoá đơn mới</h1>
            <p className="text-slate-600">
              Điền thông tin hoá đơn, cấu hình lập lịch gửi email nhắc nhở và lưu lại để gửi cho khách hàng.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <Button
              variant="outline"
              asChild
              className="flex items-center gap-2 border-slate-200 text-primary hover:bg-slate-50"
              disabled={isSubmitting || isScheduling}
            >
              <Link href="/admin/invoices">
                <ArrowLeft className="h-4 w-4" />
                Danh sách hoá đơn
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={resetForms}
              className="flex items-center gap-2 border-primary text-primary hover:bg-slate-50"
              disabled={isSubmitting || isScheduling}
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="flex items-center gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              disabled={isSubmitting || isScheduling}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu hoá đơn
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
                <CardDescription>Điền các thông tin cơ bản cho hoá đơn cần gửi tới khách hàng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Khách hàng</Label>
                    <CustomerCombobox
                      customers={customers.map((customer) => ({
                        id: customer.id,
                        name: customer.name,
                        email: customer.email || '—',
                      }))}
                      value={invoiceForm.customerId ? Number(invoiceForm.customerId) : null}
                      onValueChange={(val) => handleInvoiceFormChange('customerId', val ? String(val) : '')}
                      placeholder="Chọn khách hàng"
                      className="h-9 px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Số hoá đơn</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="invoiceNumber"
                        value={invoiceForm.invoiceNumber}
                        onChange={(event) => handleInvoiceFormChange('invoiceNumber', event.target.value)}
                        placeholder="VD: INV-2025-001"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={fetchInvoiceNumberSuggestion}
                        disabled={isFetchingSuggestion}
                      >
                        {isFetchingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="sr-only">Gợi ý số hoá đơn</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Ngày phát hành</Label>
                    <DatePicker
                      value={invoiceForm.issueDate ? new Date(invoiceForm.issueDate) : undefined}
                      onChange={(date) => handleDateChange('issueDate', date)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Ngày đến hạn</Label>
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
                <CardDescription>Thêm các dịch vụ hoặc khoản phí sẽ xuất hiện trên hoá đơn gửi cho khách hàng.</CardDescription>
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
                                      updateLineItem(item.id, 'taxRate', 0)
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
                <CardTitle>Lịch gửi email nhắc nhở</CardTitle>
                <CardDescription>
                  Tự động gửi email hoá đơn định kỳ hoặc trước hạn thanh toán để nhắc khách hàng thực hiện thanh toán đúng hạn.
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
                      Hệ thống sẽ tự động gửi hoá đơn theo lịch bạn cấu hình bên dưới.
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
                      <TimePicker
                        value={scheduleForm.sendTime}
                        onChange={(time) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            sendTime: time || prev.sendTime,
                          }))
                        }
                        disabled={!scheduleForm.enabled}
                        minuteStep={1}
                        className="h-9"
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
                        value={scheduleForm.daysBeforeDue}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            daysBeforeDue: Number(event.target.value) || 0,
                          }))
                        }
                        disabled={!scheduleForm.enabled}
                      />
                      <p className="text-xs text-muted-foreground">
                        Email sẽ được gửi thêm khi còn lại X ngày trước hạn thanh toán.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium leading-none">CC phòng kế toán</Label>
                      <div className="flex h-9 items-center justify-between rounded-md border bg-background px-3">
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
                      <p className="text-xs text-muted-foreground">
                        Gửi bản sao email hoá đơn tới nhóm kế toán nội bộ.
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ghi chú nội bộ</CardTitle>
                <CardDescription>
                  Thông tin này chỉ hiển thị nội bộ, giúp bộ phận kế toán nắm được tình trạng xử lý hoá đơn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={5} placeholder="Nhập các ghi chú, yêu cầu xử lý, điều kiện đặc biệt..." />
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-slate-600">Gợi ý quy trình:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li>Xác nhận thông tin khách hàng và hạn thanh toán trước khi gửi.</li>
                    <li>Tải PDF hoá đơn và kiểm tra bố cục trước khi kích hoạt gửi tự động.</li>
                    <li>Thêm team kế toán ở phần CC để theo dõi các phản hồi từ khách hàng.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

