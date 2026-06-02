import { generateJsonWithLlm } from "@/src/server/lib/llm-provider"
import type { GitHubRepoContext } from "@/src/server/modules/project/github-context"
import type { AnalysisSectionType } from "./types"

type EvidenceLanguage = "zh" | "en"

export interface EvidencePack {
  section_type: AnalysisSectionType
  repository: string
  evidence_catalog: EvidenceCatalogItem[]
  confirmed_facts: EvidenceFact[]
  inferred_signals: EvidenceSignal[]
  unknowns: EvidenceUnknown[]
  evidence_map: EvidenceMapItem[]
  data_coverage: EvidenceDataCoverage
}

export interface EvidenceCatalogItem {
  id: string
  source_type:
    | "metadata"
    | "README"
    | "tree"
    | "config"
    | "source"
    | "ci"
    | "release"
    | "issue"
    | "pull_request"
    | "contributor"
    | "warning"
  ref: string
  title: string
  excerpt: string
}

export interface EvidenceFact {
  fact: string
  category: string
  evidence_refs: string[]
  confidence: "high" | "medium" | "low"
}

export interface EvidenceSignal {
  signal: string
  interpretation: string
  evidence_refs: string[]
  confidence: "high" | "medium" | "low"
}

export interface EvidenceUnknown {
  question: string
  reason: string
  missing_sources: string[]
}

export interface EvidenceMapItem {
  ref: string
  source_type: EvidenceCatalogItem["source_type"]
  summary: string
}

export interface EvidenceDataCoverage {
  has_readme: boolean
  tree_entries: number
  config_files: string[]
  source_files: string[]
  ci_files: string[]
  releases: number
  issues: number
  pull_requests: number
  contributors: number
  warnings: string[]
}

const sectionEvidenceFocus: Record<AnalysisSectionType, string[]> = {
  tldr: [
    "project category and positioning",
    "core product value",
    "target users and concrete scenarios",
    "risk or uncertainty that affects first impression",
  ],
  reverse_prd: [
    "positioning and differentiation",
    "target personas and jobs-to-be-done",
    "feature priority signals",
    "business model and adoption assumptions",
    "implicit product bets",
  ],
  architecture: [
    "languages, frameworks, runtime and deployment signals",
    "top-level modules and boundaries",
    "entry points and request/data flow",
    "architectural risks and missing evidence",
  ],
  code_wiki: [
    "setup commands and prerequisites",
    "entry files and reading path",
    "test/lint/build workflow",
    "developer pitfalls and missing onboarding evidence",
  ],
  timeline: [
    "release notes and roadmap signals",
    "MVP scope and feature evolution",
    "strategic pivots",
    "future direction and uncertainty",
  ],
  tech_stack: [
    "language, framework, dependency and toolchain evidence",
    "deployment and CI/CD evidence",
    "engineering maturity signals",
    "dependency and supply-chain risk",
  ],
  community: [
    "popularity and adoption signals",
    "maintenance pressure signals",
    "governance, license and contribution channels",
    "community health limits caused by missing issue/PR details",
  ],
  contribution_guide: [
    "contribution documentation",
    "local development workflow",
    "candidate contribution areas",
    "coding standards, test requirements and PR process",
  ],
  supply_chain: [
    "dependency manifest and lockfile evidence",
    "license and compliance signals",
    "maintainer and bus-factor signals",
    "vulnerability and advisory signals",
  ],
}

export async function extractEvidencePack(
  sectionType: AnalysisSectionType,
  context: GitHubRepoContext,
  lang: EvidenceLanguage = "zh"
) {
  const evidenceCatalog = buildEvidenceCatalog(context)
  const languageInstruction = lang === "en"
    ? "Write all natural-language fields in English."
    : "Write all natural-language fields in Simplified Chinese."

  const result = await generateJsonWithLlm({
    system: [
      "You are RepoIntel's evidence extraction engine.",
      "Your job is not to write the final report. Your job is to extract verifiable facts, useful signals, and explicit unknowns from the provided evidence catalog.",
      "Return only a valid JSON object.",
      "All evidence_refs must be exact IDs from evidence_catalog. Never invent evidence IDs.",
      "If a claim is not supported by evidence, put it in unknowns instead of turning it into a fact.",
      languageInstruction,
    ].join("\n"),
    user: buildEvidenceExtractionPrompt(sectionType, context, evidenceCatalog, lang),
    temperature: 0.05,
  })

  return normalizeEvidencePack(result.content, sectionType, context, evidenceCatalog)
}

export function getEvidenceIdSet(evidencePack: EvidencePack) {
  return new Set(evidencePack.evidence_catalog.map((item) => item.id))
}

