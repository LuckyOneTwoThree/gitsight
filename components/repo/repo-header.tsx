"use client"

import { Star, GitFork, Eye, ExternalLink, Users, Clock, Tag, ArrowLeft, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkline } from "@/components/charts/sparkline"
import { cn } from "@/lib/utils"
import type { RepoDetail } from "@/lib/analysis-sections"
import { useApp } from "@/components/app-provider"

interface RepoHeaderProps {
  repo: RepoDetail | null
  isLoading?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  isWatched?: boolean
  onToggleWatch?: () => void
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k"
  }
  return num.toString()
}

export function RepoHeader({ repo, isLoading, collapsed, onToggleCollapse, isWatched, onToggleWatch }: RepoHeaderProps) {
  const router = useRouter()
  const { dict } = useApp()
  const t = dict.repoHeader

  if (isLoading || !repo) {
    return (
      <div className="shrink-0 border-b border-border bg-card/50 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasRealStarHistory = repo.hasStarHistory === true && repo.starHistory.length > 1

  return (
    <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Compact bar — always visible, identity only */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-lg shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative h-8 w-8 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
            <img
              src={repo.ownerAvatar}
              alt={repo.owner}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="min-w-0 text-sm font-semibold text-foreground truncate">
            <span className="text-muted-foreground">{repo.owner}</span>
            <span className="text-muted-foreground/60 mx-1">/</span>
            <span>{repo.name}</span>
          </h1>
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-muted-foreground hover:text-foreground shrink-0 px-1.5" asChild>
            <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 gap-1 shrink-0 px-1.5", isWatched ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-foreground")}
            onClick={onToggleWatch}
          >
            {isWatched ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </Button>
          {collapsed && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span>{formatNumber(repo.stars)}</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" />
              {dict.common.edit}
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300" />
              {dict.common.close}
            </>
          )}
        </Button>
      </div>

      {/* Expandable details — CSS Grid rows animation */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 md:px-6 pb-5 pt-2">
            {/* Main content: left info + right trend */}
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              {/* Left: Description + Stats + Topics */}
              <div className="flex-1 min-w-0">
                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 max-w-3xl">
                  {repo.description}
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mb-4">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{formatNumber(repo.stars)}</span>
                    <span className="text-xs text-muted-foreground">{t.stars}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <GitFork className="h-4 w-4" />
                    <span>{formatNumber(repo.forks)}</span>
                    <span className="text-xs text-muted-foreground">{t.forks}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{formatNumber(repo.watchers)}</span>
                    <span className="text-xs text-muted-foreground">watchers</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{repo.contributors}</span>
                    <span className="text-xs text-muted-foreground">{dict.landscape.contributors}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>{repo.language}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal">
                    {repo.license}
                  </Badge>
                </div>

                {/* Topics */}
                <div className="flex items-center gap-2 flex-wrap">
                  {repo.topics.slice(0, 8).map((topic) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="text-xs font-normal bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                    >
                      {topic}
                    </Badge>
                  ))}
                  {repo.topics.length > 8 && (
                    <span className="text-xs text-muted-foreground">+{repo.topics.length - 8}</span>
                  )}
                </div>
              </div>

              {/* Right: Star trend / Sync status + Release info */}
              <div className="flex shrink-0 flex-col gap-3 xl:items-end">
                {hasRealStarHistory ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2 border border-border">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-0.5">{dict.repo.starHistory}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-success">
                          {formatNumber(repo.starHistory.at(-1)! - repo.starHistory[0])}
                        </span>
                        <span className="text-xs text-muted-foreground">+</span>
                      </div>
                    </div>
                    <div className="w-24 h-8">
                      <Sparkline data={repo.starHistory} color="var(--success)" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-right">
                    <div className="text-xs text-muted-foreground">{dict.common.active}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{dict.statusPanel.running}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {dict.dashboard.starTrendEmpty}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{repo.lastRelease}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t.lastUpdated} {repo.lastReleaseDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
