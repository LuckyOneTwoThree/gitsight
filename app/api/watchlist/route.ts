import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getWatchlistRepos, addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/src/server/modules/project/watchlist-store"
import { starGitHubRepo, unstarGitHubRepo } from "@/src/server/modules/project/github-client"
import { getDb } from "@/src/server/lib/database"

function getRepoOwnerName(repoId: number): { owner: string; name: string } | null {
  const db = getDb()
  const row = db.prepare("SELECT owner, name FROM repos WHERE id = ?").get(repoId) as { owner: string; name: string } | undefined
  return row ?? null
}

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

  // Sync to GitHub Star (fire-and-forget)
  const repoInfo = getRepoOwnerName(repoId)
  if (repoInfo) {
    starGitHubRepo(repoInfo.owner, repoInfo.name)
  }

  return jsonResponse(item)
})

export const DELETE = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const repoId = Number(url.searchParams.get("repo_id"))
  if (!repoId) {
    return jsonResponse({ error: "repo_id is required" }, { status: 400 })
  }

  // Get repo info before removing from watchlist
  const repoInfo = getRepoOwnerName(repoId)
  const removed = removeFromWatchlist(repoId)

  // Sync to GitHub unstar (fire-and-forget)
  if (repoInfo) {
    unstarGitHubRepo(repoInfo.owner, repoInfo.name)
  }

  return jsonResponse({ removed })
})
