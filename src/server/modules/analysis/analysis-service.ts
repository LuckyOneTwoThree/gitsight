import { resolveRepo } from "@/src/server/modules/project/project-service"
import { collectGitHubRepoContext } from "@/src/server/modules/project/github-context"
import { generateJsonWithLlm, LlmGenerationError, LlmNotConfiguredError } from "@/src/server/lib/llm-provider"
import type { LlmConfig } from "@/src/server/lib/llm-provider"
import {
  analysisSectionTypes,
  analysisLanguages,
  type AnalysisLanguage,
  analysisModes,
  type AnalysisMode,
  type AnalysisSectionType,
} from "./types"
import {
  createCachedReport,
  createAnalysisJob,
  createGeneratingReport,
  findAnalysisReport,
  findAnalysisJob,
  findReusableAnalysisReport,
  listAnalysisReports,
  markAnalysisReportFailed,
  updateAnalysisJob,
} from "./analysis-store"
import { buildAnalysisPrompt, PROMPT_VERSION, type ReportLanguage } from "./prompt-builder"
import { extractEvidencePack } from "./evidence-extractor"
import { checkReportQuality, checkFastModeQuality } from "./quality-checker"
import { critiqueReport, type ReportCritique } from "./report-critic"

type LlmConfigOverride = Omit<LlmConfig, "contextWindow"> & { contextWindow?: number }

export async function getRepoAnalysis(
  owner: string,
  name: string,
  mode: AnalysisMode = "deep",
  language: AnalysisLanguage = "zh"
) {
  const { repo } = await resolveRepo(owner, name)

  // 返回两种 mode 的报告状态，前端按当前 mode 选择显示
  const fastReports = listAnalysisReports(repo.id, "fast", language).map(toStatusPayload)
  const deepReports = listAnalysisReports(repo.id, "deep", language).map(toStatusPayload)

  return {
    repo,
    reports: mode === "fast" ? fastReports : deepReports,
    fast_reports: fastReports,
    deep_reports: deepReports,
  }
}

export async function getAnalysisReport(
  owner: string,
  name: string,
  sectionType: AnalysisSectionType,
  mode: AnalysisMode = "deep",
  language: AnalysisLanguage = "zh"
) {
  const { repo } = await resolveRepo(owner, name)
  const report = findAnalysisReport(repo.id, sectionType, mode, language)

  return report || null
}

