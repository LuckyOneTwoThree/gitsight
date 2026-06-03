import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { startComparisonMarkdownJob } from "@/src/server/modules/compare/compare-service"
import { getActiveProvider, isConfigured } from "@/src/server/lib/desktop-config"

interface CompareAnalysisRequest {
  repos?: Array<{
    owner?: string
    name?: string
  }>
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return errorResponse("NOT_CONFIGURED", "请先在设置中配置 LLM API Key", 403)
  }

  const body = (await request.json().catch(() => null)) as CompareAnalysisRequest | null
  const repos = (body?.repos || [])
    .map((repo) => ({
      owner: String(repo.owner || "").trim(),
      name: String(repo.name || "").trim(),
    }))
    .filter((repo) => repo.owner && repo.name)

  if (repos.length < 2) {
    return errorResponse("INVALID_COMPARE_REPOS", "Please select at least two repositories.", 400)
  }

  try {
    const active = getActiveProvider()
    const llmConfig = {
      provider: active.provider,
      apiKey: active.apiKey,
      baseUrl: active.base_url,
      model: active.model,
    }
    const job = startComparisonMarkdownJob(repos, llmConfig)
    return jsonResponse(job)
  } catch (error) {
    return errorResponse(
      "COMPARE_ANALYSIS_FAILED",
      error instanceof Error ? error.message : "Failed to generate comparison analysis.",
      500
    )
  }
}
