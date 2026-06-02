import { semanticSearch } from "@/src/server/modules/search/semantic-search"
import { jsonResponse, errorResponse } from "@/src/server/lib/http"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = body.query as string
    const limit = body.limit as number | undefined

    if (!query || query.trim().length < 2) {
      return errorResponse("INVALID_QUERY", "Search query must be at least 2 characters", 400)
    }

    const result = await semanticSearch({
      query: query.trim(),
      limit: limit || 20,
    })

    return jsonResponse(result)
  } catch (error) {
    console.error("[semantic-search] Error:", error)

    if (error instanceof Error && error.name === "LlmNotConfiguredError") {
      return errorResponse(
        "LLM_NOT_CONFIGURED",
        "LLM is not configured. Please set LLM_PROVIDER and corresponding API key.",
        503
      )
    }

    return errorResponse("SEARCH_FAILED", "Semantic search failed", 500)
  }
}
