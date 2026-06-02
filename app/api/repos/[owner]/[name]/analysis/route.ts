import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { getRepoAnalysis, parseAnalysisLanguage, parseAnalysisMode } from "@/src/server/modules/analysis/analysis-service"
import { GitHubRepositoryNotFoundError } from "@/src/server/modules/project/github-client"

interface RouteContext {
  params: Promise<{
    owner: string
    name: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const { owner, name } = await context.params
  const searchParams = new URL(request.url).searchParams
  const mode = parseAnalysisMode(searchParams.get("mode"))
  const language = parseAnalysisLanguage(searchParams.get("lang"))

  try {
    return jsonResponse(await getRepoAnalysis(owner, name, mode, language))
  } catch (error) {
    if (error instanceof GitHubRepositoryNotFoundError) {
      return errorResponse("REPO_NOT_FOUND", error.message, 404)
    }

    return errorResponse("ANALYSIS_ERROR", "Failed to read analysis reports", 502)
  }
}
