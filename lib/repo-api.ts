import type { RepoDetail, AnalysisSection } from "@/lib/analysis-sections"
import type { ProjectData } from "@/components/projects/project-card"

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
  fast_reports: ApiAnalysisStatus[]
  deep_reports: ApiAnalysisStatus[]
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
  supply_chain: "supply_chain",
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
  generatingIds?: Set<string>,
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

export function repoToProjectData(repo: ApiRepo): ProjectData {
  const synced = repo.synced_at ? new Date(repo.synced_at) : null;
  const now = Date.now();
  let lastUpdate = "未知";
  if (synced) {
    const diffMs = now - synced.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) lastUpdate = `${diffMin}分钟前`;
    else if (diffMin < 1440) lastUpdate = `${Math.floor(diffMin / 60)}小时前`;
    else lastUpdate = `${Math.floor(diffMin / 1440)}天前`;
  }

  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner,
    ownerAvatar: `https://github.com/${repo.owner}.png`,
    description: repo.description || "",
    language: repo.language || "Unknown",
    languageColor: LANGUAGE_COLORS[repo.language || ""] || "#8b8b8b",
    stars: repo.stars,
    forks: repo.forks,
    starsToday: repo.stars_today || 0,
    starsWeek: repo.stars_week || 0,
    lastUpdate,
    license: repo.license || "Unknown",
    tags: Array.isArray(repo.topics) ? repo.topics : (typeof repo.topics === "string" ? JSON.parse(repo.topics || "[]") : []),
    sparklineData: repo.sparkline_data && repo.sparkline_data.length > 0
      ? repo.sparkline_data
      : [repo.stars],
    aiSummary: repo.description || "暂无 AI 摘要",
    intelScore: repo.intel_score,
    intelGrade: repo.intel_grade,
    velocityScore: repo.velocity_score_detail,
    communityScore: repo.community_score_detail,
    maturityScore: repo.maturity_score_detail,
  };
}
