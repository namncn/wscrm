'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, Search, Plus, Mail, Clock, ExternalLink, Trash2, PenSquare } from 'lucide-react'

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'OVERDUE' | 'PAID'

type InvoiceSummary = {
  id: number
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  customerName: string
  customerEmail?: string | null
  total: number
  currency: string
  balance?: number
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: string }> = {
  DRAFT: { label: 'Nháp', variant: 'bg-slate-100 text-slate-700' },
  SENT: { label: 'Đã gửi', variant: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: 'Thanh toán một phần', variant: 'bg-amber-100 text-amber-700' },
  OVERDUE: { label: 'Quá hạn', variant: 'bg-red-100 text-red-700' },
  PAID: { label: 'Đã thanh toán', variant: 'bg-emerald-100 text-emerald-700' },
}

export default function AdminInvoicesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = userRole === 'ADMIN'
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [sendingState, setSendingState] = useState<{ id: number; mode: 'send' | 'reminder' } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteDialogInvoice, setDeleteDialogInvoice] = useState<InvoiceSummary | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invoices')
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setInvoices(
          result.data.map((invoice: any) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status as InvoiceStatus,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            customerName: invoice.customerName ?? invoice.customer?.name ?? 'Không xác định',
            customerEmail: invoice.customerEmail ?? invoice.customer?.email ?? null,
            total: invoice.total ?? invoice.totals?.total ?? 0,
            currency: invoice.currency ?? invoice.totals?.currency ?? 'VND',
            balance: invoice.balance ?? invoice.totals?.balance,
          }))
        )
      } else {
        setInvoices([])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toastError('Không thể tải danh sách hoá đơn')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInvoices()
  }

  const handleSendInvoice = async (invoiceId: number, mode: 'send' | 'reminder') => {
    if (!isAdmin) {
      toastError('Bạn không có quyền gửi email hoá đơn')
      return
    }
    try {
      setSendingState({ id: invoiceId, mode })
      const endpoint = mode === 'send' ? 'send' : 'reminder'
      const response = await fetch(`/api/invoice/${invoiceId}/${endpoint}`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể gửi email hoá đơn')
      }
      toastSuccess(mode === 'send' ? 'Đã gửi hoá đơn cho khách hàng' : 'Đã gửi email nhắc thanh toán')
      fetchInvoices()
    } catch (error: any) {
      console.error('Error sending invoice:', error)
      toastError(error.message || 'Không thể gửi email hoá đơn')
    } finally {
      setSendingState(null)
    }
  }

  const openDeleteDialog = (invoice: InvoiceSummary) => {
    if (!isAdmin) {
      toastError('Bạn không có quyền xoá hoá đơn')
      return
    }
    setDeleteDialogInvoice(invoice)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    if (deletingId !== null) return
    setIsDeleteDialogOpen(false)
    setDeleteDialogInvoice(null)
  }

  const handleDeleteInvoice = async () => {
    if (!isAdmin) {
      toastError('Bạn không có quyền xoá hoá đơn')
      return
    }
    if (!deleteDialogInvoice) {
      return
    }

    try {
      setDeletingId(deleteDialogInvoice.id)
      const response = await fetch(`/api/invoice/${deleteDialogInvoice.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể xoá hoá đơn')
      }
      toastSuccess('Đã xoá hoá đơn thành công')
      setInvoices((prev) => prev.filter((item) => item.id !== deleteDialogInvoice.id))
    } catch (error: any) {
      console.error('Error deleting invoice:', error)
      toastError(error.message || 'Không thể xoá hoá đơn')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteDialogInvoice(null)
      setDeletingId(null)
    }
  }

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) {
      return invoices
    }
    const term = searchTerm.toLowerCase()
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.customerName.toLowerCase().includes(term) ||
        invoice.customerEmail?.toLowerCase().includes(term) ||
        statusConfig[invoice.status].label.toLowerCase().includes(term)
    )
  }, [invoices, searchTerm])

  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0)
    const outstanding = invoices.reduce((sum, invoice) => sum + (Number(invoice.balance ?? invoice.total) || 0), 0)
    const overdueCount = invoices.filter((invoice) => invoice.status === 'OVERDUE').length
    return {
      count: invoices.length,
      totalAmount,
      outstanding,
      overdueCount,
    }
  }, [invoices])

  const formatDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('vi-VN')
  }

  const isSending = (invoiceId: number, mode: 'send' | 'reminder') =>
    sendingState?.id === invoiceId && sendingState.mode === mode

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Hoá đơn</h1>
            <p className="text-slate-600">
              Theo dõi các hoá đơn đã phát hành, trạng thái thanh toán và gửi nhắc nhở cho khách hàng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
              className="flex items-center gap-2 border-blue-200 text-primary hover:bg-blue-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Làm mới
            </Button>
            <Button
              className="flex items-center gap-2 bg-primary text-white shadow-sm hover:bg-blue-700"
              onClick={() => {
                if (!isAdmin) {
                  toastError('Bạn không có quyền tạo hoá đơn mới')
                  return
                }
                router.push('/admin/invoices/new')
              }}
            >
              <Plus className="h-4 w-4" />
              Tạo hoá đơn mới
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-1">
              <CardDescription className="text-sm text-muted-foreground">Tổng số hoá đơn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <CardTitle className="text-2xl text-slate-900">{stats.count}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Trung bình {invoices.length ? Math.round(stats.count / invoices.length) : 0} hoá đơn mỗi khách hàng
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-1">
              <CardDescription className="text-sm text-muted-foreground">Tổng giá trị đã phát hành</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <CardTitle className="text-xl text-slate-900">{formatCurrency(stats.totalAmount)}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Trung bình {formatCurrency(invoices.length ? stats.totalAmount / invoices.length : 0)} mỗi hoá đơn
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-1">
              <CardDescription className="text-sm text-muted-foreground">Giá trị chưa thanh toán</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <CardTitle className="text-xl text-slate-900">{formatCurrency(stats.outstanding)}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Chiếm {stats.totalAmount ? ((stats.outstanding / stats.totalAmount) * 100).toFixed(1) : 0}% tổng giá trị
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-1">
              <CardDescription className="text-sm text-muted-foreground">Hoá đơn quá hạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <CardTitle className="text-2xl text-slate-900">{stats.overdueCount}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {stats.count ? ((stats.overdueCount / stats.count) * 100).toFixed(1) : 0}% hoá đơn bị quá hạn
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Danh sách hoá đơn</CardTitle>
              <CardDescription>Xem và quản lý các hoá đơn đã tạo trong hệ thống.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm hoá đơn..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <p className="text-sm">Chưa có hoá đơn nào được tạo hoặc không tìm thấy kết quả phù hợp.</p>
                <Button
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (!isAdmin) {
                      toastError('Bạn không có quyền tạo hoá đơn mới')
                      return
                    }
                    router.push('/admin/invoices/new')
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Tạo hoá đơn đầu tiên
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Hoá đơn</TableHead>
                      <TableHead className="min-w-[180px]">Khách hàng</TableHead>
                      <TableHead>Phát hành</TableHead>
                      <TableHead>Đến hạn</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead className="text-right">Còn lại</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="min-w-[160px] text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-semibold text-slate-900">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground">#{invoice.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">{invoice.customerName}</div>
                          <div className="text-xs text-muted-foreground">{invoice.customerEmail || '—'}</div>
                        </TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-blue-600">
                          {formatCurrency(invoice.balance ?? invoice.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusConfig[invoice.status].variant}>{statusConfig[invoice.status].label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border border-blue-200 text-blue-600 transition-colors duration-200 hover:border-blue-500 hover:bg-blue-500 hover:text-white focus-visible:ring-blue-500"
                              onClick={() => router.push(`/admin/invoice/${invoice.id}`)}
                              title="Xem chi tiết"
                            >
                              <span className="sr-only">Xem chi tiết</span>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border border-purple-200 text-purple-600 transition-colors duration-200 hover:border-purple-500 hover:bg-purple-500 hover:text-white focus-visible:ring-purple-500"
                              onClick={() => {
                                if (!isAdmin) {
                                  toastError('Bạn không có quyền chỉnh sửa hoá đơn')
                                  return
                                }
                                router.push(`/admin/invoice/${invoice.id}/edit`)
                              }}
                              title="Chỉnh sửa hoá đơn"
                            >
                              <span className="sr-only">Chỉnh sửa hoá đơn</span>
                              <PenSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border border-emerald-200 text-emerald-600 transition-colors duration-200 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white focus-visible:ring-emerald-500"
                              onClick={() => handleSendInvoice(invoice.id, 'send')}
                              disabled={isSending(invoice.id, 'send')}
                              title="Gửi hoá đơn"
                            >
                              <span className="sr-only">Gửi hoá đơn</span>
                              {isSending(invoice.id, 'send') ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border border-amber-200 text-amber-600 transition-colors duration-200 hover:border-amber-500 hover:bg-amber-500 hover:text-white focus-visible:ring-amber-500"
                              onClick={() => handleSendInvoice(invoice.id, 'reminder')}
                              disabled={isSending(invoice.id, 'reminder')}
                              title="Gửi nhắc nhở"
                            >
                              <span className="sr-only">Gửi nhắc nhở</span>
                              {isSending(invoice.id, 'reminder') ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border border-red-200 text-red-600 transition-colors duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white focus-visible:ring-red-500"
                              onClick={() => openDeleteDialog(invoice)}
                              disabled={!isAdmin || deletingId === invoice.id}
                              title="Xoá hoá đơn"
                            >
                              <span className="sr-only">Xoá hoá đơn</span>
                              {deletingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog()
          } else {
            setIsDeleteDialogOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xoá hoá đơn</DialogTitle>
            <DialogDescription>
              Bạn sắp xoá hoá đơn{' '}
              <span className="font-medium text-slate-900">{deleteDialogInvoice?.invoiceNumber}</span>. Thao tác
              này không thể hoàn tác và mọi dữ liệu liên quan (dòng sản phẩm, lịch gửi, lịch sử thanh toán) sẽ bị
              xoá.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>Hãy chắc chắn rằng bạn đã lưu trữ thông tin cần thiết trước khi xoá.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deletingId !== null}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={deletingId !== null || !deleteDialogInvoice}
            >
              {deletingId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xoá hoá đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
