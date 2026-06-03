import { NextResponse } from "next/server"
import { readConfig, updateConfig, applyProviderDefaults, isConfigured, updateLlmProviders } from "@/src/server/lib/desktop-config"

export async function GET() {
  try {
    const config = readConfig()
    const configured = isConfigured()
    return NextResponse.json({
      config: {
        github_token: config.github_token ? "****" : "",
        language: config.language,
        theme: config.theme,
        // Multi-provider
        llm_providers: config.llm_providers.map((p) => ({
          ...p,
          hasApiKey: Boolean(config.llm_api_keys[p.id]),
        })),
        llm_active_provider_id: config.llm_active_provider_id,
      },
      isConfigured: configured,
    })
  } catch {
    return NextResponse.json({ config: null, isConfigured: false }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>

    // ── Multi-provider update ──────────────────────────────────
    if ("llm_providers" in body && "llm_active_provider_id" in body) {
      const providers = body.llm_providers as Array<{ id: string; provider: string; base_url: string; model: string }>
      const activeId = body.llm_active_provider_id as string
      const keyUpdates = body.llm_api_keys as Record<string, string> | undefined

      const updated = updateLlmProviders(providers, activeId, keyUpdates)
      return NextResponse.json({
        config: {
          github_token: updated.github_token ? "****" : "",
          language: updated.language,
          theme: updated.theme,
          llm_providers: updated.llm_providers.map((p) => ({
            ...p,
            hasApiKey: Boolean(updated.llm_api_keys[p.id]),
          })),
          llm_active_provider_id: updated.llm_active_provider_id,
        },
        isConfigured: isConfigured(),
      })
    }

    // ── Legacy single-field updates (github_token, language, theme) ──
    const partial: Record<string, string> = {}
    if ("github_token" in body) partial.github_token = body.github_token as string
    if ("language" in body) partial.language = body.language as string
    if ("theme" in body) partial.theme = body.theme as string

    // Also handle legacy LLM fields for backward compat
    if ("llm_api_key" in body) partial.llm_api_key = body.llm_api_key as string
    if ("llm_provider" in body) {
      partial.llm_provider = body.llm_provider as string
      const defaults = applyProviderDefaults(body.llm_provider as string)
      if (defaults.llm_base_url) partial.llm_base_url = defaults.llm_base_url
      if (defaults.llm_model) partial.llm_model = defaults.llm_model
    }
    if ("llm_base_url" in body) partial.llm_base_url = body.llm_base_url as string
    if ("llm_model" in body) partial.llm_model = body.llm_model as string

    const updated = updateConfig(partial)

    return NextResponse.json({
      config: {
        github_token: updated.github_token ? "****" : "",
        language: updated.language,
        theme: updated.theme,
        llm_providers: updated.llm_providers.map((p) => ({
          ...p,
          hasApiKey: Boolean(updated.llm_api_keys[p.id]),
        })),
        llm_active_provider_id: updated.llm_active_provider_id,
      },
      isConfigured: isConfigured(),
    })
  } catch (err) {
    console.error("[ConfigAPI] PUT failed:", err)
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : "更新配置失败" } }, { status: 500 })
  }
}
