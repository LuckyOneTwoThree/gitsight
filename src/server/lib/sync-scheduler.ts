import { fetchGitHubTrending, trendingRepoToRepoRecord } from "@/src/server/modules/project/github-trending"
import { findRepoByFullName, upsertRepo } from "@/src/server/modules/project/repo-store"
import { fetchGitHubRepo } from "@/src/server/modules/project/github-client"
import { getServerEnv } from "@/src/server/lib/env"
import { executeAllActiveRules } from "@/src/server/modules/alerts/alert-executor"

let dailyTimer: ReturnType<typeof setInterval> | null = null
let weeklyTimer: ReturnType<typeof setInterval> | null = null
let alertTimer: ReturnType<typeof setInterval> | null = null
let started = false

const DAILY_INTERVAL = 4 * 60 * 60 * 1000
const WEEKLY_INTERVAL = 12 * 60 * 60 * 1000
const ALERT_INTERVAL = 30 * 60 * 1000
const INITIAL_DELAY = 60 * 1000

export async function syncTrending(since: "daily" | "weekly" | "monthly") {
  try {
    console.log(`[Scheduler] Starting ${since} trending sync...`)
    const trendingRepos = await fetchGitHubTrending(since)
    const hasToken = !!getServerEnv().githubToken

    let synced = 0
    for (const trending of trendingRepos) {
      const existing = findRepoByFullName(trending.fullName)
      const record = trendingRepoToRepoRecord(trending, existing, since)
      await upsertRepo(record)
      synced++

      // For new repos without forks data, enrich from GitHub API if token is available
      if (!existing && hasToken && record.forks === 0) {
        try {
          const [owner, name] = trending.fullName.split("/")
          if (owner && name) {
            const fullData = await fetchGitHubRepo(owner, name)
            await upsertRepo({
              ...record,
              forks: fullData.forks,
              open_issues_count: fullData.open_issues_count,
              watchers: fullData.watchers,
              license: fullData.license,
              contributors_count: fullData.contributors_count,
              homepage: fullData.homepage,
              is_archived: fullData.is_archived,
              is_fork: fullData.is_fork,
              default_branch: fullData.default_branch,
              description: fullData.description || record.description,
            })
          }
        } catch {
          // enrichment is optional, don't fail the sync
        }
      }
    }

    const result = { since, synced, total: trendingRepos.length }
    console.log(`[Scheduler] ${since} sync result:`, JSON.stringify(result))
    return result
  } catch (err) {
    console.error(`[Scheduler] ${since} sync failed:`, err)
    return { since, synced: 0, total: 0, error: String(err) }
  }
}

export async function runAlerts() {
  try {
    console.log("[Scheduler] Running alert rules...")
    const result = await executeAllActiveRules()
    console.log("[Scheduler] Alert execution result:", JSON.stringify(result))
    return result
  } catch (err) {
    console.error("[Scheduler] Alert execution failed:", err)
    return { rulesExecuted: 0, totalSent: 0, errors: [String(err)] }
  }
}

export function startSyncScheduler() {
  if (started) return
  started = true

  setTimeout(() => {
    syncTrending("daily")
    dailyTimer = setInterval(() => syncTrending("daily"), DAILY_INTERVAL)

    syncTrending("weekly")
    weeklyTimer = setInterval(() => syncTrending("weekly"), WEEKLY_INTERVAL)

    runAlerts()
    alertTimer = setInterval(() => runAlerts(), ALERT_INTERVAL)

    const HOURLY_ALERT_INTERVAL = 60 * 60 * 1000
    setInterval(() => runAlerts(), HOURLY_ALERT_INTERVAL)

    console.log(`[Scheduler] Started: daily every ${DAILY_INTERVAL / 3600000}h, weekly every ${WEEKLY_INTERVAL / 3600000}h, alerts every ${ALERT_INTERVAL / 60000}m + hourly`)
  }, INITIAL_DELAY)

  console.log(`[Scheduler] Will start first sync in ${INITIAL_DELAY / 1000}s (waiting for server ready)`)
}

export function stopSyncScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null }
  if (weeklyTimer) { clearInterval(weeklyTimer); weeklyTimer = null }
  if (alertTimer) { clearInterval(alertTimer); alertTimer = null }
  started = false
  console.log("[Scheduler] Stopped")
}
