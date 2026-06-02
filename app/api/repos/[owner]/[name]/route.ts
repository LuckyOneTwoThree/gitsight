import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { GitHubRepositoryNotFoundError } from "@/src/server/modules/project/github-client"
import { resolveRepo, withMetricsSnapshots } from "@/src/server/modules/project/project-service"

interface RouteContext {
  params: Promise<{
    owner: string
    name: string
  }>
}

export const GET = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { owner, name } = await (context as RouteContext).params

  try {
    const result = await resolveRepo(owner, name)
    return jsonResponse({
      ...withMetricsSnapshots(result.repo),
      is_new: result.is_new,
    })
  } catch (error) {
    if (error instanceof GitHubRepositoryNotFoundError) {
      return errorResponse("REPO_NOT_FOUND", error.message, 404)
    }
    return errorResponse("GITHUB_API_ERROR", "Failed to resolve GitHub repository", 502)
  }
})
