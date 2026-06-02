import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { createBackup, listBackups, restoreBackup } from "@/src/server/lib/database"

export const GET = withErrorHandling(() => {
  return jsonResponse(listBackups())
})

export const POST = withErrorHandling(() => {
  const backupPath = createBackup()
  return jsonResponse({ success: true, path: backupPath })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const body = await request.json() as { filename: string }
  if (!body.filename) {
    return jsonResponse({ error: "filename is required" }, { status: 400 })
  }
  const success = restoreBackup(body.filename)
  return jsonResponse({ success })
})
