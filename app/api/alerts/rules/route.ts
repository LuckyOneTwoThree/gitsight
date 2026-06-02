import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRules,
  getAlertStats,
  updateAlertRule,
} from "@/src/server/modules/alerts/alert-rules-service"

export async function GET() {
  return jsonResponse({
    rules: getAlertRules(),
    stats: getAlertStats(),
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
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
    frequency?: string
    channels?: {
      webhook?: boolean
      webhookUrl?: string
      channelIds?: string[]
    }
  } | null

  if (!body) {
    return errorResponse("INVALID_RULE", "Invalid request body", 400)
  }

  try {
    const rule = await createAlertRule({
      name: body.name || "",
      languages: body.languages || [],
      tags: body.tags || [],
      starThreshold: body.starThreshold || 500,
      minStars: body.minStars,
      maxStars: body.maxStars,
      velocityRange: body.velocityRange,
      intelGradeRange: body.intelGradeRange,
      excludeLanguages: body.excludeLanguages,
      excludeTags: body.excludeTags,
      forksRange: body.forksRange,
      licenseTypes: body.licenseTypes,
      isArchived: body.isArchived,
      frequency: (body.frequency as "hourly" | "daily" | "weekly" | "on_change") || "weekly",
      channels: {
        webhook: body.channels?.webhook ?? false,
        webhookUrl: body.channels?.webhookUrl || "",
        channelIds: body.channels?.channelIds || [],
      },
    })
    return jsonResponse({ rule })
  } catch (err) {
    return errorResponse("CREATE_RULE_FAILED", err instanceof Error ? err.message : "创建失败", 400)
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string
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
    frequency?: string
    channels?: {
      webhook?: boolean
      webhookUrl?: string
      channelIds?: string[]
    }
    isActive?: boolean
  } | null

  if (!body?.id) {
    return errorResponse("INVALID_RULE", "请提供规则 ID", 400)
  }

  try {
    const rule = await updateAlertRule(body.id, {
      name: body.name,
      languages: body.languages,
      tags: body.tags,
      starThreshold: body.starThreshold,
      minStars: body.minStars,
      maxStars: body.maxStars,
      velocityRange: body.velocityRange,
      intelGradeRange: body.intelGradeRange,
      excludeLanguages: body.excludeLanguages,
      excludeTags: body.excludeTags,
      forksRange: body.forksRange,
      licenseTypes: body.licenseTypes,
      isArchived: body.isArchived,
      frequency: body.frequency as "hourly" | "daily" | "weekly" | "on_change" | undefined,
      channels: body.channels
        ? {
            webhook: body.channels.webhook ?? false,
            webhookUrl: body.channels.webhookUrl || "",
            channelIds: body.channels.channelIds || [],
          }
        : undefined,
      isActive: body.isActive,
    })

    if (!rule) {
      return errorResponse("RULE_NOT_FOUND", "规则不存在", 404)
    }

    return jsonResponse({ rule })
  } catch (err) {
    return errorResponse("UPDATE_RULE_FAILED", err instanceof Error ? err.message : "更新失败", 400)
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const ruleId = searchParams.get("id")

  if (!ruleId) {
    return errorResponse("INVALID_RULE", "请提供规则 ID", 400)
  }

  const deleted = await deleteAlertRule(ruleId)
  if (!deleted) {
    return errorResponse("RULE_NOT_FOUND", "规则不存在", 404)
  }

  return jsonResponse({ success: true })
}
