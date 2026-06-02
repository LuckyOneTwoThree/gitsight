import { readStore, updateStore } from "@/src/server/lib/file-store"
import type { RepoRecord } from "./types"

export interface RepoMetricsSnapshot {
  repo_id: number
  stars: number
  forks: number
  open_issues_count: number
  watchers: number
  captured_at: string
}

export async function recordRepoMetricsSnapshot(repo: RepoRecord) {
  return await updateStore((store) => {
    const now = new Date().toISOString()
    const snapshots = store.metrics_snapshots
      .filter((snapshot) => snapshot.repo_id === repo.id)
      .sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at))
    const latest = snapshots.at(-1)

    const next: RepoMetricsSnapshot = {
      repo_id: repo.id,
      stars: repo.stars,
      forks: repo.forks,
      open_issues_count: repo.open_issues_count,
      watchers: repo.watchers,
      captured_at: latest && Date.parse(now) - Date.parse(latest.captured_at) < 60 * 60 * 1000
        ? latest.captured_at
        : now,
    }

    const maxPerRepo = 90
    const repoSnapshotCount = snapshots.length
    const shouldTrim = repoSnapshotCount >= maxPerRepo

    if (shouldTrim) {
      const keepCount = maxPerRepo - 1
      const repoSnapshotsToKeep = new Set(
        snapshots.slice(-keepCount).map((s) => s.captured_at)
      )
      repoSnapshotsToKeep.add(next.captured_at)

      store.metrics_snapshots = [
        ...store.metrics_snapshots.filter((snapshot) => {
          if (snapshot.repo_id !== repo.id) return true
          return repoSnapshotsToKeep.has(snapshot.captured_at)
        }),
        next,
      ]
    } else {
      store.metrics_snapshots = [
        ...store.metrics_snapshots.filter((snapshot) => {
          if (snapshot.repo_id !== repo.id) return true
          return snapshot.captured_at !== next.captured_at
        }),
        next,
      ]
    }

    return next
  })
}

export function listRepoMetricsSnapshots(repoId: number, allSnapshots?: RepoMetricsSnapshot[]) {
  const source = allSnapshots ?? readStore().metrics_snapshots
  return source
    .filter((snapshot) => snapshot.repo_id === repoId)
    .sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at))
}

export function ensureBaselineSnapshots(): number {
  const store = readStore()
  const reposWithSnapshot = new Set(store.metrics_snapshots.map((s) => s.repo_id))
  const reposNeedingBaseline = store.repos.filter((repo) => !reposWithSnapshot.has(repo.id))

  if (reposNeedingBaseline.length === 0) return 0

  const now = new Date().toISOString()
  const newSnapshots: RepoMetricsSnapshot[] = reposNeedingBaseline.map((repo) => ({
    repo_id: repo.id,
    stars: repo.stars,
    forks: repo.forks,
    open_issues_count: repo.open_issues_count,
    watchers: repo.watchers,
    captured_at: now,
  }))

  updateStore((store) => {
    store.metrics_snapshots = [...store.metrics_snapshots, ...newSnapshots]
  })

  return reposNeedingBaseline.length
}
