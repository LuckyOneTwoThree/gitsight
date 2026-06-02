"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { useApp } from "@/components/app-provider"
import { cn } from "@/lib/utils"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Bell,
  Plus,
  Pause,
  Play,
  Trash2,
  Pencil,
  TestTube,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  ExternalLink,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

interface AlertRule {
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

interface ChannelData {
  id: string
  type: string
  name: string
  is_configured: boolean
}

interface AlertStats {
  activeRules: number
  totalRules: number
  weeklyPushes: number
  monthlyPushes: number
}

const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C++", "C", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "Shell", "Lua", "Zig", "Elixir", "Scala", "R"]
const TAGS = ["web3", "llm-agent", "rag", "devops", "ai", "database", "framework", "cli", "library", "tool", "security", "monitoring", "testing", "visualization", "compiler", "runtime", "embedded", "game", "mobile", "desktop"]
const INTEL_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D"]
const LICENSE_TYPES = ["MIT", "Apache-2.0", "GPL-3.0", "GPL-2.0", "BSD-3-Clause", "BSD-2-Clause", "MPL-2.0", "LGPL-3.0", "Unlicense", "AGPL-3.0"]

const FREQUENCY_LABELS: Record<string, string> = {
  hourly: "每小时",
  daily: "每天",
  weekly: "每周",
  on_change: "有变化时",
}

interface RuleForm {
  name: string
  languages: string[]
  tags: string[]
  starThreshold: number
  minStars: string
  maxStars: string
  velocityMin: string
  velocityMax: string
  intelGradeRange: string[]
  excludeLanguages: string[]
  excludeTags: string[]
  forksMin: string
  forksMax: string
  licenseTypes: string[]
  isArchived: boolean
  frequency: string
  channelIds: string[]
  webhookUrl: string
}

const defaultForm: RuleForm = {
  name: "",
  languages: [],
  tags: [],
  starThreshold: 500,
  minStars: "",
  maxStars: "",
  velocityMin: "",
  velocityMax: "",
  intelGradeRange: [],
  excludeLanguages: [],
  excludeTags: [],
  forksMin: "",
  forksMax: "",
  licenseTypes: [],
  isArchived: false,
  frequency: "weekly",
  channelIds: [],
  webhookUrl: "",
}

export default function AlertsPage() {
  const { dict } = useApp()
  const t = dict.alerts
  const [rules, setRules] = useState<AlertRule[]>([])
  const [channels, setChannels] = useState<ChannelData[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [form, setForm] = useState<RuleForm>({ ...defaultForm })
  const [saving, setSaving] = useState(false)
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, channelsRes] = await Promise.all([
        fetch("/api/alerts/rules"),
        fetch("/api/alerts/channels"),
      ])
      const rulesData = await rulesRes.json()
      const channelsData = await channelsRes.json()
      setRules(rulesData.rules || [])
      setStats(rulesData.stats || null)
      setChannels(channelsData.channels || [])
    } catch {
      toast.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleChip = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("请输入规则名称")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        languages: form.languages,
        tags: form.tags,
        starThreshold: form.starThreshold,
        minStars: form.minStars ? Number(form.minStars) : null,
        maxStars: form.maxStars ? Number(form.maxStars) : null,
        velocityRange: form.velocityMin || form.velocityMax
          ? { min: form.velocityMin ? Number(form.velocityMin) : undefined, max: form.velocityMax ? Number(form.velocityMax) : undefined }
          : null,
        intelGradeRange: form.intelGradeRange,
        excludeLanguages: form.excludeLanguages,
        excludeTags: form.excludeTags,
        forksRange: form.forksMin || form.forksMax
          ? { min: form.forksMin ? Number(form.forksMin) : undefined, max: form.forksMax ? Number(form.forksMax) : undefined }
          : null,
        licenseTypes: form.licenseTypes,
        isArchived: form.isArchived,
        frequency: form.frequency,
        channels: {
          webhook: !!form.webhookUrl,
          webhookUrl: form.webhookUrl,
          channelIds: form.channelIds,
        },
      }

