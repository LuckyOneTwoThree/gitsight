import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { deleteCompareReport } from "@/src/server/modules/user/workspace-service"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export const DELETE = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { id } = await (context as RouteContext).params

  const deleted = await deleteCompareReport(id)
  if (!deleted) {
    return errorResponse("NOT_FOUND", "Compare report not found", 404)
  }

  return jsonResponse({ ok: true })
})
