import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { getAnalysisReportJob, retryAnalysisReportJob } from "@/src/server/modules/analysis/analysis-service"

interface RouteContext {
  params: Promise<{
    jobId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { jobId } = await context.params
  const job = await getAnalysisReportJob(jobId)
  if (!job) {
    return errorResponse("ANALYSIS_JOB_NOT_FOUND", "Analysis job was not found.", 404)
  }

  const next = await retryAnalysisReportJob(jobId)
  return jsonResponse(next)
}
