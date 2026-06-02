"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { QualityBadge } from "@/lib/report-quality-utils"

interface PublicReportData {
  repo: {
    full_name: string
    name: string
    owner: string
    description: string | null
    language: string | null
    stars: number
    forks: number
    license: string | null
    topics: string[]
  } | null
  section_type: string
  mode: string
  language: string
  content: Record<string, unknown>
  mermaid_code: string | null
  quality: QualityBadge | null
  generated_by: string | null
  generated_at: string | null
}

const sectionLabels: Record<string, string> = {
  tldr: "项目速览",
  reverse_prd: "逆向 PRD",
  architecture: "架构分析",
  code_wiki: "代码百科",
  timeline: "演进时间线",
  tech_stack: "技术栈",
  community: "社区健康",
  contribution_guide: "贡献指南",
}

export function PublicReportPage() {
  const params = useParams<{ reportId: string }>()
  const [data, setData] = useState<PublicReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/reports/${params.reportId}`)
        if (!res.ok) {
          setError(res.status === 404 ? "报告不存在或尚未生成" : "加载失败")
          return
        }
        setData(await res.json())
      } catch {
        setError("网络错误，请稍后重试")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.reportId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载报告中...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">{error || "报告未找到"}</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const repo = data.repo
  const quality = data.quality

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                RepoIntel
              </Button>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">公开报告</span>
          </div>

          {repo && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{repo.full_name}</h1>
                <a
                  href={`https://github.com/${repo.full_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {repo.description && (
                <p className="text-muted-foreground">{repo.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{sectionLabels[data.section_type] || data.section_type}</Badge>
                {repo.language && (
                  <Badge variant="secondary">{repo.language}</Badge>
                )}
                <span className="text-muted-foreground">⭐ {repo.stars.toLocaleString()}</span>
                <span className="text-muted-foreground">🍴 {repo.forks.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quality Badge */}
        {quality ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-wrap items-center gap-4 py-3 px-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-5 w-5", quality.passed ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">质量评分</span>
                <span className={cn(
                  "text-lg font-bold",
                  quality.score >= 82 ? "text-primary" : quality.score >= 60 ? "text-chart-3" : "text-destructive"
                )}>
                  {quality.score}/100
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">证据支撑</span>
                <span className="font-medium text-foreground">{quality.evidenceRate}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-sm">
                {quality.hasUnknowns ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-muted-foreground">
                  {quality.hasUnknowns ? "已声明未知项" : "未声明未知项"}
                </span>
              </div>
              {quality.critiqueScore !== null && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">审稿评分</span>
                    <span className="font-medium text-foreground">{quality.critiqueScore}/100</span>
                  </div>
                </>
              )}
              {data.generated_by && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">由 {data.generated_by} 生成</span>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-border bg-muted/30">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">该报告未经质量分析（Fast 模式生成，未经过证据链提取与双重审稿）</span>
              {data.generated_by && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">由 {data.generated_by} 生成</span>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        <Card className="border-border">
          <CardContent className="p-6">
            <ReportContentRenderer content={data.content} />
          </CardContent>
        </Card>

        {/* CTA Footer */}
        <div className="mt-8 text-center">
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="py-8">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                生成你自己的项目分析
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                RepoIntel 提供证据链支撑、双重审稿的深度项目分析报告
              </p>
              <Link href="/">
                <Button className="gap-2">
                  开始使用 RepoIntel
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ReportContentRenderer({ content }: { content: Record<string, unknown> }) {
  const entries = Object.entries(content).filter(
    ([key]) => key !== "_meta" && key !== "mermaid"
  )

  return (
    <div className="space-y-6">
      {entries.map(([key, value]) => (
        <ContentSection key={key} fieldKey={key} value={value} />
      ))}
    </div>
  )
}

function ContentSection({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const label = formatFieldLabel(fieldKey)

  if (value === null || value === undefined || value === "") return null

  if (typeof value === "string") {
    return (
      <div>
        <h3 className="text-base font-medium text-foreground mb-2">{label}</h3>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <InlineContent text={value} />
        </div>
      </div>
    )
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div>
        <h3 className="text-base font-medium text-foreground mb-2">{label}</h3>
        <p className="text-sm text-muted-foreground">{String(value)}</p>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null

    if (typeof value[0] === "string") {
      return (
        <div>
          <h3 className="text-base font-medium text-foreground mb-2">{label}</h3>
          <div className="flex flex-wrap gap-1.5">
            {value.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{String(item)}</Badge>
            ))}
          </div>
        </div>
      )
    }

    if (typeof value[0] === "object" && value[0] !== null) {
      return (
        <div>
          <h3 className="text-base font-medium text-foreground mb-2">{label}</h3>
          <div className="space-y-3">
            {value.map((item, i) => (
              <ObjectCard key={i} data={item as Record<string, unknown>} />
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  if (typeof value === "object") {
    return (
      <div>
        <h3 className="text-base font-medium text-foreground mb-2">{label}</h3>
        <ObjectCard data={value as Record<string, unknown>} />
      </div>
    )
  }

  return null
}

function ObjectCard({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "")

  return (
    <Card className="border-border bg-muted/20">
      <CardContent className="p-3 space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 min-w-[80px]">{formatFieldLabel(k)}</span>
            <span className="text-foreground">
              {typeof v === "string" ? <InlineContent text={v} /> : String(v)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function InlineContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[source:\s*\w+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-foreground font-medium">{part.slice(2, -2)}</strong>
        }
        const sourceMatch = part.match(/^\[source:\s*(\w+)\]$/)
        if (sourceMatch) {
          const sourceType = sourceMatch[1].toLowerCase()
          const colorMap: Record<string, string> = {
            readme: "bg-primary/10 text-primary border-primary/20",
            metadata: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            inferred: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
            unknown: "bg-muted text-muted-foreground border-border",
          }
          const labelMap: Record<string, string> = {
            readme: "README",
            metadata: "元数据",
            inferred: "推断",
            unknown: "未知",
          }
          return (
            <Badge key={i} variant="outline" className={cn("text-[10px] px-1.5 py-0 mx-0.5", colorMap[sourceType] || colorMap.unknown)}>
              {labelMap[sourceType] || sourceType}
            </Badge>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function formatFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    title: "标题",
    summary: "摘要",
    problem: "核心问题",
    core_capabilities: "核心能力",
    suitable_users: "适用用户",
    cover_summary: "概览",
    positioning: "定位",
    target_users_and_jtbd: "目标用户与任务",
    feature_system: "功能体系",
    tech_stack: "技术栈",
    architecture_summary: "架构概览",
    modules: "模块",
    quickstart: "快速上手",
    entry_points: "入口点",
    critical_path: "关键路径",
    mvp_scope: "MVP 范围",
    milestones: "里程碑",
    evolution_pattern: "演进模式",
    categories: "分类",
    assessment: "评估",
    health_score: "健康评分",
    strengths: "优势",
    concerns: "关注点",
    getting_started: "入门指南",
    contribution_areas: "贡献方向",
    pr_process: "PR 流程",
    confidence: "置信度",
    evidence_refs: "证据引用",
    source_tags: "来源标记",
  }

  if (labels[key]) return labels[key]

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
