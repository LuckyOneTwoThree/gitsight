import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getAvailableTracks, getLandscapeData } from "@/src/server/modules/landscape/landscape-service"

export const GET = withErrorHandling((request: Request) => {
  const { searchParams } = new URL(request.url)
  const track = searchParams.get("track") || "llm-agent"

  const data = getLandscapeData(track)
  const tracks = getAvailableTracks()

  return jsonResponse({ ...data, availableTracks: tracks })
})
