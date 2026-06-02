import { readStore, updateStore } from "@/src/server/lib/file-store"
import type { RepoRecord } from "./types"
import { listRepoMetricsSnapshots, type RepoMetricsSnapshot } from "./metrics-store"
import { computeRepoIntelScore } from "./repo-score"

export interface RepoWithVelocity extends RepoRecord {
  stars_today: number
  stars_week: number
  stars_month: number
  velocity_score: number
}

export function computeVelocityForRepo(repo: RepoRecord, allSnapshots?: RepoMetricsSnapshot[]): RepoWithVelocity {
  const snapshots = listRepoMetricsSnapshots(repo.id, allSnapshots)
  const now = Date.now()

  const snapToday = computeStarDelta(snapshots, now - 24 * 60 * 60 * 1000)
  const snapWeek = computeStarDelta(snapshots, now - 7 * 24 * 60 * 60 * 1000)
  const snapMonth = computeStarDelta(snapshots, now - 30 * 24 * 60 * 60 * 1000)

  const starsToday = snapToday > 0 ? snapToday : repo.stars_today
  const starsWeek = snapWeek > 0 ? snapWeek : repo.stars_week
  const starsMonth = snapMonth > 0 ? snapMonth : repo.stars_month

  const velocityScore = computeVelocityScore(repo, starsWeek, starsToday)

  return {
    ...repo,
    stars_today: starsToday,
    stars_week: starsWeek,
    stars_month: starsMonth,
    velocity_score: velocityScore,
  }
}

function computeStarDelta(snapshots: RepoMetricsSnapshot[], sinceMs: number): number {
  if (snapshots.length < 2) return 0

  const latest = snapshots[snapshots.length - 1]
  const cutoff = new Date(sinceMs).toISOString()

  const baseline = snapshots.find((s) => s.captured_at >= cutoff)
  if (!baseline || baseline === latest) return 0

  return Math.max(0, latest.stars - baseline.stars)
}

function computeVelocityScore(repo: RepoRecord, starsWeek: number, starsToday: number): number {
  const starBase = Math.min(repo.stars / 1000, 30)
  const weekBonus = Math.min(starsWeek / 10, 40)
  const todayBonus = Math.min(starsToday / 5, 20)
  const forkBonus = Math.min(repo.forks / 100, 10)

  return Math.min(100, Math.round(starBase + weekBonus + todayBonus + forkBonus))
}

export async function recalculateAllVelocity(): Promise<number> {
  const store = readStore()
  const allSnapshots = store.metrics_snapshots

  const reposWithVelocity = store.repos.map((repo) => {
    const hasEnoughSnapshots = allSnapshots.filter((s) => s.repo_id === repo.id).length >= 2

    if (hasEnoughSnapshots) {
      const velocity = computeVelocityForRepo(repo, allSnapshots)
      return {
        ...repo,
        stars_today: velocity.stars_today,
        stars_week: velocity.stars_week,
        stars_month: velocity.stars_month,
        velocity_score: velocity.velocity_score,
      }
    }

    const velocityScore = computeVelocityScore(repo, repo.stars_week, repo.stars_today)
    return {
      ...repo,
      velocity_score: velocityScore,
    }
  })

  reposWithVelocity.sort((a, b) => b.velocity_score - a.velocity_score)

  const ranked = reposWithVelocity.map((repo, index) => {
    const intel = computeRepoIntelScore(repo)
    return {
      ...repo,
      trending_rank: repo.velocity_score > 0 ? index + 1 : null,
      intel_score: intel.total,
      intel_grade: intel.grade,
    }
  })

  await updateStore((store) => {
    store.repos = ranked
  })

  return ranked.length
}

export function getVelocityRanking(limit = 10): RepoWithVelocity[] {
  const store = readStore()

  return [...store.repos]
    .sort((a, b) => b.velocity_score - a.velocity_score)
    .slice(0, limit)
}

export function getTrendingRepos(range: "daily" | "weekly" | "monthly", limit = 10): RepoWithVelocity[] {
  const store = readStore()

  return [...store.repos]
    .sort((a, b) => {
      if (range === "daily") return b.stars_today - a.stars_today
      if (range === "weekly") return b.stars_week - a.stars_week
      return b.stars_month - a.stars_month
    })
    .slice(0, limit)
}
