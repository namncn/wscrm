'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleSignOut = async () => {
      await signOut({ redirect: false })
      router.push('/auth/signin')
    }
    
    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Đang đăng xuất...</p>
      </div>
    </div>
  )
}
