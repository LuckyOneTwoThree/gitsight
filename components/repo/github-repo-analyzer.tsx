"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Github, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ResolveRepoResponse } from "@/lib/repo-api"
import { useApp } from "@/components/app-provider"

export function GitHubRepoAnalyzer() {
  const router = useRouter()
  const { dict } = useApp()
  const t = dict.repo
  const [url, setUrl] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = url.trim()
    if (!value) return

    setIsResolving(true)
    setError(null)

    try {
      const response = await fetch("/api/repos/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: value }),
      })

      if (!response.ok) {
        throw new Error(t.notConfiguredDesc)
      }

      const repo = (await response.json()) as ResolveRepoResponse
      router.push(`/repo/${repo.owner}/${repo.name}`)
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : dict.common.error)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Github className="h-5 w-5 text-primary" />
          </div>
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={dict.compare.pasteHint}
            className="h-10"
          />
        </div>
        <Button type="submit" disabled={isResolving || !url.trim()} className="gap-2 md:w-36">
          {isResolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {t.generateFast}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  )
}

