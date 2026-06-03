import { existsSync, readFileSync } from "fs"
import path from "path"
import type { AnalysisJobRecord, AnalysisReportRecord } from "@/src/server/modules/analysis/types"
import type { CompareAnalysisJob } from "@/src/server/modules/compare/compare-service"
import type { RepoMetricsSnapshot } from "@/src/server/modules/project/metrics-store"
import type { RepoRecord } from "@/src/server/modules/project/types"
import { getDb } from "./database"

export interface PushChannel {
  id: string
  type: "feishu" | "wecom" | "dingtalk" | "bark" | "pushplus" | "qmsg" | "discord" | "telegram" | "webhook" | "serverchan" | "wxpusher"
  name: string
  config: {
    webhook_url?: string
    bark_key?: string
    bark_server?: string
    pushplus_token?: string
    qmsg_key?: string
    discord_webhook_url?: string
    telegram_bot_token?: string
    telegram_chat_id?: string
    serverchan_key?: string
    wxpusher_app_token?: string
    wxpusher_uids?: string[]
    custom_url?: string
    custom_headers?: Record<string, string>
    custom_body_template?: string
  }
  is_configured: boolean
  last_test_at: string | null
  last_test_result: "success" | "failed" | null
  created_at: string
  updated_at: string
}

export interface AlertRuleRecord {
  id: string
  name: string
  conditions: {
    languages: string[]
    tags: string[]
    star_threshold: number
    min_stars: number | null
    max_stars: number | null
    velocity_range: { min?: number; max?: number } | null
    intel_grade_range: string[]
    exclude_languages: string[]
    exclude_tags: string[]
    forks_range: { min?: number; max?: number } | null
    license_types: string[]
    is_archived: boolean
  }
  frequency: "hourly" | "daily" | "weekly" | "on_change"
  channels: {
    webhook: boolean
    webhook_url: string
    channel_ids: string[]
  }
  is_active: boolean
  push_count: number
  last_push_at: string | null
  created_at: string
  updated_at: string
}

export interface AppStoreData {
  repos: RepoRecord[]
  metrics_snapshots: RepoMetricsSnapshot[]
  analysis_reports: AnalysisReportRecord[]
  analysis_jobs: AnalysisJobRecord[]
  compare_jobs: CompareAnalysisJob[]
  alert_rules: AlertRuleRecord[]
  push_channels: PushChannel[]
}

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

const defaultStore: AppStoreData = {
  repos: [],
  metrics_snapshots: [],
  analysis_reports: [],
  analysis_jobs: [],
  compare_jobs: [],
  alert_rules: [],
  push_channels: [],
}

const CACHE_TTL_MS = 5 * 1000 // 5 秒缓存过期，确保同步数据可被 API 读取

let storeCache: AppStoreData | null = null
let storeCacheTime = 0

function readReposFromDb(): RepoRecord[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM repos").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number,
    github_id: r.github_id as number,
    full_name: r.full_name as string,
    name: r.name as string,
    owner: r.owner as string,
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
  }))
}

function readMetricsSnapshotsFromDb(): RepoMetricsSnapshot[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM metrics_snapshots").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    repo_id: r.repo_id as number,
    stars: r.stars as number,
    forks: r.forks as number,
    open_issues_count: r.open_issues_count as number,
    watchers: r.watchers as number,
    captured_at: r.captured_at as string,
  }))
}

function readAnalysisReportsFromDb(): AnalysisReportRecord[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM analysis_reports").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number,
    repo_id: r.repo_id as number,
    section_type: r.section_type as AnalysisReportRecord["section_type"],
    mode: r.mode as AnalysisReportRecord["mode"],
    language: r.language as AnalysisReportRecord["language"],
    status: r.status as AnalysisReportRecord["status"],
    content: r.content ? JSON.parse(r.content as string) : null,
    mermaid_code: (r.mermaid_code as string) || null,
    content_hash: (r.content_hash as string) || null,
    is_stale: !!r.is_stale,
    is_pro: false,
    generated_by: (r.generated_by as string) || null,
    prompt_version: (r.prompt_version as string) || null,
    token_cost: r.token_cost as number,
    generated_at: (r.generated_at as string) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }))
}

function readAnalysisJobsFromDb(): AnalysisJobRecord[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM analysis_jobs").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    repo_id: r.repo_id as number,
    owner: r.owner as string,
    name: r.name as string,
    section_type: r.section_type as AnalysisJobRecord["section_type"],
    mode: r.mode as AnalysisJobRecord["mode"],
    language: r.language as AnalysisJobRecord["language"],
    status: r.status as AnalysisJobRecord["status"],
    report_id: r.report_id != null ? (r.report_id as number) : null,
    error: (r.error as string) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }))
}

