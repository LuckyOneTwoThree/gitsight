"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"
import { useApp } from "@/components/app-provider"

export default function NotFound() {
  const { dict } = useApp()
  const t = dict.notFound

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.description2}
        </p>
      </div>
      <Button asChild>
        <Link href="/">{t.backToHome}</Link>
      </Button>
    </div>
  )
}
