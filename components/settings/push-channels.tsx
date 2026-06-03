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
import { useApp } from "@/components/app-provider"
import type { Dictionary } from "@/lib/i18n"

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

const getChannelTypes = (t: Dictionary["pushChannels"]) => [
  { type: "feishu", label: t.feishu, icon: MessageCircle, description: t.feishuDesc, configFields: [{ key: "webhook_url", label: t.webhookUrl, type: "url", placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/..." }] },
  { type: "wecom", label: t.wecom, icon: MessageCircle, description: t.wecomDesc, configFields: [{ key: "webhook_url", label: t.webhookUrl, type: "url", placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." }] },
  { type: "dingtalk", label: t.dingtalk, icon: MessageCircle, description: t.dingtalkDesc, configFields: [{ key: "webhook_url", label: t.webhookUrl, type: "url", placeholder: "https://oapi.dingtalk.com/robot/send?access_token=..." }] },
  { type: "pushplus", label: t.pushplus, icon: Send, description: t.pushplusDesc, configFields: [{ key: "pushplus_token", label: t.token, type: "text", placeholder: "你的 PushPlus Token" }] },
  { type: "qmsg", label: t.qmsg, icon: MessageCircle, description: t.qmsgDesc, configFields: [{ key: "qmsg_key", label: t.key, type: "text", placeholder: "你的 Qmsg KEY" }] },
  { type: "bark", label: t.bark, icon: Bell, description: t.barkDesc, configFields: [{ key: "bark_key", label: t.barkKey, type: "text", placeholder: "你的 Bark Key" }, { key: "bark_server", label: t.barkServer, type: "url", placeholder: "https://api.day.app" }] },
  { type: "discord", label: t.discord, icon: MessageCircle, description: t.discordDesc, configFields: [{ key: "discord_webhook_url", label: t.discordWebhookUrl, type: "url", placeholder: "https://discord.com/api/webhooks/..." }] },
  { type: "telegram", label: t.telegram, icon: Send, description: t.telegramDesc, configFields: [{ key: "telegram_bot_token", label: t.telegramBotToken, type: "text", placeholder: "123456:ABC-DEF..." }, { key: "telegram_chat_id", label: t.telegramChatId, type: "text", placeholder: "你的 Chat ID" }] },
  { type: "wxpusher", label: t.wxpusher, icon: Send, description: t.wxpusherDesc, configFields: [{ key: "wxpusher_app_token", label: t.wxpusherAppToken, type: "text", placeholder: "AT_xxx" }, { key: "wxpusher_uids", label: t.wxpusherUids, type: "text", placeholder: "UID_xxx,UID_yyy" }] },
  { type: "serverchan", label: t.serverchan, icon: Send, description: t.serverchanDesc, configFields: [{ key: "serverchan_key", label: t.serverchanKey, type: "text", placeholder: "你的 SendKey" }] },
  { type: "webhook", label: t.webhook, icon: Settings, description: t.webhookDesc, configFields: [{ key: "custom_url", label: t.customUrl, type: "url", placeholder: "https://your-server.com/webhook" }] },
]

export function PushChannels() {
  const { dict } = useApp()
  const t = dict.pushChannels
  const tc = dict.common
  const channelTypes = getChannelTypes(t)

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
  const [testErrors, setTestErrors] = useState<Record<string, string>>({})

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/channels")
      const data = await res.json()
      setChannels(data.channels || [])
    } catch {
      toast.error(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }, [t.fetchFailed])

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
        throw new Error(data.error?.message || t.createFailed)
      }
      toast.success(t.createSuccess)
      setAddDialogOpen(false)
      setAddType("")
      setConfigValues({})
      setChannelName("")
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.createFailed)
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
        throw new Error(data.error?.message || t.updateFailed)
      }
      toast.success(t.updateSuccess)
      setEditDialogOpen(false)
      setEditChannel(null)
      setConfigValues({})
      setChannelName("")
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.updateFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/channels?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || t.deleteFailed)
      }
      toast.success(t.deleteSuccess)
      fetchChannels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.deleteFailed)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setTestErrors((prev) => {
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
        toast.success(t.testSuccess)
      } else {
        const errorMsg = data.error || t.testFailed
        setTestErrors((prev) => ({ ...prev, [id]: errorMsg }))
        toast.error(`${t.testFailed}: ${errorMsg}`)
      }
      fetchChannels()
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: false }))
      toast.error(t.testFailed)
    } finally {
      setTestingId(null)
    }
  }

  const openAddDialog = (type: string) => {
    const meta = channelTypes.find((c) => c.type === type)
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
        {channelTypes.map((ct) => {
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
                    <span className="text-xs text-muted-foreground">{t.notConfiguredAdd}</span>
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
                            {tc.configured}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {tc.incomplete}
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
                    {testErrors[ch.id] && (
                      <p className="text-xs text-destructive break-all">{testErrors[ch.id]}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => openEditDialog(ch)}
                      >
                        <Pencil className="h-3 w-3" />
                        {tc.edit}
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
                        {tc.test}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ch.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        {tc.delete}
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
              {t.externalTrigger}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.externalTriggerDesc}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-sm font-medium">{t.triggerEndpoint}</p>
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
                  toast.success(t.endpointCopied)
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t.recommendedSetup}</p>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.recommended}</Badge>
                <span className="text-sm font-medium">{t.cronJobOrg}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{t.cronJobOrgDesc}</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>{t.cronJobStep1}</li>
                <li>{t.cronJobStep2}</li>
                <li>{t.cronJobStep3}</li>
                <li>{t.cronJobStep4}</li>
                <li>{t.cronJobStep5}</li>
              </ol>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.developer}</Badge>
                <span className="text-sm font-medium">{t.githubActions}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{t.githubActionsDesc}</p>
              <div className="relative">
                <pre className="rounded bg-muted p-2 text-[11px] font-mono overflow-x-auto">
{"name: GitSight Push\non:\n  schedule:\n    - cron: '0 * * * *'\njobs:\n  push:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          curl -X POST \\\n            ${{ secrets.GITSIGHT_URL }} \\\n            -H 'Content-Type: application/json' \\\n            -d '{}'"}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => {
                    const yaml = "name: GitSight Push\non:\n  schedule:\n    - cron: '0 * * * *'\njobs:\n  push:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          curl -X POST \\\n            ${{ secrets.GITSIGHT_URL }} \\\n            -H 'Content-Type: application/json' \\\n            -d '{}'"
                    navigator.clipboard.writeText(yaml)
                    toast.success(t.workflowCopied)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.simple}</Badge>
                <span className="text-sm font-medium">{t.systemCrontab}</span>
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
                    toast.success(t.crontabCopied)
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
            <DialogTitle>{t.addChannel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{t.channelType}</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectChannelType} />
                </SelectTrigger>
                <SelectContent>
                  {channelTypes.map((ct) => (
                    <SelectItem key={ct.type} value={ct.type}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tc.name}</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={t.channelName}
              />
            </div>
            {addType && channelTypes.find((c) => c.type === addType)?.configFields.map((field) => (
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
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{tc.cancel}</Button>
              <Button onClick={handleAdd} disabled={saving || !addType}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tc.create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editChannel}</DialogTitle>
          </DialogHeader>
          {editChannel && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{tc.name}</Label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder={t.channelName}
                />
              </div>
              {channelTypes.find((c) => c.type === editChannel.type)?.configFields.map((field) => (
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
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{tc.cancel}</Button>
                <Button onClick={handleEdit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tc.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
