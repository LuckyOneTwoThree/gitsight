import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getComparisonMarkdownJob } from "@/src/server/modules/compare/compare-service"

interface RouteContext {
  params: Promise<{
    taskId: string
  }>
}

export const GET = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { taskId } = await (context as RouteContext).params
  const job = getComparisonMarkdownJob(taskId)

  if (!job) {
    return errorResponse("COMPARE_TASK_NOT_FOUND", "Comparison analysis task was not found.", 404)
  }

  return jsonResponse(job)
})