export function buildEvidenceCatalog(context: GitHubRepoContext): EvidenceCatalogItem[] {
  const items: EvidenceCatalogItem[] = []

  items.push({
    id: "metadata:repo",
    source_type: "metadata",
    ref: "repo.metadata",
    title: "GitHub repository metadata",
    excerpt: JSON.stringify({
      full_name: context.repo.full_name,
      description: context.repo.description,
      language: context.repo.language,
      stars: context.repo.stars,
      forks: context.repo.forks,
      open_issues_count: context.repo.open_issues_count,
      watchers: context.repo.watchers,
      license: context.repo.license,
      topics: context.repo.topics,
      homepage: context.repo.homepage,
      default_branch: context.repo.default_branch,
      is_archived: context.repo.is_archived,
      is_fork: context.repo.is_fork,
    }),
  })

  if (context.tree.length > 0) {
    items.push({
      id: "tree:sample",
      source_type: "tree",
      ref: "repository tree sample",
      title: "Repository file tree sample",
      excerpt: context.tree.slice(0, 200).join("\n"),
    })
  }

  if (context.readme) {
    for (const [index, chunk] of chunkText(context.readme, 3500).entries()) {
      items.push({
        id: `readme:${pad(index + 1)}`,
        source_type: "README",
        ref: `README.md chunk ${index + 1}`,
        title: `README chunk ${index + 1}`,
        excerpt: chunk,
      })
    }
  }

  appendFileEvidence(items, "config", "config", context.configFiles, 5000)
  appendFileEvidence(items, "source", "source", context.sourceFiles, 3500)
  appendFileEvidence(items, "ci", "ci", context.ciFiles, 4000)

  context.releases.forEach((release, index) => {
    items.push({
      id: `release:${pad(index + 1)}`,
      source_type: "release",
      ref: `release ${release.tag_name}`,
      title: release.name || release.tag_name,
      excerpt: JSON.stringify(release),
    })
  })

  context.issues.forEach((issue, index) => {
    items.push({
      id: `issue:${issue.number || pad(index + 1)}`,
      source_type: "issue",
      ref: `issue #${issue.number}`,
      title: issue.title,
      excerpt: JSON.stringify(issue),
    })
  })

  context.pullRequests.forEach((pullRequest, index) => {
    items.push({
      id: `pull_request:${pullRequest.number || pad(index + 1)}`,
      source_type: "pull_request",
      ref: `pull request #${pullRequest.number}`,
      title: pullRequest.title,
      excerpt: JSON.stringify(pullRequest),
    })
  })

  context.contributors.forEach((contributor, index) => {
    items.push({
      id: `contributor:${contributor.login || pad(index + 1)}`,
      source_type: "contributor",
      ref: `contributor ${contributor.login}`,
      title: contributor.login,
      excerpt: JSON.stringify(contributor),
    })
  })

  context.warnings.forEach((warning, index) => {
    items.push({
      id: `warning:${pad(index + 1)}`,
      source_type: "warning",
      ref: `collection warning ${index + 1}`,
      title: "Data collection warning",
      excerpt: warning,
    })
  })

  return items
}

function buildEvidenceExtractionPrompt(
  sectionType: AnalysisSectionType,
  context: GitHubRepoContext,
  evidenceCatalog: EvidenceCatalogItem[],
  lang: EvidenceLanguage
) {
  const naturalLanguage = lang === "en" ? "English" : "Simplified Chinese"

  return [
    `# Evidence Extraction Task: ${sectionType}`,
    "",
    "Extract evidence for this report type only. Do not summarize the whole repository generically.",
    "",
    "## Report-Specific Evidence Focus",
    JSON.stringify(sectionEvidenceFocus[sectionType]),
    "",
    "## Output JSON Schema",
    JSON.stringify(
      {
        section_type: sectionType,
        repository: context.repo.full_name,
        confirmed_facts: [
          {
            fact: `A directly verifiable fact written in ${naturalLanguage}`,
            category: "product | architecture | tech_stack | community | timeline | contribution | risk | other",
            evidence_refs: ["readme:001", "config:package-json"],
            confidence: "high | medium | low",
          },
        ],
        inferred_signals: [
          {
            signal: `A signal synthesized from multiple evidence items, written in ${naturalLanguage}`,
            interpretation: `What this signal likely means, written cautiously in ${naturalLanguage}`,
            evidence_refs: ["tree:sample", "source:src-app-page-tsx"],
            confidence: "high | medium | low",
          },
        ],
        unknowns: [
          {
            question: `A question that cannot be answered from current evidence, written in ${naturalLanguage}`,
            reason: `Why current evidence is insufficient, written in ${naturalLanguage}`,
            missing_sources: ["complete commit history", "full issue discussions"],
          },
        ],
        evidence_map: [
          {
            ref: "readme:001",
            source_type: "README",
            summary: "What this evidence item supports",
          },
        ],
      }
    ),
    "",
    "## Evidence Catalog",
    JSON.stringify(evidenceCatalog),
    "",
    "## Extraction Rules",
    "1. confirmed_facts should contain 8-18 high-value facts for this specific report type.",
    "2. inferred_signals should contain 4-12 non-obvious signals; each must include interpretation and confidence.",
    "3. unknowns must contain at least 3 concrete limitations caused by missing data.",
    "4. All evidence_refs must be exact IDs from Evidence Catalog.",
    `5. Write fact, signal, interpretation, question, reason, and summary fields in ${naturalLanguage}.`,
    "6. Do not write the final report. Do not include marketing language.",
  ].join("\n")
}

