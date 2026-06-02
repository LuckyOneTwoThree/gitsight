import { NextResponse } from "next/server"
import { readConfig, updateConfig, applyProviderDefaults, isConfigured } from "@/src/server/lib/desktop-config"

export async function GET() {
  try {
    const config = readConfig()
    const configured = isConfigured()
    return NextResponse.json({
      config: {
        github_token: config.github_token ? "****" : "",
        llm_api_key: config.llm_api_key ? "****" : "",
        llm_provider: config.llm_provider,
        llm_model: config.llm_model,
        language: config.language,
        theme: config.theme,
      },
      isConfigured: configured,
    })
  } catch {
    return NextResponse.json({ config: null, isConfigured: false }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as Record<string, string>
    const partial: Record<string, string> = {}

    if ("github_token" in body) partial.github_token = body.github_token
    if ("llm_api_key" in body) partial.llm_api_key = body.llm_api_key
    if ("llm_provider" in body) {
      partial.llm_provider = body.llm_provider
      const defaults = applyProviderDefaults(body.llm_provider)
      if (defaults.llm_base_url) partial.llm_base_url = defaults.llm_base_url
      if (defaults.llm_model) partial.llm_model = defaults.llm_model
    }
    if ("llm_base_url" in body) partial.llm_base_url = body.llm_base_url
    if ("llm_model" in body) partial.llm_model = body.llm_model
    if ("language" in body) partial.language = body.language
    if ("theme" in body) partial.theme = body.theme

    const updated = updateConfig(partial)

    return NextResponse.json({
      config: {
        github_token: updated.github_token ? "****" : "",
        llm_api_key: updated.llm_api_key ? "****" : "",
        llm_provider: updated.llm_provider,
        llm_model: updated.llm_model,
        language: updated.language,
        theme: updated.theme,
      },
      isConfigured: isConfigured(),
    })
  } catch (err) {
    console.error("[ConfigAPI] PUT failed:", err)
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : "更新配置失败" } }, { status: 500 })
  }
}
