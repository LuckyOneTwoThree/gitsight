"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { RepoHeader } from "@/components/repo/repo-header"
import { AnalysisSidebar } from "@/components/repo/analysis-sidebar"
import { AnalysisContent } from "@/components/repo/analysis-content"
import { ANALYSIS_SECTIONS } from "@/lib/analysis-sections"
import type { AnalysisSection, RepoDetail } from "@/lib/analysis-sections"
import {
  applyAnalysisStatuses,
  backendToFrontendSection,
  frontendToBackendSection,
  toRepoDetail,
  type ApiAnalysisReport,
  type ApiAnalysisStatus,
  type ApiRepo,
  type RepoAnalysisResponse,
} from "@/lib/repo-api"
import { useApp } from "@/components/app-provider"

interface AnalysisJobResponse {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  error: string | null
  report?: ApiAnalysisReport | null
}

interface StartAnalysisResponse {
  task_id: string
  report_id: number
  status: "pending" | "running" | "completed" | "failed"
  report?: ApiAnalysisReport
}

export default function RepoDetailPage() {
  const params = useParams<{ owner: string; name: string }>()
  const { dict } = useApp()
  const t = dict.repo
  const [activeSection, setActiveSection] = useState("tldr")
  const [isLoading, setIsLoading] = useState(true)
  const [generatingSectionIds, setGeneratingSectionIds] = useState<Set<string>>(() => new Set())
  const generatingIdsRef = useRef<Set<string>>(new Set())
  const [repo, setRepo] = useState<RepoDetail | null>(null)
  const [reportsBySection, setReportsBySection] = useState<Record<string, ApiAnalysisReport>>({})
  const [error, setError] = useState<string | null>(null)
  const [reportLang, setReportLang] = useState<"zh" | "en">("zh")
  const [reportMode, setReportMode] = useState<"fast" | "deep">("fast")
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [llmConfigured, setLlmConfigured] = useState(true)
  const [isWatched, setIsWatched] = useState(false)
  // 按 mode 分别存储 sections 状态，切换 mode 时直接切换
  const [sectionsByMode, setSectionsByMode] = useState<Record<string, AnalysisSection[]>>({
    fast: ANALYSIS_SECTIONS.map((s) => ({ ...s })),
    deep: ANALYSIS_SECTIONS.map((s) => ({ ...s })),
  })
  const sections = sectionsByMode[reportMode] || ANALYSIS_SECTIONS
  const hasGeneratingSection = sections.some((section) => section.status === "generating")

  useEffect(() => {
    let cancelled = false

    async function loadRepo() {
      setIsLoading(true)
      setError(null)

      try {
        const owner = decodeURIComponent(params.owner)
        const name = decodeURIComponent(params.name)
        const repoResponse = await fetch(`/api/repos/${owner}/${name}`)

        if (!repoResponse.ok) {
          throw new Error(t.cannotLoadRepo)
        }

        const repoPayload = (await repoResponse.json()) as ApiRepo
        const analysisResponse = await fetch(`/api/repos/${owner}/${name}/analysis?mode=${reportMode}&lang=${reportLang}`)
        const analysisPayload = analysisResponse.ok
          ? ((await analysisResponse.json()) as RepoAnalysisResponse)
          : null

        fetch("/api/desktop/config")
          .then((r) => r.json())
          .then((d) => setLlmConfigured(!!d.isConfigured))
          .catch(() => {})

        if (cancelled) return

        setRepo(toRepoDetail(repoPayload))

        // Check watchlist status
        fetch(`/api/watchlist/check?repo_id=${repoPayload.id}`)
          .then((r) => r.json())
          .then((d) => { if (!cancelled) setIsWatched(!!d.watched) })
          .catch(() => {})
        if (analysisPayload) {
          const fastReports = analysisPayload.fast_reports || analysisPayload.reports
          const deepReports = analysisPayload.deep_reports || analysisPayload.reports
          const fastSections = applyAnalysisStatuses(ANALYSIS_SECTIONS.map((s) => ({ ...s })), fastReports)
          const deepSections = applyAnalysisStatuses(ANALYSIS_SECTIONS.map((s) => ({ ...s })), deepReports)
          setSectionsByMode({
            fast: fastSections,
            deep: deepSections,
          })
          // Detect sections already generating on server (e.g. retry from history page)
          // Add them to generatingSectionIds and initialize progress so the animation works
          const generatingIds = new Set<string>()
          const initProgress = (sections: AnalysisSection[]) => {
            for (const s of sections) {
              if (s.status === "generating") {
                generatingIds.add(s.id)
              }
            }
          }
          initProgress(fastSections)
          initProgress(deepSections)
          if (generatingIds.size > 0) {
            setGeneratingSectionIds(generatingIds)
            generatingIdsRef.current = generatingIds
            // Set initial progress for generating sections
            setSectionsByMode((prev) => ({
              fast: prev.fast.map((s) =>
                s.status === "generating" && !s.progress
                  ? { ...s, progress: 15, progressStage: t.generatingDeepReport }
                  : s
              ),
              deep: prev.deep.map((s) =>
                s.status === "generating" && !s.progress
                  ? { ...s, progress: 15, progressStage: t.generatingDeepReport }
                  : s
              ),
            }))
          }
        } else {
          setSectionsByMode({
            fast: ANALYSIS_SECTIONS.map((s) => ({ ...s })),
            deep: ANALYSIS_SECTIONS.map((s) => ({ ...s })),
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : dict.common.loadingFailed);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadRepo()

    return () => {
      cancelled = true
    }
  }, [params.owner, params.name])

  useEffect(() => {
    if (!repo || !hasGeneratingSection) return

    let cancelled = false
    const owner = encodeURIComponent(repo.owner)
    const name = encodeURIComponent(repo.name)

    async function refreshGeneratingStatuses() {
      try {
        const response = await fetch(`/api/repos/${owner}/${name}/analysis?mode=${reportMode}&lang=${reportLang}`)
        if (!response.ok) return
        const payload = (await response.json()) as RepoAnalysisResponse
        if (!cancelled) {
          const fastReports = payload.fast_reports || payload.reports
          const deepReports = payload.deep_reports || payload.reports
          setSectionsByMode((prev) => ({
            fast: applyAnalysisStatuses(prev.fast, fastReports, generatingIdsRef.current),
            deep: applyAnalysisStatuses(prev.deep, deepReports, generatingIdsRef.current),
          }))
          // Check if any generating sections have completed
          const completedIds: string[] = []
          const checkCompleted = (reports: ApiAnalysisStatus[]) => {
            for (const r of reports) {
              const frontendId = backendToFrontendSection[r.section_type] || r.section_type
              if (generatingIdsRef.current.has(frontendId) && r.status === "cached") {
                completedIds.push(frontendId)
              }
            }
          }
          checkCompleted(fastReports)
          checkCompleted(deepReports)
          if (completedIds.length > 0) {
            setGeneratingSectionIds((prev) => {
              const next = new Set(prev)
              for (const id of completedIds) next.delete(id)
              generatingIdsRef.current = next
              return next
            })
          }
        }
      } catch {
      }
    }

    const timer = window.setInterval(refreshGeneratingStatuses, 2500)
    refreshGeneratingStatuses()

    // Simulate progress for generating sections (handles retry-from-history scenario)
    const progressTimer = window.setInterval(() => {
      setSectionsByMode((prev) => {
        const generatingIds = generatingIdsRef.current
        if (generatingIds.size === 0) return prev
        const hasGenerating = prev.fast.some((s) => generatingIds.has(s.id) && s.status === "generating")
          || prev.deep.some((s) => generatingIds.has(s.id) && s.status === "generating")
        if (!hasGenerating) return prev

        const bump = (sections: AnalysisSection[]) =>
          sections.map((s) =>
            generatingIds.has(s.id) && s.status === "generating"
              ? { ...s, progress: Math.min((s.progress || 15) + 5, 92) }
              : s
          )
        return { fast: bump(prev.fast), deep: bump(prev.deep) }
      })
    }, 1200)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.clearInterval(progressTimer)
    }
  }, [repo, reportLang, reportMode, hasGeneratingSection])

  const activeSectionStatus = sections.find((s) => s.id === activeSection)?.status

  useEffect(() => {
    const backendSection = frontendToBackendSection[activeSection]
    const reportKey = `${activeSection}:${reportMode}:${reportLang}`
    const currentRepo = repo
    if (!currentRepo || !backendSection || activeSectionStatus !== "cached" || reportsBySection[reportKey]) return
    const resolvedRepo = currentRepo

    let cancelled = false

    async function loadReport() {
      try {
        const owner = encodeURIComponent(resolvedRepo.owner)
        const name = encodeURIComponent(resolvedRepo.name)
        const response = await fetch(`/api/repos/${owner}/${name}/analysis/${backendSection}?mode=${reportMode}&lang=${reportLang}`)
        if (!response.ok) return

        const report = (await response.json()) as ApiAnalysisReport
        if (!cancelled) {
          setReportsBySection((current) => ({
            ...current,
            [reportKey]: report,
          }))
        }
      } catch {
        // Existing demo cache can still render from local mock content.
      }
    }

    loadReport()

    return () => {
      cancelled = true
    }
  }, [activeSection, reportLang, reportMode, repo, reportsBySection, activeSectionStatus])

  const pollAnalysisJob = async (taskId: string, signal?: AbortSignal) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (signal?.aborted) throw new Error("Analysis task cancelled")
      const response = await fetch(`/api/analysis/jobs/${encodeURIComponent(taskId)}`, { signal })
      if (!response.ok) {
        throw new Error("Analysis task sync failed")
      }

      const payload = (await response.json()) as AnalysisJobResponse
      if (payload.status === "completed" && payload.report) {
        return payload.report
      }
      if (payload.status === "failed") {
        throw new Error(payload.error || "Analysis generation failed")
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1800))
    }

    throw new Error("Analysis task timed out. Please refresh later.")
  }

  const playCachedReportProgress = async (sectionId: string) => {
    const steps = [
      { progress: 18, stage: t.readingCache },
      { progress: 36, stage: t.verifyingVersion },
      { progress: 58, stage: t.bindingReport },
      { progress: 78, stage: t.syncingStatus },
      { progress: 94, stage: t.organizingReport },
    ]

    for (const step of steps) {
      await new Promise((resolve) => window.setTimeout(resolve, 850))
      setSectionsByMode((prev) => ({
        ...prev,
        [reportMode]: prev[reportMode].map((item) =>
          item.id === sectionId && item.status === "generating"
            ? { ...item, progress: step.progress, progressStage: step.stage }
            : item
        ),
      }))
    }

    await new Promise((resolve) => window.setTimeout(resolve, 650))
  }

  const handleGenerate = async (section: AnalysisSection) => {
    const backendSection = frontendToBackendSection[section.id]
    if (!repo || !backendSection) return

    setGeneratingSectionIds((current) => {
      const next = new Set(current).add(section.id)
      generatingIdsRef.current = next
      return next
    })
    setSectionsByMode((prev) => ({
      ...prev,
      [reportMode]: prev[reportMode].map((item) =>
        item.id === section.id
          ? {
              ...item,
              status: "generating",
              progress: 8,
              progressStage: reportMode === "fast" ? t.generatingFastReport : t.generatingDeepReport,
            }
          : item
      ),
    }))
    setError(null)

    const abortController = new AbortController()

    const progressTimer = window.setInterval(() => {
      setSectionsByMode((prev) => ({
        ...prev,
        [reportMode]: prev[reportMode].map((item) =>
          item.id === section.id && item.status === "generating"
            ? { ...item, progress: Math.min((item.progress || 8) + 7, 92) }
            : item
        ),
      }))
    }, 900)

    try {
      const owner = encodeURIComponent(repo.owner)
      const name = encodeURIComponent(repo.name)
      const response = await fetch(`/api/repos/${owner}/${name}/analysis/${backendSection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: reportLang, mode: reportMode }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          setLlmConfigured(false)
          toast.error(t.pleaseConfigureLlmKey, {
            action: { label: t.goToSettings, onClick: () => window.location.href = "/settings" },
          })
          return
        }
        if (response.status === 401) {
          toast.error(t.requestFailedCheckConfig)
          return
        }
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message || t.generateReportFailed)
      }

      const started = (await response.json()) as StartAnalysisResponse
      const generatedReport = started.report?.status === "cached"
        ? await playCachedReportProgress(section.id).then(() => started.report)
        : await pollAnalysisJob(started.task_id, abortController.signal)

      if (generatedReport) {
        setReportsBySection((current) => ({
          ...current,
          [`${section.id}:${reportMode}:${reportLang}`]: generatedReport,
        }))
      }

      setGeneratingSectionIds((current) => {
        const next = new Set(current)
        next.delete(section.id)
        generatingIdsRef.current = next
        return next
      })

      if (generatedReport) {
        setSectionsByMode((prev) => ({
          ...prev,
          [reportMode]: prev[reportMode].map((item) =>
            item.id === section.id
              ? {
                  ...item,
                  status: "cached",
                  progress: undefined,
                  progressStage: undefined,
                  cachedAt: generatedReport.generated_at
                    ? new Date(generatedReport.generated_at).toLocaleString()
                    : new Date().toLocaleString(),
                }
              : item
          ),
        }))
      }

      const analysisResponse = await fetch(`/api/repos/${owner}/${name}/analysis?mode=${reportMode}&lang=${reportLang}`)
      if (analysisResponse.ok) {
        const payload = (await analysisResponse.json()) as RepoAnalysisResponse
        const fastReports = payload.fast_reports || payload.reports
        const deepReports = payload.deep_reports || payload.reports
        setSectionsByMode((prev) => ({
          fast: applyAnalysisStatuses(prev.fast, fastReports),
          deep: applyAnalysisStatuses(prev.deep, deepReports),
        }))
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : dict.common.loadingFailed)
      setSectionsByMode((prev) => ({
        ...prev,
        [reportMode]: prev[reportMode].map((item) =>
          item.id === section.id
            ? {
                ...item,
                status: reportsBySection[`${section.id}:${reportMode}:${reportLang}`] ? "cached" : "not_generated",
              }
            : item
        ),
      }))
    } finally {
      window.clearInterval(progressTimer)
      abortController.abort()
      setGeneratingSectionIds((current) => {
        const next = new Set(current)
        next.delete(section.id)
        generatingIdsRef.current = next
        return next
      })
    }
  }

  const handleGenerateAll = async () => {
    if (!repo || !llmConfigured) return
    const notGenerated = sections.filter(
      (s) => s.status === "not_generated" && !generatingSectionIds.has(s.id)
    )
    if (notGenerated.length === 0) {
      toast.info(t.allReportsGeneratedOrGenerating)
      return
    }
    toast.info(`${t.startBatchGenerate} ${notGenerated.length} ${t.reportsGenerating}`)
    for (const section of notGenerated) {
      void handleGenerate(section)
      // Stagger requests to avoid overwhelming the API
      await new Promise((resolve) => window.setTimeout(resolve, 500))
    }
  }

  const activeSectionData = sections.find((section) => section.id === activeSection) || sections[0]
  const activeReport = reportsBySection[`${activeSection}:${reportMode}:${reportLang}`]
  const isActiveSectionGenerating = generatingSectionIds.has(activeSection)
  const backgroundGeneratingSections = sections.filter(
    (section) => generatingSectionIds.has(section.id) && section.id !== activeSection
  )
  const shouldShowLoadingState = isLoading || !repo || !activeSectionData

  // Keep previous report visible during mode/language transitions to avoid flash
  const displayedReportRef = useRef<ApiAnalysisReport | null>(null)
  useEffect(() => {
    if (activeReport) {
      displayedReportRef.current = activeReport
    } else if (activeSectionData?.status !== "cached") {
      // Section is not cached (different section, or deleted) — clear stale report
      displayedReportRef.current = null
    }
  }, [activeReport, activeSectionData?.status, activeSection])
  const displayedReport = activeReport || displayedReportRef.current

  const handleToggleWatch = async () => {
    if (!repo) return
    const repoId = Number(repo.id)
    try {
      if (isWatched) {
        await fetch(`/api/watchlist?repo_id=${repoId}`, { method: "DELETE" })
        setIsWatched(false)
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_id: repoId }),
        })
        setIsWatched(true)
      }
    } catch {}
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* Repo Header */}
        <RepoHeader repo={repo} isLoading={shouldShowLoadingState} collapsed={headerCollapsed} onToggleCollapse={() => setHeaderCollapsed(!headerCollapsed)} isWatched={isWatched} onToggleWatch={handleToggleWatch} />
        {error && (
          <div className="shrink-0 border-b border-border bg-destructive/10 px-4 md:px-6 py-3 text-sm text-destructive flex items-center gap-3">
            <span>{error}</span>
          </div>
        )}
        {backgroundGeneratingSections.length > 0 && (
          <div className="shrink-0 border-b border-border bg-primary/10 px-4 md:px-6 py-2 text-xs text-primary">
            {backgroundGeneratingSections.map((section) => section.name).join("、")} {t.backgroundGenerating}
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: Analysis Navigation */}
          {shouldShowLoadingState ? (
            <>
              <div className="flex w-72 shrink-0 flex-col gap-3 border-r border-border bg-card/30 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-border/50 bg-muted/30 p-3">
                    <div className="mb-2 h-3 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-full animate-pulse rounded bg-muted/70" />
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden p-4 md:p-6">
                <div className="mx-auto max-w-4xl space-y-4">
                  <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-28 w-full animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-44 w-full animate-pulse rounded-lg bg-muted/40" />
                </div>
              </div>
            </>
          ) : (
            <>
              <AnalysisSidebar
                sections={sections}
                activeSection={activeSection}
                generatingSectionIds={generatingSectionIds}
                onSectionChange={(id) => {
                  setActiveSection(id)
                  setHeaderCollapsed(true)
                }}
                onGenerateAll={handleGenerateAll}
              />
              
              {/* Right: Analysis Content */}
              <AnalysisContent
                section={activeSectionData}
                repoName={repo.name}
                onGenerate={handleGenerate}
                llmConfigured={llmConfigured}
                isGenerating={isActiveSectionGenerating}
                generatedContent={displayedReport?.content}
                generatedBy={displayedReport?.generated_by}
                generatedAt={displayedReport?.generated_at}
                reportLang={reportLang}
                onReportLangChange={setReportLang}
                reportMode={reportMode}
                onReportModeChange={setReportMode}
                reportId={displayedReport?.id}
              />
            </>
          )}
        </div>
      </div>
  )
}
