import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import {
  createPushChannel,
  deletePushChannel,
  getPushChannels,
  updatePushChannel,
} from "@/src/server/modules/alerts/push-channels-service"
import type { PushChannel } from "@/src/server/lib/file-store"

export async function GET() {
  return jsonResponse({ channels: getPushChannels() })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    type?: string
    name?: string
    config?: PushChannel["config"]
  } | null

  if (!body?.type) {
    return errorResponse("INVALID_CHANNEL", "请提供渠道类型", 400)
  }

  const validTypes: string[] = [
    "feishu", "wecom", "dingtalk", "bark", "pushplus",
    "qmsg", "discord", "telegram", "webhook", "serverchan", "wxpusher",
  ]
  if (!validTypes.includes(body.type)) {
    return errorResponse("INVALID_CHANNEL", `不支持的渠道类型: ${body.type}`, 400)
  }

  try {
    const channel = await createPushChannel({
      type: body.type as PushChannel["type"],
      name: body.name || "",
      config: body.config || {},
    })
    return jsonResponse({ channel })
  } catch (err) {
    return errorResponse("CREATE_CHANNEL_FAILED", err instanceof Error ? err.message : "创建失败", 400)
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string
    name?: string
    config?: PushChannel["config"]
  } | null

  if (!body?.id) {
    return errorResponse("INVALID_CHANNEL", "请提供渠道 ID", 400)
  }

  try {
    const channel = await updatePushChannel(body.id, {
      name: body.name,
      config: body.config,
    })

    if (!channel) {
      return errorResponse("CHANNEL_NOT_FOUND", "渠道不存在", 404)
    }

    return jsonResponse({ channel })
  } catch (err) {
    return errorResponse("UPDATE_CHANNEL_FAILED", err instanceof Error ? err.message : "更新失败", 400)
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const channelId = searchParams.get("id")

  if (!channelId) {
    return errorResponse("INVALID_CHANNEL", "请提供渠道 ID", 400)
  }

  const deleted = await deletePushChannel(channelId)
  if (!deleted) {
    return errorResponse("CHANNEL_NOT_FOUND", "渠道不存在", 404)
  }

  return jsonResponse({ success: true })
}
