import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getWatchlistRepos, addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/src/server/modules/project/watchlist-store"

export const GET = withErrorHandling(() => {
  return jsonResponse(getWatchlistRepos())
})

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json() as { repo_id: number }
  const repoId = body.repo_id
  if (!repoId || typeof repoId !== "number") {
    return jsonResponse({ error: "repo_id is required" }, { status: 400 })
  }
  const item = addToWatchlist(repoId)
  return jsonResponse(item)
})

export const DELETE = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const repoId = Number(url.searchParams.get("repo_id"))
  if (!repoId) {
    return jsonResponse({ error: "repo_id is required" }, { status: 400 })
  }
  const removed = removeFromWatchlist(repoId)
  return jsonResponse({ removed })
})
