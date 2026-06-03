import { jsonResponse } from "@/src/server/lib/http"
import { deleteBackup } from "@/src/server/lib/database"

interface RouteContext {
  params: Promise<{
    filename: string
  }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { filename } = await context.params
  const success = deleteBackup(filename)
  if (!success) {
    return jsonResponse({ error: "backup not found" }, { status: 404 })
  }
  return jsonResponse({ success: true })
}
