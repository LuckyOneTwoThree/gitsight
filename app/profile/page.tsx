"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, Download, FileText, GitCompare, Loader2, RotateCcw, Trash2, Zap } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useApp } from "@/components/app-provider";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceResponse {
  stats: {
    analysis_reports: number;
    compare_reports: number;
    recent_repos: number;
    active_tasks?: number;
    failed_tasks?: number;
  };
  tasks?: WorkspaceTaskItem[];
  analysis_reports: AnalysisReportItem[];
  compare_reports: CompareReportItem[];
  recent_repos: Array<{
    id: number;
    full_name: string;
    owner: string;
    name: string;
    language: string | null;
    stars: number;
    updated_at: string;
  }>;
}

type WorkspaceTaskItem = AnalysisTaskItem | CompareTaskItem;

interface AnalysisTaskItem {
  id: string;
  type: "analysis";
  repo_full_name: string;
  repo_owner: string;
  repo_name: string;
  section_type: string;
  mode: string;
  language: string;
  status: "pending" | "running" | "completed" | "failed";
  report_id: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface CompareTaskItem {
  id: string;
  type: "compare";
  repos: Array<{ owner: string; name: string }>;
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface AnalysisReportItem {
  id: number;
  repo_full_name: string;
  repo_owner: string;
  repo_name: string;
  section_type: string;
  mode: string;
  language: string;
  generated_by: string | null;
  generated_at: string | null;
  updated_at: string;
  is_stale: boolean;
}

interface CompareReportItem {
  id: string;
  repos: Array<{ owner: string; name: string }>;
  status: string;
  generated_by: string | null;
  updated_at: string;
  error: string | null;
  has_markdown: boolean;
  markdown: string | null;
}

export default function ProfilePage() {
  const { dict } = useApp();
  const t = dict.profile;
  const sectionLabels = t.reportTypeLabels as Record<string, string>;
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user/workspace");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || `${t.requestFailed} (${response.status})`);
      }
      const payload = await response.json();
      setWorkspace(payload as WorkspaceResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : dict.common.loadingFailed);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const hasActiveTasks = workspace?.tasks?.some((task) => task.status === "pending" || task.status === "running");

  useEffect(() => {
    if (!hasActiveTasks) return;

    const timer = window.setInterval(() => {
      void loadWorkspace();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [hasActiveTasks, loadWorkspace]);

  const deleteAnalysisReport = async (id: number) => {
    await fetch(`/api/user/workspace/analysis/${id}`, { method: "DELETE" });
    void loadWorkspace();
  };

  const deleteCompareReport = async (id: string) => {
    await fetch(`/api/user/workspace/compare/${id}`, { method: "DELETE" });
    void loadWorkspace();
  };

  const retryTask = async (task: WorkspaceTaskItem) => {
    try {
      const url = task.type === "analysis"
        ? `/api/analysis/jobs/${task.id}/retry`
        : `/api/compare/analysis/${task.id}/retry`;
      const response = await fetch(url, { method: "POST" });
      if (!response.ok) {
        throw new Error(t.retryFailed);
      }
      void loadWorkspace();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : t.retryFailedShort);
    }
  };

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
                <Zap className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadWorkspace()} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dict.common.refresh}
            </Button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 grid-cols-2 xl:grid-cols-3">
            <MetricCard label={t.analysisReportsShort} value={workspace?.stats.analysis_reports ?? 0} icon={FileText} />
            <MetricCard label={t.compareReportsShort} value={workspace?.stats.compare_reports ?? 0} icon={GitCompare} />
            <MetricCard label={t.recentReposShort} value={workspace?.stats.recent_repos ?? 0} icon={BarChart3} />
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t.taskCenter}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {workspace?.stats.active_tasks || 0} {t.activeTasks} · {workspace?.stats.failed_tasks || 0} {t.failedTasks}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace?.tasks?.length ? (
                <div className="space-y-3">
                  {workspace.tasks.map((task) => (
                    <div key={`${task.type}-${task.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{task.type === "analysis" ? t.projectAnalysis : t.compareAnalysis}</Badge>
                          <span className="font-medium text-foreground">
                            {task.type === "analysis"
                              ? `${task.repo_full_name} / ${sectionLabels[task.section_type] || task.section_type}`
                              : task.repos.map((repo) => `${repo.owner}/${repo.name}`).join(" vs ")}
                          </span>
                          <Badge variant={task.status === "failed" ? "destructive" : task.status === "completed" ? "secondary" : "outline"}>
                            {getTaskStatusLabel(task.status, t)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.updatedPrefix} {formatDate(task.updated_at)}
                          {task.error ? ` · ${task.error}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {task.status === "failed" && (
                          <Button variant="outline" size="sm" onClick={() => void retryTask(task)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {dict.common.retry}
                          </Button>
                        )}
                        {task.type === "analysis" ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/repo/${task.repo_owner}/${task.repo_name}`}>{t.open}</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/compare">{t.open}</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noTasks} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">{t.recentRepos}</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace?.recent_repos.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {workspace.recent_repos.map((repo) => (
                    <Link
                      key={repo.id}
                      href={`/repo/${repo.owner}/${repo.name}`}
                      className="overflow-hidden rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="truncate font-medium text-foreground">{repo.full_name}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{repo.language || "Unknown"}</span>
                        <span>·</span>
                        <span>{repo.stars} stars</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noRecentRepos} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">{t.analysisReports}</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace?.analysis_reports.length ? (
                <div className="space-y-3">
                  {workspace.analysis_reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/repo/${report.repo_owner}/${report.repo_name}`} className="font-medium text-foreground hover:text-primary">
                            {report.repo_full_name}
                          </Link>
                          <Badge variant="secondary">{sectionLabels[report.section_type] || report.section_type}</Badge>
                          <Badge variant="outline">{report.mode}</Badge>
                          {report.is_stale && <Badge variant="outline" className="text-amber-500">{t.needRefresh}</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(report.generated_at || report.updated_at)} · {report.generated_by || "unknown"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/repo/${report.repo_owner}/${report.repo_name}`}>{t.view}</Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void deleteAnalysisReport(report.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noReports} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">{t.compareReports}</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace?.compare_reports.length ? (
                <div className="space-y-3">
                  {workspace.compare_reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {report.repos.map((repo) => `${repo.owner}/${repo.name}`).join(" vs ")}
                          </span>
                          <Badge variant={report.status === "cached" ? "secondary" : "outline"}>{report.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(report.updated_at)} · {report.generated_by || "unknown"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {report.markdown && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadTextFile("repo-comparison.md", report.markdown || "", "text/markdown")}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {t.download}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/compare">{t.continueCompare}</Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void deleteCompareReport(report.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noCompareReports} />
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getTaskStatusLabel(status: WorkspaceTaskItem["status"], t: Dictionary["profile"]) {
  const labels: Record<WorkspaceTaskItem["status"], string> = {
    pending: t.statusPending,
    running: t.statusRunning,
    completed: t.statusCompleted,
    failed: t.statusFailed,
  };

  return labels[status] || status;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
