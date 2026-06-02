"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProjectGrid } from "@/components/projects/project-grid";
import type { ProjectData } from "@/components/projects/project-card";
import type { ApiRepo } from "@/lib/repo-api";
import { LANGUAGE_COLORS } from "@/lib/repo-api";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";

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

export default function WatchlistPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const { dict } = useApp();
  const t = dict.watchlist;

  const loadWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/watchlist");
      if (!response.ok) throw new Error("加载失败");
      const data = await response.json();
      const mapped = data.map(repoToProjectData);
      setProjects(mapped);
      setWatchedIds(new Set(mapped.map((p: ProjectData) => p.id)));
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleToggleWatchlist = useCallback(async (project: ProjectData) => {
    const repoId = Number(project.id);
    try {
      await fetch(`/api/watchlist?repo_id=${repoId}`, { method: "DELETE" });
      setWatchedIds((prev) => { const next = new Set(prev); next.delete(project.id); return next; });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success(`已取消收藏 ${project.name}`);
    } catch {
      toast.error("操作失败");
    }
  }, []);

  const handleAddToCompare = useCallback((project: ProjectData) => {
    const key = "repo-intel:compare-pending";
    const existing: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
    const fullName = `${project.owner}/${project.name}`;
    if (!existing.includes(fullName)) {
      existing.push(fullName);
      sessionStorage.setItem(key, JSON.stringify(existing));
    }
    toast.success(`已添加 ${project.name} 到对比列表`);
  }, []);

  const handleGenerateReport = useCallback((project: ProjectData) => {
    window.location.href = `/repo/${project.owner}/${project.name}`;
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Bookmark className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {projects.length} {t.projects}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-muted-foreground">加载中...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bookmark className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h2 className="mb-2 text-lg font-medium text-foreground">{t.emptyTitle}</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t.emptyDesc}
              </p>
              <Link
                href="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t.goDiscover}
              </Link>
            </div>
          ) : (
            <ProjectGrid
              projects={projects}
              isLoading={false}
              viewMode="grid"
              onAddToCompare={handleAddToCompare}
              onGenerateReport={handleGenerateReport}
              onToggleWatchlist={handleToggleWatchlist}
              watchedIds={watchedIds}
            />
          )}
        </main>
      </div>
    </div>
  );
}
