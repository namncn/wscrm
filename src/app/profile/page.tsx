'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layout/member-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Edit,
  Save,
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText
} from 'lucide-react'
import { toastSuccess, toastError, toastFormError, toastFormSuccess } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  company?: string
  taxCode?: string
  companyEmail?: string
  companyAddress?: string
  companyPhone?: string
  companyTaxCode?: string
  createdAt: string
  userId?: string
  emailVerified?: 'YES' | 'NO'
  pendingEmail?: string | null
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isResendingEmailChange, setIsResendingEmailChange] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    taxCode: '',
    companyEmail: '',
    companyAddress: '',
    companyPhone: '',
    companyTaxCode: ''
  })

  // Fetch profile data from API
  const fetchProfile = async () => {
    if (!session?.user?.email) return
    
    setIsFetching(true)
    try {
      const response = await fetch('/api/customers/me')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const currentCustomer = result.data
          setProfile({
            id: currentCustomer.id,
            name: currentCustomer.name || '',
            email: currentCustomer.email || '',
            phone: currentCustomer.phone || '',
            address: currentCustomer.address || '',
            company: currentCustomer.company || '',
            taxCode: currentCustomer.taxCode || '',
            companyEmail: currentCustomer.companyEmail || '',
            companyAddress: currentCustomer.companyAddress || '',
            companyPhone: currentCustomer.companyPhone || '',
            companyTaxCode: currentCustomer.companyTaxCode || '',
            createdAt: currentCustomer.createdAt || new Date().toISOString(),
            userId: currentCustomer.userId || undefined,
            emailVerified: currentCustomer.emailVerified || 'NO',
            pendingEmail: currentCustomer.pendingEmail || null,
          })
        } else {
          // Customer not found, show empty profile
          setProfile({
            id: '',
            name: session.user?.name || 'Người dùng',
            email: session.user?.email || '',
            phone: '',
            address: '',
            company: '',
            taxCode: '',
            companyEmail: '',
            companyAddress: '',
            companyPhone: '',
            companyTaxCode: '',
            createdAt: new Date().toISOString(),
            pendingEmail: null,
          })
        }
      } else {
        console.error('Failed to fetch customer:', response.status)
        if (response.status === 404) {
          // If no customer record found, redirect admin to admin profile, or show error
          const userType = (session.user as any)?.userType
          if (userType === 'admin') {
            router.push('/admin/profile')
            return
          }
          toastError('Không tìm thấy thông tin khách hàng.')
        } else if (response.status === 401) {
          toastError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
          router.push('/auth/signin')
          return
        }
        // Customer not found, show empty profile
        setProfile({
          id: '',
          name: session.user?.name || 'Người dùng',
          email: session.user?.email || '',
          phone: '',
          address: '',
          company: '',
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toastError('Lỗi khi tải thông tin hồ sơ')
      // Fallback to session data
      setProfile({
        id: '',
        name: session.user?.name || 'Người dùng',
        email: session.user?.email || '',
        phone: '',
        address: '',
        company: '',
        createdAt: new Date().toISOString()
      })
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Only customers can access profile page
    const userType = (session.user as any)?.userType
    if (userType !== 'customer') {
      if (userType === 'admin') {
        router.push('/admin/profile')
      } else {
        router.push('/auth/signin')
      }
      return
    }
    
    fetchProfile()
  }, [session, status, router])

  const handleSendVerificationEmail = async () => {
    if (!profile?.id) {
      toastError('Không tìm thấy ID khách hàng để gửi email xác thực')
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: profile.id
        }),
      })

      if (response.ok) {
        toastFormSuccess('Đã gửi email xác thực')
        // Refresh profile to get updated status
        await fetchProfile()
      } else {
        const error = await response.json()
        toastFormError('Gửi email xác thực', error.error)
      }
    } catch (error) {
      console.error('Error sending verification email:', error)
      toastFormError('Gửi email xác thực', 'Có lỗi xảy ra khi gửi email xác thực')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleResendEmailChange = async () => {
    if (!profile?.pendingEmail) {
      toastError('Không có yêu cầu thay đổi email nào đang chờ xác nhận')
      return
    }

    setIsResendingEmailChange(true)
    try {
      const response = await fetch('/api/auth/resend-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'customer' }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Không thể gửi lại email xác nhận')
      }

      toastSuccess(result.message || 'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư của bạn.')
    } catch (error: any) {
      console.error('Error resending email change verification:', error)
      toastError(error.message || 'Không thể gửi lại email xác nhận')
    } finally {
      setIsResendingEmailChange(false)
    }
  }

  const getVerificationBadge = () => {
    if (!profile?.emailVerified) return null
    const isVerified = profile.emailVerified === 'YES'
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

  if (status === 'loading' || isFetching) {
    return (
      <MemberLayout title="Hồ sơ cá nhân">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MemberLayout>
    )
  }

  if (!session || !profile) {
    return null
  }

  const handleEdit = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || '',
      address: profile.address || '',
      company: profile.company || '',
      taxCode: profile.taxCode || '',
      companyEmail: profile.companyEmail || '',
      companyAddress: profile.companyAddress || '',
      companyPhone: profile.companyPhone || '',
      companyTaxCode: profile.companyTaxCode || ''
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!profile) return
    
    setIsLoading(true)
    try {
      // Check if customer exists in database
      let customerId = profile.id
      
      // If customer doesn't exist, create new customer
      if (!customerId || customerId === '') {
        const createResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editForm.name,
            email: editForm.email,
            phone: editForm.phone || null,
            address: editForm.address || null,
            company: editForm.company || null,
            taxCode: editForm.taxCode || null,
            companyEmail: editForm.companyEmail || null,
            companyAddress: editForm.companyAddress || null,
            companyPhone: editForm.companyPhone || null,
            companyTaxCode: editForm.companyTaxCode || null,
          }),
        })
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.error || 'Không thể tạo khách hàng')
        }
        
        const createResult = await createResponse.json()
        if (createResult.success && createResult.data) {
          customerId = createResult.data.id || createResult.data[0]?.id
        }
      }
      
      // Update customer
      if (customerId) {
        const updateResponse = await fetch('/api/customers', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: customerId,
            name: editForm.name,
            email: editForm.email,
            phone: editForm.phone || null,
            address: editForm.address || null,
            company: editForm.company || null,
            taxCode: editForm.taxCode || null,
            companyEmail: editForm.companyEmail || null,
            companyAddress: editForm.companyAddress || null,
            companyPhone: editForm.companyPhone || null,
            companyTaxCode: editForm.companyTaxCode || null,
          }),
        })
        
        const updateResult = await updateResponse.json()

        if (!updateResponse.ok || !updateResult.success) {
          throw new Error(updateResult.error || 'Không thể cập nhật thông tin')
        }
        
        // Update session first to refresh with new data
        // This ensures session has latest data before fetching profile
        if (updateSession) {
          await updateSession()
        }
        
        // Then refresh profile data to get updated info
        await fetchProfile()
        
        setIsEditing(false)
        toastSuccess(updateResult.message || 'Cập nhật thông tin thành công!')
      } else {
        throw new Error('Không tìm thấy ID khách hàng')
      }
    } catch (error: any) {
      toastError(error.message || 'Có lỗi xảy ra khi cập nhật thông tin')
      console.error('Error updating profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <MemberLayout title="Hồ sơ cá nhân">
      <div className="bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                <User className="h-10 w-10 text-indigo-900" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Hồ sơ cá nhân
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-indigo-100">
                Quản lý thông tin cá nhân của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Profile Information */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center space-x-2 mb-2">
                        <User className="h-5 w-5" />
                        <span>Thông tin cá nhân</span>
                      </CardTitle>
                      <CardDescription>
                        Quản lý thông tin cá nhân của bạn
                      </CardDescription>
                    </div>
                    {!isEditing && (
                      <Button variant="outline" onClick={handleEdit}>
                        <Edit className="h-4 w-4" />
                        Chỉnh sửa
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="mt-1"
                          disabled={Boolean(profile.pendingEmail)}
                        />
                        {!profile.pendingEmail && (
                          <p className="mt-2 text-xs text-gray-500">
                            Email hiện tại vẫn sử dụng được cho đến khi bạn xác nhận địa chỉ mới qua đường link gửi đến
                            email đó.
                          </p>
                        )}
                        {profile?.pendingEmail && (
                          <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                            <p>
                              Email mới <span className="font-semibold">{profile.pendingEmail}</span> đang chờ xác nhận.
                              Vui lòng kiểm tra hộp thư của bạn và nhấp vào liên kết xác nhận để hoàn tất thay đổi.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResendEmailChange}
                              disabled={isResendingEmailChange}
                              className="h-7 text-xs"
                            >
                              {isResendingEmailChange ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Đang gửi lại...
                                </>
                              ) : (
                                'Gửi lại email xác nhận'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Công ty</label>
                        <Input
                          value={editForm.company}
                          onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Mã số thuế</label>
                        <Input
                          value={editForm.taxCode}
                          onChange={(e) => setEditForm({...editForm, taxCode: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="h-5 w-5 text-gray-600" />
                          <h3 className="font-semibold text-gray-900">Thông tin công ty</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Quản lý thông tin công ty của bạn</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <Input
                          type="email"
                          value={editForm.companyEmail}
                          onChange={(e) => setEditForm({...editForm, companyEmail: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                        <Input
                          value={editForm.companyAddress}
                          onChange={(e) => setEditForm({...editForm, companyAddress: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                        <Input
                          value={editForm.companyPhone}
                          onChange={(e) => setEditForm({...editForm, companyPhone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Mã số thuế</label>
                        <Input
                          value={editForm.companyTaxCode}
                          onChange={(e) => setEditForm({...editForm, companyTaxCode: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSave} disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Lưu
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Họ và tên</div>
                          <div className="text-gray-900">{profile.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">Email</div>
                          <div className="text-gray-900">{profile.email}</div>
                          {profile.pendingEmail && (
                            <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                              <p>
                                Email mới <span className="font-semibold">{profile.pendingEmail}</span> đang chờ xác nhận.
                                Email hiện tại vẫn sử dụng được cho đến khi bạn xác nhận địa chỉ mới.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResendEmailChange}
                                disabled={isResendingEmailChange}
                                className="h-7 text-xs"
                              >
                                {isResendingEmailChange ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Đang gửi lại...
                                  </>
                                ) : (
                                  'Gửi lại email xác nhận'
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {profile.emailVerified && (
                        <div className="flex items-center space-x-3">
                          <CheckCircle2 className={`h-5 w-5 ${profile.emailVerified === 'YES' ? 'text-green-500' : 'text-gray-400'}`} />
                          <div className="flex-1 flex items-center space-x-2">
                            {getVerificationBadge()}
                            {profile.emailVerified !== 'YES' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSendVerificationEmail}
                                disabled={isSendingEmail}
                                className="h-7 text-xs"
                              >
                                {isSendingEmail ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Đang gửi...
                                  </>
                                ) : (
                                  'Gửi email xác thực'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                          <div className="text-gray-900">{profile.phone || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Địa chỉ</div>
                          <div className="text-gray-900">{profile.address || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Mã số thuế</div>
                          <div className="text-gray-900">{profile.taxCode || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="h-5 w-5 text-gray-600" />
                          <h3 className="font-semibold text-gray-900">Thông tin công ty</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Quản lý thông tin công ty của bạn</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Công ty</div>
                          <div className="text-gray-900">{profile.company || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Email</div>
                          <div className="text-gray-900">{profile.companyEmail || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Địa chỉ</div>
                          <div className="text-gray-900">{profile.companyAddress || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                          <div className="text-gray-900">{profile.companyPhone || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Mã số thuế</div>
                          <div className="text-gray-900">{profile.companyTaxCode || 'Chưa cập nhật'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Ngày tham gia</div>
                          <div className="text-gray-900">{formatDate(profile.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}