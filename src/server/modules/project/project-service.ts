import { fetchGitHubRepo, GitHubRepositoryNotFoundError } from "./github-client"
import { findRepoByFullName, upsertRepo } from "./repo-store"
import {
  listRepoMetricsSnapshots,
  recordRepoMetricsSnapshot,
  ensureBaselineSnapshots,
  type RepoMetricsSnapshot,
} from "./metrics-store"
import { readStore } from "@/src/server/lib/file-store"
import { computeRepoIntelScore } from "./repo-score"
import type { RepoRecord } from "./types"
import type { ResolveRepoResult } from "./types"

const repoFreshnessMs = 4 * 60 * 60 * 1000

function normalizeRepo(repo: RepoRecord): RepoRecord {
  return {
    ...repo,
    contributors_count: repo.contributors_count || 0,
  }
}

export async function resolveRepo(owner: string, name: string): Promise<ResolveRepoResult> {
  const fullName = `${owner}/${name}`
  const cached = findRepoByFullName(fullName)

  if (cached && cached.synced_at && Date.now() - Date.parse(cached.synced_at) < repoFreshnessMs) {
    await recordRepoMetricsSnapshot(cached)
    return {
      repo: normalizeRepo(cached),
      is_new: false,
    }
  }

  try {
    const fetched = await fetchGitHubRepo(owner, name)
    const repo = await upsertRepo({
      ...fetched,
      source: cached?.source || fetched.source,
      analysis_count: cached?.analysis_count || fetched.analysis_count,
      last_analyzed_at: cached?.last_analyzed_at || fetched.last_analyzed_at,
      stars_today: cached?.stars_today || 0,
      stars_week: cached?.stars_week || 0,
      stars_month: cached?.stars_month || 0,
      velocity_score: cached?.velocity_score || 0,
      intel_score: cached?.intel_score || 0,
      intel_grade: cached?.intel_grade || "D",
      trending_rank: cached?.trending_rank || null,
      last_metrics_sync: cached?.last_metrics_sync || null,
    })
    await recordRepoMetricsSnapshot(repo)

    return {
      repo,
      is_new: !cached,
    }
  } catch (error) {
    if (cached) {
      await recordRepoMetricsSnapshot(cached)
      return {
        repo: normalizeRepo(cached),
        is_new: false,
      }
    }

    if (error instanceof GitHubRepositoryNotFoundError) {
      throw error
    }

    const fallback = await upsertRepo(createFallbackRepo(owner, name, cached))
    await recordRepoMetricsSnapshot(fallback)
    return {
      repo: fallback,
      is_new: !cached,
    }
  }
}

export function withMetricsSnapshots<T extends RepoRecord>(repo: T) {
  return {
    ...repo,
    metrics_snapshots: listRepoMetricsSnapshots(repo.id),
  }
}

export async function recordCurrentMetrics(repo: RepoRecord): Promise<RepoMetricsSnapshot> {
  return await recordRepoMetricsSnapshot(repo)
}

export function getProjects(page = 1, limit = 12, offset?: number, tab = "velocity", range = "today", language?: string) {
  ensureBaselineSnapshots()
  const safePage = Math.max(page, 1)
  const safeLimit = Math.min(Math.max(limit, 1), 50)
  const store = readStore()
  let repos = store.repos
  const effectiveOffset = offset !== undefined
    ? Math.min(Math.max(offset, 0), repos.length)
    : (safePage - 1) * safeLimit

  // Filter by language if specified
  if (language) {
    repos = repos.filter((repo) => repo.language === language)
  }

  const allSnapshots = store.metrics_snapshots

  const reposWithSparkline = repos.map((repo) => {
    const snapshots = allSnapshots
      .filter((s) => s.repo_id === repo.id)
      .sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at))
    const sparkline = snapshots.length > 1
      ? snapshots.map((s) => s.stars)
      : []

    return {
      ...repo,
      sparkline_data: sparkline,
    }
  })

  const reposWithScores = reposWithSparkline.map((repo) => {
    const scores = computeRepoIntelScore(repo)
    return {
      ...repo,
      intel_score: scores.total,
      intel_grade: scores.grade,
      velocity_score_detail: scores.velocity,
      community_score_detail: scores.community,
      maturity_score_detail: scores.maturity,
    }
  })

  const sorted = sortReposByTab(reposWithScores, tab, range)
  const sliced = sorted.slice(effectiveOffset, effectiveOffset + safeLimit)

  return {
    data: sliced,
    pagination: {
      page: offset !== undefined ? Math.floor(effectiveOffset / safeLimit) + 1 : safePage,
      limit: safeLimit,
      total: repos.length,
      total_pages: Math.ceil(repos.length / safeLimit),
    },
    last_synced_at: repos[0]?.synced_at || null,
  }
}

function sortReposByTab<T extends { stars: number; stars_today: number; stars_week: number; stars_month: number; velocity_score: number; updated_at: string }>(
  repos: T[],
  tab: string,
  range: string
): T[] {
  switch (tab) {
    case "velocity":
      if (range === "today" || range === "daily") return [...repos].sort((a, b) => b.stars_today - a.stars_today || b.stars_week - a.stars_week)
      if (range === "week" || range === "weekly") return [...repos].sort((a, b) => b.stars_week - a.stars_week || b.stars - a.stars)
      if (range === "month" || range === "monthly") return [...repos].sort((a, b) => b.stars_month - a.stars_month || b.stars - a.stars)
      return [...repos].sort((a, b) => b.velocity_score - a.velocity_score)
    case "trending":
      return [...repos].sort((a, b) => b.stars_week - a.stars_week || b.stars - a.stars)
    case "rising":
      return [...repos].sort((a, b) => b.stars_today - a.stars_today || b.stars_week - a.stars_week)
    case "popular":
      return [...repos].sort((a, b) => b.stars - a.stars)
    case "recent":
    default:
      return [...repos].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
  }
}

