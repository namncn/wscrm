import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'
import { getBrandName } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: `${getBrandName()} - Quản lý Tên miền, Hosting, VPS`,
  description: `Hệ thống ${getBrandName()} quản lý khách hàng, đơn hàng, hợp đồng và dịch vụ`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}