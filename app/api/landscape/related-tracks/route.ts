import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { getRelatedTracks } from "@/src/server/modules/landscape/landscape-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const topics = body.topics as string[] | undefined

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return errorResponse("INVALID_TOPICS", "topics must be a non-empty array", 400)
    }

    const tracks = getRelatedTracks(topics)
    return jsonResponse({ tracks })
  } catch (error) {
    console.error("[landscape/related-tracks] Error:", error)
    return errorResponse("FAILED", "Failed to get related tracks", 500)
  }
}
