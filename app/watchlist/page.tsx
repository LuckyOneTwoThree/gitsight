"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProjectGrid } from "@/components/projects/project-grid";
import type { ProjectData } from "@/components/projects/project-card";
import { repoToProjectData } from "@/lib/repo-api";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";

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
      if (!response.ok) throw new Error(dict.common.loadingFailed);
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
      toast.success(`${dict.discover.removedFromWatchlist} ${project.name}`);
    } catch {
      toast.error(dict.common.operationFailed);
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
    toast.success(`${dict.discover.addedToCompare} ${project.name}`);
  }, []);

  const handleGenerateReport = useCallback((project: ProjectData) => {
    window.location.href = `/repo/${project.owner}/${project.name}`;
  }, []);

  return (
    <>
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
              <span className="text-muted-foreground">{dict.common.loading}</span>
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
    </>
  );
}
