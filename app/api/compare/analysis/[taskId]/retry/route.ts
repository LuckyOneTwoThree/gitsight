import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { getComparisonMarkdownJob, retryComparisonMarkdownJob } from "@/src/server/modules/compare/compare-service"

interface RouteContext {
  params: Promise<{
    taskId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { taskId } = await context.params
  const job = getComparisonMarkdownJob(taskId)
  if (!job) {
    return errorResponse("COMPARE_TASK_NOT_FOUND", "Comparison analysis task was not found.", 404)
  }

  return jsonResponse(retryComparisonMarkdownJob(taskId))
}
