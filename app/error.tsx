"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useApp } from "@/components/app-provider"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { dict } = useApp()
  const t = dict.errorPage

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.description2}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          {t.backToHome}
        </Button>
        <Button onClick={reset}>{t.retry}</Button>
      </div>
    </div>
  )
}
