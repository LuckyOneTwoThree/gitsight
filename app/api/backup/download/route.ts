import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getBackupFilepath } from "@/src/server/lib/database"
import { readFileSync } from "fs"

export const GET = withErrorHandling(async (request: Request) => {
  const url = new URL(request.url)
  const filename = url.searchParams.get("filename")
  if (!filename) {
    return jsonResponse({ error: "filename is required" }, { status: 400 })
  }

  const backupPath = getBackupFilepath(filename)
  if (!backupPath) {
    return jsonResponse({ error: "backup not found" }, { status: 404 })
  }

  const data = readFileSync(backupPath)
  return new Response(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
})