export async function generateAnalysisReport(
  owner: string,
  name: string,
  sectionType: AnalysisSectionType,
  lang?: ReportLanguage,
  mode: AnalysisMode = "deep",
  llmConfig?: LlmConfigOverride
) {
  const language = parseAnalysisLanguage(lang)
  const { repo } = await resolveRepo(owner, name)
  const context = await collectGitHubRepoContext(repo)
  const evidencePack = mode === "deep" ? await extractEvidencePack(sectionType, context, language) : undefined
  let prompt = buildAnalysisPrompt(sectionType, context, evidencePack, undefined, undefined, language)
  if (mode === "fast") {
    prompt = buildFastPrompt(prompt, sectionType)
  }
  let result = await generateJsonWithLlm({ ...prompt, llmConfig })

  validateReportContent(result.content, sectionType)
  let quality = evidencePack
    ? checkReportQuality(sectionType, result.content, evidencePack)
    : mode === "fast"
      ? checkFastModeQuality(sectionType, result.content)
      : null
  let critique: ReportCritique | null = null
  if (evidencePack && quality?.passed) {
    critique = await critiqueReport(sectionType, result.content, evidencePack, language)
  }

  if (mode === "deep" && evidencePack && quality && (!quality.passed || (critique && !critique.passed))) {
    const feedback = [
      ...quality.issues,
      ...quality.warnings,
      ...(critique?.issues || []),
      ...(critique?.rewrite_instructions || []),
    ]
    prompt = buildAnalysisPrompt(sectionType, context, evidencePack, feedback, undefined, language)
    const retryResult = await generateJsonWithLlm({ ...prompt, llmConfig })
    const retryQuality = checkReportQuality(sectionType, retryResult.content, evidencePack)
    const retryCritique = retryQuality.passed
      ? await critiqueReport(sectionType, retryResult.content, evidencePack, language)
      : null
    const retryScore = retryQuality.score + (retryCritique?.score || 0)
    const currentScore = quality.score + (critique?.score || 0)

    if (retryScore >= currentScore) {
      result = retryResult
      quality = retryQuality
      critique = retryCritique
    }

    validateReportContent(result.content, sectionType)
  }

  const mermaidCode = extractMermaidCode(result.content)

  const content = {
    ...result.content,
    _meta: {
      provider: result.provider,
      model: result.model,
      context_warnings: context.warnings,
      generated_from: {
        has_readme: Boolean(context.readme),
        tree_files: context.tree.length,
        config_files: context.configFiles.map((file) => file.path),
        source_files: context.sourceFiles.map((file) => file.path),
        ci_files: context.ciFiles.map((file) => file.path),
        releases: context.releases.length,
        issues: context.issues.length,
        pull_requests: context.pullRequests.length,
        contributors: context.contributors.length,
      },
      evidence_pack: evidencePack ? summarizeEvidencePackForMeta(evidencePack) : null,
      analysis_mode: mode,
      language,
      quality,
      critique,
    },
  }
  const publicReport = await createCachedReport({
    repoId: repo.id,
    sectionType,
    mode,
    language,
    content,
    mermaidCode,
    generatedBy: `${result.provider}:${result.model}`,
    tokenCost: result.tokenCost,
    promptVersion: PROMPT_VERSION,
  })

  return {
    task_id: `local-${publicReport.id}`,
    report_id: publicReport.id,
    status: "cached",
    report: publicReport,
  }
}

