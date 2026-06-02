import { getDb } from "@/src/server/lib/database"
import type { RepoRecord } from "../project/types"
import { computeRepoIntelScore } from "../project/repo-score"

export interface WatchlistItem {
  id: number
  repo_id: number
  created_at: string
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
  const repos = db.prepare(`SELECT * FROM repos WHERE id IN (${placeholders})`).all(...watchlistIds) as RepoRecord[]

  const repoMap = new Map(repos.map((r) => [r.id, r]))

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
