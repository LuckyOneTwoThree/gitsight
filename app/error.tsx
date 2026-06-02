"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">出了点问题</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          页面遇到了一个错误，请尝试刷新或返回首页。
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          返回首页
        </Button>
        <Button onClick={reset}>重试</Button>
      </div>
    </div>
  )
}
