export const analysisSectionTypes = [
  "tldr",
  "reverse_prd",
  "architecture",
  "code_wiki",
  "timeline",
  "tech_stack",
  "community",
  "contribution_guide",
  "supply_chain",
] as const

export type AnalysisSectionType = (typeof analysisSectionTypes)[number]

export const analysisModes = ["fast", "deep"] as const
export type AnalysisMode = (typeof analysisModes)[number]

export const analysisLanguages = ["zh", "en"] as const
export type AnalysisLanguage = (typeof analysisLanguages)[number]

export type AnalysisReportStatus =
  | "not_generated"
  | "generating"
  | "cached"
  | "stale"
  | "failed"

export type AnalysisJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"

export interface AnalysisJobRecord {
  id: string
  repo_id: number
  owner: string
  name: string
  section_type: AnalysisSectionType
  mode: AnalysisMode
  language: AnalysisLanguage
  status: AnalysisJobStatus
  report_id: number | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisReportRecord {
  id: number
  repo_id: number
  section_type: AnalysisSectionType
  mode: AnalysisMode
  language: AnalysisLanguage
  status: AnalysisReportStatus
  content: Record<string, unknown> | null
  mermaid_code: string | null
  content_hash: string | null
  is_stale: boolean
  is_pro: boolean
  generated_by: string | null
  prompt_version: string | null
  token_cost: number
  generated_at: string | null
  created_at: string
  updated_at: string
}
