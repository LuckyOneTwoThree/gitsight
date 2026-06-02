import type { RepoDetail, AnalysisSection } from "@/lib/mock-repo-data"

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  Vue: "#41b883",
}

export interface ApiRepo {
  id: number
  github_id: number
  full_name: string
  name: string
  owner: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  open_issues_count: number
  watchers: number
  license: string | null
  topics: string[]
  homepage: string | null
  default_branch: string
  contributors_count: number
  synced_at: string | null
  stars_today: number
  stars_week: number
  stars_month: number
  velocity_score: number
  intel_score: number
  intel_grade: string
  velocity_score_detail?: number
  community_score_detail?: number
  maturity_score_detail?: number
  metrics_snapshots?: ApiRepoMetricsSnapshot[]
  sparkline_data?: number[]
  is_new?: boolean
}

export interface ApiRepoMetricsSnapshot {
  repo_id: number
  stars: number
  forks: number
  open_issues_count: number
  watchers: number
  captured_at: string
}

export interface ApiAnalysisStatus {
  id: number
  section_type: string
  mode: "fast" | "deep"
  language: "zh" | "en"
  status: AnalysisSection["status"]
  is_stale: boolean
  generated_at: string | null
}

export interface ApiAnalysisReport {
  id: number
  repo_id: number
  section_type: string
  mode: "fast" | "deep"
  language: "zh" | "en"
  status: string
  content: Record<string, unknown> | null
  mermaid_code: string | null
  generated_by: string | null
  generated_at: string | null
}

export interface ResolveRepoResponse extends ApiRepo {}

export interface RepoAnalysisResponse {
  repo: ApiRepo
  reports: ApiAnalysisStatus[]
}

export const frontendToBackendSection: Record<string, string> = {
  tldr: "tldr",
  "reverse-prd": "reverse_prd",
  architecture: "architecture",
  codewiki: "code_wiki",
  timemachine: "timeline",
  "tech-stack": "tech_stack",
  community: "community",
  "contribution-guide": "contribution_guide",
}

export const backendToFrontendSection: Record<string, string> = Object.fromEntries(
  Object.entries(frontendToBackendSection).map(([front, back]) => [back, front])
)

export function toRepoDetail(repo: ApiRepo): RepoDetail {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner,
    ownerAvatar: `https://github.com/${repo.owner}.png`,
    description: repo.description || "No description provided.",
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    issues: repo.open_issues_count,
    language: repo.language || "Unknown",
    license: repo.license || "Unknown",
    createdAt: "",
    updatedAt: repo.synced_at || "",
    topics: repo.topics || [],
    starHistory: (repo.metrics_snapshots || []).map((snapshot) => snapshot.stars),
    hasStarHistory: (repo.metrics_snapshots || []).length > 1,
    contributors: repo.contributors_count || 0,
    lastRelease: repo.default_branch,
    lastReleaseDate: repo.synced_at ? new Date(repo.synced_at).toLocaleDateString() : "unknown",
  }
}

export function applyAnalysisStatuses(
  sections: AnalysisSection[],
  reports: ApiAnalysisStatus[],
  generatingIds?: Set<string>
): AnalysisSection[] {
  const statusByFrontendId = new Map(
    reports.map((report) => [backendToFrontendSection[report.section_type] || report.section_type, report])
  )

  return sections.map((section) => {
    if (generatingIds?.has(section.id)) {
      return section
    }

    const report = statusByFrontendId.get(section.id)
    if (!report) return section

    return {
      ...section,
      status: report.status,
      cachedAt: report.generated_at
        ? new Date(report.generated_at).toLocaleString()
        : section.cachedAt,
    }
  })
}
