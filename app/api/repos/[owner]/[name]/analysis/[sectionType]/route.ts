import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import {
  getAnalysisReport,
  parseAnalysisLanguage,
  parseAnalysisMode,
  parseAnalysisSectionType,
  startAnalysisReportJob,
} from "@/src/server/modules/analysis/analysis-service"
import { GitHubRepositoryNotFoundError } from "@/src/server/modules/project/github-client"
import { type ReportLanguage } from "@/src/server/modules/analysis/prompt-builder"
import { getActiveProvider, isConfigured } from "@/src/server/lib/desktop-config"

interface RouteContext {
  params: Promise<{
    owner: string
    name: string
    sectionType: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const { owner, name, sectionType: rawSectionType } = await context.params
  const sectionType = parseAnalysisSectionType(rawSectionType)
  const searchParams = new URL(request.url).searchParams
  const mode = parseAnalysisMode(searchParams.get("mode"))
  const language = parseAnalysisLanguage(searchParams.get("lang"))

  if (!sectionType) {
    return errorResponse("INVALID_SECTION_TYPE", "Unsupported analysis section type")
  }

  try {
    const report = await getAnalysisReport(owner, name, sectionType, mode, language)

    if (!report) {
      return errorResponse("REPORT_NOT_GENERATED", "Analysis report has not been generated", 404)
    }

    return jsonResponse(report)
  } catch (error) {
    if (error instanceof GitHubRepositoryNotFoundError) {
      return errorResponse("REPO_NOT_FOUND", error.message, 404)
    }

    return errorResponse("ANALYSIS_ERROR", "Failed to read analysis report", 502)
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!isConfigured()) {
    return errorResponse("NOT_CONFIGURED", "请先在设置中配置 LLM API Key", 403)
  }

  const { owner, name, sectionType: rawSectionType } = await context.params
  const sectionType = parseAnalysisSectionType(rawSectionType)

  if (!sectionType) {
    return errorResponse("INVALID_SECTION_TYPE", "Unsupported analysis section type")
  }

  let lang: ReportLanguage | undefined
  let mode = parseAnalysisMode(new URL(request.url).searchParams.get("mode"))
  try {
    const body = await request.json()
    if (body.lang === "en" || body.lang === "zh") {
      lang = body.lang
    }
    mode = parseAnalysisMode(body.mode || mode)
  } catch {}

  try {
    const language = parseAnalysisLanguage(lang)
    const active = getActiveProvider()
    const llmConfig = {
      provider: active.provider,
      apiKey: active.apiKey,
      baseUrl: active.base_url,
      model: active.model,
    }
    const result = await startAnalysisReportJob(owner, name, sectionType, language, mode, llmConfig)
    return jsonResponse(result, { status: 202 })
  } catch (error) {
    if (error instanceof GitHubRepositoryNotFoundError) {
      return errorResponse("REPO_NOT_FOUND", error.message, 404)
    }

    return errorResponse("ANALYSIS_ERROR", "Failed to generate analysis report", 502)
  }
}
