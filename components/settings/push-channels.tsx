"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bell,
  MessageCircle,
  Send,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  Trash2,
  Pencil,
  Clock,
  ExternalLink,
  Copy,
} from "lucide-react"
import { toast } from "sonner"

interface PushChannelData {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  is_configured: boolean
  last_test_at: string | null
  last_test_result: "success" | "failed" | null
  created_at: string
  updated_at: string
}

const CHANNEL_TYPES = [
  { type: "feishu", label: "飞书机器人", icon: MessageCircle, description: "推送到飞书群机器人", configFields: [{ key: "webhook_url", label: "Webhook 地址", type: "url", placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/..." }] },
  { type: "wecom", label: "企业微信机器人", icon: MessageCircle, description: "推送到企业微信群机器人", configFields: [{ key: "webhook_url", label: "Webhook 地址", type: "url", placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." }] },
  { type: "dingtalk", label: "钉钉机器人", icon: MessageCircle, description: "推送到钉钉群机器人", configFields: [{ key: "webhook_url", label: "Webhook 地址", type: "url", placeholder: "https://oapi.dingtalk.com/robot/send?access_token=..." }] },
  { type: "pushplus", label: "PushPlus (微信)", icon: Send, description: "通过微信公众号推送，免费200次/天", configFields: [{ key: "pushplus_token", label: "Token", type: "text", placeholder: "你的 PushPlus Token" }] },
  { type: "qmsg", label: "Qmsg (QQ)", icon: MessageCircle, description: "推送到QQ，完全免费", configFields: [{ key: "qmsg_key", label: "KEY", type: "text", placeholder: "你的 Qmsg KEY" }] },
  { type: "bark", label: "Bark (iOS)", icon: Bell, description: "推送到iOS通知，完全免费", configFields: [{ key: "bark_key", label: "Key", type: "text", placeholder: "你的 Bark Key" }, { key: "bark_server", label: "服务器地址（可选）", type: "url", placeholder: "https://api.day.app" }] },
  { type: "discord", label: "Discord Webhook", icon: MessageCircle, description: "推送到Discord频道", configFields: [{ key: "discord_webhook_url", label: "Webhook URL", type: "url", placeholder: "https://discord.com/api/webhooks/..." }] },
  { type: "telegram", label: "Telegram Bot", icon: Send, description: "通过Telegram Bot推送", configFields: [{ key: "telegram_bot_token", label: "Bot Token", type: "text", placeholder: "123456:ABC-DEF..." }, { key: "telegram_chat_id", label: "Chat ID", type: "text", placeholder: "你的 Chat ID" }] },
  { type: "wxpusher", label: "WxPusher (微信)", icon: Send, description: "通过微信公众号推送，无限额", configFields: [{ key: "wxpusher_app_token", label: "App Token", type: "text", placeholder: "AT_xxx" }, { key: "wxpusher_uids", label: "用户UID（逗号分隔）", type: "text", placeholder: "UID_xxx,UID_yyy" }] },
  { type: "serverchan", label: "Server酱", icon: Send, description: "推送到微信，免费5次/天", configFields: [{ key: "serverchan_key", label: "SendKey", type: "text", placeholder: "你的 SendKey" }] },
  { type: "webhook", label: "自定义 Webhook", icon: Settings, description: "推送到自定义HTTP接口", configFields: [{ key: "custom_url", label: "URL", type: "url", placeholder: "https://your-server.com/webhook" }] },
]

export function PushChannels() {
  const [channels, setChannels] = useState<PushChannelData[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addType, setAddType] = useState("")
  const [editChannel, setEditChannel] = useState<PushChannelData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [channelName, setChannelName] = useState("")
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/channels")
      const data = await res.json()
      setChannels(data.channels || [])
    } catch {
      toast.error("获取渠道列表失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleAdd = async () => {
    if (!addType) return
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(configValues)) {
        if (k === "wxpusher_uids" && v) {
          config[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
        } else {
          config[k] = v
        }
      }
      const res = await fetch("/api/alerts/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: addType, name: channelName, config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "创建失败")
      }
      toast.success("渠道创建成功")
      setAddDialogOpen(false)
      setAddType("")
      setConfigValues({})
      setChannelName("")
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editChannel) return
    setSaving(true)
    try {
      const config: Record<string, unknown> = { ...editChannel.config }
      for (const [k, v] of Object.entries(configValues)) {
        if (k === "wxpusher_uids" && v) {
          config[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
        } else {
          config[k] = v
        }
      }
      const res = await fetch("/api/alerts/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editChannel.id, name: channelName, config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "更新失败")
      }
      toast.success("渠道更新成功")
      setEditDialogOpen(false)
      setEditChannel(null)
      setConfigValues({})
      setChannelName("")
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/channels?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || "删除失败")
      }
      toast.success("渠道已删除")
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    try {
      const res = await fetch("/api/alerts/channels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id }),
      })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [id]: data.success }))
      if (data.success) {
        toast.success("测试推送成功")
      } else {
        toast.error("测试推送失败")
      }
      fetchChannels()
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: false }))
      toast.error("测试推送失败")
    } finally {
      setTestingId(null)
    }
  }

  const openAddDialog = (type: string) => {
    const meta = CHANNEL_TYPES.find((c) => c.type === type)
    setAddType(type)
    setChannelName(meta?.label || "")
    setConfigValues({})
    setAddDialogOpen(true)
  }

  const openEditDialog = (channel: PushChannelData) => {
    setEditChannel(channel)
    setChannelName(channel.name)
    const vals: Record<string, string> = {}
    for (const [k, v] of Object.entries(channel.config)) {
      if (Array.isArray(v)) {
        vals[k] = v.join(",")
      } else if (v != null) {
        vals[k] = String(v)
      }
    }
    setConfigValues(vals)
    setEditDialogOpen(true)
  }

  const getChannelsByType = (type: string) => channels.filter((c) => c.type === type)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHANNEL_TYPES.map((ct) => {
          const Icon = ct.icon
          const typeChannels = getChannelsByType(ct.type)
          return (
            <Card key={ct.type} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {ct.label}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openAddDialog(ct.type)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{ct.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeChannels.length === 0 && (
                  <div className="flex items-center justify-center rounded-md border border-dashed border-border py-6">
                    <span className="text-xs text-muted-foreground">未配置，点击 + 添加</span>
                  </div>
                )}
                {typeChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-md border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{ch.name || ct.label}</span>
                        {ch.is_configured ? (
                          <Badge variant="outline" className="text-[10px] text-success border-success/30">
                            已配置
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            未完成
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {ch.last_test_result && (
                          testResults[ch.id] !== undefined ? (
                            testResults[ch.id] ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )
                          ) : ch.last_test_result === "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => openEditDialog(ch)}
                      >
                        <Pencil className="h-3 w-3" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        disabled={testingId === ch.id}
                        onClick={() => handleTest(ch.id)}
                      >
                        {testingId === ch.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <TestTube className="h-3 w-3" />
                        )}
                        测试
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ch.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              外部定时触发
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            推送需要程序运行时才生效。配置外部定时服务可在程序关闭时也能触发推送
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-sm font-medium">触发端点</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono">
                POST {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/alerts/execute
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  const url = `${window.location.origin}/api/alerts/execute`
                  navigator.clipboard.writeText(url)
                  toast.success("已复制端点地址")
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">推荐配置方式</p>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">推荐</Badge>
                <span className="text-sm font-medium">cron-job.org</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">免费在线定时任务服务，无需服务器</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>访问 cron-job.org 注册账号</li>
                <li>创建定时任务，URL 填写上方端点</li>
                <li>请求方式选 POST，Content-Type: application/json</li>
                <li>Body 填写 {"{}"}</li>
                <li>设置执行频率（建议每小时）</li>
              </ol>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">开发者</Badge>
                <span className="text-sm font-medium">GitHub Actions</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">利用 GitHub 仓库的 Actions 定时触发</p>
              <div className="relative">
                <pre className="rounded bg-muted p-2 text-[11px] font-mono overflow-x-auto">
{"name: RepoIntel Push\non:\n  schedule:\n    - cron: '0 * * * *'\njobs:\n  push:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          curl -X POST \\\n            ${{ secrets.REPOINTEL_URL }} \\\n            -H 'Content-Type: application/json' \\\n            -d '{}'"}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => {
                    const yaml = "name: RepoIntel Push\non:\n  schedule:\n    - cron: '0 * * * *'\njobs:\n  push:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          curl -X POST \\\n            ${{ secrets.REPOINTEL_URL }} \\\n            -H 'Content-Type: application/json' \\\n            -d '{}'"
                    navigator.clipboard.writeText(yaml)
                    toast.success("已复制 workflow 配置")
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">简单</Badge>
                <span className="text-sm font-medium">系统 crontab (Linux/Mac)</span>
              </div>
              <div className="relative">
                <pre className="rounded bg-muted p-2 text-[11px] font-mono overflow-x-auto">
                  0 * * * * curl -X POST http://localhost:3000/api/alerts/execute -H 'Content-Type: application/json' -d '{}'
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText("0 * * * * curl -X POST http://localhost:3000/api/alerts/execute -H 'Content-Type: application/json' -d '{}'")
                    toast.success("已复制 crontab 配置")
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加推送渠道</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">渠道类型</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道类型" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((ct) => (
                    <SelectItem key={ct.type} value={ct.type}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">名称</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="渠道名称"
              />
            </div>
            {addType && CHANNEL_TYPES.find((c) => c.type === addType)?.configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-sm">{field.label}</Label>
                <Input
                  type={field.type === "url" ? "url" : "text"}
                  value={configValues[field.key] || ""}
                  onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
              <Button onClick={handleAdd} disabled={saving || !addType}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                创建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑推送渠道</DialogTitle>
          </DialogHeader>
          {editChannel && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">名称</Label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="渠道名称"
                />
              </div>
              {CHANNEL_TYPES.find((c) => c.type === editChannel.type)?.configFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-sm">{field.label}</Label>
                  <Input
                    type={field.type === "url" ? "url" : "text"}
                    value={configValues[field.key] || ""}
                    onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                <Button onClick={handleEdit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
