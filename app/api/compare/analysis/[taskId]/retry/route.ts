import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getComparisonMarkdownJob, retryComparisonMarkdownJob } from "@/src/server/modules/compare/compare-service"
import { getActiveProvider, isConfigured } from "@/src/server/lib/desktop-config"

interface RouteContext {
  params: Promise<{
    taskId: string
  }>
}

export const POST = withErrorHandling(async (_request: Request, context?: unknown) => {
  if (!isConfigured()) {
    return errorResponse("NOT_CONFIGURED", "请先在设置中配置 LLM API Key", 403)
  }

  const { taskId } = await (context as RouteContext).params
  const job = getComparisonMarkdownJob(taskId)
  if (!job) {
    return errorResponse("COMPARE_TASK_NOT_FOUND", "Comparison analysis task was not found.", 404)
  }

  const active = getActiveProvider()
  const llmConfig = {
    provider: active.provider,
    apiKey: active.apiKey,
    baseUrl: active.base_url,
    model: active.model,
  }

  return jsonResponse(retryComparisonMarkdownJob(taskId, llmConfig))
})
