import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { isInWatchlist } from "@/src/server/modules/project/watchlist-store"

export const GET = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const repoId = Number(url.searchParams.get("repo_id"))
  if (!repoId) {
    return jsonResponse({ error: "repo_id is required" }, { status: 400 })
  }
  return jsonResponse({ watched: isInWatchlist(repoId) })
})
