import { readStore, updateStore, type AlertRuleRecord } from "@/src/server/lib/file-store"
import type { RepoRecord } from "@/src/server/modules/project/types"
import { sendPushNotification, type PushPayload } from "./push-sender"

export interface AlertMatch {
  rule: AlertRuleRecord
  repo: RepoRecord
  reason: string
}

export function evaluateRule(rule: AlertRuleRecord, repo: RepoRecord): { matched: boolean; reason: string } {
  if (!rule.is_active) return { matched: false, reason: "" }

  const reasons: string[] = []

  if (rule.conditions.languages.length > 0) {
    if (!repo.language || !rule.conditions.languages.includes(repo.language)) {
      return { matched: false, reason: "" }
    }
    reasons.push(`语言匹配: ${repo.language}`)
  }

  if (rule.conditions.exclude_languages.length > 0) {
    if (repo.language && rule.conditions.exclude_languages.includes(repo.language)) {
      return { matched: false, reason: "" }
    }
  }

  if (rule.conditions.tags.length > 0) {
    const matchedTags = repo.topics.filter((t: string) => rule.conditions.tags.includes(t))
    if (matchedTags.length === 0) {
      return { matched: false, reason: "" }
    }
    reasons.push(`标签匹配: ${matchedTags.join(", ")}`)
  }

  if (rule.conditions.exclude_tags.length > 0) {
    const excludedTags = repo.topics.filter((t: string) => rule.conditions.exclude_tags.includes(t))
    if (excludedTags.length > 0) {
      return { matched: false, reason: "" }
    }
  }

  if (rule.conditions.star_threshold > 0) {
    if (repo.stars < rule.conditions.star_threshold) {
      return { matched: false, reason: "" }
    }
    reasons.push(`Stars ≥ ${rule.conditions.star_threshold}`)
  }

  if (rule.conditions.min_stars != null && repo.stars < rule.conditions.min_stars) {
    return { matched: false, reason: "" }
  }

  if (rule.conditions.max_stars != null && repo.stars > rule.conditions.max_stars) {
    return { matched: false, reason: "" }
  }

  if (rule.conditions.velocity_range) {
    if (rule.conditions.velocity_range.min != null && repo.velocity_score < rule.conditions.velocity_range.min) {
      return { matched: false, reason: "" }
    }
    if (rule.conditions.velocity_range.max != null && repo.velocity_score > rule.conditions.velocity_range.max) {
      return { matched: false, reason: "" }
    }
    reasons.push(`增速评分: ${repo.velocity_score}`)
  }

  if (rule.conditions.intel_grade_range.length > 0) {
    if (!rule.conditions.intel_grade_range.includes(repo.intel_grade)) {
      return { matched: false, reason: "" }
    }
    reasons.push(`情报等级: ${repo.intel_grade}`)
  }

  if (rule.conditions.forks_range) {
    if (rule.conditions.forks_range.min != null && repo.forks < rule.conditions.forks_range.min) {
      return { matched: false, reason: "" }
    }
    if (rule.conditions.forks_range.max != null && repo.forks > rule.conditions.forks_range.max) {
      return { matched: false, reason: "" }
    }
  }

  if (rule.conditions.license_types.length > 0) {
    if (!repo.license || !rule.conditions.license_types.includes(repo.license)) {
      return { matched: false, reason: "" }
    }
  }

  if (!rule.conditions.is_archived && repo.is_archived) {
    return { matched: false, reason: "" }
  }

  if (reasons.length === 0) {
    reasons.push("无条件限制，默认匹配")
  }

  return { matched: true, reason: reasons.join("; ") }
}

export function findMatchingRepos(rule: AlertRuleRecord): AlertMatch[] {
  const store = readStore()
  const matches: AlertMatch[] = []

  for (const repo of store.repos) {
    const result = evaluateRule(rule, repo)
    if (result.matched) {
      matches.push({ rule, repo, reason: result.reason })
    }
  }

  return matches
}

export function shouldRunNow(rule: AlertRuleRecord): boolean {
  if (!rule.is_active) return false
  if (!rule.last_push_at) return true

  const lastPush = new Date(rule.last_push_at).getTime()
  const now = Date.now()

  switch (rule.frequency) {
    case "hourly":
      return now - lastPush >= 60 * 60 * 1000
    case "daily":
      return now - lastPush >= 24 * 60 * 60 * 1000
    case "weekly":
      return now - lastPush >= 7 * 24 * 60 * 60 * 1000
    case "on_change":
      return now - lastPush >= 5 * 60 * 1000
    default:
      return false
  }
}

export async function executeRule(rule: AlertRuleRecord): Promise<{ sent: number; skipped: number }> {
  if (!shouldRunNow(rule)) return { sent: 0, skipped: 1 }

  const matches = findMatchingRepos(rule)
  if (matches.length === 0) return { sent: 0, skipped: 0 }

  const payload: PushPayload = {
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

  const result = await sendPushNotification(rule, payload)

  if (result.sent > 0) {
    await updateStore((store) => {
      const idx = store.alert_rules.findIndex((r) => r.id === rule.id)
      if (idx >= 0) {
        store.alert_rules[idx].last_push_at = new Date().toISOString()
        store.alert_rules[idx].push_count += 1
      }
    })
  }

  return {
    sent: result.sent,
    skipped: result.failed,
  }
}

export async function executeAllActiveRules(): Promise<{
  rulesExecuted: number
  totalSent: number
  errors: string[]
}> {
  const store = readStore()
  const activeRules = store.alert_rules.filter((r) => r.is_active)
  let totalSent = 0
  const errors: string[] = []

  for (const rule of activeRules) {
    try {
      const result = await executeRule(rule)
      totalSent += result.sent
    } catch (err) {
      errors.push(`Rule ${rule.id} (${rule.name}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { rulesExecuted: activeRules.length, totalSent, errors }
}
