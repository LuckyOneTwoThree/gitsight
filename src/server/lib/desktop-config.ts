import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"

export interface DesktopConfig {
  github_token: string
  github_api_base_url: string
  llm_provider: string
  llm_api_key: string
  llm_base_url: string
  llm_model: string
  language: "zh" | "en"
  theme: "light" | "dark" | "system"
}

const defaultConfig: DesktopConfig = {
  github_token: "",
  github_api_base_url: "https://api.github.com",
  llm_provider: "openai",
  llm_api_key: "",
  llm_base_url: "https://api.openai.com/v1",
  llm_model: "gpt-4.1-mini",
  language: "zh",
  theme: "system",
}

const providerDefaults: Record<string, Partial<DesktopConfig>> = {
  openai: {
    llm_base_url: "https://api.openai.com/v1",
    llm_model: "gpt-4.1-mini",
  },
  deepseek: {
    llm_base_url: "https://api.deepseek.com/v1",
    llm_model: "deepseek-chat",
  },
  kimi: {
    llm_base_url: "https://api.moonshot.ai/v1",
    llm_model: "moonshot-v1-32k",
  },
  mimo: {
    llm_base_url: "https://token-plan-cn.xiaomimimo.com/v1",
    llm_model: "mimo-v2.5-pro",
  },
  openrouter: {
    llm_base_url: "https://openrouter.ai/api/v1",
    llm_model: "xiaomi/mimo-v2.5-pro",
  },
}

function getConfigDir(): string {
  // Try user home first, fallback to project-local .data directory
  const home = process.env.HOME || process.env.USERPROFILE
  if (home) {
    const userDir = path.join(home, ".repointel")
    try {
      if (!existsSync(userDir)) {
        mkdirSync(userDir, { recursive: true })
      }
      // Test write permission
      const testFile = path.join(userDir, ".write-test")
      writeFileSync(testFile, "", "utf8")
      try { require("fs").unlinkSync(testFile) } catch {}
      return userDir
    } catch {
      // Fall through to local directory
    }
  }
  const localDir = path.join(process.cwd(), ".data")
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true })
  }
  return localDir
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json")
}

let cachedConfig: DesktopConfig | null = null

export function readConfig(): DesktopConfig {
  if (cachedConfig) return cachedConfig

  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    cachedConfig = { ...defaultConfig }
    return cachedConfig
  }

  try {
    const raw = readFileSync(configPath, "utf8")
    const parsed = JSON.parse(raw) as Partial<DesktopConfig>
    cachedConfig = { ...defaultConfig, ...parsed }
    return cachedConfig
  } catch {
    cachedConfig = { ...defaultConfig }
    return cachedConfig
  }
}

export function writeConfig(config: DesktopConfig): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8")
  cachedConfig = config
}

export function updateConfig(partial: Partial<DesktopConfig>): DesktopConfig {
  const current = readConfig()
  const next = { ...current, ...partial }
  writeConfig(next)
  return next
}

export function applyProviderDefaults(provider: string): Partial<DesktopConfig> {
  return providerDefaults[provider] || {}
}

export function isConfigured(): boolean {
  const config = readConfig()
  return Boolean(config.github_token) && Boolean(config.llm_api_key)
}

export function getConfigDirPath(): string {
  return getConfigDir()
}
