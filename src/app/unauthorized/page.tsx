'use client'

import { useEffect } from 'react'
import { getBrandName } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const brandName = getBrandName()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Truy cập bị từ chối
          </CardTitle>
          <CardDescription className="text-gray-600">
            Bạn không có quyền truy cập vào trang này
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            <p>Chỉ có quản trị viên mới có thể truy cập vào hệ thống {brandName}.</p>
            <p className="mt-2">
              Vui lòng liên hệ với quản trị viên để được cấp quyền truy cập.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="w-4 h-4" />
              Về trang chủ
            </Button>
            
            <Button 
              onClick={() => router.push('/auth/signout')}
              className="w-full"
              variant="outline"
            >
              Đăng xuất
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}