export async function startAnalysisReportJob(
  owner: string,
  name: string,
  sectionType: AnalysisSectionType,
  language: AnalysisLanguage,
  mode: AnalysisMode,
  llmConfig?: LlmConfigOverride
) {
  const { repo } = await resolveRepo(owner, name)
  const reusableReport = findReusableAnalysisReport(repo.id, sectionType, mode, language)
  if (reusableReport?.status === "cached" && !reusableReport.is_stale) {
    const job = await createAnalysisJob({
      id: `cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      repo_id: repo.id,
      owner,
      name,
      section_type: sectionType,
      mode,
      language,
      status: "completed",
      report_id: reusableReport.id,
      error: null,
    })

    return {
      task_id: job.id,
      report_id: reusableReport.id,
      status: "completed",
      report: reusableReport,
    }
  }

  const report = await createGeneratingReport({
    repoId: repo.id,
    sectionType,
    mode,
    language,
  })

  const job = await createAnalysisJob({
    id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    repo_id: repo.id,
    owner,
    name,
    section_type: sectionType,
    mode,
    language,
    status: "pending",
    report_id: report.id,
    error: null,
  })

  void runAnalysisReportJob(job.id, llmConfig)

  return {
    task_id: job.id,
    report_id: report.id,
    status: job.status,
    report,
  }
}

export async function getAnalysisReportJob(id: string) {
  const job = findAnalysisJob(id)
  if (!job) return null

  const report = findAnalysisReport(job.repo_id, job.section_type, job.mode, job.language)

  return {
    ...job,
    report,
  }
}

export async function retryAnalysisReportJob(id: string, llmConfig?: LlmConfigOverride) {
  const job = findAnalysisJob(id)
  if (!job) return null

  await createGeneratingReport({
    repoId: job.repo_id,
    sectionType: job.section_type,
    mode: job.mode,
    language: job.language,
  })
  const next = await updateAnalysisJob(id, {
    status: "pending",
    error: null,
    report_id: job.report_id,
  })

  void runAnalysisReportJob(id, llmConfig)
  return next
}

async function runAnalysisReportJob(id: string, llmConfig?: LlmConfigOverride) {
  const job = findAnalysisJob(id)
  if (!job) return

  await updateAnalysisJob(id, { status: "running", error: null })

  try {
    const result = await generateAnalysisReport(
      job.owner,
      job.name,
      job.section_type,
      job.language,
      job.mode,
      llmConfig
    )
    await updateAnalysisJob(id, {
      status: "completed",
      report_id: result.report_id,
    })
  } catch (error) {
    await markAnalysisReportFailed(job.repo_id, job.section_type, job.mode, job.language)
    await updateAnalysisJob(id, {
      status: "failed",
      error: classifyAnalysisJobError(error),
    })
  }
}

function classifyAnalysisJobError(error: unknown) {
  if (error instanceof LlmNotConfiguredError) {
    return "模型服务未配置，请在设置中配置可用的模型 API。"
  }

  if (error instanceof LlmGenerationError) {
    if (error.message.includes("valid JSON")) {
      return "模型返回格式异常，未能解析为结构化 JSON。请重试，或切换模型后再生成。"
    }

    if (error.message.includes("LLM request failed")) {
      return `模型服务请求失败：${error.message}`
    }

    return `模型生成失败：${error.message}`
  }

  if (error instanceof Error) {
    if (error.name === "GitHubRepositoryNotFoundError") {
      return "GitHub 仓库不存在，或当前 Token 没有访问权限。"
    }

    if (error.message.includes("GitHub")) {
      return `GitHub 数据拉取失败：${error.message}`
    }

    return error.message || "分析任务失败，请重试。"
  }

  return "分析任务失败，请重试。"
}

function buildFastPrompt(prompt: ReturnType<typeof buildAnalysisPrompt>, sectionType: AnalysisSectionType) {
  const reversePrdFastRules = sectionType === "reverse_prd"
    ? [
        "",
        "# Reverse PRD Fast Mode Shape",
        "For reverse_prd fast mode, output only these top-level sections: title, cover_summary, positioning, target_users_and_jtbd, core_user_journeys, feature_system, mvp_reverse_engineering, risks_limits_and_open_questions.",
        "Omit the deeper sections: strategic_judgment, product_experience_and_information_architecture, business_model_and_growth_path, competition_and_replacement_analysis, product_opportunity_scorecard, assumptions_and_validation_plan, metrics_framework, role_based_action_plan, final_judgment.",
      ]
    : []

  // Detect language from system prompt to reinforce in fast mode
  const isChinese = prompt.system.includes("简体中文")
  const langReminder = isChinese
    ? "重要提醒：所有自然语言内容必须使用简体中文撰写，不要使用英文。"
    : ""

  return {
    ...prompt,
    user: [
      prompt.user,
      "",
      "# Fast Mode Requirements",
      "Generate a concise but useful report in one pass.",
      "Prefer 3-5 high-signal items per list. Avoid exhaustive coverage.",
      "Do not include long nested structures unless they are essential.",
      "If evidence is limited, state uncertainty briefly instead of expanding every unknown.",
      "Because fast mode does not build a Structured Evidence Pack, use empty evidence_refs arrays instead of inventing evidence IDs.",
      "",
      "# Source Tagging (Fast Mode)",
      "Since fast mode has no evidence pack, tag the source of each claim inline using these markers:",
      "- [source: README] — directly quoted or paraphrased from the repository README or documentation",
      "- [source: metadata] — derived from repo metadata (stars, language, license, topics, etc.)",
      "- [source: inferred] — your inference or judgment based on available signals",
      "- [source: unknown] — you are uncertain and cannot determine the source",
      "Place the tag at the end of the sentence or list item it applies to. Example:",
      "  \"The project uses a plugin architecture [source: README]. It has over 10k stars [source: metadata].\"",
      "Only tag factual claims; do not tag section headers, structural labels, or your own instructions.",
      ...reversePrdFastRules,
      ...(langReminder ? ["", langReminder] : []),
    ].join("\n"),
    temperature: Math.min(prompt.temperature ?? 0.2, 0.12),
  }
}

function summarizeEvidencePackForMeta(evidencePack: Awaited<ReturnType<typeof extractEvidencePack>>) {
  return {
    section_type: evidencePack.section_type,
    repository: evidencePack.repository,
    confirmed_facts: evidencePack.confirmed_facts.length,
    inferred_signals: evidencePack.inferred_signals.length,
    unknowns: evidencePack.unknowns.length,
    evidence_catalog: evidencePack.evidence_catalog.map((item) => ({
      id: item.id,
      source_type: item.source_type,
      ref: item.ref,
      title: item.title,
    })),
    data_coverage: evidencePack.data_coverage,
  }
}

export function parseAnalysisMode(value: string | null | undefined): AnalysisMode {
  return analysisModes.includes(value as AnalysisMode) ? (value as AnalysisMode) : "deep"
}

export function parseAnalysisLanguage(value: string | null | undefined): AnalysisLanguage {
  return analysisLanguages.includes(value as AnalysisLanguage) ? (value as AnalysisLanguage) : "zh"
}

export function parseAnalysisSectionType(value: string): AnalysisSectionType | null {
  return analysisSectionTypes.includes(value as AnalysisSectionType)
    ? (value as AnalysisSectionType)
    : null
}

function toStatusPayload(report: ReturnType<typeof listAnalysisReports>[number]) {
  return {
    id: report.id,
    section_type: report.section_type,
    mode: report.mode,
    language: report.language,
    status: report.status,
    is_pro: report.is_pro,
    is_stale: report.is_stale,
    generated_at: report.generated_at,
  }
}

const requiredFieldsBySection: Record<AnalysisSectionType, string[]> = {
  tldr: ["title", "summary", "problem", "core_capabilities", "suitable_users"],
  reverse_prd: ["title", "cover_summary", "positioning", "target_users_and_jtbd", "feature_system"],
  architecture: ["title", "tech_stack", "architecture_summary", "modules"],
  code_wiki: ["title", "quickstart", "entry_points", "critical_path"],
  timeline: ["title", "mvp_scope", "milestones", "evolution_pattern"],
  tech_stack: ["title", "categories", "assessment"],
  community: ["title", "health_score", "strengths", "concerns"],
  contribution_guide: ["title", "getting_started", "contribution_areas", "pr_process"],
  supply_chain: ["title", "dependency_overview", "dependency_risks", "license_compliance"],
}

function validateReportContent(content: Record<string, unknown>, sectionType: AnalysisSectionType) {
  const requiredFields = requiredFieldsBySection[sectionType] || []
  const missingFields = requiredFields.filter((field) => {
    const value = content[field]
    return value === undefined || value === null || value === ""
  })

  if (missingFields.length > 0) {
    console.warn(
      `[AnalysisService] Report for "${sectionType}" is missing required fields: ${missingFields.join(", ")}. ` +
      `This may indicate incomplete LLM output. Proceeding with available data.`
    )
  }

  const businessKeys = Object.keys(content).filter(
    (key) => key !== "_meta" && key !== "mermaid" && key !== "title"
  )
  if (businessKeys.length === 0) {
    throw new LlmGenerationError(
      `LLM output for "${sectionType}" contains no business content (only metadata). The model likely returned an incomplete response.`
    )
  }
}

function extractMermaidCode(content: Record<string, unknown>): string | null {
  if (typeof content.mermaid === "string" && content.mermaid.trim().length > 0) {
    return content.mermaid
  }

  for (const value of Object.values(content)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      for (const [key, val] of Object.entries(obj)) {
        if (
          (key === "mermaid" || key === "flowchart" || key === "diagram") &&
          typeof val === "string" &&
          val.trim().length > 0
        ) {
          return val
        }
      }
    }
  }

  return null
}
