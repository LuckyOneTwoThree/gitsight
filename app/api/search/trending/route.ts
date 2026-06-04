import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { readStore } from "@/src/server/lib/file-store"
import { computeVelocityForRepo } from "@/src/server/modules/project/velocity-service"
import { trackDefinitions, matchTrack } from "@/src/server/modules/landscape/landscape-service"

export const GET = withErrorHandling(() => {
    const store = readStore()
    const allSnapshots = store.metrics_snapshots

    const trackTrending: Array<{
      rank: number
      query: string
      growth: string
      trackKey: string
      projectCount: number
      topRepo: string
    }> = []

    for (const [key, track] of Object.entries(trackDefinitions)) {
      const repos = store.repos
        .filter((repo) => matchTrack(repo, key))
        .map((repo) => computeVelocityForRepo(repo, allSnapshots))

      const totalStarsWeek = repos.reduce((sum, r) => sum + r.stars_week, 0)
      const totalStars = repos.reduce((sum, r) => sum + r.stars, 0)
      const growthRate = totalStars > 0 ? (totalStarsWeek / totalStars * 100) : 0

      const topRepo = repos.sort((a, b) => b.stars_week - a.stars_week)[0]

      trackTrending.push({
        rank: 0,
        query: track.name,
        growth: growthRate > 0 ? `+${growthRate.toFixed(1)}%` : "0%",
        trackKey: key,
        projectCount: repos.length,
        topRepo: topRepo ? `${topRepo.owner}/${topRepo.name}` : "",
      })
    }

    trackTrending.sort((a, b) => {
      const ga = parseFloat(a.growth.replace("+", "").replace("%", ""))
      const gb = parseFloat(b.growth.replace("+", "").replace("%", ""))
      return gb - ga
    })

    trackTrending.forEach((item, index) => {
      item.rank = index + 1
    })

    return jsonResponse({ data: trackTrending })
})
