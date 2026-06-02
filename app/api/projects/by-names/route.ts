import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { readStore } from "@/src/server/lib/file-store"
import { computeVelocityForRepo } from "@/src/server/modules/project/velocity-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const names = body.names as string[] | undefined

    if (!names || !Array.isArray(names) || names.length === 0) {
      return errorResponse("INVALID_NAMES", "names must be a non-empty array", 400)
    }

    const store = readStore()
    const allSnapshots = store.metrics_snapshots
    const nameSet = new Set(names.map((n) => n.toLowerCase()))

    const matched = store.repos
      .filter((repo) => nameSet.has(repo.full_name.toLowerCase()))
      .map((repo) => {
        const velocity = computeVelocityForRepo(repo, allSnapshots)
        return {
          ...repo,
          stars_today: velocity.stars_today,
          stars_week: velocity.stars_week,
          stars_month: velocity.stars_month,
          velocity_score: velocity.velocity_score,
        }
      })

    return jsonResponse({ data: matched })
  } catch (error) {
    console.error("[projects/by-names] Error:", error)
    return errorResponse("FAILED", "Failed to fetch projects by names", 500)
  }
}
