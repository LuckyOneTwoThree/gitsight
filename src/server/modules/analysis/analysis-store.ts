import { readStore, updateStore, loadReportContentByKey, invalidateStoreCache, saveReportContentToDb } from "@/src/server/lib/file-store"
import {
  type AnalysisJobRecord,
  analysisSectionTypes,
  type AnalysisLanguage,
  type AnalysisMode,
  type AnalysisReportRecord,
  type AnalysisSectionType,
} from "./types"
import { PROMPT_VERSION } from "./prompt-builder"

export function findReportByContentKey(
  repoId: number,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode,
  language: AnalysisLanguage
) {
  return readStore().analysis_reports.find((item) => {
    return item.repo_id === repoId &&
      item.section_type === sectionType &&
      item.mode === mode &&
      item.language === language
  }) || null
}

export function listAnalysisReports(
  repoId: number,
  mode: AnalysisMode = "deep",
  language: AnalysisLanguage = "zh"
) {
  return analysisSectionTypes.map((sectionType) => {
    const report = findReportByContentKey(repoId, sectionType, mode, language)
    if (!report) {
      return createPlaceholder(repoId, sectionType, mode, language)
    }

    if (report.prompt_version && report.prompt_version !== PROMPT_VERSION) {
      return { ...report, is_stale: true }
    }

    return report
  })
}

/** 按需加载报告完整内容（从 DB 单独查询，避免全量加载） */
export function findAnalysisReport(
  repoId: number,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode = "deep",
  language: AnalysisLanguage = "zh"
): AnalysisReportRecord | null {
  const result = loadReportContentByKey(repoId, sectionType, mode, language)
  if (!result) return null

  const { report } = result

  if (report.prompt_version && report.prompt_version !== PROMPT_VERSION) {
    return { ...report, is_stale: true }
  }

  return report
}

export function findReusableAnalysisReport(
  repoId: number,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode = "deep",
  language: AnalysisLanguage = "zh"
) {
  // 先查元数据确认状态
  const meta = findReportByContentKey(repoId, sectionType, mode, language)
  if (!meta || meta.status !== "cached" || !meta.prompt_version || meta.prompt_version !== PROMPT_VERSION) {
    return null
  }

  // 确认可用后再加载完整内容
  const result = loadReportContentByKey(repoId, sectionType, mode, language)
  if (!result || !result.content) return null

  return result.report
}

export async function upsertAnalysisReport(report: AnalysisReportRecord) {
  const result = await updateStore((store) => {
    const index = store.analysis_reports.findIndex((item) => {
      return item.repo_id === report.repo_id &&
        item.section_type === report.section_type &&
        item.mode === report.mode &&
        item.language === report.language
    })

    // Store as meta (content excluded from cache, loaded on-demand via loadReportContentByKey)
    const meta: typeof store.analysis_reports[number] = {
      ...report,
      content: null,
    }

    if (index >= 0) {
      store.analysis_reports[index] = meta
    } else {
      store.analysis_reports.push(meta)
    }

    return report
  })

  // Save content directly to DB (bypass cache)
  if (report.content) {
    saveReportContentToDb(report.id, report.content)
  }

  return result
}

export async function createGeneratingReport({
  repoId,
  sectionType,
  mode,
  language,
}: {
  repoId: number
  sectionType: AnalysisSectionType
  mode: AnalysisMode
  language: AnalysisLanguage
}) {
  const now = new Date().toISOString()
  const existing = findReportByContentKey(repoId, sectionType, mode, language)
  const nextId = Math.max(0, ...readStore().analysis_reports.map((report) => report.id)) + 1
  const report: AnalysisReportRecord = {
    id: existing?.id || nextId,
    repo_id: repoId,
    section_type: sectionType,
    mode,
    language,
    status: "generating",
    content: existing?.content || null,
    mermaid_code: existing?.mermaid_code || null,
    content_hash: existing?.content_hash || null,
    is_stale: existing?.is_stale || false,
    is_pro: false,
    generated_by: existing?.generated_by || null,
    prompt_version: existing?.prompt_version || null,
    token_cost: existing?.token_cost || 0,
    generated_at: existing?.generated_at || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  return await upsertAnalysisReport(report)
}

export async function markAnalysisReportFailed(
  repoId: number,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode,
  language: AnalysisLanguage
) {
  const existing = findReportByContentKey(repoId, sectionType, mode, language)
  if (!existing) return null

  return await upsertAnalysisReport({
    ...existing,
    content: null,
    status: "failed",
    updated_at: new Date().toISOString(),
  })
}

export async function createAnalysisJob(job: Omit<AnalysisJobRecord, "created_at" | "updated_at">) {
  const now = new Date().toISOString()
  const next: AnalysisJobRecord = {
    ...job,
    created_at: now,
    updated_at: now,
  }

  return await upsertAnalysisJob(next)
}

export function findAnalysisJob(id: string) {
  return readStore().analysis_jobs.find((job) => job.id === id) || null
}

export async function updateAnalysisJob(id: string, patch: Partial<Omit<AnalysisJobRecord, "id" | "created_at">>) {
  const current = findAnalysisJob(id)
  if (!current) return null

  return upsertAnalysisJob({
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  })
}

async function upsertAnalysisJob(job: AnalysisJobRecord) {
  return await updateStore((store) => {
    const index = store.analysis_jobs.findIndex((item) => item.id === job.id)
    if (index >= 0) {
      store.analysis_jobs[index] = job
    } else {
      store.analysis_jobs.push(job)
    }
    return job
  })
}

export async function createCachedReport({
  repoId,
  sectionType,
  mode,
  language,
  content,
  mermaidCode,
  generatedBy,
  tokenCost,
  promptVersion,
}: {
  repoId: number
  sectionType: AnalysisSectionType
  mode: AnalysisMode
  language: AnalysisLanguage
  content: Record<string, unknown>
  mermaidCode?: string | null
  generatedBy: string
  tokenCost: number
  promptVersion: string
}) {
  const now = new Date().toISOString()
  const existing = findReportByContentKey(repoId, sectionType, mode, language)
  const nextId = Math.max(0, ...readStore().analysis_reports.map((report) => report.id)) + 1
  const report: AnalysisReportRecord = {
    id: existing?.id || nextId,
    repo_id: repoId,
    section_type: sectionType,
    mode,
    language,
    status: "cached",
    content,
    mermaid_code: mermaidCode || null,
    content_hash: null,
    is_stale: false,
    is_pro: false,
    generated_by: generatedBy,
    prompt_version: promptVersion,
    token_cost: tokenCost,
    generated_at: now,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  return await upsertAnalysisReport(report)
}

function createPlaceholder(
  repoId: number,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode,
  language: AnalysisLanguage
): AnalysisReportRecord {
  const now = new Date().toISOString()

  return {
    id: 0,
    repo_id: repoId,
    section_type: sectionType,
    mode,
    language,
    status: "not_generated",
    content: null,
    mermaid_code: null,
    content_hash: null,
    is_stale: false,
    is_pro: false,
    generated_by: null,
    prompt_version: null,
    token_cost: 0,
    generated_at: null,
    created_at: now,
    updated_at: now,
  }
}
