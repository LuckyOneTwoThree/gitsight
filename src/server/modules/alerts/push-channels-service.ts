import { randomBytes } from "crypto"
import { readStore, updateStore, type PushChannel } from "@/src/server/lib/file-store"

export type PushChannelType = PushChannel["type"]

export interface PublicPushChannel {
  id: string
  type: PushChannelType
  name: string
  config: PushChannel["config"]
  is_configured: boolean
  last_test_at: string | null
  last_test_result: "success" | "failed" | null
  created_at: string
  updated_at: string
}

function toPublicChannel(channel: PushChannel): PublicPushChannel {
  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    config: channel.config,
    is_configured: channel.is_configured,
    last_test_at: channel.last_test_at,
    last_test_result: channel.last_test_result,
    created_at: channel.created_at.split("T")[0],
    updated_at: channel.updated_at.split("T")[0],
  }
}

export function getPushChannels(): PublicPushChannel[] {
  const store = readStore()
  return store.push_channels
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toPublicChannel)
}

export async function createPushChannel(data: {
  type: PushChannelType
  name: string
  config: PushChannel["config"]
}): Promise<PublicPushChannel> {
  const now = new Date().toISOString()
  const id = `channel-${Date.now()}-${randomBytes(4).toString("hex")}`

  const isConfigured = isChannelConfigured(data.type, data.config)

  const channel: PushChannel = {
    id,
    type: data.type,
    name: data.name || getDefaultName(data.type),
    config: data.config,
    is_configured: isConfigured,
    last_test_at: null,
    last_test_result: null,
    created_at: now,
    updated_at: now,
  }

  await updateStore((store) => {
    store.push_channels.push(channel)
  })

  return toPublicChannel(channel)
}

export async function updatePushChannel(
  channelId: string,
  patch: {
    name?: string
    config?: PushChannel["config"]
  }
): Promise<PublicPushChannel | null> {
  return await updateStore((store) => {
    const index = store.push_channels.findIndex((c) => c.id === channelId)
    if (index < 0) return null

    const existing = store.push_channels[index]
    const now = new Date().toISOString()

    if (patch.name !== undefined) existing.name = patch.name
    if (patch.config !== undefined) {
      existing.config = patch.config
      existing.is_configured = isChannelConfigured(existing.type, patch.config)
    }
    existing.updated_at = now

    return toPublicChannel(existing)
  })
}

export async function deletePushChannel(channelId: string): Promise<boolean> {
  return await updateStore((store) => {
    const before = store.push_channels.length
    store.push_channels = store.push_channels.filter((c) => c.id !== channelId)
    for (const rule of store.alert_rules) {
      rule.channels.channel_ids = rule.channels.channel_ids.filter((id) => id !== channelId)
    }
    return store.push_channels.length < before
  })
}

export async function updateChannelTestResult(
  channelId: string,
  result: "success" | "failed"
): Promise<void> {
  await updateStore((store) => {
    const channel = store.push_channels.find((c) => c.id === channelId)
    if (channel) {
      channel.last_test_at = new Date().toISOString()
      channel.last_test_result = result
      channel.updated_at = new Date().toISOString()
    }
  })
}

function isChannelConfigured(type: PushChannelType, config: PushChannel["config"]): boolean {
  switch (type) {
    case "feishu":
    case "wecom":
    case "dingtalk":
      return Boolean(config.webhook_url)
    case "bark":
      return Boolean(config.bark_key)
    case "pushplus":
      return Boolean(config.pushplus_token)
    case "qmsg":
      return Boolean(config.qmsg_key)
    case "discord":
      return Boolean(config.discord_webhook_url)
    case "telegram":
      return Boolean(config.telegram_bot_token) && Boolean(config.telegram_chat_id)
    case "serverchan":
      return Boolean(config.serverchan_key)
    case "wxpusher":
      return Boolean(config.wxpusher_app_token) && Boolean(config.wxpusher_uids?.length)
    case "webhook":
      return Boolean(config.custom_url)
    default:
      return false
  }
}

function getDefaultName(type: PushChannelType): string {
  const names: Record<PushChannelType, string> = {
    feishu: "飞书机器人",
    wecom: "企业微信机器人",
    dingtalk: "钉钉机器人",
    bark: "Bark (iOS)",
    pushplus: "PushPlus (微信)",
    qmsg: "Qmsg (QQ)",
    discord: "Discord Webhook",
    telegram: "Telegram Bot",
    webhook: "自定义 Webhook",
    serverchan: "Server酱",
    wxpusher: "WxPusher (微信)",
  }
  return names[type] || "未知渠道"
}
