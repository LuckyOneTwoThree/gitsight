import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { GitHubRepositoryNotFoundError } from "@/src/server/modules/project/github-client"
import {
  recordCurrentMetrics,
  resolveRepo,
  withMetricsSnapshots,
} from "@/src/server/modules/project/project-service"

interface RouteContext {
  params: Promise<{
    owner: string
    name: string
  }>
}

export const POST = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { owner, name } = await (context as RouteContext).params

  try {
    const result = await resolveRepo(owner, name)
    const snapshot = await recordCurrentMetrics(result.repo)

    return jsonResponse({
      snapshot,
      repo: withMetricsSnapshots(result.repo),
    })
  } catch (error) {
    if (error instanceof GitHubRepositoryNotFoundError) {
      return errorResponse("REPO_NOT_FOUND", error.message, 404)
    }

    return errorResponse("METRICS_ERROR", "Failed to record repository metrics", 502)
  }
})

