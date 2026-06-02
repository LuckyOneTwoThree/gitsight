import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getDb } from "@/src/server/lib/database"

export const GET = withErrorHandling(() => {
  const db = getDb()

  const totalRow = db.prepare("SELECT COALESCE(SUM(token_cost), 0) as total_tokens FROM analysis_reports").get() as { total_tokens: number }
  const byModel = db.prepare(`
    SELECT generated_by as model, COUNT(*) as report_count, SUM(token_cost) as total_tokens
    FROM analysis_reports
    WHERE generated_by IS NOT NULL AND token_cost > 0
    GROUP BY generated_by
    ORDER BY total_tokens DESC
  `).all() as Array<{ model: string; report_count: number; total_tokens: number }>

  const byDay = db.prepare(`
    SELECT DATE(generated_at) as date, SUM(token_cost) as tokens, COUNT(*) as reports
    FROM analysis_reports
    WHERE generated_at IS NOT NULL AND token_cost > 0
    GROUP BY DATE(generated_at)
    ORDER BY date DESC
    LIMIT 30
  `).all() as Array<{ date: string; tokens: number; reports: number }>

  const totalReports = db.prepare("SELECT COUNT(*) as count FROM analysis_reports WHERE status = 'cached'").get() as { count: number }

  return jsonResponse({
    total_tokens: totalRow.total_tokens,
    total_reports: totalReports.count,
    by_model: byModel,
    by_day: byDay,
  })
})
