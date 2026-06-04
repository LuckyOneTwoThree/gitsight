import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { deleteBackup } from "@/src/server/lib/database"

interface RouteContext {
  params: Promise<{
    filename: string
  }>
}

export const DELETE = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { filename } = await (context as RouteContext).params
  const success = deleteBackup(filename)
  if (!success) {
    return jsonResponse({ error: "backup not found" }, { status: 404 })
  }
  return jsonResponse({ success: true })
})
