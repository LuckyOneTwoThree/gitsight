import { randomBytes } from "crypto"
import { readStore, updateStore, type AlertRuleRecord } from "@/src/server/lib/file-store"

export interface PublicAlertRule {
  id: string
  name: string
  conditions: {
    languages: string[]
    tags: string[]
    starThreshold: number
    minStars: number | null
    maxStars: number | null
    velocityRange: { min?: number; max?: number } | null
    intelGradeRange: string[]
    excludeLanguages: string[]
    excludeTags: string[]
    forksRange: { min?: number; max?: number } | null
    licenseTypes: string[]
    isArchived: boolean
  }
  frequency: "hourly" | "daily" | "weekly" | "on_change"
  channels: {
    webhook: boolean
    webhookUrl: string
    channelIds: string[]
  }
  isActive: boolean
  createdAt: string
  lastPushAt: string | null
  pushCount: number
}

export interface AlertStats {
  activeRules: number
  totalRules: number
  weeklyPushes: number
  monthlyPushes: number
}

function toPublicRule(record: AlertRuleRecord): PublicAlertRule {
  return {
    id: record.id,
    name: record.name,
    conditions: {
      languages: record.conditions.languages,
      tags: record.conditions.tags,
      starThreshold: record.conditions.star_threshold,
      minStars: record.conditions.min_stars,
      maxStars: record.conditions.max_stars,
      velocityRange: record.conditions.velocity_range,
      intelGradeRange: record.conditions.intel_grade_range,
      excludeLanguages: record.conditions.exclude_languages,
      excludeTags: record.conditions.exclude_tags,
      forksRange: record.conditions.forks_range,
      licenseTypes: record.conditions.license_types,
      isArchived: record.conditions.is_archived,
    },
    frequency: record.frequency,
    channels: {
      webhook: record.channels.webhook,
      webhookUrl: record.channels.webhook_url,
      channelIds: record.channels.channel_ids,
    },
    isActive: record.is_active,
    createdAt: record.created_at.split("T")[0],
    lastPushAt: record.last_push_at ? record.last_push_at.split("T")[0] : null,
    pushCount: record.push_count,
  }
}

export function getAlertRules(): PublicAlertRule[] {
  const store = readStore()
  return store.alert_rules
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toPublicRule)
}

export function getAlertStats(): AlertStats {
  const store = readStore()
  const rules = store.alert_rules
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let weeklyPushes = 0
  let monthlyPushes = 0
  for (const rule of rules) {
    if (rule.last_push_at) {
      const lastPushDate = new Date(rule.last_push_at)
      if (lastPushDate >= weekAgo) weeklyPushes += rule.push_count
      if (lastPushDate >= monthAgo) monthlyPushes += rule.push_count
    }
  }

  return {
    activeRules: rules.filter((r) => r.is_active).length,
    totalRules: rules.length,
    weeklyPushes,
    monthlyPushes,
  }
}

const DEFAULT_CONDITIONS: AlertRuleRecord["conditions"] = {
  languages: [],
  tags: [],
  star_threshold: 500,
  min_stars: null,
  max_stars: null,
  velocity_range: null,
  intel_grade_range: [],
  exclude_languages: [],
  exclude_tags: [],
  forks_range: null,
  license_types: [],
  is_archived: false,
}

