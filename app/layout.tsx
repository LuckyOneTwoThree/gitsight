import type { Metadata } from 'next'
import localFont from "next/font/local"
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/components/app-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/layout/app-sidebar'
import './globals.css'

const geistSans = localFont({
  src: "./fonts/geist-sans.woff2",
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
              <div className="flex min-h-screen bg-background">
                <AppSidebar />
                <div className="main-content flex flex-1 flex-col">
                  {children}
                </div>
              </div>
              <Toaster richColors position="top-center" />
            </AppProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