export function getNewlyTrending(hours = 24, limit = 6) {
  ensureBaselineSnapshots()
  const store = readStore()
  const cutoff = Date.now() - hours * 60 * 60 * 1000

  const newlyTrending = store.repos
    .filter((repo) => repo.source === "trending_sync" && repo.synced_at && Date.parse(repo.synced_at) >= cutoff)
    .sort((a, b) => Date.parse(b.synced_at!) - Date.parse(a.synced_at!))
    .slice(0, limit)

  const allSnapshots = store.metrics_snapshots

  return newlyTrending.map((repo) => {
    const snapshots = allSnapshots
      .filter((s) => s.repo_id === repo.id)
      .sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at))
    const sparkline = snapshots.length > 1 ? snapshots.map((s) => s.stars) : []
    const scores = computeRepoIntelScore(repo)

    return {
      ...repo,
      sparkline_data: sparkline,
      intel_score: scores.total,
      intel_grade: scores.grade,
      velocity_score_detail: scores.velocity,
      community_score_detail: scores.community,
      maturity_score_detail: scores.maturity,
    }
  })
}

export function getProjectStats() {
  const store = readStore()
  const repos = store.repos

  const starsToday = repos.reduce((sum, repo) => sum + repo.stars_today, 0)
  const starsWeek = repos.reduce((sum, repo) => sum + repo.stars_week, 0)
  const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0)
  const totalForks = repos.reduce((sum, repo) => sum + repo.forks, 0)

  const allSnapshots = store.metrics_snapshots
  const starsSparkline = buildAggregateSparkline(allSnapshots, "stars")
  const forksSparkline = buildAggregateSparkline(allSnapshots, "forks")

  // Language distribution
  const langMap = new Map<string, number>()
  for (const repo of repos) {
    const lang = repo.language || "Unknown"
    langMap.set(lang, (langMap.get(lang) || 0) + 1)
  }
  const language_distribution = [...langMap.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  // Top projects by different metrics
  const topByStars = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 5).map((r) => ({ full_name: r.full_name, stars: r.stars, stars_today: r.stars_today, stars_week: r.stars_week }))
  const topByVelocity = [...repos].sort((a, b) => b.stars_week - a.stars_week).slice(0, 5).map((r) => ({ full_name: r.full_name, stars: r.stars, stars_today: r.stars_today, stars_week: r.stars_week }))

  return {
    total_projects: repos.length,
    total_reports: repos.reduce((sum, repo) => sum + repo.analysis_count, 0),
    total_users: 1,
    stars_today: starsToday,
    stars_week: starsWeek,
    total_stars: totalStars,
    total_forks: totalForks,
    recent_projects: repos.slice(0, 5),
    stars_sparkline: starsSparkline,
    forks_sparkline: forksSparkline,
    language_distribution,
    top_by_stars: topByStars,
    top_by_velocity: topByVelocity,
  }
}

function buildAggregateSparkline(snapshots: Array<{ captured_at: string; stars: number; forks: number }>, field: "stars" | "forks"): number[] {
  if (snapshots.length === 0) return []

  const byTime = new Map<string, number>()
  for (const s of snapshots) {
    const key = s.captured_at.slice(0, 16)
    const current = byTime.get(key) || 0
    byTime.set(key, current + s[field])
  }

  const sorted = [...byTime.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return sorted.map(([, val]) => val)
}

function createFallbackRepo(owner: string, name: string, existing: RepoRecord | null): RepoRecord {
  const now = new Date().toISOString()
  const fullName = `${owner}/${name}`

  return {
    id: existing?.id || hashRepoId(fullName),
    github_id: existing?.github_id || hashRepoId(fullName),
    full_name: fullName,
    name,
    owner,
    description: existing?.description || "GitHub metadata is pending sync. Add GITHUB_TOKEN to avoid anonymous API rate limits.",
    language: existing?.language || null,
    stars: existing?.stars || 0,
    forks: existing?.forks || 0,
    open_issues_count: existing?.open_issues_count || 0,
    watchers: existing?.watchers || 0,
    license: existing?.license || null,
    topics: existing?.topics || [],
    homepage: existing?.homepage || null,
    is_archived: existing?.is_archived || false,
    is_fork: existing?.is_fork || false,
    default_branch: existing?.default_branch || "main",
    contributors_count: existing?.contributors_count || 0,
    source: existing?.source || "on_demand",
    analysis_count: existing?.analysis_count || 0,
    last_analyzed_at: existing?.last_analyzed_at || null,
    synced_at: existing?.synced_at || null,
    stars_today: existing?.stars_today || 0,
    stars_week: existing?.stars_week || 0,
    stars_month: existing?.stars_month || 0,
    velocity_score: existing?.velocity_score || 0,
    intel_score: existing?.intel_score || 0,
    intel_grade: existing?.intel_grade || "D",
    trending_rank: existing?.trending_rank || null,
    last_metrics_sync: existing?.last_metrics_sync || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  }
}

function hashRepoId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash || 1
}
