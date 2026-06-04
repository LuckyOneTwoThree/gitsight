import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { readStore, loadReportContent } from "@/src/server/lib/file-store"
import { extractQualityBadge } from "@/lib/report-quality-utils"

interface RouteContext {
  params: Promise<{ reportId: string }>
}

export const GET = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { reportId } = await (context as RouteContext).params
  const id = Number(reportId)

  if (!Number.isFinite(id) || id <= 0) {
    return errorResponse("BAD_REQUEST", "Invalid report ID", 400)
  }

  const store = readStore()
  const report = store.analysis_reports.find((r) => r.id === id)

  if (!report || report.status !== "cached") {
    return errorResponse("NOT_FOUND", "Report not found or not yet generated", 404)
  }

  // Load content from DB on demand (not in cache)
  const content = loadReportContent(id)
  if (!content) {
    return errorResponse("NOT_FOUND", "Report content not available", 404)
  }

  const repo = store.repos.find((r) => r.id === report.repo_id)

  const quality = extractQualityBadge(content)

  const { _meta, ...publicContent } = content as Record<string, unknown>

  return jsonResponse({
    repo: repo
      ? {
          full_name: repo.full_name,
          name: repo.name,
          owner: repo.owner,
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          license: repo.license,
          topics: repo.topics,
        }
      : null,
    section_type: report.section_type,
    mode: report.mode,
    language: report.language,
    content: publicContent,
    mermaid_code: report.mermaid_code,
    quality,
    generated_by: report.generated_by,
    generated_at: report.generated_at,
  })
})
