import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { parseGitHubRepo } from "@/src/server/modules/project/github-url"
import { GitHubRepositoryNotFoundError } from "@/src/server/modules/project/github-client"
import { resolveRepo, withMetricsSnapshots } from "@/src/server/modules/project/project-service"

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return errorResponse("BAD_REQUEST", "Request body must be valid JSON")
  }

  const input = typeof payload === "object" && payload && "url" in payload
    ? String(payload.url)
    : ""

  const parsed = parseGitHubRepo(input)
  if (!parsed) {
    return errorResponse("INVALID_GITHUB_REPO", "Provide a GitHub URL or owner/repo value")
  }

  try {
    const result = await resolveRepo(parsed.owner, parsed.name)
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
}