function readCompareJobsFromDb(): CompareAnalysisJob[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM compare_jobs").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    repos: JSON.parse((r.repos as string) || "[]") as CompareAnalysisJob["repos"],
    status: r.status as CompareAnalysisJob["status"],
    markdown: (r.markdown as string) || null,
    generated_by: (r.generated_by as string) || null,
    error: (r.error as string) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }))
}

function readAlertRulesFromDb(): AlertRuleRecord[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM alert_rules").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    conditions: JSON.parse((r.conditions as string) || "{}") as AlertRuleRecord["conditions"],
    frequency: (r.frequency as AlertRuleRecord["frequency"]) || "daily",
    channels: JSON.parse((r.channels as string) || "{}") as AlertRuleRecord["channels"],
    is_active: !!r.is_active,
    push_count: r.push_count as number,
    last_push_at: (r.last_push_at as string) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }))
}

function readPushChannelsFromDb(): PushChannel[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM push_channels").all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as PushChannel["type"],
    name: r.name as string,
    config: JSON.parse((r.config as string) || "{}") as PushChannel["config"],
    is_configured: !!r.is_configured,
    last_test_at: (r.last_test_at as string) || null,
    last_test_result: (r.last_test_result as "success" | "failed") || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }))
}

function loadAllFromDb(): AppStoreData {
  return {
    repos: readReposFromDb(),
    metrics_snapshots: readMetricsSnapshotsFromDb(),
    analysis_reports: readAnalysisReportsFromDb(),
    analysis_jobs: readAnalysisJobsFromDb(),
    compare_jobs: readCompareJobsFromDb(),
    alert_rules: readAlertRulesFromDb(),
    push_channels: readPushChannelsFromDb(),
  }
}

