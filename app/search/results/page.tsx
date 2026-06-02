"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SearchResultCard, type SearchResultData } from "@/components/search/search-result-card";
import { AISummaryBar } from "@/components/search/ai-summary-bar";
import { SearchSidebar, type LandscapeEntry, type CompareRecommendation } from "@/components/search/search-sidebar";
import { SemanticSearchPalette } from "@/components/search/semantic-search-palette";
import { LANGUAGE_COLORS } from "@/lib/repo-api";
import {
  Search,
  LayoutGrid,
  List,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface IntentTag {
  type: "领域" | "类别" | "特性" | "语言" | "场景" | "规模";
  value: string;
}

interface SemanticResult {
  repo: {
    id: number;
    full_name: string;
    name: string;
    owner: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    open_issues_count: number;
    watchers: number;
    license: string | null;
    topics: string[];
    stars_today: number;
    stars_week: number;
    velocity_score: number;
    intel_score: number;
    intel_grade: string;
  };
  matchScore: number;
  matchReason: string;
  aiSummary: string;
  matchedIntents: Array<{
    type: string;
    label: string;
    matched: boolean;
  }>;
}

function toSearchResultData(result: SemanticResult): SearchResultData {
  const repo = result.repo;
  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner,
    ownerAvatar: `https://avatars.githubusercontent.com/${repo.owner}`,
    description: repo.description || "",
    language: repo.language || "",
    languageColor: LANGUAGE_COLORS[repo.language || ""] || "#8b949e",
    stars: repo.stars,
    forks: repo.forks,
    starsToday: repo.stars_today,
    starsWeek: repo.stars_week,
    lastUpdate: "刚刚",
    license: repo.license || "",
    tags: (Array.isArray(repo.topics) ? repo.topics : (typeof repo.topics === "string" ? JSON.parse(repo.topics || "[]") : [])).slice(0, 5),
    sparklineData: repo.velocity_score > 0
      ? Array.from({ length: 12 }, (_, i) =>
          Math.max(0, repo.stars_week * (0.3 + 0.7 * (i / 11)))
        )
      : Array(12).fill(0),
    aiSummary: result.aiSummary,
    matchScore: result.matchScore,
    matchReason: result.matchReason,
    matchedIntents: result.matchedIntents.map((mi) => ({
      type: (mi.type as SearchResultData["matchedIntents"][number]["type"]) || "feature",
      label: mi.label,
      matched: mi.matched,
    })),
    intelScore: repo.intel_score,
    intelGrade: repo.intel_grade,
  };
}

const CACHE_KEY_PREFIX = "search_cache_";

function getCachedResults(query: string): { results: SemanticResult[]; intentTags: IntentTag[]; aiSummary: string } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + query);
    if (!raw) return null;
    return JSON.parse(raw) as { results: SemanticResult[]; intentTags: IntentTag[]; aiSummary: string };
  } catch {
    return null;
  }
}

function setCachedResults(query: string, data: { results: SemanticResult[]; intentTags: IntentTag[]; aiSummary: string }) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + query, JSON.stringify(data));
  } catch {}
}