export async function createAlertRule(
  data: {
    name: string
    languages?: string[]
    tags?: string[]
    starThreshold?: number
    minStars?: number | null
    maxStars?: number | null
    velocityRange?: { min?: number; max?: number } | null
    intelGradeRange?: string[]
    excludeLanguages?: string[]
    excludeTags?: string[]
    forksRange?: { min?: number; max?: number } | null
    licenseTypes?: string[]
    isArchived?: boolean
    frequency?: "hourly" | "daily" | "weekly" | "on_change"
    channels?: {
      webhook?: boolean
      webhookUrl?: string
      channelIds?: string[]
    }
  }
): Promise<PublicAlertRule> {
  const now = new Date().toISOString()
  const id = `rule-${Date.now()}-${randomBytes(4).toString("hex")}`

  const record: AlertRuleRecord = {
    id,
    name: data.name || "新建订阅规则",
    conditions: {
      languages: data.languages || DEFAULT_CONDITIONS.languages,
      tags: data.tags || DEFAULT_CONDITIONS.tags,
      star_threshold: data.starThreshold ?? DEFAULT_CONDITIONS.star_threshold,
      min_stars: data.minStars ?? DEFAULT_CONDITIONS.min_stars,
      max_stars: data.maxStars ?? DEFAULT_CONDITIONS.max_stars,
      velocity_range: data.velocityRange ?? DEFAULT_CONDITIONS.velocity_range,
      intel_grade_range: data.intelGradeRange || DEFAULT_CONDITIONS.intel_grade_range,
      exclude_languages: data.excludeLanguages || DEFAULT_CONDITIONS.exclude_languages,
      exclude_tags: data.excludeTags || DEFAULT_CONDITIONS.exclude_tags,
      forks_range: data.forksRange ?? DEFAULT_CONDITIONS.forks_range,
      license_types: data.licenseTypes || DEFAULT_CONDITIONS.license_types,
      is_archived: data.isArchived ?? DEFAULT_CONDITIONS.is_archived,
    },
    frequency: data.frequency || "weekly",
    channels: {
      webhook: data.channels?.webhook ?? false,
      webhook_url: data.channels?.webhookUrl || "",
      channel_ids: data.channels?.channelIds || [],
    },
    is_active: true,
    push_count: 0,
    last_push_at: null,
    created_at: now,
    updated_at: now,
  }

  await updateStore((store) => {
    store.alert_rules.push(record)
  })

  return toPublicRule(record)
}

export async function updateAlertRule(
  ruleId: string,
  patch: {
    name?: string
    languages?: string[]
    tags?: string[]
    starThreshold?: number
    minStars?: number | null
    maxStars?: number | null
    velocityRange?: { min?: number; max?: number } | null
    intelGradeRange?: string[]
    excludeLanguages?: string[]
    excludeTags?: string[]
    forksRange?: { min?: number; max?: number } | null
    licenseTypes?: string[]
    isArchived?: boolean
    frequency?: "hourly" | "daily" | "weekly" | "on_change"
    channels?: {
      webhook?: boolean
      webhookUrl?: string
      channelIds?: string[]
    }
    isActive?: boolean
  }
): Promise<PublicAlertRule | null> {
  return await updateStore((store) => {
    const index = store.alert_rules.findIndex((rule) => rule.id === ruleId)
    if (index < 0) return null

    const existing = store.alert_rules[index]
    const now = new Date().toISOString()

    if (patch.name !== undefined) existing.name = patch.name
    if (patch.languages !== undefined) existing.conditions.languages = patch.languages
    if (patch.tags !== undefined) existing.conditions.tags = patch.tags
    if (patch.starThreshold !== undefined) existing.conditions.star_threshold = patch.starThreshold
    if (patch.minStars !== undefined) existing.conditions.min_stars = patch.minStars
    if (patch.maxStars !== undefined) existing.conditions.max_stars = patch.maxStars
    if (patch.velocityRange !== undefined) existing.conditions.velocity_range = patch.velocityRange
    if (patch.intelGradeRange !== undefined) existing.conditions.intel_grade_range = patch.intelGradeRange
    if (patch.excludeLanguages !== undefined) existing.conditions.exclude_languages = patch.excludeLanguages
    if (patch.excludeTags !== undefined) existing.conditions.exclude_tags = patch.excludeTags
    if (patch.forksRange !== undefined) existing.conditions.forks_range = patch.forksRange
    if (patch.licenseTypes !== undefined) existing.conditions.license_types = patch.licenseTypes
    if (patch.isArchived !== undefined) existing.conditions.is_archived = patch.isArchived
    if (patch.frequency !== undefined) existing.frequency = patch.frequency
    if (patch.isActive !== undefined) existing.is_active = patch.isActive
    if (patch.channels !== undefined) {
      existing.channels.webhook = patch.channels.webhook ?? existing.channels.webhook
      existing.channels.webhook_url = patch.channels.webhookUrl ?? existing.channels.webhook_url
      existing.channels.channel_ids = patch.channels.channelIds ?? existing.channels.channel_ids
    }
    existing.updated_at = now

    return toPublicRule(existing)
  })
}

export async function deleteAlertRule(ruleId: string): Promise<boolean> {
  return await updateStore((store) => {
    const before = store.alert_rules.length
    store.alert_rules = store.alert_rules.filter((rule) => rule.id !== ruleId)
    return store.alert_rules.length < before
  })
}
