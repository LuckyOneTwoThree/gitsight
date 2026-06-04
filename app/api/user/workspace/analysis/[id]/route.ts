import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { deleteAnalysisReport } from "@/src/server/modules/user/workspace-service"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export const DELETE = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { id: rawId } = await (context as RouteContext).params
  const id = Number(rawId)

  if (!Number.isFinite(id) || id <= 0) {
    return errorResponse("INVALID_ID", "Invalid report ID", 400)
  }

  const deleted = await deleteAnalysisReport(id)
  if (!deleted) {
    return errorResponse("NOT_FOUND", "Report not found", 404)
  }

  return jsonResponse({ ok: true })
})
