import { readStore, type AlertRuleRecord, type PushChannel } from "@/src/server/lib/file-store"
import { updateChannelTestResult } from "./push-channels-service"

export interface PushMatchItem {
  fullName: string
  description: string
  language: string
  stars: number
  reason: string
}

export interface PushPayload {
  ruleName: string
  ruleId: string
  frequency: string
  matches: PushMatchItem[]
  totalMatches: number
}

export interface PushResult {
  sent: number
  failed: number
  channels: { id: string; type: string; success: boolean }[]
}

export async function sendPushNotification(rule: AlertRuleRecord, payload: PushPayload): Promise<PushResult> {
  const store = readStore()
  const results: { id: string; type: string; success: boolean }[] = []
  let sent = 0
  let failed = 0

  if (rule.channels.webhook && rule.channels.webhook_url) {
    const ok = await sendWebhook(rule.channels.webhook_url, payload)
    results.push({ id: "legacy-webhook", type: "webhook", success: ok })
    if (ok) sent++; else failed++
  }

  for (const channelId of rule.channels.channel_ids) {
    const channel = store.push_channels.find((c) => c.id === channelId)
    if (!channel || !channel.is_configured) {
      results.push({ id: channelId, type: "unknown", success: false })
      failed++
      continue
    }

    const ok = await sendToChannel(channel, payload)
    results.push({ id: channelId, type: channel.type, success: ok })
    if (ok) sent++; else failed++
  }

  return { sent, failed, channels: results }
}

async function sendToChannel(channel: PushChannel, payload: PushPayload): Promise<boolean> {
  try {
    let ok = false
    switch (channel.type) {
      case "feishu":
      case "wecom":
      case "dingtalk":
        ok = await sendGroupBotWebhook(channel.config.webhook_url || "", channel.type, payload)
        break
      case "bark":
        ok = await sendBark(channel.config.bark_key || "", channel.config.bark_server, payload)
        break
      case "pushplus":
        ok = await sendPushPlus(channel.config.pushplus_token || "", payload)
        break
      case "qmsg":
        ok = await sendQmsg(channel.config.qmsg_key || "", payload)
        break
      case "discord":
        ok = await sendDiscord(channel.config.discord_webhook_url || "", payload)
        break
      case "telegram":
        ok = await sendTelegram(channel.config.telegram_bot_token || "", channel.config.telegram_chat_id || "", payload)
        break
      case "serverchan":
        ok = await sendServerChan(channel.config.serverchan_key || "", payload)
        break
      case "wxpusher":
        ok = await sendWxPusher(channel.config.wxpusher_app_token || "", channel.config.wxpusher_uids || [], payload)
        break
      case "webhook":
        ok = await sendCustomWebhook(channel.config.custom_url || "", channel.config.custom_headers, channel.config.custom_body_template, payload)
        break
      default:
        ok = false
    }
    return ok
  } catch {
    return false
  }
}

export async function testPushChannel(channel: PushChannel): Promise<boolean> {
  const testPayload: PushPayload = {
    ruleName: "测试推送",
    ruleId: "test",
    frequency: "instant",
    matches: [{
      fullName: "example-org/example-repo",
      description: "RepoIntel 测试推送消息",
      language: "TypeScript",
      stars: 5000,
      reason: "这是一条测试消息",
    }],
    totalMatches: 1,
  }

  const ok = await sendToChannel(channel, testPayload)
  await updateChannelTestResult(channel.id, ok ? "success" : "failed")
  return ok
}

function buildMarkdownText(payload: PushPayload): string {
  const lines = [
    `**📊 RepoIntel 情报速递**`,
    `━━━━━━━━━━━━━━━━`,
    `规则: ${payload.ruleName}`,
    `频率: ${payload.frequency} | 匹配: ${payload.totalMatches} 个项目`,
    ``,
  ]
  for (const m of payload.matches.slice(0, 10)) {
    lines.push(`🔥 **${m.fullName}**`)
    lines.push(`   ${m.language} · ⭐ ${m.stars.toLocaleString()}`)
    lines.push(`   ${m.reason}`)
    lines.push(``)
  }
  if (payload.totalMatches > payload.matches.length) {
    lines.push(`... 还有 ${payload.totalMatches - payload.matches.length} 个项目`)
  }
  return lines.join("\n")
}

function buildPlainText(payload: PushPayload): string {
  const lines = [
    `📊 RepoIntel 情报速递`,
    `规则: ${payload.ruleName} | 频率: ${payload.frequency} | 匹配: ${payload.totalMatches}`,
    ``,
  ]
  for (const m of payload.matches.slice(0, 10)) {
    lines.push(`🔥 ${m.fullName} (${m.language}, ⭐${m.stars}) - ${m.reason}`)
  }
  if (payload.totalMatches > payload.matches.length) {
    lines.push(`... 还有 ${payload.totalMatches - payload.matches.length} 个项目`)
  }
  return lines.join("\n")
}

