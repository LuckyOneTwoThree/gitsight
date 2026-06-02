"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ProjectGrid } from "@/components/projects/project-grid";
import { GitHubRepoAnalyzer } from "@/components/repo/github-repo-analyzer";
import { Sparkline } from "@/components/charts/sparkline";
import { Badge } from "@/components/ui/badge";
import type { ProjectData } from "@/components/projects/project-card";
import type { ApiRepo } from "@/lib/repo-api";
import { LANGUAGE_COLORS } from "@/lib/repo-api";
import { toast } from "sonner";
import { Star, TrendingUp, ArrowRight } from "lucide-react";
import { useApp } from "@/components/app-provider";

const TrendingSidebar = dynamic(
  () => import("@/components/dashboard/trending-sidebar").then((mod) => mod.TrendingSidebar)
);

function CompactTrendingStrip() {
  const [items, setItems] = useState<Array<{ id: string; name: string; owner: string; stars: number; starsWeek: number; starsToday: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/stats/trending?range=weekly&limit=8");
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled) return;
        setItems((payload.trending || []).map((r: Record<string, unknown>) => ({
          id: String(r.id || ""),
          name: String(r.name || ""),
          owner: String(r.owner || ""),
          stars: Number(r.stars || 0),
          starsWeek: Number(r.stars_week || 0),
          starsToday: Number(r.stars_today || 0),
        })));
      } catch { /* ignore */ }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (items.length === 0) return null;

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <section className="xl:hidden">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">实时飙升</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={`/repo/${item.owner}/${item.name}`}
            className="group flex-shrink-0 w-[130px] snap-start rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{item.owner}</span>
            </div>
            <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{item.name}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <TrendingUp className="h-3 w-3" />
                +{fmt(item.starsWeek || item.starsToday)}
              </span>
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Star className="h-3 w-3" />
                {fmt(item.stars)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function repoToProjectData(repo: ApiRepo): ProjectData {
  const synced = repo.synced_at ? new Date(repo.synced_at) : null;
  const now = Date.now();
  let lastUpdate = "未知";
  if (synced) {
    const diffMs = now - synced.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) lastUpdate = `${diffMin}分钟前`;
    else if (diffMin < 1440) lastUpdate = `${Math.floor(diffMin / 60)}小时前`;
    else lastUpdate = `${Math.floor(diffMin / 1440)}天前`;
  }

  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner,
    ownerAvatar: `https://github.com/${repo.owner}.png`,
    description: repo.description || "",
    language: repo.language || "Unknown",
    languageColor: LANGUAGE_COLORS[repo.language || ""] || "#8b8b8b",
    stars: repo.stars,
    forks: repo.forks,
    starsToday: repo.stars_today || 0,
    starsWeek: repo.stars_week || 0,
    lastUpdate,
    license: repo.license || "Unknown",
    tags: Array.isArray(repo.topics) ? repo.topics : (typeof repo.topics === "string" ? JSON.parse(repo.topics || "[]") : []),
    sparklineData: repo.sparkline_data && repo.sparkline_data.length > 0
      ? repo.sparkline_data
      : [repo.stars],
    aiSummary: repo.description || "暂无 AI 摘要",
    intelScore: repo.intel_score,
    intelGrade: repo.intel_grade,
    velocityScore: repo.velocity_score_detail,
    communityScore: repo.community_score_detail,
    maturityScore: repo.maturity_score_detail,
  };
}

