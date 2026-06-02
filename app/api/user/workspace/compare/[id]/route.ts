import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { deleteCompareReport } from "@/src/server/modules/user/workspace-service"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params

  const deleted = await deleteCompareReport(id)
  if (!deleted) {
    return errorResponse("NOT_FOUND", "Compare report not found", 404)
  }

  return jsonResponse({ ok: true })
}
