"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bookmark,
  BookmarkCheck,
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
    owner_avatar_url: string | null;
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

function toSearchResultData(result: SemanticResult, justNowLabel: string): SearchResultData {
  const repo = result.repo;
  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner,
    ownerAvatar: repo.owner_avatar_url || `https://avatars.githubusercontent.com/${repo.owner}`,
    description: repo.description || "",
    language: repo.language || "",
    languageColor: LANGUAGE_COLORS[repo.language || ""] || "#8b949e",
    stars: repo.stars,
    forks: repo.forks,
    starsToday: repo.stars_today,
    starsWeek: repo.stars_week,
    lastUpdate: justNowLabel,
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
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const { dict } = useApp();
  const t = dict.searchResults;

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [filterMinScore, setFilterMinScore] = useState(0);

  const [results, setResults] = useState<SemanticResult[]>([]);
  const [intentTags, setIntentTags] = useState<IntentTag[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedLandscapes, setRelatedLandscapes] = useState<LandscapeEntry[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const SAVED_KEY = "repo-intel:saved-searches";

  useEffect(() => {
    if (!query) { setIsSaved(false); return; }
    try {
      const saved: Array<{ id: string; query: string }> = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
      setIsSaved(saved.some((s) => s.query === query));
    } catch { setIsSaved(false); }
  }, [query]);

  const toggleSave = () => {
    try {
      const saved: Array<{ id: string; query: string; tags: string[]; alerts: boolean }> = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
      if (isSaved) {
        const updated = saved.filter((s) => s.query !== query);
        localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
        setIsSaved(false);
      } else {
        const entry = { id: Date.now().toString(), query, tags: intentTags.map((t) => `${t.type}: ${t.value}`), alerts: false };
        localStorage.setItem(SAVED_KEY, JSON.stringify([entry, ...saved]));
        setIsSaved(true);
      }
    } catch {}
  };

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
        throw new Error(data?.error?.message || data?.error || t.searchFailed);
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
      setError(err instanceof Error ? err.message : t.searchFailedRetry);
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
    reasonParts.push(t.reasonSameLang.replace("{lang}", lang));
    if (commonTopics.length > 0) {
      reasonParts.push(t.reasonCommonTopics.replace("{topics}", commonTopics.join("、")));
    }
    const starRange = `${Math.min(...selected.map((r) => r.repo.stars)).toLocaleString()}~${Math.max(...selected.map((r) => r.repo.stars)).toLocaleString()}`;
    reasonParts.push(t.reasonStarRange.replace("{range}", starRange));
    reasonParts.push(t.reasonTechSelection);

    return {
      projects: selected.map((r) => ({
        id: String(r.repo.id),
        name: r.repo.name,
        owner: r.repo.owner,
        avatar: r.repo.owner_avatar_url || `https://avatars.githubusercontent.com/${r.repo.owner}`,
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

  const filteredResults = results.filter((r) => {
    if (filterLanguages.length > 0 && !filterLanguages.includes(r.repo.language || "")) return false;
    if (filterMinScore > 0 && r.matchScore < filterMinScore) return false;
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
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

  const searchResultCards = sortedResults.map((r) => toSearchResultData(r, t.justNow));

  const allLanguages = [...new Set(results.map((r) => r.repo.language).filter(Boolean))];

  const avgMatchScore = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.matchScore, 0) / filteredResults.length)
    : 0;

  const topLanguages = allLanguages.slice(0, 2);
  const avgStars = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.repo.stars, 0) / filteredResults.length)
    : 0;

  const insights = filteredResults.length > 0 ? {
    avgMatchScore,
    topLanguage: topLanguages.join(" / ") || "N/A",
    avgStars: avgStars >= 1000 ? `${(avgStars / 1000).toFixed(1)}k` : String(avgStars),
    recentActivity: `${Math.round(filteredResults.filter((r) => r.matchScore >= 70).length / filteredResults.length * 100)}%`,
  } : undefined;

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden">
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Link href="/search">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {dict.common.back}
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">{t.title}</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="w-80 justify-start gap-2 border-border bg-muted/50 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate text-left text-sm">{query || t.searchPlaceholder}</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2 border-border", isSaved && "border-primary text-primary")}
                onClick={toggleSave}
                disabled={!query}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? t.bookmarked : t.bookmark}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2 border-border", (filterLanguages.length > 0 || filterMinScore > 0) && "border-primary text-primary")}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {dict.common.filter}
                {(filterLanguages.length > 0 || filterMinScore > 0) && (
                  <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                    {filterLanguages.length + (filterMinScore > 0 ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              {(filterLanguages.length > 0 || filterMinScore > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => { setFilterLanguages([]); setFilterMinScore(0); }}
                >
                  {dict.common.clear}
                </Button>
              )}
            </div>
          </div>
          {filterOpen && (
            <div className="border-b border-border bg-muted/30 px-4 py-3 md:px-6">
              <div className="flex flex-wrap items-center gap-4">
                {allLanguages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t.languageLabel}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {allLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setFilterLanguages((prev) =>
                            prev.includes(lang!) ? prev.filter((l) => l !== lang) : [...prev, lang!]
                          )}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-xs transition-colors",
                            filterLanguages.includes(lang!)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t.minMatchScore}</span>
                  <div className="flex gap-1.5">
                    {[0, 50, 70, 85].map((score) => (
                      <button
                        key={score}
                        onClick={() => setFilterMinScore(score)}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-xs transition-colors",
                          filterMinScore === score
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {score === 0 ? dict.common.all : `≥${score}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{t.aiSearching}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.aiSearchSteps}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{t.searchFailed}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                  </div>
                  <Button variant="outline" onClick={() => {
                    sessionStorage.removeItem(CACHE_KEY_PREFIX + query);
                    doSearch(query);
                  }}>
                    {t.retryButton}
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
                      suggestions={intentTags.length > 0 ? [
                        t.suggestionAddTechStack.replace("{value}", intentTags.find(t => t.type === "特性")?.value || "GraphQL"),
                        t.suggestionFilterLicense,
                        t.suggestionAddActivity,
                      ] : undefined}
                      relatedSearches={relatedTopics.slice(0, 5).map((t) => t.name)}
                      onRelatedSearchClick={(q) => {
                        router.push(`/search/results?q=${encodeURIComponent(q)}`);
                      }}
                    />
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {results.length} {t.foundProjects}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40 border-border bg-muted/50">
                          <SelectValue placeholder={dict.searchResults.advancedFilters} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">{t.sortRelevanceFirst}</SelectItem>
                          <SelectItem value="stars">{t.sortStarsMost}</SelectItem>
                          <SelectItem value="trending">{t.sortTrendingThisWeek}</SelectItem>
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
                    <p className="text-sm font-medium text-foreground">{t.noMatchingProjects}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.tryAdjustSearch}</p>
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
  );
}