function normalizeEvidencePack(
  content: Record<string, unknown>,
  sectionType: AnalysisSectionType,
  context: GitHubRepoContext,
  evidenceCatalog: EvidenceCatalogItem[]
): EvidencePack {
  const validIds = new Set(evidenceCatalog.map((item) => item.id))

  return {
    section_type: sectionType,
    repository: context.repo.full_name,
    evidence_catalog: evidenceCatalog,
    confirmed_facts: normalizeFacts(content.confirmed_facts, validIds),
    inferred_signals: normalizeSignals(content.inferred_signals, validIds),
    unknowns: normalizeArray(content.unknowns) as EvidenceUnknown[],
    evidence_map: normalizeEvidenceMap(content.evidence_map, evidenceCatalog),
    data_coverage: {
      has_readme: Boolean(context.readme),
      tree_entries: context.tree.length,
      config_files: context.configFiles.map((file) => file.path),
      source_files: context.sourceFiles.map((file) => file.path),
      ci_files: context.ciFiles.map((file) => file.path),
      releases: context.releases.length,
      issues: context.issues.length,
      pull_requests: context.pullRequests.length,
      contributors: context.contributors.length,
      warnings: context.warnings,
    },
  }
}

function normalizeFacts(value: unknown, validIds: Set<string>): EvidenceFact[] {
  return normalizeArray(value)
    .map((item) => {
      const record = item as Record<string, unknown>
      return {
        fact: String(record.fact || ""),
        category: String(record.category || "other"),
        evidence_refs: normalizeEvidenceRefs(record.evidence_refs, validIds),
        confidence: normalizeConfidence(record.confidence),
      }
    })
    .filter((item) => item.fact && item.evidence_refs.length > 0)
}

function normalizeSignals(value: unknown, validIds: Set<string>): EvidenceSignal[] {
  return normalizeArray(value)
    .map((item) => {
      const record = item as Record<string, unknown>
      return {
        signal: String(record.signal || ""),
        interpretation: String(record.interpretation || ""),
        evidence_refs: normalizeEvidenceRefs(record.evidence_refs, validIds),
        confidence: normalizeConfidence(record.confidence),
      }
    })
    .filter((item) => item.signal && item.evidence_refs.length > 0)
}

function normalizeEvidenceMap(value: unknown, catalog: EvidenceCatalogItem[]): EvidenceMapItem[] {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  return normalizeArray(value)
    .map((item) => {
      const record = item as Record<string, unknown>
      const ref = String(record.ref || "")
      const catalogItem = byId.get(ref)
      if (!catalogItem) return null
      return {
        ref,
        source_type: catalogItem.source_type,
        summary: String(record.summary || catalogItem.title),
      }
    })
    .filter((item): item is EvidenceMapItem => Boolean(item))
}

function normalizeEvidenceRefs(value: unknown, validIds: Set<string>) {
  if (!Array.isArray(value)) return []
  return value.map(String).filter((ref) => validIds.has(ref))
}

function normalizeConfidence(value: unknown): EvidenceFact["confidence"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low"
}

function appendFileEvidence(
  items: EvidenceCatalogItem[],
  idPrefix: "config" | "source" | "ci",
  sourceType: EvidenceCatalogItem["source_type"],
  files: Array<{ path: string; content: string }>,
  maxLength: number
) {
  for (const file of files) {
    items.push({
      id: `${idPrefix}:${slugify(file.path)}`,
      source_type: sourceType,
      ref: file.path,
      title: file.path,
      excerpt: file.content.slice(0, maxLength),
    })
  }
}

function chunkText(text: string, maxLength: number) {
  const chunks: string[] = []
  for (let start = 0; start < text.length; start += maxLength) {
    chunks.push(text.slice(start, start + maxLength))
  }
  return chunks
}

function normalizeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function pad(value: number) {
  return String(value).padStart(3, "0")
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}
