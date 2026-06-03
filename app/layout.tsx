import type { Metadata } from 'next'
import { Geist } from "next/font/google"
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/components/app-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata: Metadata = {
  title: 'GitSight - 开源 GitHub 项目智能分析工具',
  description: 'AI 驱动的 GitHub 开源项目深度分析桌面工具 — 发现热门项目、解析技术架构、洞察行业赛道',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased bg-background`}>
        <TooltipProvider delayDuration={0}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AppProvider>
              {children}
              <Toaster richColors position="top-center" />
            </AppProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
