import { semanticSearch, parseSearchIntent } from "@/src/server/modules/search/semantic-search"
import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()
  const query = body.query as string
  const limit = body.limit as number | undefined
  const parseIntentOnly = body.parseIntentOnly as boolean | undefined

  if (!query || query.trim().length < 2) {
    return errorResponse("INVALID_QUERY", "Search query must be at least 2 characters", 400)
  }

  // Light-weight mode: only parse intent tags without full search
  if (parseIntentOnly) {
    const intent = await parseSearchIntent(query.trim())
    return jsonResponse({ intentTags: intent.tags })
  }

  const result = await semanticSearch({
    query: query.trim(),
    limit: limit || 20,
  })

  return jsonResponse(result)
})
