import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { deleteAnalysisReport } from "@/src/server/modules/user/workspace-service"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params
  const id = Number(rawId)

  if (!Number.isFinite(id) || id <= 0) {
    return errorResponse("INVALID_ID", "Invalid report ID", 400)
  }

  const deleted = await deleteAnalysisReport(id)
  if (!deleted) {
    return errorResponse("NOT_FOUND", "Report not found", 404)
  }

  return jsonResponse({ ok: true })
}
