import { fetchGitHubTrending, trendingRepoToRepoRecord } from "@/src/server/modules/project/github-trending"
import { findRepoByFullName, upsertRepo } from "@/src/server/modules/project/repo-store"
import { fetchGitHubRepo } from "@/src/server/modules/project/github-client"
import { getServerEnv } from "@/src/server/lib/env"
import { executeAllActiveRules } from "@/src/server/modules/alerts/alert-executor"
import { recordRepoMetricsSnapshot, ensureBaselineSnapshots } from "@/src/server/modules/project/metrics-store"
import { recalculateAllVelocity } from "@/src/server/modules/project/velocity-service"
import { discoverReposByTopics, type GitHubSearchResult } from "@/src/server/modules/search/github-search"
import type { RepoRecord } from "@/src/server/modules/project/types"

let dailyTimer: ReturnType<typeof setInterval> | null = null
let weeklyTimer: ReturnType<typeof setInterval> | null = null
let alertTimer: ReturnType<typeof setInterval> | null = null
let topicDiscoveryTimer: ReturnType<typeof setInterval> | null = null
let started = false

const DAILY_INTERVAL = 4 * 60 * 60 * 1000
const WEEKLY_INTERVAL = 12 * 60 * 60 * 1000
const ALERT_INTERVAL = 30 * 60 * 1000
const TOPIC_DISCOVERY_INTERVAL = 24 * 60 * 60 * 1000
const INITIAL_DELAY = 60 * 1000

// 按语言分类爬取 Trending，扩大项目覆盖面
const TRENDING_LANGUAGES = [
  "",           // 全语言（默认页）
  "python",
  "typescript",
  "javascript",
  "rust",
  "go",
  "cpp",
  "java",
]

// 按 topic 发现热门项目，覆盖赛道全景图的核心领域
const DISCOVERY_TOPICS = [
  // AI / ML
  "llm", "machine-learning", "deep-learning", "pytorch", "huggingface",
  // AI Agent
  "agent", "ai-agents", "mcp", "langchain",
  // RAG
  "rag", "vector-database", "embedding", "llamaindex",
  // 前端
  "react", "vue", "nextjs", "tailwindcss", "design-system",
  // DevOps
  "kubernetes", "docker", "terraform", "monitoring",
  // 数据库
  "database", "postgresql", "redis", "sqlite",
  // 编程工具
  "cli", "developer-tools", "neovim",
  // Web3
  "web3", "blockchain", "defi", "smart-contract",
]

export async function syncTrending(since: "daily" | "weekly" | "monthly") {
  try {
    console.log(`[Scheduler] Starting ${since} trending sync...`)
    let totalSynced = 0
    const hasToken = !!getServerEnv().githubToken

    for (const lang of TRENDING_LANGUAGES) {
      try {
        const trendingRepos = await fetchGitHubTrending(since, lang)

        for (const trending of trendingRepos) {
          const existing = findRepoByFullName(trending.fullName)
          const record = trendingRepoToRepoRecord(trending, existing, since)
          await upsertRepo(record)
          totalSynced++

          // 对新仓库用 GitHub API 补全数据
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
              // enrichment is optional
            }
          }
        }

        const langLabel = lang || "all"
        console.log(`[Scheduler] ${since}/${langLabel}: synced ${trendingRepos.length} repos`)
      } catch (err) {
        const langLabel = lang || "all"
        console.error(`[Scheduler] ${since}/${langLabel} trending fetch failed:`, err instanceof Error ? err.message : err)
      }
    }

    const result = { since, synced: totalSynced }
    console.log(`[Scheduler] ${since} sync result:`, JSON.stringify(result))

    // 同步后记录指标快照并重算 velocity
    await postSyncMetrics()

    return result
  } catch (err) {
    console.error(`[Scheduler] ${since} sync failed:`, err)
    return { since, synced: 0, error: String(err) }
  }
}

