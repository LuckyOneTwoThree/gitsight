import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getAnalysisReportJob } from "@/src/server/modules/analysis/analysis-service"

interface RouteContext {
  params: Promise<{
    jobId: string
  }>
}

export const GET = withErrorHandling(async (_request: Request, context?: unknown) => {
  const { jobId } = await (context as RouteContext).params
  const job = await getAnalysisReportJob(jobId)

  if (!job) {
    return errorResponse("ANALYSIS_JOB_NOT_FOUND", "Analysis job was not found.", 404)
  }

  return jsonResponse(job)
})
