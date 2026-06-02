import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { readStore } from "@/src/server/lib/file-store"
import { trackDefinitions, matchTrack } from "@/src/server/modules/landscape/landscape-service"

const trackIcons: Record<string, string> = {
  "ai-ml": "brain",
  "ai-agent": "bot",
  rag: "search",
  frontend: "layout",
  devops: "server",
  database: "database",
  "dev-tools": "wrench",
  web3: "link",
}

const trackColors: Record<string, string> = {
  "ai-ml": "from-blue-500/20 to-cyan-500/20",
  "ai-agent": "from-purple-500/20 to-pink-500/20",
  rag: "from-emerald-500/20 to-teal-500/20",
  frontend: "from-orange-500/20 to-yellow-500/20",
  devops: "from-sky-500/20 to-indigo-500/20",
  database: "from-green-500/20 to-lime-500/20",
  "dev-tools": "from-amber-500/20 to-red-500/20",
  web3: "from-violet-500/20 to-fuchsia-500/20",
}

let exploreCache: { data: unknown; expiresAt: number } | null = null
const EXPLORE_CACHE_TTL = 2 * 60 * 60 * 1000

export async function GET() {
  try {
    const now = Date.now()
    if (exploreCache && exploreCache.expiresAt > now) {
      return jsonResponse(exploreCache.data)
    }

    const store = readStore()

    const explorations = Object.entries(trackDefinitions).map(([key, track]) => {
      const matchedRepos = store.repos.filter((repo) => matchTrack(repo, key))

      const topRepos = [...matchedRepos]
        .sort((a, b) => b.stars_week - a.stars_week)
        .slice(0, 3)
        .map((r) => r.name)

      return {
        id: key,
        title: track.name,
        description: track.description.slice(0, 40),
        icon: trackIcons[key] || "sparkles",
        color: trackColors[key] || "from-gray-500/20 to-gray-500/20",
        projects: matchedRepos.length,
        topRepos,
        trackKey: key,
      }
    })

    explorations.sort((a, b) => b.projects - a.projects)

    const result = { data: explorations }
    exploreCache = { data: result, expiresAt: now + EXPLORE_CACHE_TTL }

    return jsonResponse(result)
  } catch (error) {
    console.error("[search/explore] Error:", error)
    return errorResponse("FAILED", "Failed to get exploration suggestions", 500)
  }
}