function writeAllToDb(data: AppStoreData) {
  const db = getDb()
  const write = db.transaction(() => {
    db.prepare("DELETE FROM repos").run()
    db.prepare("DELETE FROM metrics_snapshots").run()
    db.prepare("DELETE FROM analysis_reports").run()
    db.prepare("DELETE FROM analysis_jobs").run()
    db.prepare("DELETE FROM compare_jobs").run()
    db.prepare("DELETE FROM alert_rules").run()
    db.prepare("DELETE FROM push_channels").run()

    const insertRepo = db.prepare(`INSERT INTO repos (id, github_id, full_name, name, owner, description, language,
      stars, forks, open_issues_count, watchers, license, topics, homepage,
      is_archived, is_fork, default_branch, contributors_count, source,
      analysis_count, last_analyzed_at, synced_at,
      stars_today, stars_week, stars_month, velocity_score, intel_score, intel_grade, trending_rank,
      last_metrics_sync, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const r of data.repos) {
      insertRepo.run(
        r.id, r.github_id, r.full_name, r.name, r.owner, r.description ?? null, r.language ?? null,
        r.stars, r.forks, r.open_issues_count, r.watchers, r.license ?? null,
        JSON.stringify(r.topics ?? []), r.homepage ?? null,
        r.is_archived ? 1 : 0, r.is_fork ? 1 : 0, r.default_branch, r.contributors_count, r.source,
        r.analysis_count, r.last_analyzed_at ?? null, r.synced_at ?? null,
        r.stars_today, r.stars_week, r.stars_month, r.velocity_score, r.intel_score ?? 0, r.intel_grade ?? "D", r.trending_rank ?? null,
        r.last_metrics_sync ?? null, r.created_at, r.updated_at
      )
    }

    const insertMetrics = db.prepare("INSERT INTO metrics_snapshots (repo_id, stars, forks, open_issues_count, watchers, captured_at) VALUES (?, ?, ?, ?, ?, ?)")
    for (const m of data.metrics_snapshots) {
      insertMetrics.run(m.repo_id, m.stars, m.forks, m.open_issues_count, m.watchers, m.captured_at)
    }

    const insertReport = db.prepare(`INSERT INTO analysis_reports (id, repo_id, section_type, mode, language,
      status, content, mermaid_code, content_hash, is_stale,
      generated_by, prompt_version, token_cost, generated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const r of data.analysis_reports) {
      insertReport.run(
        r.id, r.repo_id, r.section_type, r.mode, r.language,
        r.status, r.content ? JSON.stringify(r.content) : null,
        r.mermaid_code ?? null, r.content_hash ?? null,
        r.is_stale ? 1 : 0,
        r.generated_by ?? null, r.prompt_version ?? null, r.token_cost,
        r.generated_at ?? null, r.created_at, r.updated_at
      )
    }

    const insertJob = db.prepare(`INSERT INTO analysis_jobs (id, repo_id, owner, name, section_type, mode, language,
      status, report_id, error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const j of data.analysis_jobs) {
      insertJob.run(
        j.id, j.repo_id, j.owner, j.name, j.section_type, j.mode, j.language,
        j.status, j.report_id ?? null, j.error ?? null, j.created_at, j.updated_at
      )
    }

    const insertCompare = db.prepare(`INSERT INTO compare_jobs (id, repos, status, markdown, generated_by,
      error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const c of data.compare_jobs) {
      insertCompare.run(
        c.id, JSON.stringify(c.repos ?? []),
        c.status, c.markdown ?? null, c.generated_by ?? null,
        c.error ?? null, c.created_at, c.updated_at
      )
    }

    const insertAlert = db.prepare(`INSERT INTO alert_rules (id, name, conditions, frequency, channels,
      is_active, push_count, last_push_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const a of data.alert_rules) {
      insertAlert.run(
        a.id, a.name, JSON.stringify(a.conditions ?? {}),
        a.frequency, JSON.stringify(a.channels ?? {}),
        a.is_active ? 1 : 0, a.push_count, a.last_push_at ?? null, a.created_at, a.updated_at
      )
    }

    const insertPushChannel = db.prepare(`INSERT INTO push_channels (id, type, name, config, is_configured, last_test_at, last_test_result, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const c of data.push_channels) {
      insertPushChannel.run(
        c.id, c.type, c.name, JSON.stringify(c.config ?? {}),
        c.is_configured ? 1 : 0, c.last_test_at ?? null, c.last_test_result ?? null, c.created_at, c.updated_at
      )
    }
  })

  write()
}

export function readStore(): AppStoreData {
  const now = Date.now()
  if (storeCache && now - storeCacheTime < CACHE_TTL_MS) return storeCache

  try {
    storeCache = loadAllFromDb()
    storeCacheTime = now
    maybeTriggerTrendingSync(storeCache)
    return storeCache
  } catch (error) {
    console.error("[DataStore] Failed to read from SQLite:", error)
    return { ...defaultStore }
  }
}

let trendingSyncInFlight = false

async function maybeTriggerTrendingSync(store: AppStoreData) {
  if (trendingSyncInFlight) return
  if (store.repos.length > 0) {
    const lastSync = store.repos[0]?.synced_at || store.repos[0]?.updated_at
    if (lastSync) {
      const hoursSinceSync = (Date.now() - Date.parse(lastSync)) / (1000 * 60 * 60)
      if (hoursSinceSync < 4) return
    }
  }
  trendingSyncInFlight = true
  console.log("[DataStore] Triggering trending sync (repos empty or stale)...")
  try {
    const { syncTrending, syncTopicDiscovery } = await import("@/src/server/lib/sync-scheduler")
    const weeklyResult = await syncTrending("weekly")
    console.log("[DataStore] Weekly trending sync result:", JSON.stringify(weeklyResult))
    const topicResult = await syncTopicDiscovery()
    console.log("[DataStore] Topic discovery result:", JSON.stringify(topicResult))
  } catch (err) {
    console.error("[DataStore] Trending sync failed:", err)
  } finally {
    trendingSyncInFlight = false
  }
}

export function writeStore(next: AppStoreData) {
  try {
    writeAllToDb(next)
    storeCache = next
    storeCacheTime = Date.now()
  } catch (error) {
    console.error("[DataStore] Failed to write to SQLite:", error)
  }
}

export async function updateStore<T>(updater: (current: AppStoreData) => T): Promise<T> {
  // 始终从 DB 重新加载，避免多进程/模块实例间缓存不一致导致全量覆盖
  const current = loadAllFromDb()
  storeCache = current
  storeCacheTime = Date.now()
  maybeCleanupStaleData(current)
  const result = updater(current)
  writeStore(current)
  return result
}

function maybeCleanupStaleData(store: AppStoreData) {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now

  const isoNow = new Date().toISOString()
  const before = store.analysis_jobs.length
  store.analysis_jobs = store.analysis_jobs.filter(
    (j) => j.status === "pending" || j.status === "running" || new Date(j.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  const removed = before - store.analysis_jobs.length
  if (removed > 0) {
    console.info(`[DataStore] Cleaned up ${removed} old analysis jobs`)
  }
}

let lastCleanupAt = 0
