import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getTrendingRepos } from "@/src/server/modules/project/velocity-service"
import { readStore } from "@/src/server/lib/file-store"

export const GET = withErrorHandling((request: Request) => {
  const url = new URL(request.url)
  const range = url.searchParams.get("range") || "weekly"
  const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50)

  const trending = getTrendingRepos(range as "daily" | "weekly" | "monthly", limit)

  const store = readStore()

  const topicMap = new Map<string, { count: number; totalStars: number; totalVelocity: number; languages: Set<string> }>()
  for (const repo of store.repos) {
    const velocity = repo.velocity_score || 0
    for (const topic of repo.topics || []) {
      const existing = topicMap.get(topic)
      if (existing) {
        existing.count++
        existing.totalStars += repo.stars
        existing.totalVelocity += velocity
        if (repo.language) existing.languages.add(repo.language)
      } else {
        topicMap.set(topic, {
          count: 1,
          totalStars: repo.stars,
          totalVelocity: velocity,
          languages: new Set(repo.language ? [repo.language] : []),
        })
      }
    }
  }

  const hotTopics = Array.from(topicMap.entries())
    .sort((a, b) => {
      const scoreA = a[1].count * 2 + a[1].totalVelocity
      const scoreB = b[1].count * 2 + b[1].totalVelocity
      return scoreB - scoreA
    })
    .slice(0, 15)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalStars: data.totalStars,
      avgVelocity: data.count > 0 ? Math.round(data.totalVelocity / data.count) : 0,
      languages: Array.from(data.languages).slice(0, 3),
      trend: data.totalVelocity > data.count * 10 ? "up" as const : "stable" as const,
    }))

  const languageMap = new Map<string, { count: number; totalStars: number; totalVelocity: number }>()
  for (const repo of store.repos) {
    if (!repo.language) continue
    const velocity = repo.velocity_score || 0
    const existing = languageMap.get(repo.language)
    if (existing) {
      existing.count++
      existing.totalStars += repo.stars
      existing.totalVelocity += velocity
    } else {
      languageMap.set(repo.language, {
        count: 1,
        totalStars: repo.stars,
        totalVelocity: velocity,
      })
    }
  }

  const hotLanguages = Array.from(languageMap.entries())
    .sort((a, b) => b[1].totalVelocity - a[1].totalVelocity)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalStars: data.totalStars,
      avgVelocity: data.count > 0 ? Math.round(data.totalVelocity / data.count) : 0,
    }))

  return jsonResponse({
    trending,
    hotTopics,
    hotLanguages,
  })
})
