import { readConfig, getActiveProvider } from "./desktop-config"

declare global {
  var __repoIntelEnvValidated: boolean | undefined
}

export function getServerEnv() {
  const config = readConfig()
  const active = getActiveProvider()

  return {
    githubToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || config.github_token,
    githubApiBaseUrl: config.github_api_base_url || process.env.GITHUB_API_BASE_URL || "https://api.github.com",
    llmProvider: active.provider || process.env.LLM_PROVIDER || "openai",
    llmApiKey: active.apiKey || process.env.LLM_API_KEY || "",
    llmBaseUrl: active.base_url || process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    llmModel: active.model || process.env.LLM_MODEL || "gpt-4.1-mini",
  }
}

if (typeof process !== "undefined" && !globalThis.__repoIntelEnvValidated) {
  globalThis.__repoIntelEnvValidated = true
  const env = getServerEnv()
  const warnings: string[] = []

  if (!env.githubToken) {
    warnings.push("GITHUB_TOKEN is not set. GitHub API requests will be rate-limited (60/hr).")
  }

  if (!env.llmApiKey) {
    warnings.push("LLM API key is not configured. Analysis generation will fail.")
  }

  if (warnings.length > 0) {
    console.warn("[GitSight] Startup warnings:")
    warnings.forEach((w) => console.warn(`  - ${w}`))
  }
}