      if (editingRule) {
        const res = await fetch("/api/alerts/rules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingRule.id, ...payload }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message || "更新失败")
        }
        toast.success("规则更新成功")
      } else {
        const res = await fetch("/api/alerts/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message || "创建失败")
        }
        toast.success("规则创建成功")
      }
      setCreateDialogOpen(false)
      setEditDialogOpen(false)
      setEditingRule(null)
      setForm({ ...defaultForm })
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      const res = await fetch("/api/alerts/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      })
      if (!res.ok) throw new Error("操作失败")
      toast.success(rule.isActive ? "规则已暂停" : "规则已恢复")
      fetchData()
    } catch {
      toast.error("操作失败")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/rules?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("删除失败")
      toast.success("规则已删除")
      fetchData()
    } catch {
      toast.error("删除失败")
    }
  }

  const handleTestPush = async (rule: AlertRule) => {
    setTestingRuleId(rule.id)
    try {
      const res = await fetch("/api/alerts/push-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, dryRun: true }),
      })
      const data = await res.json()
      if (data.matchedRepos !== undefined) {
        toast.success(`匹配 ${data.matchedRepos} 个项目`)
      } else {
        toast.error("测试失败")
      }
    } catch {
      toast.error("测试失败")
    } finally {
      setTestingRuleId(null)
    }
  }

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      languages: rule.conditions.languages,
      tags: rule.conditions.tags,
      starThreshold: rule.conditions.starThreshold,
      minStars: rule.conditions.minStars != null ? String(rule.conditions.minStars) : "",
      maxStars: rule.conditions.maxStars != null ? String(rule.conditions.maxStars) : "",
      velocityMin: rule.conditions.velocityRange?.min != null ? String(rule.conditions.velocityRange.min) : "",
      velocityMax: rule.conditions.velocityRange?.max != null ? String(rule.conditions.velocityRange.max) : "",
      intelGradeRange: rule.conditions.intelGradeRange,
      excludeLanguages: rule.conditions.excludeLanguages,
      excludeTags: rule.conditions.excludeTags,
      forksMin: rule.conditions.forksRange?.min != null ? String(rule.conditions.forksRange.min) : "",
      forksMax: rule.conditions.forksRange?.max != null ? String(rule.conditions.forksRange.max) : "",
      licenseTypes: rule.conditions.licenseTypes,
      isArchived: rule.conditions.isArchived,
      frequency: rule.frequency,
      channelIds: rule.channels.channelIds,
      webhookUrl: rule.channels.webhookUrl,
    })
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingRule(null)
    setForm({ ...defaultForm })
    setCreateDialogOpen(true)
  }

  const getConditionsSummary = (rule: AlertRule) => {
    const parts: string[] = []
    if (rule.conditions.languages.length) parts.push(`语言: ${rule.conditions.languages.join(", ")}`)
    if (rule.conditions.tags.length) parts.push(`标签: ${rule.conditions.tags.join(", ")}`)
    if (rule.conditions.intelGradeRange.length) parts.push(`等级: ${rule.conditions.intelGradeRange.join(", ")}`)
    if (rule.conditions.starThreshold) parts.push(`⭐ ≥${rule.conditions.starThreshold}`)
    return parts.length ? parts.join(" · ") : "无筛选条件"
  }

  const configuredChannels = channels.filter((c) => c.is_configured)

  const renderForm = () => (
    <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label className="text-sm">规则名称</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="例如：Rust 高星项目"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">语言</Label>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setForm((f) => ({ ...f, languages: toggleChip(f.languages, lang) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.languages.includes(lang)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">标签</Label>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setForm((f) => ({ ...f, tags: toggleChip(f.tags, tag) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.tags.includes(tag)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">最低星数</Label>
          <Input
            type="number"
            value={form.starThreshold}
            onChange={(e) => setForm((f) => ({ ...f, starThreshold: Number(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">星数范围</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="最小"
              value={form.minStars}
              onChange={(e) => setForm((f) => ({ ...f, minStars: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="最大"
              value={form.maxStars}
              onChange={(e) => setForm((f) => ({ ...f, maxStars: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">增速范围</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="最小"
              value={form.velocityMin}
              onChange={(e) => setForm((f) => ({ ...f, velocityMin: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="最大"
              value={form.velocityMax}
              onChange={(e) => setForm((f) => ({ ...f, velocityMax: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Fork 范围</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="最小"
              value={form.forksMin}
              onChange={(e) => setForm((f) => ({ ...f, forksMin: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="最大"
              value={form.forksMax}
              onChange={(e) => setForm((f) => ({ ...f, forksMax: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">情报等级</Label>
        <div className="flex flex-wrap gap-1.5">
          {INTEL_GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setForm((f) => ({ ...f, intelGradeRange: toggleChip(f.intelGradeRange, grade) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.intelGradeRange.includes(grade)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">排除语言</Label>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setForm((f) => ({ ...f, excludeLanguages: toggleChip(f.excludeLanguages, lang) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.excludeLanguages.includes(lang)
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">排除标签</Label>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setForm((f) => ({ ...f, excludeTags: toggleChip(f.excludeTags, tag) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.excludeTags.includes(tag)
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">许可证类型</Label>
        <div className="flex flex-wrap gap-1.5">
          {LICENSE_TYPES.map((lic) => (
            <button
              key={lic}
              type="button"
              onClick={() => setForm((f) => ({ ...f, licenseTypes: toggleChip(f.licenseTypes, lic) }))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                form.licenseTypes.includes(lic)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {lic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm">包含已归档项目</Label>
        <Switch
          checked={form.isArchived}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, isArchived: checked }))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">推送频率</Label>
        <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">每小时</SelectItem>
            <SelectItem value="daily">每天</SelectItem>
            <SelectItem value="weekly">每周</SelectItem>
            <SelectItem value="on_change">有变化时</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">推送渠道</Label>
        {configuredChannels.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">暂无已配置的推送渠道</p>
            <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Settings className="h-3 w-3" />
              前往设置配置渠道
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {configuredChannels.map((ch) => (
              <label
                key={ch.id}
                className="flex items-center gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-accent transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form.channelIds.includes(ch.id)}
                  onChange={() => setForm((f) => ({ ...f, channelIds: toggleChip(f.channelIds, ch.id) }))}
                  className="rounded border-border"
                />
                <span className="text-sm">{ch.name}</span>
                <Badge variant="outline" className="text-[10px]">{ch.type}</Badge>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">自定义 Webhook URL（可选）</Label>
        <Input
          type="url"
          value={form.webhookUrl}
          onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
          placeholder="https://your-webhook-url.com/endpoint"
        />
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Bell className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
            <Button size="sm" className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              创建规则
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-6 flex-col xl:flex-row">
              <aside className="xl:w-[260px] shrink-0 space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">概览</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">活跃规则</span>
                      <span className="text-sm font-semibold">{stats?.activeRules ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">总规则数</span>
                      <span className="text-sm font-semibold">{stats?.totalRules ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">本周推送</span>
                      <span className="text-sm font-semibold">{stats?.weeklyPushes ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">推送渠道</CardTitle>
                      <Link href="/settings" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        配置
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {channels.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-muted-foreground mb-2">暂无推送渠道</p>
                        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" />
                          前往配置
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {channels.map((ch) => (
                          <div key={ch.id} className="flex items-center gap-2">
                            {ch.is_configured ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-xs truncate">{ch.name}</span>
                            <Badge variant="outline" className="text-[9px] ml-auto">{ch.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">外部触发</CardTitle>
                      <Link href="/settings" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        配置
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">本地调度运行中</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        关闭程序后推送将暂停，可配置外部定时服务保持推送
                      </p>
                      <Link href="/settings" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        查看配置方式
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              <div className="flex-1 space-y-4 min-w-0">
                {rules.length === 0 ? (
                  <Card className="border-border bg-card">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Bell className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">还没有订阅规则</p>
                      <Button size="sm" className="gap-2" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4" />
                        创建第一条规则
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  rules.map((rule) => (
                    <Card key={rule.id} className={cn("border-border bg-card", !rule.isActive && "opacity-60")}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold truncate">{rule.name}</span>
                              <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px]">
                                {rule.isActive ? "活跃" : "已暂停"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {FREQUENCY_LABELS[rule.frequency] || rule.frequency}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{getConditionsSummary(rule)}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {rule.channels.channelIds.length > 0 && (
                                <span>{rule.channels.channelIds.length} 个渠道</span>
                              )}
                              {rule.channels.webhook && (
                                <span>Webhook</span>
                              )}
                              {rule.pushCount > 0 && (
                                <span>推送 {rule.pushCount} 次</span>
                              )}
                              {rule.lastPushAt && (
                                <span>最近推送: {rule.lastPushAt}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(rule)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleActive(rule)}
                            >
                              {rule.isActive ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={testingRuleId === rule.id}
                              onClick={() => handleTestPush(rule)}
                            >
                              {testingRuleId === rule.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <TestTube className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建订阅规则</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              创建
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑订阅规则</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
