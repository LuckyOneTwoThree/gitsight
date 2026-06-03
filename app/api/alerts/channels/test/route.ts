import { errorResponse, jsonResponse } from "@/src/server/lib/http"
import { readStore } from "@/src/server/lib/file-store"
import { testPushChannel } from "@/src/server/modules/alerts/push-sender"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    channelId?: string
  } | null

  if (!body?.channelId) {
    return errorResponse("INVALID_REQUEST", "请提供 channelId", 400)
  }

  const store = readStore()
  const channel = store.push_channels.find((c) => c.id === body.channelId)
  if (!channel) {
    return errorResponse("CHANNEL_NOT_FOUND", "渠道不存在", 404)
  }

  const result = await testPushChannel(channel)

  return jsonResponse({
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type,
    success: result.success,
    error: result.error,
  })
}