export async function syncTopicDiscovery() {
  const hasToken = !!getServerEnv().githubToken
  if (!hasToken) {
    console.log("[Scheduler] Skipping topic discovery: no GitHub token configured")
    return { discovered: 0, skipped: true }
  }

  try {
    console.log(`[Scheduler] Starting topic discovery (${DISCOVERY_TOPICS.length} topics)...`)
    const results = await discoverReposByTopics(DISCOVERY_TOPICS, {
      minStars: 200,
      perTopic: 20,
    })

    let discovered = 0
    for (const item of results) {
      const existing = findRepoByFullName(item.full_name)
      if (existing) continue // 已有记录，不重复

      const record = searchResultToRepoRecord(item)
      await upsertRepo(record)
      discovered++
    }

    console.log(`[Scheduler] Topic discovery: ${results.length} results, ${discovered} new repos added`)

    await postSyncMetrics()

    return { discovered, total: results.length }
  } catch (err) {
    console.error("[Scheduler] Topic discovery failed:", err)
    return { discovered: 0, error: String(err) }
  }
}

function searchResultToRepoRecord(item: GitHubSearchResult): RepoRecord {
  const now = new Date().toISOString()
  return {
    id: item.id,
    github_id: item.id,
    full_name: item.full_name,
    name: item.name,
    owner: item.owner.login,
    description: item.description,
    language: item.language,
    stars: item.stargazers_count,
    forks: item.forks_count,
    open_issues_count: item.open_issues_count,
    watchers: item.watchers_count,
    license: item.license?.spdx_id || item.license?.key || null,
    topics: item.topics || [],
    homepage: item.homepage || null,
    is_archived: item.archived,
    is_fork: item.fork,
    default_branch: item.default_branch,
    contributors_count: 0,
    source: "trending_sync",
    analysis_count: 0,
    last_analyzed_at: null,
    synced_at: now,
    stars_today: 0,
    stars_week: 0,
    stars_month: 0,
    velocity_score: 0,
    intel_score: 0,
    intel_grade: "D",
    trending_rank: null,
    last_metrics_sync: now,
    created_at: now,
    updated_at: now,
  }
}

async function postSyncMetrics() {
  try {
    const { readStore } = await import("@/src/server/lib/file-store")
    const store = readStore()
    for (const repo of store.repos) {
      await recordRepoMetricsSnapshot(repo)
    }
    const velocityCount = await recalculateAllVelocity()
    console.log(`[Scheduler] Snapshots recorded, velocity recalculated for ${velocityCount} repos`)
  } catch (err) {
    console.error("[Scheduler] Post-sync metrics update failed:", err)
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
    // 确保已有仓库有基线快照
    const baselineCount = ensureBaselineSnapshots()
    if (baselineCount > 0) {
      console.log(`[Scheduler] Created baseline snapshots for ${baselineCount} repos`)
    }

    // Trending 同步：daily + weekly + monthly
    syncTrending("daily")
    dailyTimer = setInterval(() => syncTrending("daily"), DAILY_INTERVAL)

    syncTrending("weekly")
    weeklyTimer = setInterval(() => syncTrending("weekly"), WEEKLY_INTERVAL)

    // monthly 同步（低频，每天执行一次即可）
    syncTrending("monthly")

    // Topic 发现：通过 GitHub Search API 补充项目
    syncTopicDiscovery()
    topicDiscoveryTimer = setInterval(() => syncTopicDiscovery(), TOPIC_DISCOVERY_INTERVAL)

    // 告警执行
    runAlerts()
    alertTimer = setInterval(() => runAlerts(), ALERT_INTERVAL)

    const HOURLY_ALERT_INTERVAL = 60 * 60 * 1000
    setInterval(() => runAlerts(), HOURLY_ALERT_INTERVAL)

    console.log(`[Scheduler] Started: daily every ${DAILY_INTERVAL / 3600000}h, weekly every ${WEEKLY_INTERVAL / 3600000}h, monthly daily, topic discovery every ${TOPIC_DISCOVERY_INTERVAL / 3600000}h, alerts every ${ALERT_INTERVAL / 60000}m + hourly`)
  }, INITIAL_DELAY)

  console.log(`[Scheduler] Will start first sync in ${INITIAL_DELAY / 1000}s (waiting for server ready)`)
}

export function stopSyncScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null }
  if (weeklyTimer) { clearInterval(weeklyTimer); weeklyTimer = null }
  if (alertTimer) { clearInterval(alertTimer); alertTimer = null }
  if (topicDiscoveryTimer) { clearInterval(topicDiscoveryTimer); topicDiscoveryTimer = null }
  started = false
  console.log("[Scheduler] Stopped")
}
