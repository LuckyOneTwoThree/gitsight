"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { BarChart3, Download, FileText, GitCompare, Loader2, RotateCcw, Search, Trash2, Zap } from "lucide-react";
import { useApp } from "@/components/app-provider";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

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

const PAGE_SIZE = 10;

function usePagination<T>(items: T[], search: string) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return { page, setPage, totalPages, paginated };
}

export default function ProfilePage() {
  const { dict } = useApp();
  const t = dict.profile;
  const sectionLabels = t.reportTypeLabels as Record<string, string>;
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskSearch, setTaskSearch] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [compareSearch, setCompareSearch] = useState("");

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

  const filteredTasks = useMemo(() => {
    const tasks = workspace?.tasks ?? [];
    if (!taskSearch.trim()) return tasks;
    const q = taskSearch.toLowerCase();
    return tasks.filter((task) => {
      const label = task.type === "analysis"
        ? `${task.repo_full_name} ${sectionLabels[task.section_type] || task.section_type}`
        : task.repos.map((r) => `${r.owner}/${r.name}`).join(" ");
      return label.toLowerCase().includes(q);
    });
  }, [workspace?.tasks, taskSearch, sectionLabels]);

  const filteredRepos = useMemo(() => {
    const repos = workspace?.recent_repos ?? [];
    if (!repoSearch.trim()) return repos;
    const q = repoSearch.toLowerCase();
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [workspace?.recent_repos, repoSearch]);

  const filteredAnalysisReports = useMemo(() => {
    const reports = workspace?.analysis_reports ?? [];
    if (!analysisSearch.trim()) return reports;
    const q = analysisSearch.toLowerCase();
    return reports.filter((r) => r.repo_full_name.toLowerCase().includes(q));
  }, [workspace?.analysis_reports, analysisSearch]);

  const filteredCompareReports = useMemo(() => {
    const reports = workspace?.compare_reports ?? [];
    if (!compareSearch.trim()) return reports;
    const q = compareSearch.toLowerCase();
    return reports.filter((r) =>
      r.repos.map((repo) => `${repo.owner}/${repo.name}`).join(" vs ").toLowerCase().includes(q)
    );
  }, [workspace?.compare_reports, compareSearch]);

  const taskPager = usePagination(filteredTasks, taskSearch);
  const repoPager = usePagination(filteredRepos, repoSearch);
  const analysisPager = usePagination(filteredAnalysisReports, analysisSearch);
  const comparePager = usePagination(filteredCompareReports, compareSearch);

  return (
    <>
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

          <Tabs defaultValue="tasks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tasks">
                <Zap className="h-4 w-4" />
                {t.taskCenter}
              </TabsTrigger>
              <TabsTrigger value="repos">
                <BarChart3 className="h-4 w-4" />
                {t.recentRepos}
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <FileText className="h-4 w-4" />
                {t.analysisReports}
              </TabsTrigger>
              <TabsTrigger value="compare">
                <GitCompare className="h-4 w-4" />
                {t.compareReports}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t.taskCenter}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {workspace?.stats.active_tasks || 0} {t.activeTasks} · {workspace?.stats.failed_tasks || 0} {t.failedTasks}
                      </span>
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t.searchPlaceholder}
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="w-60 pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {taskPager.paginated.length ? (
                    <>
                      <div className="space-y-3">
                        {taskPager.paginated.map((task) => (
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
                                <Button variant="outline" size="sm" onClick={() => {
                                  if (task.type === "compare") {
                                    const names = task.repos.map((r: { owner: string; name: string }) => `${r.owner}/${r.name}`);
                                    sessionStorage.setItem("repo-intel:compare-pending", JSON.stringify(names));
                                  }
                                  window.location.href = "/compare";
                                }}>
                                  {t.open}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination pager={taskPager} t={t} />
                    </>
                  ) : (
                    <EmptyState text={t.noTasks} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="repos">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.recentRepos}</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t.searchRepos}
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="w-60 pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {repoPager.paginated.length ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {repoPager.paginated.map((repo) => (
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
                      <Pagination pager={repoPager} t={t} />
                    </>
                  ) : (
                    <EmptyState text={t.noRecentRepos} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.analysisReports}</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t.searchReports}
                        value={analysisSearch}
                        onChange={(e) => setAnalysisSearch(e.target.value)}
                        className="w-60 pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {analysisPager.paginated.length ? (
                    <>
                      <div className="space-y-3">
                        {analysisPager.paginated.map((report) => (
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
                      <Pagination pager={analysisPager} t={t} />
                    </>
                  ) : (
                    <EmptyState text={t.noReports} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compare">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.compareReports}</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t.searchCompare}
                        value={compareSearch}
                        onChange={(e) => setCompareSearch(e.target.value)}
                        className="w-60 pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {comparePager.paginated.length ? (
                    <>
                      <div className="space-y-3">
                        {comparePager.paginated.map((report) => (
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
                              <Button variant="outline" size="sm" onClick={() => {
                                const names = report.repos.map((r: { owner: string; name: string }) => `${r.owner}/${r.name}`);
                                sessionStorage.setItem("repo-intel:compare-pending", JSON.stringify(names));
                                window.location.href = "/compare";
                              }}>
                                {t.continueCompare}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => void deleteCompareReport(report.id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination pager={comparePager} t={t} />
                    </>
                  ) : (
                    <EmptyState text={t.noCompareReports} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
    </>
  );
}

function Pagination({ pager, t }: {
  pager: { page: number; setPage: (fn: (p: number) => number) => void; totalPages: number };
  t: Dictionary["profile"];
}) {
  if (pager.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {t.pageInfo.replace("{current}", String(pager.page)).replace("{total}", String(pager.totalPages))}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pager.page <= 1}
          onClick={() => pager.setPage((p) => p - 1)}
        >
          {t.prevPage}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pager.page >= pager.totalPages}
          onClick={() => pager.setPage((p) => p + 1)}
        >
          {t.nextPage}
        </Button>
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
