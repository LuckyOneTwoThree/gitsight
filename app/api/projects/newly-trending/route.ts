import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getNewlyTrending } from "@/src/server/modules/project/project-service"

export const GET = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const hours = Number(url.searchParams.get("hours") || 24)
  const limit = Number(url.searchParams.get("limit") || 6)

  return jsonResponse(getNewlyTrending(hours, limit))
})
