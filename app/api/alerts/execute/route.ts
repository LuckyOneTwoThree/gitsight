import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { executeAllActiveRules } from "@/src/server/modules/alerts/alert-executor"

export const POST = withErrorHandling(async () => {
  const result = await executeAllActiveRules()

  return jsonResponse({
    success: true,
    timestamp: new Date().toISOString(),
    rulesExecuted: result.rulesExecuted,
    totalSent: result.totalSent,
    errors: result.errors,
  })
})

export const GET = withErrorHandling(() => {
  return jsonResponse({
    endpoint: "/api/alerts/execute",
    method: "POST",
    description: "外部定时触发推送执行",
    usage: {
      curl: 'curl -X POST http://localhost:3000/api/alerts/execute -H "Content-Type: application/json" -d "{}"',
      cronExample: "0 * * * * curl -X POST http://localhost:3000/api/alerts/execute -H 'Content-Type: application/json' -d '{}'",
      githubActions: "See documentation for GitHub Actions workflow example",
    },
  })
})