export default function SearchResultsPage() {
  return (
    <Suspense>
      <SearchResultsContent />
    </Suspense>
  )
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [searchOpen, setSearchOpen] = useState(false);

  const [results, setResults] = useState<SemanticResult[]>([]);
  const [intentTags, setIntentTags] = useState<IntentTag[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedLandscapes, setRelatedLandscapes] = useState<LandscapeEntry[]>([]);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const cached = getCachedResults(searchQuery);
    if (cached) {
      setResults(cached.results);
      setIntentTags(cached.intentTags);
      setAiSummary(cached.aiSummary);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setIntentTags([]);
    setAiSummary("");

    try {
      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.error || "搜索失败");
      }

      const data = await response.json();
      const fetchedResults = data.results || [];
      const fetchedTags = data.intentTags || [];
      const fetchedSummary = data.aiSummary || "";

      setCachedResults(searchQuery, { results: fetchedResults, intentTags: fetchedTags, aiSummary: fetchedSummary });
      setResults(fetchedResults);
      setIntentTags(fetchedTags);
      setAiSummary(fetchedSummary);

      try {
        const historyKey = "repo-intel:search-history"
        const existing: Array<{ id: string; query: string; tags: string[]; timestamp: number; resultCount: number }> = JSON.parse(localStorage.getItem(historyKey) || "[]")
        const filtered = existing.filter((h) => h.query !== searchQuery)
        const entry = {
          id: Date.now().toString(),
          query: searchQuery,
          tags: fetchedTags.map((t: IntentTag) => `${t.type}: ${t.value}`),
          timestamp: Date.now(),
          resultCount: fetchedResults.length,
        }
        localStorage.setItem(historyKey, JSON.stringify([entry, ...filtered].slice(0, 20)))
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      doSearch(query);
    }
  }, [query, doSearch]);

  useEffect(() => {
    if (results.length === 0) {
      setRelatedLandscapes([]);
      return;
    }
    const allTopics = [...new Set(results.flatMap((r) => r.repo.topics || []))];
    if (allTopics.length === 0) return;

    fetch("/api/landscape/related-tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: allTopics }),
    })
      .then((res) => res.json())
      .then((data) => {
        const tracks = data.tracks || [];
        setRelatedLandscapes(
          tracks.map((t: { key: string; name: string; description: string; projectCount: number; trending: boolean }) => ({
            id: t.key,
            name: t.name,
            projectCount: t.projectCount,
            trending: t.trending,
            description: t.description,
          }))
        );
      })
      .catch(() => {});
  }, [results]);

  const compareRecommendation: CompareRecommendation = useMemo(() => {
    if (results.length < 2) return { projects: [], reason: "" };

    const topResults = results.slice(0, 10);
    const languageGroups = new Map<string, SemanticResult[]>();
    for (const r of topResults) {
      const lang = r.repo.language || "Unknown";
      const group = languageGroups.get(lang) || [];
      group.push(r);
      languageGroups.set(lang, group);
    }

    let candidates: SemanticResult[] = [];
    for (const [, group] of languageGroups) {
      if (group.length >= 2) {
        candidates = group;
        break;
      }
    }

    if (candidates.length < 2) {
      candidates = topResults.slice(0, 3);
    }

    const selected = candidates.slice(0, 3);
    const lang = selected[0].repo.language || "Unknown";
    const sharedTopics = selected
      .flatMap((r) => r.repo.topics || [])
      .reduce((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    const commonTopics = Object.entries(sharedTopics)
      .filter(([, count]) => count >= 2)
      .map(([topic]) => topic)
      .slice(0, 3);

    const reasonParts: string[] = [];
    reasonParts.push(`均为 ${lang} 项目`);
    if (commonTopics.length > 0) {
      reasonParts.push(`共同关注 ${commonTopics.join("、")}`);
    }
    const starRange = `${Math.min(...selected.map((r) => r.repo.stars)).toLocaleString()}~${Math.max(...selected.map((r) => r.repo.stars)).toLocaleString()}`;
    reasonParts.push(`Star 量级 ${starRange}`);
    reasonParts.push("适合横向对比技术选型");

    return {
      projects: selected.map((r) => ({
        id: String(r.repo.id),
        name: r.repo.name,
        owner: r.repo.owner,
        avatar: `https://avatars.githubusercontent.com/${r.repo.owner}`,
        matchScore: r.matchScore,
      })),
      reason: reasonParts.join("，"),
    };
  }, [results]);

  const relatedTopics = useMemo(() => {
    const topicCount = new Map<string, number>();
    for (const r of results) {
      for (const t of r.repo.topics || []) {
        topicCount.set(t, (topicCount.get(t) || 0) + 1);
      }
    }
    return [...topicCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [results]);

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "stars":
        return b.repo.stars - a.repo.stars;
      case "trending":
        return b.repo.stars_week - a.repo.stars_week;
      case "recent":
        return b.matchScore - a.matchScore;
      default:
        return b.matchScore - a.matchScore;
    }
  });

  const searchResultCards = sortedResults.map(toSearchResultData);

  const avgMatchScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.matchScore, 0) / results.length)
    : 0;

  const topLanguages = [...new Set(results.map((r) => r.repo.language).filter(Boolean))];
  const avgStars = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.repo.stars, 0) / results.length)
    : 0;

  const insights = results.length > 0 ? {
    avgMatchScore,
    topLanguage: topLanguages.slice(0, 2).join(" / ") || "N/A",
    avgStars: avgStars >= 1000 ? `${(avgStars / 1000).toFixed(1)}k` : String(avgStars),
    recentActivity: `${Math.round(results.filter((r) => r.matchScore >= 70).length / results.length * 100)}%`,
  } : undefined;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="main-content flex flex-1 flex-col h-screen overflow-hidden">
        <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Link href="/search">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">搜索结果</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="w-80 justify-start gap-2 border-border bg-muted/50 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate text-left text-sm">{query || "搜索..."}</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 border-border" disabled>
                <SlidersHorizontal className="h-4 w-4" />
                高级筛选
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">AI 正在搜索并分析...</p>
                    <p className="mt-1 text-xs text-muted-foreground">解析意图 → 搜索 GitHub → 语义排序</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">搜索失败</p>
                    <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                  </div>
                  <Button variant="outline" onClick={() => {
                    sessionStorage.removeItem(CACHE_KEY_PREFIX + query);
                    doSearch(query);
                  }}>
                    重试
                  </Button>
                </div>
              )}

              {!isLoading && !error && results.length > 0 && (
                <>
                  <div className="mb-6">
                    <AISummaryBar
                      query={query}
                      resultCount={results.length}
                      intentTags={intentTags.map((t) => ({
                        type: t.type === "领域" ? "domain" : t.type === "类别" ? "category" : t.type === "特性" ? "feature" : t.type === "语言" ? "language" : t.type === "场景" ? "scenario" : "scale",
                        label: t.value,
                        value: t.value,
                      }))}
                      summaryText={aiSummary}
                      insights={insights}
                    />
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        找到 {results.length} 个相关项目
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40 border-border bg-muted/50">
                          <SelectValue placeholder="排序方式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">匹配度优先</SelectItem>
                          <SelectItem value="stars">Stars 最多</SelectItem>
                          <SelectItem value="trending">本周热门</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center rounded-lg border border-border bg-muted/50 p-1">
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode("grid")}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode("list")}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={cn(viewMode === "grid" ? "grid gap-4 grid-cols-1 xl:grid-cols-2" : "space-y-4")}>
                    {searchResultCards.map((result, index) => (
                      <SearchResultCard key={result.id} result={result} rank={index + 1} />
                    ))}
                  </div>
                </>
              )}

              {!isLoading && !error && query && results.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">未找到匹配的项目</p>
                    <p className="mt-1 text-xs text-muted-foreground">请尝试调整搜索条件或使用不同的关键词</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden w-72 xl:w-80 shrink-0 border-l border-border bg-background xl:block overflow-y-auto">
            <div className="p-4 md:p-6">
              <SearchSidebar
                landscapes={relatedLandscapes}
                compareRecommendation={compareRecommendation}
                relatedTopics={relatedTopics}
              />
            </div>
          </div>
        </div>

        <SemanticSearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </div>
  );
}
