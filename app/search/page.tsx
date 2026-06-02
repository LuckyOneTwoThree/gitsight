"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useApp } from "@/components/app-provider";
import { SemanticSearchPalette, SearchTrigger } from "@/components/search/semantic-search-palette";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  Code2,
  Database,
  Brain,
  Rocket,
  ArrowUpRight,
  History,
  Bookmark,
  Bot,
  Search as SearchIcon,
  Wrench,
  Link as LinkIcon,
  Layout,
  Server,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingItem {
  rank: number
  query: string
  growth: string
  trackKey: string
  projectCount: number
  topRepo: string
}

interface ExploreItem {
  id: string
  title: string
  description: string
  icon: string
  color: string
  projects: number
  topRepos: string[]
  trackKey: string
}

interface SearchHistoryEntry {
  id: string
  query: string
  tags: string[]
  timestamp: number
  resultCount: number
}

interface SavedSearchEntry {
  id: string
  query: string
  tags: string[]
  alerts: boolean
}

const HISTORY_KEY = "repo-intel:search-history"
const SAVED_KEY = "repo-intel:saved-searches"

function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  } catch { return [] }
}

function saveHistory(entries: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)))
}

function loadSaved(): SavedSearchEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")
  } catch { return [] }
}

function saveSaved(entries: SavedSearchEntry[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(ts).toLocaleDateString("zh-CN")
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  bot: Bot,
  search: SearchIcon,
  layout: Layout,
  server: Server,
  database: Database,
  wrench: Wrench,
  link: LinkIcon,
  sparkles: Sparkles,
  rocket: Rocket,
  zap: Zap,
  code2: Code2,
}

const growthColors = [
  "text-emerald-400",
  "text-orange-400",
  "text-blue-400",
  "text-purple-400",
  "text-pink-400",
  "text-cyan-400",
  "text-yellow-400",
  "text-red-400",
]

export default function SearchPage() {
  const router = useRouter()
  const { dict } = useApp()
  const t = dict.search
  const [searchOpen, setSearchOpen] = useState(false)
  const [trendingData, setTrendingData] = useState<TrendingItem[]>([])
  const [exploreData, setExploreData] = useState<ExploreItem[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearchEntry[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    setSearchHistory(loadHistory())
    setSavedSearches(loadSaved())
  }, [])

  useEffect(() => {
    fetch("/api/search/trending")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setTrendingData(data.data)
      })
      .catch(() => {})

    fetch("/api/search/explore")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setExploreData(data.data)
      })
      .catch(() => {})
  }, [])

  const handleTrendingClick = (item: TrendingItem) => {
    const entry: SearchHistoryEntry = {
      id: Date.now().toString(),
      query: item.query,
      tags: [item.query],
      timestamp: Date.now(),
      resultCount: item.projectCount,
    }
    const updated = [entry, ...searchHistory.filter((h) => h.query !== item.query)].slice(0, 20)
    setSearchHistory(updated)
    saveHistory(updated)
    router.push(`/search/results?q=${encodeURIComponent(item.query)}`)
  }

  const handleExploreClick = (item: ExploreItem) => {
    const entry: SearchHistoryEntry = {
      id: Date.now().toString(),
      query: item.title,
      tags: [item.title],
      timestamp: Date.now(),
      resultCount: item.projects,
    }
    const updated = [entry, ...searchHistory.filter((h) => h.query !== item.title)].slice(0, 20)
    setSearchHistory(updated)
    saveHistory(updated)
    router.push(`/search/results?q=${encodeURIComponent(item.title)}`)
  }

  const handleHistoryClick = (item: SearchHistoryEntry) => {
    router.push(`/search/results?q=${encodeURIComponent(item.query)}`)
  }

  const handleClearHistory = () => {
    setSearchHistory([])
    saveHistory([])
  }

  const handleRemoveSaved = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id)
    setSavedSearches(updated)
    saveSaved(updated)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="main-content flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Search className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SearchTrigger className="w-80" />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-foreground">
              用自然语言发现开源项目
            </h2>
            <p className="mb-6 max-w-xl text-muted-foreground">
              描述您的需求，AI
              将理解您的意图并智能匹配最相关的开源项目。支持多维度语义搜索和意图解析。
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              开始搜索
              <div className="ml-2 flex items-center gap-1">
                <Kbd className="h-5 bg-primary-foreground/20">
                  <span className="text-[10px]">⌘</span>
                </Kbd>
                <Kbd className="h-5 bg-primary-foreground/20">K</Kbd>
              </div>
            </Button>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <History className="h-4 w-4 text-muted-foreground" />
                    搜索历史
                  </CardTitle>
                  {searchHistory.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearHistory}>
                      清除全部
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {searchHistory.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      暂无搜索历史，开始搜索吧
                    </p>
                  )}
                  {searchHistory.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      className="group flex w-full items-start gap-4 rounded-lg border border-transparent bg-muted/30 p-4 text-left transition-all hover:border-border/50 hover:bg-muted/60"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {item.query}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-muted/50 text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          找到 {item.resultCount} 个相关项目
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    推荐探索方向
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {exploreData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      加载中...
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {exploreData.map((suggestion) => {
                        const IconComp = iconMap[suggestion.icon] || Sparkles
                        return (
                          <button
                            key={suggestion.id}
                            className={cn(
                              "group flex flex-col gap-3 rounded-xl border border-border/50 bg-gradient-to-br p-4 text-left transition-all hover:border-border hover:shadow-lg",
                              suggestion.color
                            )}
                            onClick={() => handleExploreClick(suggestion)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
                                <IconComp className="h-5 w-5 text-foreground" />
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-background/50 text-[10px]"
                              >
                                {suggestion.projects} 项目
                              </Badge>
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">
                                {suggestion.title}
                              </h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {suggestion.description}
                              </p>
                              {suggestion.topRepos.length > 0 && (
                                <p className="mt-2 text-[10px] text-muted-foreground/70">
                                  热门: {suggestion.topRepos.join(" · ")}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    热门搜索趋势
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {trendingData.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      加载中...
                    </p>
                  )}
                  {trendingData.map((item) => (
                    <button
                      key={item.rank}
                      className="group flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => handleTrendingClick(item)}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                          item.rank <= 3
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-sm text-foreground">
                          {item.query}
                        </span>
                        {item.topRepo && (
                          <span className="block truncate text-[10px] text-muted-foreground/70">
                            🔥 {item.topRepo}
                          </span>
                        )}
                      </div>
                      <span className={cn("shrink-0 text-xs font-medium", growthColors[(item.rank - 1) % growthColors.length])}>
                        {item.growth}
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                    收藏的搜索
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedSearches.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      暂无收藏，搜索后可收藏常用查询
                    </p>
                  )}
                  {savedSearches.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 transition-all hover:border-border hover:bg-muted/60"
                    >
                      <Bookmark className="h-4 w-4 shrink-0 text-primary" />
                      <button
                        className="flex-1 text-left text-sm text-foreground"
                        onClick={() => router.push(`/search/results?q=${encodeURIComponent(item.query)}`)}
                      >
                        {item.query}
                      </button>
                      <button
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        onClick={() => handleRemoveSaved(item.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    搜索技巧
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>使用自然语言描述需求，如"医疗领域的轻量级数据库"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>组合多个特性，如"Rust 编写的高性能 Web 框架"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>描述使用场景，如"适合初创团队的低代码平台"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      按
                      <Kbd className="mx-1 inline-flex">
                        <span className="text-[10px]">⌘</span>
                      </Kbd>
                      <Kbd className="inline-flex">K</Kbd>
                      随时唤起搜索
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <SemanticSearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
