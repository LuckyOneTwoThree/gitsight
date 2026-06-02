import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { readStore } from "@/src/server/lib/file-store"
import { buildWebhookPreviewPayload, sendPushNotification } from "@/src/server/modules/alerts/push-sender"
import { findMatchingRepos } from "@/src/server/modules/alerts/alert-executor"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    ruleId?: string
    dryRun?: boolean
  } | null

  if (!body?.ruleId) {
    return errorResponse("INVALID_REQUEST", "请提供 ruleId", 400)
  }

  const store = readStore()
  const rule = store.alert_rules.find((r) => r.id === body.ruleId)
  if (!rule) {
    return errorResponse("RULE_NOT_FOUND", "规则不存在", 404)
  }

  const matches = findMatchingRepos(rule)

  if (body.dryRun) {
    const previewPayload = buildWebhookPreviewPayload(rule)
    return jsonResponse({
      ruleId: rule.id,
      ruleName: rule.name,
      matchedRepos: matches.length,
      sampleMatches: matches.slice(0, 5).map((m) => ({
        fullName: m.repo.full_name,
        stars: m.repo.stars,
        language: m.repo.language,
        reason: m.reason,
      })),
      webhookPreview: rule.channels.webhook ? previewPayload : null,
    })
  }

  const payload = {
    ruleName: rule.name,
    ruleId: rule.id,
    frequency: rule.frequency,
    matches: matches.slice(0, 20).map((m) => ({
      fullName: m.repo.full_name,
      description: m.repo.description || "",
      language: m.repo.language || "",
      stars: m.repo.stars,
      reason: m.reason,
    })),
    totalMatches: matches.length,
  }

  const results = await sendPushNotification(rule, payload)

  return jsonResponse({
    ruleId: rule.id,
    matchedRepos: matches.length,
    sent: results,
  })
}
