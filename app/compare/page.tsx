"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CompareHeader } from "@/components/compare/compare-header";
import { ProjectSelector } from "@/components/compare/project-selector";
import { ComparisonMatrix } from "@/components/compare/comparison-matrix";
import { CompareRadarChart } from "@/components/compare/compare-radar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildComparisonCsv, repoToComparisonProject } from "@/lib/compare-utils";
import type { ComparisonProject } from "@/lib/mock-compare-data";
import type { ApiRepo } from "@/lib/repo-api";

const compareTaskStorageKey = "repo-intel:compare-analysis-task";

interface ProjectsResponse {
  data: ApiRepo[];
}

interface CompareAnalysisJob {
  id: string;
  status: "generating" | "cached" | "failed";
  markdown: string | null;
  generated_by: string | null;
  error: string | null;
  updated_at: string;
}

export default function ComparePage() {
  const [availableProjects, setAvailableProjects] = useState<ComparisonProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<ComparisonProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [analysisTaskId, setAnalysisTaskId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<CompareAnalysisJob["status"] | null>(null);
  const [markdownReport, setMarkdownReport] = useState("");
  const [markdownProvider, setMarkdownProvider] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const isGeneratingMarkdown = analysisStatus === "generating";

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setIsLoadingProjects(true);
      setProjectError(null);

      try {
        const response = await fetch("/api/projects?limit=50");
        if (!response.ok) {
          throw new Error("无法加载已同步仓库");
        }

        const payload = (await response.json()) as ProjectsResponse;
        const projects = payload.data.map(repoToComparisonProject);

        if (cancelled) return;
        setAvailableProjects(projects);

        const pendingKey = "repo-intel:compare-pending";
        const pendingNames: string[] = JSON.parse(sessionStorage.getItem(pendingKey) || "[]");
        sessionStorage.removeItem(pendingKey);

        if (pendingNames.length > 0) {
          const pendingSet = new Set(pendingNames.map((n) => n.toLowerCase()));
          const matched = projects.filter((p) => pendingSet.has(`${p.owner}/${p.name}`.toLowerCase()));

          if (matched.length < pendingNames.length) {
            try {
              const byNamesRes = await fetch("/api/projects/by-names", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ names: pendingNames }),
              });
              if (byNamesRes.ok) {
                const byNamesPayload = (await byNamesRes.json()) as ProjectsResponse;
                const extraProjects = byNamesPayload.data.map(repoToComparisonProject);
                const existingIds = new Set(matched.map((p) => p.id));
                const newProjects = extraProjects.filter((p) => !existingIds.has(p.id));
                const allMatched = [...matched, ...newProjects];

                if (!cancelled) {
                  setSelectedProjects(allMatched);
                  const existingAvailIds = new Set(projects.map((p) => p.id));
                  const extraAvail = newProjects.filter((p) => !existingAvailIds.has(p.id));
                  if (extraAvail.length > 0) {
                    setAvailableProjects((prev) => [...extraAvail, ...prev]);
                  }
                }
                return;
              }
            } catch {}
          }

          if (!cancelled) {
            setSelectedProjects(matched);
          }
        } else {
          setSelectedProjects([]);
        }
      } catch (error) {
        if (!cancelled) {
          setProjectError(error instanceof Error ? error.message : "加载失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedTaskId = window.sessionStorage.getItem(compareTaskStorageKey);
    if (storedTaskId) {
      setAnalysisTaskId(storedTaskId);
      setAnalysisStatus("generating");
    }
  }, []);

  useEffect(() => {
    if (!analysisTaskId || analysisStatus === "cached" || analysisStatus === "failed") return;

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const maxAttempts = 80;

    async function pollTask() {
      attempts += 1;
      try {
        const response = await fetch(`/api/compare/analysis/${analysisTaskId}`);
        const payload = (await response.json().catch(() => null)) as CompareAnalysisJob | null;

        if (!response.ok || !payload) {
          throw new Error("无法同步对比分析任务状态");
        }

        if (cancelled) return;
        setAnalysisStatus(payload.status);

        if (payload.status === "cached") {
          setMarkdownReport(payload.markdown || "");
          setMarkdownProvider(payload.generated_by);
          setAnalysisError(null);
          window.sessionStorage.removeItem(compareTaskStorageKey);
          return;
        }

        if (payload.status === "failed") {
          setAnalysisError(payload.error || "生成失败");
          window.sessionStorage.removeItem(compareTaskStorageKey);
          return;
        }

        if (attempts < maxAttempts) {
          timer = window.setTimeout(pollTask, 1800);
        } else {
          setAnalysisStatus("failed");
          setAnalysisError("同步超时，请刷新页面重试。");
          window.sessionStorage.removeItem(compareTaskStorageKey);
        }
      } catch (error) {
        if (cancelled) return;
        if (attempts < maxAttempts) {
          timer = window.setTimeout(pollTask, 3000);
        } else {
          setAnalysisStatus("failed");
          setAnalysisError(error instanceof Error ? error.message : "同步失败，请刷新页面重试。");
          window.sessionStorage.removeItem(compareTaskStorageKey);
        }
      }
    }

    pollTask();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [analysisTaskId, analysisStatus]);

  const selectedRepoInputs = selectedProjects.map((project) => ({
    owner: project.owner,
    name: project.name,
  }));

  const resetReportForSelectionChange = () => {
    if (isGeneratingMarkdown) return;
    setMarkdownReport("");
    setMarkdownProvider(null);
    setAnalysisStatus(null);
    setAnalysisError(null);
  };

  const handleRemoveProject = (projectId: string) => {
    if (isGeneratingMarkdown) return;
    setSelectedProjects((prev) => prev.filter((project) => project.id !== projectId));
    resetReportForSelectionChange();
  };

  const handleAddProject = (project: ComparisonProject) => {
    if (isGeneratingMarkdown) return;
    setSelectedProjects((prev) => {
      if (prev.some((item) => item.id === project.id) || prev.length >= 6) return prev;
      return [...prev, project];
    });
    setAvailableProjects((prev) => {
      if (prev.some((item) => item.id === project.id)) return prev;
      return [project, ...prev];
    });
    resetReportForSelectionChange();
  };

  const [abortRef, setAbortRef] = useState<AbortController | null>(null);

  const handleGenerateMarkdown = async () => {
    if (selectedProjects.length < 2 || isGeneratingMarkdown) return;

    abortRef?.abort();
    const controller = new AbortController();
    setAbortRef(controller);

    setAnalysisStatus("generating");
    setAnalysisError(null);

    try {
      const response = await fetch("/api/compare/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: selectedRepoInputs }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        toast.error("请求失败，请检查配置后重试。");
        return;
      }

      if (response.status === 403) {
        toast.error("请求被拒绝，请检查配置后重试。");
        setAnalysisStatus(null);
        return;
      }

      const payload = (await response.json().catch(() => null)) as CompareAnalysisJob | null;
      if (!response.ok || !payload) {
        throw new Error((payload as { error?: { message?: string } } | null)?.error?.message || "生成对比报告失败");
      }

      setAnalysisTaskId(payload.id);
      setAnalysisStatus(payload.status);
      window.sessionStorage.setItem(compareTaskStorageKey, payload.id);
    } catch (error) {
      setAnalysisStatus("failed");
      setAnalysisError(error instanceof Error ? error.message : "生成失败");
      window.sessionStorage.removeItem(compareTaskStorageKey);
    }
  };

  const handleExport = (format: "markdown" | "csv") => {
    if (isGeneratingMarkdown) return;

    if (format === "csv") {
      downloadTextFile("repo-comparison.csv", buildComparisonCsv(selectedProjects), "text/csv");
      return;
    }

    const markdown = markdownReport || buildBasicMarkdown(selectedProjects);
    downloadTextFile("repo-comparison.md", markdown, "text/markdown");
  };

  const handleShare = () => {
    if (isGeneratingMarkdown) return;
    toast.info("分享链接后续接入，当前可先导出 Markdown。");
  };

  const handleRefresh = () => {
    if (isGeneratingMarkdown) return;
    window.location.reload();
  };

  const handleClearAll = () => {
    if (isGeneratingMarkdown) return;
    setSelectedProjects([]);
    setMarkdownReport("");
    setMarkdownProvider(null);
    setAnalysisStatus(null);
    setAnalysisError(null);
    setAnalysisTaskId(null);
    window.sessionStorage.removeItem(compareTaskStorageKey);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
        <CompareHeader
          projectCount={selectedProjects.length}
          isBusy={isGeneratingMarkdown}
          onExport={handleExport}
          onShare={handleShare}
          onRefresh={handleRefresh}
          onClearAll={handleClearAll}
        />

        {isGeneratingMarkdown && (
          <div className="shrink-0 border-b border-border bg-primary/10 px-4 md:px-6 py-2 text-xs text-primary">
            深度对比分析正在后台生成。可以切换到其他页面，回到对比工作台后会继续同步结果。
          </div>
        )}

        <main className="flex-1 space-y-6 p-4 md:p-6">
          <ProjectSelector
            selectedProjects={selectedProjects}
            availableProjects={availableProjects}
            isLoadingProjects={isLoadingProjects}
            onRemoveProject={handleRemoveProject}
            onAddProject={handleAddProject}
            maxProjects={6}
            disabled={isGeneratingMarkdown}
          />

          {projectError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {projectError}
            </div>
          )}

          {selectedProjects.length >= 2 ? (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="min-w-0">
                  <CompareRadarChart projects={selectedProjects} />
                </div>
                <div className="min-w-0">
                  <ComparisonMatrix projects={selectedProjects} />
                </div>
              </div>

              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      深度对比分析
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      当前先生成 Markdown，后续再打磨 prompt 和 PDF 版式。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {markdownProvider && (
                      <Badge variant="outline" className="text-xs">
                        {markdownProvider}
                      </Badge>
                    )}
                    {analysisStatus === "cached" && (
                      <Badge variant="secondary" className="gap-1 text-xs text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        已生成
                      </Badge>
                    )}
                    {markdownReport && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isGeneratingMarkdown}
                        onClick={() => downloadTextFile("repo-comparison.md", markdownReport, "text/markdown")}
                      >
                        <Download className="h-4 w-4" />
                        下载 MD
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={isGeneratingMarkdown}
                      onClick={handleGenerateMarkdown}
                    >
                      {isGeneratingMarkdown ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {markdownReport ? "重新生成" : "生成 Markdown"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {analysisError && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {analysisError}
                    </div>
                  )}
                  {isGeneratingMarkdown && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在生成 Markdown 报告，完成后会自动刷新预览。
                    </div>
                  )}
                  {markdownReport ? (
                    <MarkdownPreview markdown={markdownReport} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                      选择项目后点击生成，系统会产出一份 Markdown 对比报告。
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                请选择至少 2 个项目
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                可以从已同步仓库中选择，也可以直接粘贴 GitHub 地址解析加入。
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return;
    const [head, separator, ...body] = tableRows;
    tableRows = [];
    if (!head || !separator) return;

    elements.push(
      <div key={key} className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {head.map((cell) => (
                <th key={cell} className="px-3 py-2 text-left font-medium text-foreground">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("|") && line.includes("|")) {
      tableRows.push(parseTableRow(line));
      return;
    }

    flushTable(`table-${index}`);

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="mb-4 mt-1 text-2xl font-semibold text-foreground">
          {line.slice(2)}
        </h1>
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="mb-3 mt-6 text-lg font-semibold text-foreground">
          {line.slice(3)}
        </h2>
      );
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="mb-2 mt-4 text-base font-medium text-foreground">
          {line.slice(4)}
        </h3>
      );
      return;
    }

    if (line.startsWith("- ")) {
      elements.push(
        <div key={index} className="my-1 flex gap-2 text-sm leading-6 text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{line.slice(2)}</span>
        </div>
      );
      return;
    }

    if (line.trim() === "") {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    elements.push(
      <p key={index} className="my-2 text-sm leading-6 text-muted-foreground">
        {line}
      </p>
    );
  });

  flushTable("table-final");

  return (
    <div className="max-h-[620px] overflow-auto rounded-lg border border-border bg-background p-5">
      {elements}
    </div>
  );
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => !/^:?-{3,}:?$/.test(cell));
}

function buildBasicMarkdown(projects: ComparisonProject[]) {
  const rows = projects.map((project) => {
    return `| ${project.owner}/${project.name} | ${project.language} | ${project.stars} | ${project.forks} | ${project.openIssues} | ${project.license} |`;
  });

  return [
    "# 项目对比报告",
    "",
    "| 仓库 | 语言 | Stars | Forks | Open Issues | License |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...rows,
    "",
    "## 备注",
    "当前为基础对比导出，点击“生成 Markdown”可生成更完整的对比分析。",
  ].join("\n");
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
