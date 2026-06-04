import { getDb } from "@/src/server/lib/database"
import type { RepoRecord } from "../project/types"
import { computeRepoIntelScore } from "../project/repo-score"

export interface WatchlistItem {
  id: number
  repo_id: number
  created_at: string
}

function mapRepoRow(r: Record<string, unknown>): RepoRecord {
  return {
    id: r.id as number,
    github_id: r.github_id as number,
    full_name: r.full_name as string,
    name: r.name as string,
    owner: r.owner as string,
    owner_avatar_url: (r.owner_avatar_url as string) || null,
    description: (r.description as string) || null,
    language: (r.language as string) || null,
    stars: r.stars as number,
    forks: r.forks as number,
    open_issues_count: r.open_issues_count as number,
    watchers: r.watchers as number,
    license: (r.license as string) || null,
    topics: JSON.parse((r.topics as string) || "[]") as string[],
    homepage: (r.homepage as string) || null,
    is_archived: !!r.is_archived,
    is_fork: !!r.is_fork,
    default_branch: (r.default_branch as string) || "main",
    contributors_count: r.contributors_count as number,
    source: (r.source as "on_demand" | "trending_sync" | "seed") || "seed",
    analysis_count: r.analysis_count as number,
    last_analyzed_at: (r.last_analyzed_at as string) || null,
    synced_at: (r.synced_at as string) || null,
    stars_today: r.stars_today as number,
    stars_week: r.stars_week as number,
    stars_month: r.stars_month as number,
    velocity_score: r.velocity_score as number,
    intel_score: r.intel_score as number,
    intel_grade: (r.intel_grade as string) || "D",
    trending_rank: r.trending_rank != null ? (r.trending_rank as number) : null,
    last_metrics_sync: (r.last_metrics_sync as string) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

export function addToWatchlist(repoId: number): WatchlistItem {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare("INSERT OR IGNORE INTO watchlist (repo_id, created_at) VALUES (?, ?)").run(repoId, now)
  const row = db.prepare("SELECT * FROM watchlist WHERE repo_id = ?").get(repoId) as WatchlistItem
  return row
}

export function removeFromWatchlist(repoId: number): boolean {
  const db = getDb()
  const result = db.prepare("DELETE FROM watchlist WHERE repo_id = ?").run(repoId)
  return result.changes > 0
}

export function isInWatchlist(repoId: number): boolean {
  const db = getDb()
  const row = db.prepare("SELECT 1 FROM watchlist WHERE repo_id = ?").get(repoId)
  return !!row
}

export function getWatchlistRepoIds(): number[] {
  const db = getDb()
  const rows = db.prepare("SELECT repo_id FROM watchlist ORDER BY created_at DESC").all() as { repo_id: number }[]
  return rows.map((r) => r.repo_id)
}

export function getWatchlistRepos() {
  const db = getDb()
  const watchlistIds = getWatchlistRepoIds()
  if (watchlistIds.length === 0) return []

  const placeholders = watchlistIds.map(() => "?").join(",")
  const repos = db.prepare(`SELECT * FROM repos WHERE id IN (${placeholders})`).all(...watchlistIds) as Record<string, unknown>[]

  const repoMap = new Map(repos.map((r) => [r.id as number, mapRepoRow(r)]))

  return watchlistIds
    .map((id) => repoMap.get(id))
    .filter(Boolean)
    .map((repo) => {
      const scores = computeRepoIntelScore(repo!)
      return {
        ...repo!,
        sparkline_data: [] as number[],
        intel_score: scores.total,
        intel_grade: scores.grade,
        velocity_score_detail: scores.velocity,
        community_score_detail: scores.community,
        maturity_score_detail: scores.maturity,
      }
    })
}
