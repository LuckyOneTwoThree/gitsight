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
  title: '开源情报与智能分析中台 | GitHub Intelligence Hub',
  description: 'AI驱动的开源项目情报中台，发现热门项目、深度解析技术架构、洞察行业赛道',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
