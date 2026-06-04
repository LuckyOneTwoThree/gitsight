import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { readConfig, writeConfig } from "@/src/server/lib/desktop-config"

const INTEGRATIONS_KEY = "integrations"

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  config: Record<string, string>
  updated_at: string | null
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: "email",
    name: "邮件推送",
    description: "通过邮件接收项目情报推送通知",
    icon: "Mail",
    enabled: false,
    config: {},
    updated_at: null,
  },
  {
    id: "webhook",
    name: "Webhook",
    description: "通过自定义 Webhook 推送情报到任意服务",
    icon: "Webhook",
    enabled: false,
    config: { url: "" },
    updated_at: null,
  },
  {
    id: "feishu",
    name: "飞书",
    description: "通过飞书机器人推送情报通知",
    icon: "MessageCircle",
    enabled: false,
    config: {},
    updated_at: null,
  },
  {
    id: "wechat",
    name: "微信",
    description: "通过微信推送情报通知（WxPusher / Server酱）",
    icon: "Smartphone",
    enabled: false,
    config: {},
    updated_at: null,
  },
]

function getIntegrationsFromConfig(config: Record<string, unknown>): Integration[] {
  const raw = config[INTEGRATIONS_KEY]
  if (Array.isArray(raw)) {
    return raw as Integration[]
  }
  return DEFAULT_INTEGRATIONS
}

export const GET = withErrorHandling(() => {
  const config = readConfig() as unknown as Record<string, unknown>
  const integrations = getIntegrationsFromConfig(config)
  return jsonResponse({ integrations })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>
  const channelId = body.channel_id as string | undefined
  const enabled = body.enabled as boolean | undefined
  const channelConfig = body.config as Record<string, string> | undefined

  if (!channelId) {
    return errorResponse("MISSING_CHANNEL_ID", "channel_id is required", 400)
  }

  const config = readConfig() as unknown as Record<string, unknown>
  const currentIntegrations = getIntegrationsFromConfig(config)

  const updatedIntegrations = currentIntegrations.map((item) => {
    if (item.id === channelId) {
      return {
        ...item,
        ...(typeof enabled === "boolean" && { enabled }),
        ...(channelConfig && { config: channelConfig }),
        updated_at: new Date().toISOString(),
      }
    }
    return item
  })

  config[INTEGRATIONS_KEY] = updatedIntegrations
  writeConfig(config as any)

  return jsonResponse({ integrations: updatedIntegrations })
})
