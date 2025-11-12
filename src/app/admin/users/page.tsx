'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toastError, toastSuccess, toastFormError, toastFormSuccess } from '@/lib/toast'
import { Pagination } from '@/components/ui/pagination'
import { Search, Shield, User, Loader2, Crown, Users, Plus, Eye, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Member {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  emailVerified?: 'YES' | 'NO'
  createdAt: string
  updatedAt: string
}

export default function MembersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [newRole, setNewRole] = useState<'ADMIN' | 'USER'>('USER')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER'
  })
  const [editMember, setEditMember] = useState({
    id: 0,
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER'
  })
  
  // Track if members have been fetched to avoid refetching when switching tabs
  const hasFetchedMembers = useRef(false)

  // Fetch members from API
  const fetchMembers = async () => {
    try {
      setIsLoadingMembers(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setMembers(result.data)
        } else {
          setMembers([])
          toastError('Không thể tải danh sách thành viên')
        }
      } else {
        setMembers([])
        toastError('Không thể tải danh sách thành viên')
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      setMembers([])
      toastError('Lỗi khi tải danh sách thành viên')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  // Check if user is ADMIN or USER before allowing access
  useEffect(() => {
    if (status === 'loading') return // Wait for session to load
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    const userRole = (session.user as any)?.role
    // Allow both ADMIN and USER to view the page
    if (userRole !== 'ADMIN' && userRole !== 'USER') {
      router.push('/unauthorized')
      return
    }
  }, [session, status, router])

  // Only fetch members once when session is loaded and user is ADMIN or USER
  // Don't refetch when switching tabs or session refreshes
  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    if (hasFetchedMembers.current) return // Already fetched, don't fetch again
    
    const userRole = (session.user as any)?.role
    // Allow both ADMIN and USER to fetch members
    if (userRole === 'ADMIN' || userRole === 'USER') {
      hasFetchedMembers.current = true
      fetchMembers()
    }
  }, [session, status]) // Only fetch when session/status changes from initial state
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleRoleChange = (member: Member) => {
    setSelectedMember(member)
    setNewRole(member.role)
    setIsRoleDialogOpen(true)
  }

  const confirmRoleChange = async () => {
    if (!selectedMember) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedMember.id,
          role: newRole,
        }),
      })

      if (response.ok) {
        toastFormSuccess('Cập nhật quyền thành viên')
        setIsRoleDialogOpen(false)
        setSelectedMember(null)
        // Refresh members list
        await fetchMembers()
      } else {
        const error = await response.json()
        toastFormError('Cập nhật quyền thành viên', error.error)
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      toastFormError('Cập nhật quyền thành viên', 'Có lỗi xảy ra khi cập nhật quyền')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      toastError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      })

      if (response.ok) {
        toastFormSuccess('Tạo thành viên')
        setNewMember({ name: '', email: '', password: '', role: 'USER' })
        setIsAddDialogOpen(false)
        // Refresh members list
        await fetchMembers()
      } else {
        const error = await response.json()
        toastFormError('Tạo thành viên', error.error)
      }
    } catch (error) {
      console.error('Error creating member:', error)
      toastFormError('Tạo thành viên', 'Có lỗi xảy ra khi tạo thành viên')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewMember = (member: Member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditMember({
      id: member.id,
      name: member.name,
      email: member.email,
      password: '',
      role: member.role
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateMember = async () => {
    if (!editMember.name || !editMember.email) {
      toastError('Vui lòng nhập tên và email')
      return
    }

    setIsLoading(true)
    try {
      const updateData: any = {
        id: editMember.id,
        name: editMember.name,
        email: editMember.email,
        role: editMember.role
      }

      // Only include password if it's provided
      if (editMember.password) {
        updateData.password = editMember.password
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toastFormSuccess(result.message || 'Cập nhật thành viên')
        setIsEditDialogOpen(false)
        // Refresh members list
        await fetchMembers()
      } else {
        toastFormError('Cập nhật thành viên', result.error || 'Không thể cập nhật thành viên')
      }
    } catch (error) {
      console.error('Error updating member:', error)
      toastFormError('Cập nhật thành viên', 'Có lỗi xảy ra khi cập nhật thành viên')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteMember = async () => {
    if (!selectedMember) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users?id=${selectedMember.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toastFormSuccess('Xóa thành viên')
        setIsDeleteDialogOpen(false)
        setSelectedMember(null)
        // Refresh members list
        await fetchMembers()
      } else {
        const error = await response.json()
        toastFormError('Xóa thành viên', error.error)
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      toastFormError('Xóa thành viên', 'Có lỗi xảy ra khi xóa thành viên')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyMember = async (member: Member) => {
    if (!member || member.emailVerified === 'YES') return

    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: member.id
        }),
      })

      if (response.ok) {
        toastFormSuccess('Đã gửi email xác thực đến thành viên')
        // Refresh members list
        await fetchMembers()
      } else {
        const error = await response.json()
        toastFormError('Gửi email xác thực', error.error)
      }
    } catch (error) {
      console.error('Error sending verification email:', error)
      toastFormError('Gửi email xác thực', 'Có lỗi xảy ra khi gửi email xác thực')
    } finally {
      setIsLoading(false)
    }
  }

  const getVerificationBadge = (emailVerified?: 'YES' | 'NO') => {
    const isVerified = emailVerified === 'YES'
    return (
      <Badge 
        variant={isVerified ? 'default' : 'outline'} 
        className={isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
      >
        {isVerified ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Đã xác thực
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Chưa xác thực
          </>
        )}
      </Badge>
    )
  }

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)
  const totalFilteredPages = Math.ceil(filteredMembers.length / itemsPerPage)

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Quản trị viên
          </Badge>
        )
      case 'USER':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Thành viên
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const adminCount = members.filter(m => m.role === 'ADMIN').length
  const userCount = members.filter(m => m.role === 'USER').length
  
  // Check if current user is ADMIN (to show/hide action buttons)
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Quản Lý Thành Viên</h1>
            <p className="text-gray-600 mt-1">Quản lý quyền hạn và vai trò của thành viên</p>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Thêm Thành Viên
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Thêm Thành Viên Mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin thành viên mới vào form bên dưới.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Tên
                  </Label>
                  <Input 
                    id="name" 
                    className="col-span-3" 
                    placeholder="Tên thành viên"
                    value={newMember.name}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    className="col-span-3" 
                    placeholder="email@example.com"
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Mật khẩu
                  </Label>
                  <Input 
                    id="password" 
                    type="password" 
                    className="col-span-3" 
                    placeholder="Mật khẩu"
                    value={newMember.password}
                    onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Vai trò
                  </Label>
                  <Select 
                    value={newMember.role} 
                    onValueChange={(value: 'ADMIN' | 'USER') => 
                      setNewMember({...newMember, role: value})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Thành viên thường
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Quản trị viên
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateMember} disabled={isLoading}>
                  {isLoading ? 'Đang tạo...' : 'Thêm Thành Viên'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Thành Viên</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingMembers ? <Loader2 className="h-6 w-6 animate-spin" /> : members.length}
              </div>
              <p className="text-xs text-gray-600">Thành viên trong hệ thống</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quản Trị Viên</CardTitle>
              <Crown className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingMembers ? <Loader2 className="h-6 w-6 animate-spin" /> : adminCount}
              </div>
              <p className="text-xs text-gray-600">
                {members.length > 0 ? Math.round((adminCount / members.length) * 100) : 0}% tổng thành viên
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thành Viên Thường</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingMembers ? <Loader2 className="h-6 w-6 animate-spin" /> : userCount}
              </div>
              <p className="text-xs text-gray-600">Quyền truy cập cơ bản</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Tìm Kiếm Thành Viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Thành Viên</CardTitle>
            <CardDescription>
              Quản lý quyền hạn và vai trò của tất cả thành viên trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Đang tải danh sách thành viên...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thành Viên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai Trò</TableHead>
                    <TableHead>Xác Thực</TableHead>
                    <TableHead>Ngày Tham Gia</TableHead>
                    <TableHead>Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'Không tìm thấy thành viên nào' : 'Chưa có thành viên nào'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMembers.map((member) => {
                      const isCurrentUser = session?.user?.email === member.email
                      return (
                      <TableRow 
                        key={member.id}
                        className={isCurrentUser ? 'bg-blue-50 hover:bg-blue-100' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {member.name}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                    Đang đăng nhập
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">ID: {member.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{getRoleBadge(member.role)}</TableCell>
                        <TableCell>{getVerificationBadge(member.emailVerified)}</TableCell>
                        <TableCell>
                          {new Date(member.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewMember(member)}
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {member.emailVerified !== 'YES' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleVerifyMember(member)}
                                    title="Xác thực tài khoản"
                                    className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    disabled={isLoading}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Xác thực
                                  </Button>
                                )}
                                {!isCurrentUser && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleRoleChange(member)}
                                      title="Thay đổi quyền"
                                      className="flex items-center gap-1"
                                    >
                                      <Shield className="h-3 w-3" />
                                      Quyền
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDeleteMember(member)}
                                      title="Xóa"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {isCurrentUser && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push('/admin/profile')}
                                title="Xem hồ sơ của bạn"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-3 w-3" />
                                Hồ sơ
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            totalItems={filteredMembers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>

        {/* Role Change Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Thay Đổi Quyền Thành Viên</DialogTitle>
              <DialogDescription>
                Chọn vai trò mới cho thành viên "{selectedMember?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Vai trò</label>
                <Select value={newRole} onValueChange={(value: 'ADMIN' | 'USER') => setNewRole(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Thành viên thường
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Quản trị viên
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={confirmRoleChange} disabled={isLoading}>
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Member Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Chi Tiết Thành Viên</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết của thành viên
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Tên</Label>
                  <div className="col-span-3">{selectedMember.name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Email</Label>
                  <div className="col-span-3">{selectedMember.email}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Vai trò</Label>
                  <div className="col-span-3">{getRoleBadge(selectedMember.role)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Xác thực</Label>
                  <div className="col-span-3">{getVerificationBadge(selectedMember.emailVerified)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Ngày tham gia</Label>
                  <div className="col-span-3">
                    {new Date(selectedMember.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Cập nhật cuối</Label>
                  <div className="col-span-3">
                    {new Date(selectedMember.updatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Chỉnh Sửa Thành Viên</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin thành viên
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Tên
                </Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  placeholder="Tên thành viên"
                  value={editMember.name}
                  onChange={(e) => setEditMember({...editMember, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  className="col-span-3" 
                  placeholder="email@example.com"
                  value={editMember.email}
                  onChange={(e) => setEditMember({...editMember, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Mật khẩu
                </Label>
                <Input 
                  id="edit-password" 
                  type="password" 
                  className="col-span-3" 
                  placeholder="Để trống nếu không muốn thay đổi"
                  value={editMember.password}
                  onChange={(e) => setEditMember({...editMember, password: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Vai trò
                </Label>
                <Select 
                  value={editMember.role} 
                  onValueChange={(value: 'ADMIN' | 'USER') => 
                    setEditMember({...editMember, role: value})
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Thành viên thường
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Quản trị viên
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateMember} disabled={isLoading}>
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Member Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Xác nhận xóa thành viên</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa thành viên "{selectedMember?.name}"? 
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteMember} 
                disabled={isLoading}
              >
                {isLoading ? 'Đang xóa...' : 'Xóa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

