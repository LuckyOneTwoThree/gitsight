import type { ComparisonProject } from "@/lib/mock-compare-data"
import type { ApiRepo } from "@/lib/repo-api"

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Vue: "#41b883",
  PHP: "#4F5D95",
  Ruby: "#701516",
}

export function repoToComparisonProject(repo: ApiRepo): ComparisonProject {
  const language = repo.language || "Unknown"
  const topics = repo.topics || []
  const syncedAt = repo.synced_at ? new Date(repo.synced_at) : null

  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner,
    ownerAvatar: `https://github.com/${repo.owner}.png`,
    description: repo.description || "No description provided.",
    language,
    languageColor: languageColors[language] || "#6b7280",
    stars: repo.stars,
    forks: repo.forks,
    starsToday: 0,
    starsWeek: 0,
    lastUpdate: syncedAt ? syncedAt.toLocaleDateString() : "unknown",
    license: repo.license || "Unknown",
    tags: topics,
    sparklineData: (repo.metrics_snapshots || []).map((snapshot) => snapshot.stars),
    aiSummary: repo.description || `${repo.full_name} GitHub repository.`,
    contributors: 0,
    openIssues: repo.open_issues_count,
    closedIssues: 0,
    prMergeRate: 0,
    issueResponseTime: "unknown",
    releaseFrequency: "unknown",
    createdAt: "",
    techStack: [language].filter((item) => item !== "Unknown"),
    deployment: [],
    database: [],
    frameworks: [],
    features: {},
    businessModel: "unknown",
    pricing: "unknown",
    targetAudience: topics.slice(0, 3).join(", ") || "unknown",
  }
}

export function buildComparisonCsv(projects: ComparisonProject[]) {
  const rows = [
    ["Repo", "Description", "Language", "Stars", "Forks", "Open issues", "License", "Topics"],
    ...projects.map((project) => [
      `${project.owner}/${project.name}`,
      project.description,
      project.language,
      String(project.stars),
      String(project.forks),
      String(project.openIssues),
      project.license,
      project.tags.join(" | "),
    ]),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`
}
