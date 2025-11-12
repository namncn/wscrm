'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Calendar,
  Edit,
  Save,
  X,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { toastSuccess, toastError, toastFormError, toastFormSuccess } from '@/lib/toast'

export default function AdminProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isResendingEmailChange, setIsResendingEmailChange] = useState(false)
  const [emailVerified, setEmailVerified] = useState<'YES' | 'NO' | undefined>(undefined)
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    bio: '',
    pendingEmail: '',
  })

  // Store original profile for cancel functionality
  const [originalProfile, setOriginalProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    bio: '',
    pendingEmail: '',
  })

  // Ref to track if we're updating profile (prevent re-fetch during update)
  const isUpdatingRef = useRef(false)

  // Fetch user profile with emailVerified status
  const fetchUserProfile = async () => {
    // Always call API - it will find user by ID (which is in session and never changes)
    // Don't depend on session.email because email can change
    if (!session?.user) {
      setIsFetching(false)
      return
    }
    
    setIsFetching(true)
    try {
      const response = await fetch('/api/users/me')
      const result = await response.json()
      
      if (response.ok && result.success && result.data) {
        const userData = result.data
        const fetchedProfile = {
          id: userData.id || (session?.user as any)?.id || '',
          name: userData.name || session?.user?.name || '',
          email: userData.email || session?.user?.email || '',
          phone: userData.phone || '',
          company: userData.company || '',
          address: userData.address || '',
          bio: userData.bio || '',
          pendingEmail: userData.pendingEmail || '',
        }
        setProfile(fetchedProfile)
        setOriginalProfile(fetchedProfile)
        setEmailVerified(userData.emailVerified || 'NO')
      } else {
        // API returned error, use session data as fallback
        console.warn('API returned error:', result.error || 'Unknown error')
        const fallbackProfile = {
          id: (session?.user as any)?.id || '',
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          phone: '',
          company: '',
          address: '',
          bio: '',
          pendingEmail: '',
        }
        setProfile(fallbackProfile)
        setOriginalProfile(fallbackProfile)
        setEmailVerified('NO')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Fallback to session data
      const fallbackProfile = {
        id: (session?.user as any)?.id || '',
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        phone: '',
        company: '',
        address: '',
        bio: '',
        pendingEmail: '',
      }
      setProfile(fallbackProfile)
      setOriginalProfile(fallbackProfile)
      setEmailVerified('NO')
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
    
    // Don't fetch if we're currently updating profile (prevents re-fetch during save)
    if (isUpdatingRef.current) {
      return
    }
    
    // Only fetch on initial load or when status changes, not when session object reference changes
    // This prevents unnecessary re-fetches when session is updated after profile edit
    fetchUserProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]) // Only depend on status, not session to avoid re-fetch on session updates

  const handleSendVerificationEmail = async () => {
    if (!profile.id) {
      toastError('Không tìm thấy ID user')
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/users', {
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
        await fetchUserProfile()
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
    if (!profile.pendingEmail) {
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
        body: JSON.stringify({ type: 'user' }),
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
    const isVerified = emailVerified === 'YES'
    return (
      <Badge 
        variant={isVerified ? 'default' : 'outline'} 
        className={isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
      >
        {isVerified ? (
          <>
            Đã xác thực
          </>
        ) : (
          <>
            Chưa xác thực
          </>
        )}
      </Badge>
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!profile?.id) {
      toastError('Không tìm thấy ID user để cập nhật')
      return
    }

    if (!profile.name || !profile.email) {
      toastError('Tên và email là bắt buộc')
      return
    }

    setIsLoading(true)
    isUpdatingRef.current = true // Mark that we're updating to prevent re-fetch
    
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || '',
          company: profile.company || '',
          address: profile.address || '',
          bio: profile.bio || '',
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Use data from API response (includes all updated fields from database)
        // This is better than optimistic update as it ensures consistency
        let updatedProfile
        if (result.data) {
          const userData = result.data
          updatedProfile = {
            id: userData.id || profile.id,
            name: userData.name || profile.name,
            email: userData.email || profile.email,
            phone: userData.phone || '',
            company: userData.company || '',
            address: userData.address || '',
            bio: userData.bio || '',
            pendingEmail: userData.pendingEmail || '',
          }
        } else {
          // Fallback: use data we sent if API doesn't return data
          updatedProfile = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '',
            company: profile.company || '',
            address: profile.address || '',
            bio: profile.bio || '',
            pendingEmail: profile.pendingEmail || '',
          }
        }
        
        // React 18 automatically batches these state updates together
        setProfile(updatedProfile)
        setOriginalProfile(updatedProfile)
        setIsEditing(false)
        
        toastSuccess(result.message || 'Cập nhật hồ sơ thành công!')
        
        // Update session after a delay to refresh header/sidebar
        // Delay is important to avoid triggering re-render during current update cycle
        if (updateSession) {
          // Use requestIdleCallback if available for better performance, otherwise use setTimeout
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            requestIdleCallback(() => {
              updateSession().finally(() => {
                isUpdatingRef.current = false
              })
            }, { timeout: 1000 })
          } else {
            setTimeout(() => {
              updateSession().finally(() => {
                isUpdatingRef.current = false
              })
            }, 800)
          }
        } else {
          isUpdatingRef.current = false
        }
      } else {
        toastError(result.error || 'Có lỗi xảy ra khi cập nhật hồ sơ')
        isUpdatingRef.current = false
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toastError('Có lỗi xảy ra khi cập nhật hồ sơ')
      isUpdatingRef.current = false
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Restore original profile values
    setProfile(originalProfile)
    setIsEditing(false)
  }

  // Only show loading screen on initial load (when status is loading), not when fetching or updating
  // This prevents flickering/flashing when saving profile
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải hồ sơ...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-primary bg-clip-text text-transparent">Hồ Sơ Cá Nhân</h1>
            <p className="text-gray-600 mt-1">Quản lý thông tin cá nhân và cài đặt tài khoản</p>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                  Hủy
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                // Save current state before editing
                setOriginalProfile({ ...profile })
                setIsEditing(true)
              }}>
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{profile.name}</CardTitle>
                <CardDescription className="flex items-center justify-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Quản trị viên</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{profile.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className={`h-4 w-4 ${emailVerified === 'YES' ? 'text-green-500' : 'text-gray-500'}`} />
                  <div className="flex items-center space-x-2">
                    {getVerificationBadge()}
                    {emailVerified !== 'YES' && (
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
                <div className="flex items-center space-x-3">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Tham gia: {new Date().toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Cập nhật thông tin cá nhân của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing || Boolean(profile.pendingEmail)}
                    />
                    {!profile.pendingEmail && (
                      <p className="mt-2 text-xs text-gray-500">
                        Email hiện tại vẫn sử dụng được cho đến khi bạn xác nhận địa chỉ mới qua email được gửi đến bạn.
                      </p>
                    )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Công ty</Label>
                    <Input
                      id="company"
                      value={profile.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Nhập tên công ty"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Nhập địa chỉ"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Giới thiệu</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Giới thiệu về bản thân"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