async function sendWebhook(url: string, payload: PushPayload): Promise<boolean> {
  try {
    const body = {
      event: "alert.match",
      timestamp: new Date().toISOString(),
      data: {
        rule_id: payload.ruleId,
        rule_name: payload.ruleName,
        frequency: payload.frequency,
        total_matches: payload.totalMatches,
        matches: payload.matches.map((m) => ({
          full_name: m.fullName,
          description: m.description,
          language: m.language,
          stars: m.stars,
          reason: m.reason,
        })),
      },
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendGroupBotWebhook(url: string, type: string, payload: PushPayload): Promise<boolean> {
  if (!url) return false
  try {
    const markdown = buildMarkdownText(payload)
    let body: Record<string, unknown>
    if (type === "feishu") {
      body = { msg_type: "interactive", card: { header: { title: { tag: "plain_text", content: "📊 RepoIntel 情报速递" } }, elements: [{ tag: "markdown", content: markdown }] } }
    } else if (type === "wecom") {
      body = { msgtype: "markdown", markdown: { content: markdown } }
    } else {
      body = { msgtype: "markdown", markdown: { title: "RepoIntel 情报速递", text: markdown } }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendBark(key: string, server: string | undefined, payload: PushPayload): Promise<boolean> {
  if (!key) return false
  try {
    const baseUrl = server || "https://api.day.app"
    const text = buildPlainText(payload)
    const url = `${baseUrl}/${encodeURIComponent(key)}/${encodeURIComponent("RepoIntel 情报速递")}/${encodeURIComponent(text)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendPushPlus(token: string, payload: PushPayload): Promise<boolean> {
  if (!token) return false
  try {
    const body = {
      token,
      title: `📊 RepoIntel 情报速递 - ${payload.ruleName}`,
      content: buildMarkdownText(payload),
      template: "markdown",
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch("https://www.pushplus.plus/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const result = await response.json() as { code: number }
    return result.code === 200
  } catch {
    return false
  }
}

async function sendQmsg(key: string, payload: PushPayload): Promise<boolean> {
  if (!key) return false
  try {
    const text = buildPlainText(payload)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(`https://qmsg.zendee.cn/send/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `msg=${encodeURIComponent(text)}`,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendDiscord(webhookUrl: string, payload: PushPayload): Promise<boolean> {
  if (!webhookUrl) return false
  try {
    const lines = payload.matches.slice(0, 10).map((m) =>
      `🔥 **${m.fullName}** (${m.language}, ⭐${m.stars.toLocaleString()}) - ${m.reason}`
    )
    if (payload.totalMatches > payload.matches.length) {
      lines.push(`... and ${payload.totalMatches - payload.matches.length} more`)
    }
    const body = {
      username: "RepoIntel",
      embeds: [{
        title: `📊 情报速递 - ${payload.ruleName}`,
        description: lines.join("\n"),
        color: 0x6366f1,
        footer: { text: `频率: ${payload.frequency} | 匹配: ${payload.totalMatches} 个项目` },
      }],
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendTelegram(botToken: string, chatId: string, payload: PushPayload): Promise<boolean> {
  if (!botToken || !chatId) return false
  try {
    const text = buildMarkdownText(payload)
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendServerChan(key: string, payload: PushPayload): Promise<boolean> {
  if (!key) return false
  try {
    const body = {
      title: `📊 RepoIntel 情报速递 - ${payload.ruleName}`,
      desp: buildMarkdownText(payload),
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(`https://sctapi.ftqq.com/${key}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function sendWxPusher(appToken: string, uids: string[], payload: PushPayload): Promise<boolean> {
  if (!appToken || !uids.length) return false
  try {
    const body = {
      appToken,
      content: buildMarkdownText(payload),
      contentType: 3,
      uids,
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch("https://wxpusher.zjiecode.com/api/send/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const result = await response.json() as { code: number }
    return result.code === 1000
  } catch {
    return false
  }
}

async function sendCustomWebhook(url: string, headers: Record<string, string> | undefined, bodyTemplate: string | undefined, payload: PushPayload): Promise<boolean> {
  if (!url) return false
  try {
    let body: string
    if (bodyTemplate) {
      body = bodyTemplate.replace("{{payload}}", JSON.stringify(payload))
    } else {
      body = JSON.stringify({
        event: "alert.match",
        timestamp: new Date().toISOString(),
        data: payload,
      })
    }
    const fetchHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, {
      method: "POST",
      headers: fetchHeaders,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

export function buildWebhookPreviewPayload(rule: AlertRuleRecord): object {
  return {
    event: "alert.match",
    timestamp: new Date().toISOString(),
    data: {
      rule_id: rule.id,
      rule_name: rule.name,
      frequency: rule.frequency,
      total_matches: 1,
      matches: [{
        full_name: "example-org/example-repo",
        description: "An example repository for webhook preview",
        language: rule.conditions.languages[0] || "TypeScript",
        stars: 5000,
        reason: "Preview: this is a test payload",
      }],
    },
  }
}
