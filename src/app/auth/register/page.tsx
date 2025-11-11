'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, UserPlus, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const userType = 'customer' // Only allow customer registration on public page

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error and success when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ và tên')
      return false
    }

    if (!formData.email.trim()) {
      setError('Vui lòng nhập email')
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ')
      return false
    }

    if (!formData.password) {
      setError('Vui lòng nhập mật khẩu')
      return false
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Register user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          userType: userType
        }),
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json()
        throw new Error(errorData.error || 'Không thể đăng ký tài khoản')
      }

      setSuccess('Đăng ký thành công, vui lòng click vào link xác nhận tài khoản đã được gửi vào trong Email.')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      })

      // Redirect to signin page after a short delay
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi, vui lòng thử lại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Đăng ký tài khoản
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Tạo tài khoản mới để sử dụng dịch vụ của chúng tôi
          </p>
        </div>
        
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Đăng ký</span>
            </CardTitle>
            <CardDescription>
              Điền thông tin để tạo tài khoản khách hàng mới
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {success && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{success}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
                <p className="text-xs text-gray-500">
                  Mật khẩu phải có ít nhất 6 ký tự
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Đăng ký
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800 font-medium">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

