import { getEvidenceIdSet, type EvidencePack } from "./evidence-extractor"
import type { AnalysisSectionType } from "./types"

export interface ReportQualityResult {
  passed: boolean
  score: number
  issues: string[]
  warnings: string[]
  metrics: {
    evidence_refs_count: number
    invalid_evidence_refs_count: number
    confidence_count: number
    unknowns_or_limits_present: boolean
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

const unsupportedClaimPatterns = [
  {
    pattern: /(commit history|git log|完整提交历史|提交历史|提交记录)/i,
    blockedWhen: () => true,
    message: "报告声称分析了完整 commit/提交历史，但当前上下文没有完整提交历史。",
  },
  {
    pattern: /(average response|response time|review time|SLA|平均响应|响应时间|响应速度|评审时间)/i,
    blockedWhen: (evidence: EvidencePack) => evidence.data_coverage.issues === 0 && evidence.data_coverage.pull_requests === 0,
    message: "报告涉及响应速度或评审时间，但没有 issue/PR 摘要可支撑。",
  },
  {
    pattern: /(maintainer activity|contributor activity|核心维护者|维护者活跃度|贡献者活跃度)/i,
    blockedWhen: (evidence: EvidencePack) => evidence.data_coverage.contributors === 0,
    message: "报告涉及维护者或贡献者活跃度，但没有 contributors 数据可支撑。",
  },
  {
    pattern: /(release history|release cadence|版本发布|发布节奏|版本历史)/i,
    blockedWhen: (evidence: EvidencePack) => evidence.data_coverage.releases === 0,
    message: "报告涉及 release/版本历史，但没有 releases 数据可支撑。",
  },
]

export function checkReportQuality(
  sectionType: AnalysisSectionType,
  content: Record<string, unknown>,
  evidencePack: EvidencePack
): ReportQualityResult {
  const issues: string[] = []
  const warnings: string[] = []

  for (const field of requiredFieldsBySection[sectionType]) {
    const value = content[field]
    if (isEmptyValue(value)) {
      issues.push(`缺少必填字段 ${field}，或该字段为空。`)
    }
  }

  const evidenceRefs = collectEvidenceRefs(content)
  const invalidEvidenceRefs = findInvalidEvidenceRefs(evidenceRefs, evidencePack)
  if (evidenceRefs.length < minEvidenceRefs(sectionType)) {
    issues.push(`证据引用不足：仅发现 ${evidenceRefs.length} 个 evidence_refs。`)
  }

  if (invalidEvidenceRefs.length > 0) {
    issues.push(`发现不存在的 evidence_refs：${invalidEvidenceRefs.slice(0, 8).join(", ")}。`)
  }

  const confidenceCount = countKeys(content, "confidence")
  if (confidenceCount < minConfidenceMarkers(sectionType)) {
    warnings.push(`置信度标记偏少：仅发现 ${confidenceCount} 个 confidence。`)
  }

  const serialized = JSON.stringify(content)
  for (const rule of unsupportedClaimPatterns) {
    if (rule.pattern.test(serialized) && rule.blockedWhen(evidencePack)) {
      issues.push(rule.message)
    }
  }

  const unknownsOrLimitsPresent = hasUnknownOrLimit(content)
  if (!unknownsOrLimitsPresent) {
    warnings.push("报告没有明显说明未知项、限制或证据不足，可能存在过度自信。")
  }

  if (sectionType === "architecture") {
    const mermaid = findStringByKey(content, "mermaid")
    if (mermaid && !mermaid.trim().startsWith("flowchart TD")) {
      issues.push("架构报告中的 mermaid 字段必须以 flowchart TD 开头。")
    }
  }

  const score = Math.max(0, 100 - issues.length * 24 - warnings.length * 8)

  return {
    passed: issues.length === 0 && score >= 76,
    score,
    issues,
    warnings,
    metrics: {
      evidence_refs_count: evidenceRefs.length,
      invalid_evidence_refs_count: invalidEvidenceRefs.length,
      confidence_count: confidenceCount,
      unknowns_or_limits_present: unknownsOrLimitsPresent,
    },
  }
}

export interface FastModeQualityResult {
  passed: boolean
  score: number
  issues: string[]
  warnings: string[]
  metrics: {
    source_tags_count: number
    source_tag_distribution: Record<string, number>
    unknowns_or_limits_present: boolean
  }
}

const SOURCE_TAG_REGEX = /\[source:\s*(README|metadata|inferred|unknown)\]/gi

export function checkFastModeQuality(
  sectionType: AnalysisSectionType,
  content: Record<string, unknown>
): FastModeQualityResult {
  const issues: string[] = []
  const warnings: string[] = []

  for (const field of requiredFieldsBySection[sectionType]) {
    const value = content[field]
    if (isEmptyValue(value)) {
      issues.push(`缺少必填字段 ${field}，或该字段为空。`)
    }
  }

  const serialized = JSON.stringify(content)
  const sourceTagMatches = serialized.match(SOURCE_TAG_REGEX) || []
  const sourceTagsCount = sourceTagMatches.length

  const distribution: Record<string, number> = { README: 0, metadata: 0, inferred: 0, unknown: 0 }
  for (const tag of sourceTagMatches) {
    const type = tag.replace(/\[source:\s*/i, "").replace("]", "")
    const key = type.toLowerCase() as keyof typeof distribution
    if (key in distribution) distribution[key]++
  }

  if (sourceTagsCount < minSourceTags(sectionType)) {
    warnings.push(`Source tags 偏少：仅发现 ${sourceTagsCount} 个标记，建议至少 ${minSourceTags(sectionType)} 个。`)
  }

  if (distribution.unknown > sourceTagsCount * 0.5 && sourceTagsCount > 0) {
    warnings.push("超过半数 source tags 为 [source: unknown]，报告可靠性可能偏低。")
  }

  const unknownsOrLimitsPresent = hasUnknownOrLimit(content)
  if (!unknownsOrLimitsPresent) {
    warnings.push("报告没有明显说明未知项、限制或证据不足，可能存在过度自信。")
  }

  if (sectionType === "architecture") {
    const mermaid = findStringByKey(content, "mermaid")
    if (mermaid && !mermaid.trim().startsWith("flowchart TD")) {
      issues.push("架构报告中的 mermaid 字段必须以 flowchart TD 开头。")
    }
  }

  const score = Math.max(0, 100 - issues.length * 24 - warnings.length * 8)

  return {
    passed: issues.length === 0 && score >= 60,
    score,
    issues,
    warnings,
    metrics: {
      source_tags_count: sourceTagsCount,
      source_tag_distribution: distribution,
      unknowns_or_limits_present: unknownsOrLimitsPresent,
    },
  }
}

function minSourceTags(sectionType: AnalysisSectionType) {
  return sectionType === "tldr" ? 3 : 6
}

export function collectEvidenceRefs(value: unknown): string[] {
  const refs: string[] = []

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }

    if (typeof node !== "object" || node === null) return

    for (const [key, nested] of Object.entries(node as Record<string, unknown>)) {
      if (key === "evidence_refs" && Array.isArray(nested)) {
        refs.push(...nested.map(String))
      } else {
        visit(nested)
      }
    }
  }

  visit(value)
  return Array.from(new Set(refs))
}

function findInvalidEvidenceRefs(refs: string[], evidencePack: EvidencePack) {
  const validIds = getEvidenceIdSet(evidencePack)
  return refs.filter((ref) => !validIds.has(ref))
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function minEvidenceRefs(sectionType: AnalysisSectionType) {
  return sectionType === "tldr" ? 2 : 5
}

function minConfidenceMarkers(sectionType: AnalysisSectionType) {
  return sectionType === "tldr" ? 1 : 3
}

function countKeys(value: unknown, keyName: string): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countKeys(item, keyName), 0)
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>).reduce((sum, [key, nested]) => {
      return sum + (key === keyName ? 1 : 0) + countKeys(nested, keyName)
    }, 0)
  }

  return 0
}

function hasUnknownOrLimit(content: Record<string, unknown>) {
  const serialized = JSON.stringify(content)
  return /(未知|无法确认|证据不足|限制|风险|unknown|insufficient evidence|unable to confirm|risk|unknowns|limits)/i.test(serialized)
}

function findStringByKey(value: unknown, keyName: string): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keyName)
      if (found) return found
    }
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === keyName && typeof nested === "string") return nested
      const found = findStringByKey(nested, keyName)
      if (found) return found
    }
  }

  return null
}
