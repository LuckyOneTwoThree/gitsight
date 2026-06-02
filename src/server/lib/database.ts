import Database from "better-sqlite3"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { readdirSync } from "fs"
import path from "path"
import { getConfigDirPath } from "./desktop-config"

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance

  const dataDir = getConfigDirPath()
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  let dbPath = path.join(dataDir, "repo-intel.db")
  try {
    dbInstance = new Database(dbPath)
  } catch {
    const localDir = path.join(process.cwd(), ".data")
    if (!existsSync(localDir)) {
      mkdirSync(localDir, { recursive: true })
    }
    dbPath = path.join(localDir, "repo-intel.db")
    dbInstance = new Database(dbPath)
  }
  dbInstance.pragma("journal_mode = WAL")
  dbInstance.pragma("foreign_keys = ON")
  dbInstance.pragma("busy_timeout = 5000")

  initializeTables(dbInstance)

  return dbInstance
}

function initializeTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      id INTEGER PRIMARY KEY,
      github_id INTEGER NOT NULL,
      full_name TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      description TEXT,
      language TEXT,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues_count INTEGER NOT NULL DEFAULT 0,
      watchers INTEGER NOT NULL DEFAULT 0,
      license TEXT,
      topics TEXT NOT NULL DEFAULT '[]',
      homepage TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_fork INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT NOT NULL DEFAULT 'main',
      contributors_count INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'seed',
      analysis_count INTEGER NOT NULL DEFAULT 0,
      last_analyzed_at TEXT,
      synced_at TEXT,
      stars_today INTEGER NOT NULL DEFAULT 0,
      stars_week INTEGER NOT NULL DEFAULT 0,
      stars_month INTEGER NOT NULL DEFAULT 0,
      velocity_score REAL NOT NULL DEFAULT 0,
      intel_score INTEGER NOT NULL DEFAULT 0,
      intel_grade TEXT NOT NULL DEFAULT 'D',
      trending_rank INTEGER,
      last_metrics_sync TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues_count INTEGER NOT NULL DEFAULT 0,
      watchers INTEGER NOT NULL DEFAULT 0,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      section_type TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'fast',
      language TEXT NOT NULL DEFAULT 'zh',
      status TEXT NOT NULL DEFAULT 'not_generated',
      content TEXT,
      mermaid_code TEXT,
      content_hash TEXT,
      is_stale INTEGER NOT NULL DEFAULT 0,
      generated_by TEXT,
      prompt_version TEXT,
      token_cost INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id TEXT PRIMARY KEY,
      repo_id INTEGER NOT NULL,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      section_type TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'fast',
      language TEXT NOT NULL DEFAULT 'zh',
      status TEXT NOT NULL DEFAULT 'pending',
      report_id INTEGER,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compare_jobs (
      id TEXT PRIMARY KEY,
      repos TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'generating',
      markdown TEXT,
      generated_by TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      conditions TEXT NOT NULL DEFAULT '{}',
      frequency TEXT NOT NULL DEFAULT 'daily',
      channels TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      push_count INTEGER NOT NULL DEFAULT 0,
      last_push_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_channels (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      is_configured INTEGER NOT NULL DEFAULT 0,
      last_test_at TEXT,
      last_test_result TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_push_channels_type ON push_channels(type);

    CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repos(full_name);
    CREATE INDEX IF NOT EXISTS idx_repos_language ON repos(language);
    CREATE INDEX IF NOT EXISTS idx_repos_stars ON repos(stars DESC);
    CREATE INDEX IF NOT EXISTS idx_repos_velocity_score ON repos(velocity_score DESC);
    CREATE INDEX IF NOT EXISTS idx_repos_intel_score ON repos(intel_score DESC);
    CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_repo_id ON metrics_snapshots(repo_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_reports_repo_id ON analysis_reports(repo_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_reports_section_type ON analysis_reports(section_type);
    CREATE INDEX IF NOT EXISTS idx_analysis_jobs_repo_id ON analysis_jobs(repo_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_watchlist_repo_id ON watchlist(repo_id);
  `)
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export function getDbPath(): string {
  const dataDir = getConfigDirPath()
  return path.join(dataDir, "repo-intel.db")
}

export function createBackup(): string {
  const db = getDb()
  const dataDir = getConfigDirPath()
  const backupDir = path.join(dataDir, "backups")
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(backupDir, `repo-intel-${timestamp}.db`)
  db.backup(backupPath)
  return backupPath
}

export function listBackups(): Array<{ filename: string; size: number; created_at: string }> {
  const dataDir = getConfigDirPath()
  const backupDir = path.join(dataDir, "backups")
  if (!existsSync(backupDir)) return []

  return readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = require("fs").statSync(path.join(backupDir, f))
      return {
        filename: f,
        size: stat.size,
        created_at: stat.mtime.toISOString(),
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function restoreBackup(filename: string): boolean {
  const dataDir = getConfigDirPath()
  const backupDir = path.join(dataDir, "backups")
  const backupPath = path.join(backupDir, filename)

  if (!existsSync(backupPath)) return false
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return false

  const dbPath = getDbPath()
  closeDb()

  const backupData = readFileSync(backupPath)
  writeFileSync(dbPath, backupData)

  return true
}

export function getBackupFilepath(filename: string): string | null {
  const dataDir = getConfigDirPath()
  const backupDir = path.join(dataDir, "backups")
  const backupPath = path.join(backupDir, filename)

  if (!existsSync(backupPath)) return null
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return null

  return backupPath
}
