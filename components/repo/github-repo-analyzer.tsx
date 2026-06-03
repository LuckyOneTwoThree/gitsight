"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Github, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApp } from "@/components/app-provider"

function parseGitHubUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim()
  // 匹配 github.com/owner/name 或 owner/name
  const match = trimmed.match(/(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+)/)
  if (!match) return null
  const [, owner, name] = match
  // 去掉可能的 .git 后缀
  const cleanName = name.replace(/\.git$/, "")
  if (!owner || !cleanName) return null
  return { owner, name: cleanName }
}

export function GitHubRepoAnalyzer() {
  const router = useRouter()
  const { dict } = useApp()
  const [url, setUrl] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = parseGitHubUrl(url)
    if (parsed) {
      router.push(`/repo/${parsed.owner}/${parsed.name}`)
    }
  }

  const parsed = parseGitHubUrl(url)

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
        <Button type="submit" disabled={!parsed} className="gap-2 md:w-36">
          <Search className="h-4 w-4" />
          {dict.discover.searchPlaceholder}
        </Button>
      </form>
    </section>
  )
}
