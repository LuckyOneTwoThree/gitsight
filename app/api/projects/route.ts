import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getProjects } from "@/src/server/modules/project/project-service"

export const GET = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get("page") || 1)
  const limit = Number(url.searchParams.get("limit") || 12)
  const offset = url.searchParams.has("offset")
    ? Number(url.searchParams.get("offset"))
    : undefined
  const tab = url.searchParams.get("tab") || "velocity"
  const range = url.searchParams.get("range") || "today"

  return jsonResponse(getProjects(page, limit, offset, tab, range))
})