export default function HomePage() {
  const router = useRouter();
  const { dict } = useApp();
  const [timeRange, setTimeRange] = useState("today");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("velocity");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [newlyTrending, setNewlyTrending] = useState<ProjectData[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadWatchlist() {
      try {
        const response = await fetch("/api/watchlist");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setWatchedIds(new Set(data.map((r: { id: number }) => String(r.id))));
      } catch {
        // silently ignore
      }
    }

    loadWatchlist();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNewlyTrending() {
      try {
        const response = await fetch("/api/projects/newly-trending?hours=24&limit=6");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setNewlyTrending(data.map(repoToProjectData));
      } catch {
        // silently ignore
      }
    }

    loadNewlyTrending();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setIsLoading(true);
      try {
        const limit = 12;
        const params = new URLSearchParams({ limit: String(limit), tab: activeTab, range: timeRange });
        if (languageFilter && languageFilter !== "all") params.set("language", languageFilter);
        const response = await fetch(`/api/projects?${params}`);
        if (!response.ok) throw new Error("加载失败");
        const payload = await response.json();
        if (cancelled) return;
        const mapped = (payload.data || []).map(repoToProjectData);
        setProjects(mapped);
        setHasMore(mapped.length >= limit);
        setLastFetchedAt(new Date());
      } catch {
        if (!cancelled) {
          setProjects([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProjects();
    return () => { cancelled = true; };
  }, [activeTab, timeRange, languageFilter]);

  const handleLoadMore = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects?limit=12&offset=${projects.length}&tab=${activeTab}&range=${timeRange}`);
      if (!response.ok) return;
      const payload = await response.json();
      const mapped = (payload.data || []).map(repoToProjectData);
      setProjects((prev) => [...prev, ...mapped]);
      setHasMore(mapped.length >= 12);
    } catch {
      toast.error("加载更多项目失败");
    }
  }, [projects.length, activeTab, timeRange]);

  const handleAddToCompare = useCallback((project: ProjectData) => {
    const key = "repo-intel:compare-pending";
    const existing: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
    const fullName = `${project.owner}/${project.name}`;
    if (!existing.includes(fullName)) {
      existing.push(fullName);
      sessionStorage.setItem(key, JSON.stringify(existing));
    }
    toast.success(`已添加 ${project.name} 到对比列表`);
    router.push("/compare");
  }, [router]);

  const handleGenerateReport = useCallback((project: ProjectData) => {
    router.push(`/repo/${project.owner}/${project.name}`);
  }, [router]);

  const handleToggleWatchlist = useCallback(async (project: ProjectData) => {
    const repoId = Number(project.id);
    const isWatched = watchedIds.has(project.id);
    try {
      if (isWatched) {
        await fetch(`/api/watchlist?repo_id=${repoId}`, { method: "DELETE" });
        setWatchedIds((prev) => { const next = new Set(prev); next.delete(project.id); return next; });
        toast.success(`已取消收藏 ${project.name}`);
      } else {
        await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo_id: repoId }) });
        setWatchedIds((prev) => new Set(prev).add(project.id));
        toast.success(`已收藏 ${project.name}`);
      }
    } catch {
      toast.error("操作失败");
    }
  }, [watchedIds]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
        <Header
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          lastFetchedAt={lastFetchedAt}
          languageFilter={languageFilter}
          onLanguageFilterChange={setLanguageFilter}
        />

        <main className="flex flex-1 gap-4 md:gap-6 p-4 md:p-6">
          <div className="flex-1 space-y-6 min-w-0">
            {/* Compact trending strip - visible only below xl */}
            <CompactTrendingStrip />

            <GitHubRepoAnalyzer />

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">数据概览</h2>
                <span className="text-xs text-muted-foreground">
                  {lastFetchedAt ? `数据更新于 ${Math.max(1, Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000))} 分钟前` : "加载中…"}
                </span>
              </div>
              <StatsCards />
            </section>

            {newlyTrending.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {dict.projectCard.newlyTrending}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {newlyTrending.map((project) => (
                    <Link
                      key={project.id}
                      href={`/repo/${project.owner}/${project.name}`}
                      className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <div className="mb-1.5 truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {project.name}
                      </div>
                      <div className="mb-2 truncate text-xs text-muted-foreground">
                        {project.owner}
                      </div>
                      <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span className="font-medium text-foreground">{project.stars >= 1000 ? `${(project.stars / 1000).toFixed(1)}k` : project.stars}</span>
                        {project.starsToday > 0 && (
                          <span className="text-primary">+{project.starsToday}</span>
                        )}
                      </div>
                      {project.sparklineData && project.sparklineData.length > 1 && (
                        <Sparkline data={project.sparklineData} height={20} />
                      )}
                      {project.language && project.language !== "Unknown" && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 border-transparent px-1.5 py-0 text-[9px] font-medium"
                          style={{
                            backgroundColor: `${project.languageColor}20`,
                            color: project.languageColor,
                          }}
                        >
                          {project.language}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {activeTab === "velocity" && "短期飙升项目"}
                  {activeTab === "trending" && "热门项目榜单"}
                  {activeTab === "new" && "新兴黑马项目"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  共 {projects.length} 个项目
                </span>
              </div>
              <ProjectGrid
                projects={projects}
                isLoading={isLoading}
                viewMode={viewMode}
                onAddToCompare={handleAddToCompare}
                onGenerateReport={handleGenerateReport}
                onToggleWatchlist={handleToggleWatchlist}
                watchedIds={watchedIds}
              />
            </section>

            {!isLoading && projects.length > 0 && hasMore && (
              <div className="flex justify-center py-8">
                <button
                  className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  onClick={handleLoadMore}
                >
                  加载更多项目
                </button>
              </div>
            )}
          </div>

          <TrendingSidebar />
        </main>
      </div>
    </div>
  );
}
