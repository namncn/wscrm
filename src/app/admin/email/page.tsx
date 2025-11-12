'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { 
  Mail, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Pause, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface EmailNotification {
  id: string
  customerId: string
  serviceId: string
  serviceType: 'DOMAIN' | 'HOSTING' | 'VPS'
  notificationType: 'EXPIRING_SOON_1' | 'EXPIRING_SOON_2' | 'EXPIRING_SOON_3' | 'EXPIRED' | 'DELETION_WARNING' | 'DELETED'
  subject: string
  content: string
  recipientEmail: string
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  scheduledAt: string | null
  sentAt: string | null
  errorMessage: string | null
  retryCount: number
  metadata: any
  createdAt: string
  updatedAt: string
}

export default function EmailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<EmailNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<string>('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all')
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Form state for edit
  const [editForm, setEditForm] = useState({
    subject: '',
    content: '',
    status: 'PENDING' as EmailNotification['status'],
    scheduledAt: '',
  })

  // Check authentication separately
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fetch emails when session is ready (initial load) or when filters/pagination change
  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    fetchEmails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, currentPage, statusFilter, notificationTypeFilter, serviceTypeFilter])
  
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, notificationTypeFilter, serviceTypeFilter])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (notificationTypeFilter !== 'all') {
        params.append('notificationType', notificationTypeFilter)
      }
      if (serviceTypeFilter !== 'all') {
        params.append('serviceType', serviceTypeFilter)
      }

      const response = await fetch(`/api/email-notifications?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setEmails(result.data)
          setTotalPages(result.pagination?.totalPages || 1)
          setTotalItems(result.pagination?.total || 0)
        } else {
          setEmails([])
        }
      } else {
        setEmails([])
        toastError('Không thể tải danh sách email')
      }
    } catch (error) {
      setEmails([])
      toastError('Có lỗi xảy ra khi tải danh sách email')
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewEmail = (email: EmailNotification) => {
    setSelectedEmail(email)
    setIsViewDialogOpen(true)
  }

  const handleEditEmail = (email: EmailNotification) => {
    setSelectedEmail(email)
    setEditForm({
      subject: email.subject,
      content: email.content,
      status: email.status,
      scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString().slice(0, 16) : '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateEmail = async () => {
    if (!selectedEmail) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/email-notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedEmail.id,
          ...editForm,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        await fetchEmails()
        setIsEditDialogOpen(false)
        setSelectedEmail(null)
        toastSuccess('Cập nhật email thành công!')
      } else {
        toastError(result.error || 'Không thể cập nhật email')
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi cập nhật email')
      console.error('Error updating email:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePauseEmail = async (email: EmailNotification) => {
    try {
      const response = await fetch('/api/email-notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: email.id,
          status: 'CANCELLED',
        }),
      })

      if (response.ok) {
        await fetchEmails()
        toastSuccess('Đã tạm dừng email')
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể tạm dừng email')
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi tạm dừng email')
      console.error('Error pausing email:', error)
    }
  }

  const handleResumeEmail = async (email: EmailNotification) => {
    try {
      const response = await fetch('/api/email-notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: email.id,
          status: 'PENDING',
        }),
      })

      if (response.ok) {
        await fetchEmails()
        toastSuccess('Đã tiếp tục email')
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể tiếp tục email')
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi tiếp tục email')
      console.error('Error resuming email:', error)
    }
  }

  const handleDeleteEmail = (email: EmailNotification) => {
    setSelectedEmail(email)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteEmail = async () => {
    if (!selectedEmail) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/email-notifications?id=${selectedEmail.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchEmails()
        setIsDeleteDialogOpen(false)
        setSelectedEmail(null)
        toastSuccess('Xóa email thành công!')
      } else {
        const errorData = await response.json()
        toastError(errorData.error || 'Không thể xóa email')
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xóa email')
      console.error('Error deleting email:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleScheduleEmails = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/email-notifications/schedule', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toastSuccess(`Đã lên lịch ${result.totalScheduled} email thông báo!`)
        await fetchEmails()
      } else {
        // Show appropriate error message based on status code
        if (response.status === 403) {
          toastError(result.error || 'Bạn không có quyền thực hiện hành động này')
        } else if (response.status === 401) {
          toastError('Vui lòng đăng nhập lại')
        } else {
          toastError(result.error || 'Không thể lên lịch email')
        }
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi lên lịch email')
      console.error('Error scheduling emails:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessEmails = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/email-notifications/process', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toastSuccess(`Đã xử lý ${result.processed} email, ${result.failed} thất bại`)
        await fetchEmails()
      } else {
        // Show appropriate error message based on status code
        if (response.status === 403) {
          toastError(result.error || 'Bạn không có quyền thực hiện hành động này')
        } else if (response.status === 401) {
          toastError('Vui lòng đăng nhập lại')
        } else {
          toastError(result.error || 'Không thể xử lý email')
        }
      }
    } catch (error) {
      toastError('Có lỗi xảy ra khi xử lý email')
      console.error('Error processing emails:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  const filteredEmails = emails.filter(email =>
    email.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Sắp gửi</Badge>
      case 'SENDING':
        return <Badge className="bg-blue-100 text-blue-800">Đang gửi</Badge>
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800">Đã gửi</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Thất bại</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Đã hủy</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'EXPIRING_SOON_1':
        return 'Sắp hết hạn (Email 1)'
      case 'EXPIRING_SOON_2':
        return 'Sắp hết hạn (Email 2)'
      case 'EXPIRING_SOON_3':
        return 'Sắp hết hạn (Email 3)'
      case 'EXPIRED':
        return 'Đã hết hạn'
      case 'DELETION_WARNING':
        return 'Cảnh báo xóa'
      case 'DELETED':
        return 'Đã bị xóa'
      default:
        return type
    }
  }

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'DOMAIN':
        return 'Tên miền'
      case 'HOSTING':
        return 'Hosting'
      case 'VPS':
        return 'VPS'
      default:
        return type
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'SENDING':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'CANCELLED':
        return <Pause className="h-4 w-4 text-gray-600" />
      default:
        return <Mail className="h-4 w-4 text-gray-600" />
    }
  }

  const stats = {
    pending: emails.filter(e => e.status === 'PENDING').length,
    sending: emails.filter(e => e.status === 'SENDING').length,
    sent: emails.filter(e => e.status === 'SENT').length,
    failed: emails.filter(e => e.status === 'FAILED').length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Email</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý email thông báo</p>
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              onClick={handleScheduleEmails}
              disabled={isProcessing}
              variant="default"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Lên lịch Email
                </>
              )}
            </Button>
            <Button
              onClick={handleProcessEmails}
              disabled={isProcessing}
              variant="outline"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Gửi Email Đang Chờ
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sắp Gửi</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-gray-600">Email đang chờ gửi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang Gửi</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sending}</div>
              <p className="text-xs text-gray-600">Email đang được gửi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã Gửi</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-gray-600">Email đã gửi thành công</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thất Bại</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
              <p className="text-xs text-gray-600">Email gửi thất bại</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Tìm Kiếm & Lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo email, chủ đề..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Sắp gửi</SelectItem>
                  <SelectItem value="SENDING">Đang gửi</SelectItem>
                  <SelectItem value="SENT">Đã gửi</SelectItem>
                  <SelectItem value="FAILED">Thất bại</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={notificationTypeFilter} onValueChange={setNotificationTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Loại thông báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="EXPIRING_SOON_1">Sắp hết hạn (1)</SelectItem>
                  <SelectItem value="EXPIRING_SOON_2">Sắp hết hạn (2)</SelectItem>
                  <SelectItem value="EXPIRING_SOON_3">Sắp hết hạn (3)</SelectItem>
                  <SelectItem value="EXPIRED">Đã hết hạn</SelectItem>
                  <SelectItem value="DELETION_WARNING">Cảnh báo xóa</SelectItem>
                  <SelectItem value="DELETED">Đã bị xóa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Loại dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dịch vụ</SelectItem>
                  <SelectItem value="DOMAIN">Tên miền</SelectItem>
                  <SelectItem value="HOSTING">Hosting</SelectItem>
                  <SelectItem value="VPS">VPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Email</CardTitle>
            <CardDescription>
              Quản lý và theo dõi email thông báo ({totalItems} email)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có email nào</h3>
                <p className="text-gray-500">Không tìm thấy email nào phù hợp với bộ lọc</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Loại Thông Báo</TableHead>
                    <TableHead>Dịch Vụ</TableHead>
                    <TableHead>Người Nhận</TableHead>
                    <TableHead>Chủ Đề</TableHead>
                    <TableHead>Lên Lịch</TableHead>
                    <TableHead>Đã Gửi</TableHead>
                    <TableHead>Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(email.status)}
                          {getStatusBadge(email.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getNotificationTypeLabel(email.notificationType)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getServiceTypeLabel(email.serviceType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{email.recipientEmail}</div>
                        {email.retryCount > 0 && (
                          <div className="text-xs text-red-600">Thử lại: {email.retryCount} lần</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium max-w-xs truncate">{email.subject}</div>
                      </TableCell>
                      <TableCell>
                        {email.scheduledAt ? (
                          <div className="text-sm">{new Date(email.scheduledAt).toLocaleString('vi-VN')}</div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.sentAt ? (
                          <div className="text-sm">{new Date(email.sentAt).toLocaleString('vi-VN')}</div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEmail(email)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEmail(email)}
                            title="Chỉnh sửa"
                            disabled={email.status === 'SENT'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {email.status === 'PENDING' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePauseEmail(email)}
                              title="Tạm dừng"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : email.status === 'CANCELLED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResumeEmail(email)}
                              title="Tiếp tục"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEmail(email)}
                            title="Xóa"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>

        {/* View Email Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chi Tiết Email</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của email thông báo
              </DialogDescription>
            </DialogHeader>
            {selectedEmail && (
              <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Trạng thái</Label>
                    <div>{getStatusBadge(selectedEmail.status)}</div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Loại thông báo</Label>
                    <div className="text-sm">{getNotificationTypeLabel(selectedEmail.notificationType)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Dịch vụ</Label>
                    <Badge variant="outline">{getServiceTypeLabel(selectedEmail.serviceType)}</Badge>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Người nhận</Label>
                    <div className="text-sm">{selectedEmail.recipientEmail}</div>
                  </div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Chủ đề</Label>
                  <div className="text-sm font-medium">{selectedEmail.subject}</div>
                </div>
                <div>
                  <Label className="font-medium mb-2 block">Nội dung</Label>
                  <div 
                    className="text-sm p-3 bg-gray-50 rounded-lg max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Lên lịch</Label>
                    <div className="text-sm">
                      {selectedEmail.scheduledAt 
                        ? new Date(selectedEmail.scheduledAt).toLocaleString('vi-VN')
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Đã gửi</Label>
                    <div className="text-sm">
                      {selectedEmail.sentAt 
                        ? new Date(selectedEmail.sentAt).toLocaleString('vi-VN')
                        : '—'}
                    </div>
                  </div>
                </div>
                {selectedEmail.errorMessage && (
                  <div>
                    <Label className="font-medium mb-2 block text-red-600">Lỗi</Label>
                    <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                      {selectedEmail.errorMessage}
                    </div>
                  </div>
                )}
                {selectedEmail.retryCount > 0 && (
                  <div>
                    <Label className="font-medium mb-2 block">Số lần thử lại</Label>
                    <div className="text-sm">{selectedEmail.retryCount}</div>
                  </div>
                )}
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Email Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Chỉnh Sửa Email</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin email thông báo
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="editSubject">Chủ đề</Label>
                <Input
                  id="editSubject"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="editContent">Nội dung</Label>
                <div className="mt-2 max-h-[360px] overflow-y-auto rounded-md border bg-background">
                  <Textarea
                    id="editContent"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={12}
                    className="min-h-[240px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editStatus">Trạng thái</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: EmailNotification['status']) => 
                    setEditForm({...editForm, status: value})
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Sắp gửi</SelectItem>
                    <SelectItem value="SENDING">Đang gửi</SelectItem>
                    <SelectItem value="SENT">Đã gửi</SelectItem>
                    <SelectItem value="FAILED">Thất bại</SelectItem>
                    <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editScheduledAt">Lên lịch (tùy chọn)</Label>
                <Input
                  id="editScheduledAt"
                  type="datetime-local"
                  value={editForm.scheduledAt}
                  onChange={(e) => setEditForm({...editForm, scheduledAt: e.target.value})}
                  className="mt-2"
                />
              </div>
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateEmail} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  'Cập nhật'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Email Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa email này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 pt-4 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={confirmDeleteEmail} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xóa'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

