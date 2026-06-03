import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"

// ── Provider types ─────────────────────────────────────────────
export interface LlmProviderConfig {
  id: string
  provider: string
  base_url: string
  model: string
}

// ── Config types ───────────────────────────────────────────────
export interface DesktopConfig {
  github_token: string
  github_api_base_url: string
  // Multi-provider
  llm_providers: LlmProviderConfig[]
  llm_active_provider_id: string
  llm_api_keys: Record<string, string>   // id → apiKey, stored separately
  // Legacy (kept for backward compat, not actively used)
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
  llm_providers: [],
  llm_active_provider_id: "",
  llm_api_keys: {},
  // Legacy
  llm_provider: "openai",
  llm_api_key: "",
  llm_base_url: "https://api.openai.com/v1",
  llm_model: "gpt-4.1-mini",
  language: "zh",
  theme: "system",
}

// ── Provider defaults (for new provider creation) ──────────────
export const PROVIDER_DEFAULTS: Record<string, { label: string; base_url: string; model: string }> = {
  openai:      { label: "OpenAI",                       base_url: "https://api.openai.com/v1",                                    model: "gpt-4.1-mini" },
  anthropic:   { label: "Anthropic (Claude)",            base_url: "https://api.anthropic.com/v1",                                 model: "claude-sonnet-4-20250514" },
  google:      { label: "Google (Gemini)",               base_url: "https://generativelanguage.googleapis.com/v1beta/openai",       model: "gemini-2.5-flash" },
  openrouter:  { label: "OpenRouter (免费额度)",          base_url: "https://openrouter.ai/api/v1",                                model: "google/gemini-2.5-flash-preview" },
  deepseek:    { label: "DeepSeek (深度求索)",            base_url: "https://api.deepseek.com/v1",                                  model: "deepseek-chat" },
  qwen:        { label: "通义千问 (阿里)",                base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",            model: "qwen-plus" },
  zhipu:       { label: "智谱 (GLM)",                    base_url: "https://open.bigmodel.cn/api/paas/v4",                         model: "glm-4-flash" },
  kimi:        { label: "Kimi (月之暗面)",                base_url: "https://api.moonshot.ai/v1",                                   model: "moonshot-v1-32k" },
  mimo:        { label: "MiMo (小米)",                    base_url: "https://api.mimo.ai/v1",                                       model: "mimo-v2.5-pro" },
  volcengine:  { label: "豆包 (火山引擎)",                base_url: "https://ark.cn-beijing.volces.com/api/v3",                     model: "doubao-1.5-pro-32k" },
  baichuan:    { label: "百川 (Baichuan)",                base_url: "https://api.baichuan-ai.com/v1",                               model: "Baichuan4" },
  yi:          { label: "零一万物 (Yi)",                  base_url: "https://api.lingyiwanwu.com/v1",                               model: "yi-lightning" },
  stepfun:     { label: "阶跃星辰 (StepFun)",             base_url: "https://api.stepfun.com/v1",                                   model: "step-2-16k" },
  minimax:     { label: "MiniMax",                       base_url: "https://api.minimax.chat/v1",                                  model: "MiniMax-Text-01" },
  siliconflow: { label: "SiliconFlow (硅基流动)",         base_url: "https://api.siliconflow.cn/v1",                                model: "Qwen/Qwen3-8B" },
  custom:      { label: "自定义 (Custom)",                base_url: "",                                                             model: "" },
}

// ── Config directory ───────────────────────────────────────────
function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE
  if (home) {
    const userDir = path.join(home, ".repointel")
    try {
      if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true })
      const testFile = path.join(userDir, ".write-test")
      writeFileSync(testFile, "", "utf8")
      try { require("fs").unlinkSync(testFile) } catch {}
      return userDir
    } catch { /* fall through */ }
  }
  const localDir = path.join(process.cwd(), ".data")
  if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true })
  return localDir
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json")
}

// ── Read / Write ───────────────────────────────────────────────
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
    const parsed = JSON.parse(raw) as Record<string, unknown>
    cachedConfig = migrateConfig(parsed)
    return cachedConfig
  } catch {
    cachedConfig = { ...defaultConfig }
    return cachedConfig
  }
}

function migrateConfig(raw: Record<string, unknown>): DesktopConfig {
  const config = { ...defaultConfig, ...raw } as DesktopConfig

  // Migrate from old single-provider format (only when llm_providers is missing entirely)
  if (!config.llm_providers || !Array.isArray(config.llm_providers)) {
    const legacyId = `${config.llm_provider || "openai"}-1`
    config.llm_providers = [
      {
        id: legacyId,
        provider: config.llm_provider || "openai",
        base_url: config.llm_base_url || "https://api.openai.com/v1",
        model: config.llm_model || "gpt-4.1-mini",
      },
    ]
    config.llm_active_provider_id = legacyId
    if (config.llm_api_key) {
      config.llm_api_keys = { [legacyId]: config.llm_api_key }
    }
  }
  if (!config.llm_active_provider_id) {
    config.llm_active_provider_id = config.llm_providers[0].id
  }
  if (!config.llm_api_keys || typeof config.llm_api_keys !== "object") {
    config.llm_api_keys = {}
  }

  return config
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

// ── Multi-provider helpers ─────────────────────────────────────

/** Get the currently active LLM provider config + apiKey */
export function getActiveProvider(): LlmProviderConfig & { apiKey: string } {
  const config = readConfig()
  const active = config.llm_providers.find((p) => p.id === config.llm_active_provider_id)
    || config.llm_providers[0]
  return { ...active, apiKey: config.llm_api_keys[active.id] || "" }
}

/** Update the providers list and/or active ID, preserving existing API keys */
export function updateLlmProviders(
  providers: LlmProviderConfig[],
  activeId: string,
  keyUpdates?: Record<string, string>,
): DesktopConfig {
  const config = readConfig()
  const mergedKeys = { ...config.llm_api_keys }
  if (keyUpdates) {
    for (const [id, key] of Object.entries(keyUpdates)) {
      if (key) mergedKeys[id] = key
    }
  }
  const next = {
    ...config,
    llm_providers: providers,
    llm_active_provider_id: activeId,
    llm_api_keys: mergedKeys,
  }
  writeConfig(next)
  return next
}

export function applyProviderDefaults(provider: string): Partial<DesktopConfig> {
  const d = PROVIDER_DEFAULTS[provider]
  if (!d) return {}
  return { llm_base_url: d.base_url, llm_model: d.model }
}

export function isConfigured(): boolean {
  const config = readConfig()
  if (config.llm_providers?.length > 0) {
    const active = getActiveProvider()
    return Boolean(config.github_token) && Boolean(active.apiKey)
  }
  return Boolean(config.github_token) && Boolean(config.llm_api_key)
}

export function getConfigDirPath(): string {
  return getConfigDir()
}
