import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { syncTrending, syncTopicDiscovery } from "@/src/server/lib/sync-scheduler"

export const POST = withErrorHandling(async (request: Request) => {
  const url = new URL(request.url)
  const type = url.searchParams.get("type") || "weekly"

  const results: Record<string, unknown> = {}

  // Sync trending repos
  results.trending = await syncTrending(type as "daily" | "weekly" | "monthly")

  // Topic discovery (skips automatically if no GitHub token)
  results.topicDiscovery = await syncTopicDiscovery()

  return jsonResponse({ ok: true, ...results })
})
