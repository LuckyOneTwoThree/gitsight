"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Clock3, Loader2, X } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"

interface WorkspaceTask {
  id: string
  type: "analysis" | "compare"
  status: "pending" | "running" | "completed" | "failed"
}

interface WorkspaceResponse {
  stats: {
    active_tasks?: number
    failed_tasks?: number
  }
  tasks?: WorkspaceTask[]
}

export function TaskStatusBanner() {
  const { dict } = useApp()
  const t = dict.taskBanner
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  const activeCount = workspace?.stats.active_tasks || 0
  const failedCount = workspace?.stats.failed_tasks || 0
  const visibleKey = `${activeCount}:${failedCount}`
  const shouldShow = Boolean(activeCount > 0 || failedCount > 0) && dismissedKey !== visibleKey

  const label = useMemo(() => {
    if (activeCount > 0 && failedCount > 0) {
      return `${activeCount} ${t.generating}, ${failedCount} ${t.failed}`
    }
    if (activeCount > 0) {
      return `${activeCount} ${t.generatingInBackground}`
    }
    return `${failedCount} ${t.generationFailed}`
  }, [activeCount, failedCount])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      try {
        const response = await fetch("/api/user/workspace")
        if (!response.ok) return
        const payload = (await response.json()) as WorkspaceResponse
        if (!cancelled) {
          setWorkspace(payload)
        }
      } catch {
        // The banner is auxiliary. Keep the main app quiet if sync fails.
      }
    }

    void loadWorkspace()
    const timer = window.setInterval(loadWorkspace, activeCount > 0 ? 2500 : 8000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeCount])

  useEffect(() => {
    if (activeCount > 0 || failedCount > 0) {
      setDismissedKey(null)
    }
  }, [visibleKey, activeCount, failedCount])

  if (!shouldShow) return null

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(380px,calc(100vw-2rem))] rounded-md border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          {activeCount > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            {t.syncing}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" asChild>
              <Link href="/profile">{t.viewTaskCenter}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDismissedKey(visibleKey)}>
              {t.dismissTemporarily}
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setDismissedKey(visibleKey)}
          aria-label={t.dismissTemporarily}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
