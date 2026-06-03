"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import DOMPurify from "dompurify"
import { useApp } from "@/components/app-provider"
import type { Dictionary } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  Download,
  Share2,
  RefreshCw,
  Clock,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Settings
} from "lucide-react"
import mermaid from "mermaid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import type { AnalysisSection } from "@/lib/analysis-sections"
import { toast } from "sonner"

interface AnalysisContentProps {
  section: AnalysisSection
  repoName: string
  onGenerate?: (section: AnalysisSection) => void
  isGenerating?: boolean
  generatedContent?: Record<string, unknown> | null
  generatedBy?: string | null
  generatedAt?: string | null
  reportLang?: "zh" | "en"
  onReportLangChange?: (lang: "zh" | "en") => void
  reportMode?: "fast" | "deep"
  onReportModeChange?: (mode: "fast" | "deep") => void
  reportId?: number
  llmConfigured?: boolean
}

// Mermaid diagram renderer
let mermaidIdCounter = 0

function MermaidPlaceholder({ code }: { code: string }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Use a unique ID per render to avoid conflicts with already-rendered diagrams
    const id = `mermaid-${++mermaidIdCounter}-${Date.now()}`

    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    })

    // Remove any existing SVG element with the same ID (stale from HMR/re-render)
    try {
      const existing = document.getElementById(id)
      if (existing) existing.remove()
    } catch {}

    mermaid
      .render(id, code)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Mermaid render failed")
      })

    return () => { cancelled = true }
  }, [code])

  if (error) {
    return (
      <div className="my-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
        <p className="font-medium mb-1">{t.renderingFlowchart}</p>
        <p className="text-xs">{error}</p>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer hover:text-foreground">{t.viewMermaidSource}</summary>
          <pre className="mt-2 p-3 rounded bg-background text-xs overflow-x-auto">
            <code className="text-muted-foreground">{code}</code>
          </pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-6 p-8 rounded-lg border border-border bg-muted/30 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">{t.renderingFlowchart}</p>
      </div>
    )
  }

  return (
    <div className="my-6 p-6 rounded-lg border border-border bg-muted/20 overflow-x-auto">
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg) }} />
      <details className="mt-4">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          {t.viewMermaidSource}
        </summary>
        <pre className="mt-2 p-3 rounded bg-background text-xs overflow-x-auto">
          <code className="text-muted-foreground">{code}</code>
        </pre>
      </details>
    </div>
  )
}

// Markdown content renderer (simplified)
function MarkdownContent({ content }: { content: string }) {
  // Parse basic markdown to JSX
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inTable = false
  let tableRows: string[][] = []
  let inCodeBlock = false
  let codeContent = ""

  const processLine = (line: string, index: number) => {
    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={index} className="my-4 p-4 rounded-lg bg-muted/50 border border-border overflow-x-auto">
            <code className="text-sm text-muted-foreground">{codeContent}</code>
          </pre>
        )
        codeContent = ""
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeContent += line + "\n"
      return
    }

    // Headers
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-lg font-semibold text-foreground mt-6 mb-3">
          {line.replace("## ", "")}
        </h2>
      )
      return
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-base font-medium text-foreground mt-4 mb-2">
          {line.replace("### ", "")}
        </h3>
      )
      return
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={index} className="my-4 pl-4 border-l-2 border-primary text-muted-foreground italic">
          {line.replace("> ", "")}
        </blockquote>
      )
      return
    }

    // Tables
    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      
      if (!line.includes("---")) {
        const cells = line.split("|").filter(Boolean).map(c => c.trim())
        tableRows.push(cells)
      }
      return
    } else if (inTable) {
      // End of table
      elements.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {tableRows[0]?.map((cell, i) => (
                  <th key={i} className="px-4 py-2 text-left font-medium text-foreground bg-muted/50">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-border">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      inTable = false
      tableRows = []
    }

    // Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={index} className="ml-4 text-sm text-muted-foreground mb-1 list-disc">
          {line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
        </li>
      )
      return
    }

    // Numbered lists
    if (/^\d+\. /.test(line)) {
      elements.push(
        <li key={index} className="ml-4 text-sm text-muted-foreground mb-1 list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      )
      return
    }

    // Regular paragraphs
    if (line.trim()) {
      const processedLine = DOMPurify.sanitize(
        line
          .replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground'>$1</strong>")
          .replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 rounded bg-muted text-primary text-xs'>$1</code>")
      )

      elements.push(
        <p 
          key={index} 
          className="text-sm text-muted-foreground mb-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      )
    }
  }

  lines.forEach(processLine)

  return <div className="prose-sm max-w-none">{elements}</div>
}

function StructuredReportContent({ content, reportLang = "zh" }: { content: Record<string, unknown>; reportLang?: "zh" | "en" }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const businessEntries = Object.entries(content)
    .filter(([key]) => key !== "_meta" && key !== "mermaid" && key !== "title")

  return (
    <div className="space-y-5">
      {businessEntries.length === 0 && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">
              {t.incompleteReport}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.incompleteReportDesc}
          </p>
        </div>
      )}
      {businessEntries.map(([key, value]) => (
        <section key={key}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {formatReportKey(key, reportLang)}
          </h3>
          <ReportValue value={value} fieldKey={key} reportLang={reportLang} />
        </section>
      ))}
      {"_meta" in content && (
        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t.generationContext}
          </h3>
          <ReportValue value={summarizeReportMeta(content._meta, reportLang)} fieldKey="_meta" reportLang={reportLang} />
        </section>
      )}
    </div>
  )
}

function summarizeReportMeta(meta: unknown, reportLang: "zh" | "en" = "zh") {
  if (!meta || typeof meta !== "object") return meta

  const record = meta as Record<string, unknown>
  const evidencePack = record.evidence_pack as Record<string, unknown> | undefined
  const dataCoverage = evidencePack?.data_coverage as Record<string, unknown> | undefined
  const quality = record.quality as Record<string, unknown> | undefined
  const critique = record.critique as Record<string, unknown> | undefined

  return {
    provider: record.provider,
    model: record.model,
    generated_from: record.generated_from,
    evidence_summary: evidencePack
      ? {
          confirmed_facts: typeof evidencePack.confirmed_facts === "number"
            ? evidencePack.confirmed_facts
            : Array.isArray(evidencePack.confirmed_facts)
            ? evidencePack.confirmed_facts.length
            : 0,
          inferred_signals: typeof evidencePack.inferred_signals === "number"
            ? evidencePack.inferred_signals
            : Array.isArray(evidencePack.inferred_signals)
            ? evidencePack.inferred_signals.length
            : 0,
          evidence_items: Array.isArray(evidencePack.evidence_catalog)
            ? evidencePack.evidence_catalog.length
            : 0,
          data_coverage: dataCoverage,
        }
      : undefined,
    quality: reportLang === "en" && quality
      ? {
          passed: quality.passed,
          score: quality.score,
          metrics: quality.metrics,
        }
      : record.quality,
    critique: reportLang === "en" && critique
      ? {
          passed: critique.passed,
          score: critique.score,
        }
      : record.critique,
    ...(reportLang === "zh" ? { context_warnings: record.context_warnings } : {}),
  }
}

function ReportValue({ value, fieldKey, reportLang = "zh" }: { value: unknown; fieldKey?: string; reportLang?: "zh" | "en" }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground italic">—</p>
  }

  if (typeof value === "number") {
    if (fieldKey === "overall" || fieldKey === "score") {
      return <ScoreBar score={value} />
    }
    return <p className="text-sm leading-relaxed text-muted-foreground">{value}</p>
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="text-xs">
        {value ? dict.common.yes : dict.common.no}
      </Badge>
    )
  }

  if (typeof value === "string") {
    if (fieldKey === "priority") {
      return <PriorityBadge priority={value} />
    }
    if (fieldKey === "severity") {
      return <SeverityBadge severity={value} />
    }
    if (fieldKey === "difficulty") {
      return <DifficultyBadge difficulty={value} reportLang={reportLang} />
    }
    if (fieldKey === "path" || fieldKey === "file" || fieldKey === "evidence") {
      return <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs break-all">{value}</code>
    }
    if (value.includes("\n")) {
      const hasSourceTags = /\[source:\s*\w+\]/.test(value)
      if (hasSourceTags) {
        return (
          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {value.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <InlineSourceContent text={line} />
              </span>
            ))}
          </div>
        )
      }
      return (
        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{value}</div>
      )
    }
    if (/\[source:\s*\w+\]/.test(value)) {
      return <p className="text-sm leading-relaxed text-muted-foreground"><InlineSourceContent text={value} /></p>
    }
    return <p className="text-sm leading-relaxed text-muted-foreground">{value}</p>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground italic">{t.noData}</p>
    }

    const isStringArray = value.every((item) => typeof item === "string")
    if (isStringArray) {
      if (fieldKey === "steps" || fieldKey === "key_changes" || fieldKey === "core_features") {
        return (
          <ol className="space-y-2 ml-1">
            {(value as string[]).map((item, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {index + 1}
                </span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ol>
        )
      }

      if (fieldKey === "key_files" || fieldKey === "suggested_files" || fieldKey === "read_next") {
        return (
          <div className="flex flex-wrap gap-1.5">
            {(value as string[]).map((item, index) => (
              <code key={index} className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs">{item}</code>
            ))}
          </div>
        )
      }

      return (
        <ul className="space-y-2">
          {(value as string[]).map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span>{/\[source:\s*\w+\]/.test(item) ? <InlineSourceContent text={item} /> : item}</span>
            </li>
          ))}
        </ul>
      )
    }

    const isObjectArray = value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))
    if (isObjectArray) {
      const items = value as Record<string, unknown>[]
      const hasNameField = items.some((item) => "name" in item || "area" in item || "role" in item || "phase" in item || "question" in item)

      if (hasNameField) {
        return (
          <div className="space-y-3">
            {items.map((item, index) => {
              const label = String(item.name || item.area || item.role || item.phase || item.question || `#${index + 1}`)
              return (
                <div key={index} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {item.priority != null && <PriorityBadge priority={String(item.priority)} />}
                    {item.difficulty != null && <DifficultyBadge difficulty={String(item.difficulty)} reportLang={reportLang} />}
                    {item.severity != null && <SeverityBadge severity={String(item.severity)} />}
                    {item.period != null && <Badge variant="outline" className="text-xs">{String(item.period)}</Badge>}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(item)
                      .filter(([k]) => k !== "name" && k !== "area" && k !== "role" && k !== "phase" && k !== "question" && k !== "priority" && k !== "difficulty" && k !== "severity" && k !== "period")
                      .map(([k, v]) => (
                        <div key={k} className="grid gap-1 md:grid-cols-[140px_1fr]">
                          <span className="text-xs font-medium text-muted-foreground">{formatReportKey(k, reportLang)}</span>
                          <div className="text-sm text-muted-foreground">
                            <ReportValue value={v} fieldKey={k} reportLang={reportLang} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      return (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-md border border-border bg-background/60 p-3">
              <div className="space-y-1.5">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="grid gap-1 md:grid-cols-[140px_1fr]">
                    <span className="text-xs font-medium text-muted-foreground">{formatReportKey(k, reportLang)}</span>
                    <div className="text-sm text-muted-foreground">
                      <ReportValue value={v} fieldKey={k} reportLang={reportLang} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <ul className="space-y-2">
        {value.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-muted-foreground">
            {typeof item === "object" && item ? <ReportValue value={item} fieldKey={fieldKey} reportLang={reportLang} /> : String(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === "object" && value) {
    const entries = Object.entries(value as Record<string, unknown>)

    if (fieldKey === "health_score" || fieldKey === "assessment") {
      return <ObjectCard entries={entries} reportLang={reportLang} />
    }

    return (
      <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
        {entries.map(([key, nestedValue]) => (
          <div key={key} className="grid gap-1 md:grid-cols-[150px_1fr]">
            <span className="text-xs font-medium text-muted-foreground">
              {formatReportKey(key, reportLang)}
            </span>
            <div className="text-sm text-muted-foreground">
              <ReportValue value={nestedValue} fieldKey={key} reportLang={reportLang} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-sm leading-relaxed text-muted-foreground">{String(value ?? "")}</p>
}

function InlineSourceContent({ text }: { text: string }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const parts = text.split(/(\[source:\s*\w+\])/g)
  return (
    <>
      {parts.map((part, i) => {
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
            readme: t.sourceReadme,
            metadata: t.sourceMetadata,
            inferred: t.sourceInferred,
            unknown: t.sourceUnknown,
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

function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const color = clamped >= 80 ? "bg-success" : clamped >= 60 ? "bg-warning" : clamped >= 40 ? "bg-orange-500" : "bg-destructive"
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-sm font-medium text-foreground tabular-nums">{clamped}</span>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const variant = priority === "P0" ? "default" : priority === "P1" ? "secondary" : "outline"
  const colorClass = priority === "P0" ? "bg-red-500/10 text-red-500 border-red-500/20" : priority === "P1" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
  return <Badge className={cn("text-xs", colorClass)}>{priority}</Badge>
}

function SeverityBadge({ severity }: { severity: string }) {
  const colorClass = severity === "high" ? "bg-red-500/10 text-red-500 border-red-500/20" : severity === "medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
  return <Badge className={cn("text-xs", colorClass)}>{severity}</Badge>
}

function DifficultyBadge({ difficulty, reportLang = "zh" }: { difficulty: string; reportLang?: "zh" | "en" }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const colorClass = difficulty === "beginner" ? "bg-green-500/10 text-green-500 border-green-500/20" : difficulty === "intermediate" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
  const label = difficulty === "beginner" ? t.difficultyBeginner : difficulty === "intermediate" ? t.difficultyIntermediate : t.difficultyAdvanced
  return <Badge className={cn("text-xs", colorClass)}>{label}</Badge>
}

function ObjectCard({ entries, reportLang = "zh" }: { entries: [string, unknown][]; reportLang?: "zh" | "en" }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
      {entries.map(([key, nestedValue]) => (
        <div key={key} className="grid gap-1 md:grid-cols-[150px_1fr]">
          <span className="text-xs font-medium text-muted-foreground">
            {formatReportKey(key, reportLang)}
          </span>
          <div className="text-sm text-muted-foreground">
            <ReportValue value={nestedValue} fieldKey={key} reportLang={reportLang} />
          </div>
        </div>
      ))}
    </div>
  )
}

const reportKeyLabelsZh: Record<string, string> = {
  summary: "摘要",
  problem: "解决的核心问题",
  core_capabilities: "核心能力",
  suitable_users: "适用人群",
  key_evidence: "关键证据",
  risks_or_unknowns: "风险与未知",
  positioning: "产品定位",
  target_users: "目标用户",
  user_stories: "用户故事",
  role: "角色",
  goal: "目标",
  value: "价值",
  core_features: "核心功能",
  name: "名称",
  description: "描述",
  priority: "优先级",
  evidence: "证据",
  business_model_inference: "商业模式推断",
  assumptions: "隐含假设",
  tech_stack: "技术栈",
  architecture_summary: "架构概述",
  modules: "模块拆解",
  path: "路径",
  responsibility: "职责",
  key_files: "关键文件",
  data_flow: "数据流",
  mermaid: "架构图",
  quickstart: "快速启动",
  steps: "步骤",
  prerequisites: "前置条件",
  first_run: "首次运行",
  entry_points: "入口文件",
  file: "文件",
  read_next: "推荐后续阅读",
  critical_path: "关键代码路径",
  common_gotchas: "常见坑点",
  solution: "解决方案",
  faq: "常见问题",
  question: "问题",
  answer: "回答",
  dev_setup: "开发环境配置",
  environment: "环境变量",
  test_command: "测试命令",
  lint_command: "代码检查命令",
  mvp_scope: "MVP 范围",
  estimated_period: "预估时期",
  milestones: "里程碑",
  phase: "阶段",
  period: "时间",
  key_changes: "关键变化",
  significance: "意义",
  evolution_pattern: "演进模式",
  strategic_pivots: "战略转折",
  from: "原方向",
  to: "新方向",
  future_outlook: "未来展望",
  stated_plans: "已声明计划",
  inferred_trajectory: "推断方向",
  categories: "技术分类",
  technologies: "技术列表",
  purpose: "用途",
  assessment: "综合评估",
  strengths: "优势",
  weaknesses: "不足",
  overall: "总体评价",
  alternatives: "替代方案对比",
  current: "当前选型",
  alternative: "常见替代",
  reason: "选型理由",
  supply_chain_risks: "供应链风险",
  dependency: "依赖项",
  risk: "风险描述",
  severity: "严重程度",
  health_score: "健康度评分",
  dimensions: "评分维度",
  score: "分数",
  justification: "评分依据",
  concerns: "关注点",
  contributor_friendliness: "贡献者友好度",
  has_contributing_guide: "贡献指南",
  has_code_of_conduct: "行为准则",
  onboarding_experience: "上手体验",
  good_first_issues: "新手友好 Issue",
  license_analysis: "License 分析",
  type: "类型",
  implications: "影响说明",
  commercial_use: "商业使用",
  recommendations: "改进建议",
  recommendation: "建议",
  rationale: "理由",
  getting_started: "快速上手",
  setup_steps: "搭建步骤",
  environment_requirements: "环境要求",
  build_command: "构建命令",
  contribution_areas: "贡献领域",
  area: "领域",
  difficulty: "难度",
  suggested_files: "推荐文件",
  coding_standards: "编码规范",
  style_guide: "代码风格",
  commit_convention: "提交规范",
  testing_requirements: "测试要求",
  pr_process: "PR 流程",
  workflow: "工作流",
  review_criteria: "审查标准",
  typical_review_time: "典型审查时间",
  communication: "沟通渠道",
  channels: "渠道",
  link_or_reference: "链接或引用",
  maintainer_response_pattern: "维护者响应模式",
  analysis_limits: "分析局限",
  confirmed_facts: "已确认事实",
  inferred_signals: "推断信号",
  unknowns: "未知项",
  data_coverage: "数据覆盖度",
  confidence: "置信度",
  timeline_type: "时间线类型",
  generated_from: "生成来源",
  has_readme: "README 可用",
  tree_files: "目录树文件数",
  config_files: "配置文件",
  source_files: "源码文件",
  ci_files: "CI 文件",
  releases: "Releases",
  issues: "Issues",
  pull_requests: "Pull Requests",
  contributors: "贡献者",
  warnings: "警告",
  context_warnings: "上下文警告",
  provider: "模型供应商",
  model: "模型",
  evidence_pack: "证据包",
  evidence_catalog: "证据目录",
  source_type: "来源类型",
  ref: "引用",
  title: "标题",
  section_type: "分析维度",
  repository: "仓库",
  capability: "能力",
  explanation: "说明",
  persona: "用户角色",
  scenario: "使用场景",
  expected_value: "预期价值",
  category: "类别",
  level: "等级",
  main_job_to_be_done: "核心任务",
  context: "上下文",
  confirmed_signals: "已确认信号",
  inferred_model: "推断模式",
  assumption: "假设",
  why_it_matters: "重要性",
  pattern: "模式",
  version: "版本",
  actor_or_component: "组件/角色",
  action: "动作",
  inferred: "推断",
  step: "步骤",
  impact: "影响",
  order: "顺序",
  focus: "关注点",
  package_manager: "包管理器",
  install_command: "安装命令",
  env_requirements: "环境要求",
  maturity_score: "成熟度评分",
  dependency_risks: "依赖风险",
  mitigation: "缓解措施",
  good_first_issue_signal: "新手 Issue 信号",
  confirmed_workflow: "已确认流程",
  recommended_workflow: "建议流程",
  first_pr_strategy: "首个 PR 策略",
  recommended_start: "推荐起点",
  evidence_refs: "证据引用",
  supports: "支撑判断",
  critique: "审稿意见",
  quality: "质量",
}

const reportKeyLabelsEn: Record<string, string> = {
  summary: "Summary",
  problem: "Core Problem",
  core_capabilities: "Core Capabilities",
  suitable_users: "Suitable Users",
  key_evidence: "Key Evidence",
  risks_or_unknowns: "Risks & Unknowns",
  positioning: "Positioning",
  target_users: "Target Users",
  user_stories: "User Stories",
  role: "Role",
  goal: "Goal",
  value: "Value",
  core_features: "Core Features",
  name: "Name",
  description: "Description",
  priority: "Priority",
  evidence: "Evidence",
  business_model_inference: "Business Model Inference",
  assumptions: "Assumptions",
  tech_stack: "Tech Stack",
  architecture_summary: "Architecture Summary",
  modules: "Modules",
  path: "Path",
  responsibility: "Responsibility",
  key_files: "Key Files",
  data_flow: "Data Flow",
  mermaid: "Architecture Diagram",
  quickstart: "Quick Start",
  steps: "Steps",
  prerequisites: "Prerequisites",
  first_run: "First Run",
  entry_points: "Entry Points",
  file: "File",
  read_next: "Read Next",
  critical_path: "Critical Path",
  common_gotchas: "Common Gotchas",
  solution: "Solution",
  faq: "FAQ",
  question: "Question",
  answer: "Answer",
  dev_setup: "Dev Setup",
  environment: "Environment",
  test_command: "Test Command",
  lint_command: "Lint Command",
  mvp_scope: "MVP Scope",
  estimated_period: "Estimated Period",
  milestones: "Milestones",
  phase: "Phase",
  period: "Period",
  key_changes: "Key Changes",
  significance: "Significance",
  evolution_pattern: "Evolution Pattern",
  strategic_pivots: "Strategic Pivots",
  from: "From",
  to: "To",
  trigger: "Trigger",
  future_outlook: "Future Outlook",
  stated_plans: "Stated Plans",
  inferred_trajectory: "Inferred Trajectory",
  categories: "Categories",
  technologies: "Technologies",
  purpose: "Purpose",
  assessment: "Assessment",
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  overall: "Overall",
  alternatives: "Alternatives",
  current: "Current",
  alternative: "Alternative",
  reason: "Reason",
  supply_chain_risks: "Supply Chain Risks",
  dependency: "Dependency",
  risk: "Risk",
  severity: "Severity",
  health_score: "Health Score",
  dimensions: "Dimensions",
  score: "Score",
  justification: "Justification",
  concerns: "Concerns",
  contributor_friendliness: "Contributor Friendliness",
  has_contributing_guide: "Contributing Guide",
  has_code_of_conduct: "Code of Conduct",
  onboarding_experience: "Onboarding Experience",
  good_first_issues: "Good First Issues",
  license_analysis: "License Analysis",
  type: "Type",
  implications: "Implications",
  commercial_use: "Commercial Use",
  recommendations: "Recommendations",
  recommendation: "Recommendation",
  rationale: "Rationale",
  getting_started: "Getting Started",
  setup_steps: "Setup Steps",
  environment_requirements: "Environment Requirements",
  build_command: "Build Command",
  contribution_areas: "Contribution Areas",
  area: "Area",
  difficulty: "Difficulty",
  suggested_files: "Suggested Files",
  coding_standards: "Coding Standards",
  style_guide: "Style Guide",
  commit_convention: "Commit Convention",
  testing_requirements: "Testing Requirements",
  pr_process: "PR Process",
  workflow: "Workflow",
  review_criteria: "Review Criteria",
  typical_review_time: "Typical Review Time",
  communication: "Communication",
  channels: "Channels",
  link_or_reference: "Link / Reference",
  maintainer_response_pattern: "Maintainer Response Pattern",
  analysis_limits: "Analysis Limits",
  confirmed_facts: "Confirmed Facts",
  inferred_signals: "Inferred Signals",
  unknowns: "Unknowns",
  data_coverage: "Data Coverage",
  confidence: "Confidence",
  timeline_type: "Timeline Type",
  generated_from: "Generated From",
  has_readme: "Has README",
  tree_files: "Tree Files",
  config_files: "Config Files",
  source_files: "Source Files",
  ci_files: "CI Files",
  releases: "Releases",
  issues: "Issues",
  pull_requests: "Pull Requests",
  contributors: "Contributors",
  warnings: "Warnings",
  context_warnings: "Context Warnings",
  provider: "Provider",
  model: "Model",
  evidence_pack: "Evidence Pack",
  evidence_catalog: "Evidence Catalog",
  source_type: "Source Type",
  ref: "Reference",
  title: "Title",
  section_type: "Section Type",
  repository: "Repository",
  capability: "Capability",
  explanation: "Explanation",
  persona: "Persona",
  scenario: "Scenario",
  expected_value: "Expected Value",
  category: "Category",
  level: "Level",
  main_job_to_be_done: "Main Job to Be Done",
  context: "Context",
  confirmed_signals: "Confirmed Signals",
  inferred_model: "Inferred Model",
  assumption: "Assumption",
  why_it_matters: "Why It Matters",
  pattern: "Pattern",
  version: "Version",
  actor_or_component: "Actor / Component",
  action: "Action",
  inferred: "Inferred",
  step: "Step",
  impact: "Impact",
  order: "Order",
  focus: "Focus",
  package_manager: "Package Manager",
  install_command: "Install Command",
  env_requirements: "Environment Requirements",
  maturity_score: "Maturity Score",
  dependency_risks: "Dependency Risks",
  mitigation: "Mitigation",
  good_first_issue_signal: "Good First Issue Signal",
  confirmed_workflow: "Confirmed Workflow",
  recommended_workflow: "Recommended Workflow",
  first_pr_strategy: "First PR Strategy",
  recommended_start: "Recommended Start",
  evidence_refs: "Evidence Refs",
  supports: "Supports",
  critique: "Critique",
  quality: "Quality",
}

const reportKeyLabelsZhOverride: Record<string, string> = {
  cover_summary: "封面摘要",
  project_name: "项目名称",
  one_sentence_positioning: "一句话定位",
  core_value_proposition: "核心价值主张",
  primary_users: "核心用户",
  product_stage: "产品阶段",
  opportunity_score: "机会评分",
  highest_value_insight: "最高价值发现",
  biggest_uncertainty: "最大不确定性",
  strategic_judgment: "战略判断",
  opportunity_type: "机会类型",
  why_now: "为什么是现在",
  demand_rigidity: "需求刚性",
  long_term_ceiling: "长期天花板",
  strategic_focus: "战略重心",
  product_archetype: "产品形态",
  critical_strategy_assumption: "关键战略假设",
  evidence_strength: "证据强度",
  summary: "摘要",
  problem: "解决的核心问题",
  category: "类别",
  core_capabilities: "核心能力",
  capability: "能力",
  user_value: "用户价值",
  mechanism: "实现机制",
  suitable_users: "适用人群",
  not_ideal_for: "不适合的场景",
  adoption_questions: "采用前需验证的问题",
  risks_or_unknowns: "风险与未知项",
  positioning: "产品定位",
  statement: "定位语句",
  target_market: "目标市场",
  replacement_categories: "替代方案类型",
  differentiators: "差异化",
  primary_use_cases: "主要使用场景",
  not_suitable_for: "不适合场景",
  positioning_risks: "定位风险",
  target_users: "目标用户",
  target_users_and_jtbd: "目标用户与 JTBD",
  role_in_buying_process: "购买流程角色",
  job_to_be_done: "待完成任务",
  pain_intensity: "痛点强度",
  product_workflows: "核心用户旅程",
  core_user_journeys: "核心用户旅程",
  journey: "旅程",
  trigger: "触发场景",
  workflow: "工作流",
  user_goal: "用户目标",
  likely_steps: "可能步骤",
  user_stories: "用户故事",
  role: "角色",
  goal: "目标",
  value: "价值",
  core_features: "核心功能",
  name: "名称",
  description: "描述",
  priority: "优先级",
  priority_rationale: "优先级依据",
  mvp_inference: "MVP 推断",
  mvp_reverse_engineering: "MVP 反推",
  minimum_viable_loop: "最小可行闭环",
  must_have_capabilities: "MVP 必需能力",
  deferrable_capabilities: "可延后能力",
  current_stage_vs_mvp: "当前相对 MVP 阶段",
  mvp_completeness_score: "MVP 完整度评分",
  validation_metrics: "验证指标",
  missing_evidence: "缺失证据",
  likely_mvp_scope: "可能的 MVP 范围",
  business_model_inference: "商业模式推断",
  confirmed_signals: "已确认信号",
  inferred_model: "推断模式",
  monetization_levers: "变现杠杆",
  strategic_assumptions: "战略假设",
  assumptions_and_validation_plan: "关键假设与验证计划",
  assumption_type: "假设类型",
  validation_method: "验证方式",
  validation_metric: "验证指标",
  failure_signal: "失败信号",
  assumption: "假设",
  validation_signal: "验证信号",
  why_it_matters: "重要性",
  risks_or_open_questions: "风险与开放问题",
  product_experience_and_information_architecture: "产品体验与信息架构",
  main_surfaces: "主要界面/入口",
  information_architecture: "信息架构",
  onboarding_path: "Onboarding 路径",
  configuration_complexity: "配置复杂度",
  integration_complexity: "集成复杂度",
  learning_curve: "学习成本",
  experience_strengths: "体验优势",
  experience_risks: "体验风险",
  business_model_and_growth_path: "商业模式与增长路径",
  likely_business_model: "可能商业模式",
  payment_triggers: "付费触发点",
  open_source_cloud_enterprise_path: "开源/云/企业版路径",
  growth_channels: "增长渠道",
  distribution_advantages: "分发优势",
  ecosystem_or_network_effects: "生态或网络效应",
  commercialization_friction: "商业化阻力",
  competition_and_replacement_analysis: "竞争与替代方案",
  advantages_vs_replacements: "相对替代方案优势",
  disadvantages_or_switching_costs: "劣势或迁移成本",
  differentiation_moats: "差异化壁垒",
  easy_to_copy_parts: "容易被复制的部分",
  competitive_risks: "竞争风险",
  next_competitor_signals_to_check: "后续竞品验证信号",
  product_opportunity_scorecard: "产品机会评分",
  overall_score: "综合评分",
  dimension: "维度",
  score_rationale: "评分理由",
  architecture_summary: "架构概述",
  pattern: "架构模式",
  tech_stack: "技术栈",
  modules: "模块拆解",
  layer: "层级",
  path: "路径",
  responsibility: "职责",
  key_files: "关键文件",
  data_flow: "数据流",
  component: "组件",
  action: "动作",
  input_output: "输入/输出",
  inferred: "是否推断",
  mermaid: "架构图",
  architecture_risks: "架构风险",
  mitigation_or_next_check: "缓解措施或下一步检查",
  quickstart: "快速开始",
  prerequisites: "前置条件",
  setup_steps: "配置步骤",
  first_run: "首次运行",
  developer_map: "开发者地图",
  package_manager: "包管理器",
  build_command: "构建命令",
  test_command: "测试命令",
  lint_command: "代码检查命令",
  env_requirements: "环境要求",
  entry_points: "入口文件",
  why_start_here: "为什么从这里开始",
  read_next: "推荐后续阅读",
  critical_path: "关键阅读路径",
  order: "顺序",
  focus: "关注点",
  expected_learning: "预期收获",
  extension_points: "扩展点",
  change_type: "变更类型",
  difficulty: "难度",
  common_gotchas: "常见坑点",
  solution_or_next_check: "解决方案或下一步检查",
  faq: "常见问题",
  question: "问题",
  answer: "回答",
  timeline_type: "时间线类型",
  mvp_scope: "MVP 范围",
  period: "时间",
  milestones: "里程碑",
  phase: "阶段",
  stated_or_inferred: "明确说明或推断",
  key_changes: "关键变化",
  strategic_meaning: "战略意义",
  evolution_pattern: "演进模式",
  explanation: "说明",
  strategic_pivots: "战略转向",
  from: "原方向",
  to: "新方向",
  future_outlook: "未来展望",
  stated_plans: "已声明计划",
  inferred_trajectory: "推断方向",
  evidence_limits: "证据限制",
  stack_overview: "技术栈概览",
  categories: "技术分类",
  technologies: "技术列表",
  version: "版本",
  purpose: "用途",
  engineering_maturity: "工程成熟度",
  gaps: "缺口",
  assessment: "综合评估",
  overall: "总体评价",
  strengths: "优势",
  weaknesses: "不足",
  recommended_checks: "建议检查项",
  tradeoffs: "技术取舍",
  choice: "选择",
  benefit: "收益",
  cost_or_risk: "成本或风险",
  alternative: "替代方案",
  dependency_risks: "依赖风险",
  mitigation: "缓解措施",
  health_score: "健康度评分",
  dimensions: "评分维度",
  score: "分数",
  justification: "评分依据",
  adoption_signals: "采用信号",
  signal: "信号",
  interpretation: "解读",
  maintenance_pressure: "维护压力",
  visible_signals: "可见信号",
  contributor_friendliness: "贡献者友好度",
  onboarding_experience: "上手体验",
  has_contributing_guide: "是否有贡献指南",
  has_code_of_conduct: "是否有行为准则",
  setup_clarity: "配置清晰度",
  license_analysis: "License 分析",
  type: "类型",
  implications: "影响说明",
  commercial_use: "商业使用",
  concerns: "关注点",
  recommendations: "改进建议",
  recommendation: "建议",
  rationale: "理由",
  analysis_limits: "分析限制",
  getting_started: "快速上手",
  environment_requirements: "环境要求",
  contribution_areas: "贡献领域",
  area: "领域",
  contribution_type: "贡献类型",
  suggested_files: "建议文件",
  why_this_area: "推荐原因",
  coding_standards: "编码规范",
  style_guide: "代码风格",
  commit_convention: "提交规范",
  testing_requirements: "测试要求",
  pr_process: "PR 流程",
  confirmed_workflow: "已确认流程",
  recommended_workflow: "建议流程",
  review_criteria: "审查标准",
  typical_review_time: "典型审查时间",
  communication: "沟通方式",
  channels: "渠道",
  link_or_reference: "链接或引用",
  maintainer_response_pattern: "维护者响应模式",
  first_pr_strategy: "首个 PR 策略",
  recommended_start: "建议起点",
  missing_contributor_information: "缺失的贡献者信息",
  generated_from: "生成来源",
  evidence_summary: "证据摘要",
  evidence_pack: "证据包",
  evidence_catalog: "证据目录",
  evidence_items: "证据项数量",
  evidence_refs: "证据引用",
  data_coverage: "数据覆盖度",
  has_readme: "README 可用",
  tree_files: "目录树文件数",
  tree_entries: "目录树条目数",
  config_files: "配置文件",
  source_files: "源码文件",
  ci_files: "CI 文件",
  releases: "Releases",
  issues: "Issues",
  pull_requests: "Pull Requests",
  contributors: "贡献者",
  warnings: "警告",
  context_warnings: "上下文警告",
  provider: "模型供应商",
  model: "模型",
  source_type: "来源类型",
  ref: "引用",
  title: "标题",
  section_type: "分析维度",
  repository: "仓库",
  confidence: "置信度",
  level: "等级",
  main_job_to_be_done: "核心任务",
  context: "上下文",
  impact: "影响",
  risk: "风险",
  severity: "严重程度",
  risks_limits_and_open_questions: "风险、限制与开放问题",
  risk_type: "风险类型",
  item: "事项",
  next_research_step: "下一步调研",
  role_based_action_plan: "不同角色行动建议",
  founder: "给创始人的建议",
  product_manager: "给 PM 的建议",
  engineering_lead: "给研发负责人的建议",
  investor_or_competitive_researcher: "给投资/竞品研究者的建议",
  open_source_maintainer: "给开源维护者的建议",
  final_judgment: "最终判断",
  worth_continued_investigation: "是否值得继续投入",
  strongest_opportunity: "最强机会点",
  highest_priority_validation: "最高优先级验证事项",
  recommended_next_step: "建议下一步",
  report_confidence: "报告置信度",
  metrics_framework: "指标体系",
  north_star_metric: "北极星指标",
  activation_metrics: "激活指标",
  retention_metrics: "留存指标",
  conversion_metrics: "转化指标",
  usage_depth_metrics: "使用深度指标",
  quality_metrics: "质量指标",
  community_or_ecosystem_metrics: "社区/生态指标",
  observable_repo_signals: "仓库可观察信号",
  missing_data: "缺失数据",
  unknowns: "未知项",
  confirmed_facts: "已确认事实",
  inferred_signals: "推断信号",
  critique: "审稿意见",
  quality: "质量检查",
  metrics: "质量指标",
  passed: "是否通过",
  rewrite_instructions: "重写建议",
}

const reportKeyLabelsEnOverride: Record<string, string> = {
  cover_summary: "Cover Summary",
  project_name: "Project Name",
  one_sentence_positioning: "One-Sentence Positioning",
  core_value_proposition: "Core Value Proposition",
  primary_users: "Primary Users",
  product_stage: "Product Stage",
  opportunity_score: "Opportunity Score",
  highest_value_insight: "Highest-Value Insight",
  biggest_uncertainty: "Biggest Uncertainty",
  strategic_judgment: "Strategic Judgment",
  opportunity_type: "Opportunity Type",
  why_now: "Why Now",
  demand_rigidity: "Demand Rigidity",
  long_term_ceiling: "Long-Term Ceiling",
  strategic_focus: "Strategic Focus",
  product_archetype: "Product Archetype",
  critical_strategy_assumption: "Critical Strategy Assumption",
  evidence_strength: "Evidence Strength",
  statement: "Positioning Statement",
  target_market: "Target Market",
  replacement_categories: "Replacement Categories",
  differentiators: "Differentiators",
  primary_use_cases: "Primary Use Cases",
  not_suitable_for: "Not Suitable For",
  positioning_risks: "Positioning Risks",
  target_users_and_jtbd: "Target Users & JTBD",
  role_in_buying_process: "Role in Buying Process",
  job_to_be_done: "Job To Be Done",
  product_workflows: "Core User Journeys",
  core_user_journeys: "Core User Journeys",
  journey: "Journey",
  trigger: "Trigger",
  user_goal: "User Goal",
  likely_steps: "Likely Steps",
  priority_rationale: "Priority Rationale",
  mvp_inference: "MVP Inference",
  mvp_reverse_engineering: "MVP Reverse Engineering",
  minimum_viable_loop: "Minimum Viable Loop",
  must_have_capabilities: "Must-Have Capabilities",
  deferrable_capabilities: "Deferrable Capabilities",
  current_stage_vs_mvp: "Current Stage vs MVP",
  mvp_completeness_score: "MVP Completeness Score",
  validation_metrics: "Validation Metrics",
  missing_evidence: "Missing Evidence",
  likely_mvp_scope: "Likely MVP Scope",
  monetization_levers: "Monetization Levers",
  strategic_assumptions: "Strategic Assumptions",
  assumptions_and_validation_plan: "Assumptions & Validation Plan",
  assumption_type: "Assumption Type",
  validation_method: "Validation Method",
  validation_metric: "Validation Metric",
  failure_signal: "Failure Signal",
  validation_signal: "Validation Signal",
  risks_or_open_questions: "Risks & Open Questions",
  product_experience_and_information_architecture: "Product Experience & Information Architecture",
  main_surfaces: "Main Surfaces",
  information_architecture: "Information Architecture",
  onboarding_path: "Onboarding Path",
  configuration_complexity: "Configuration Complexity",
  integration_complexity: "Integration Complexity",
  learning_curve: "Learning Curve",
  experience_strengths: "Experience Strengths",
  experience_risks: "Experience Risks",
  business_model_and_growth_path: "Business Model & Growth Path",
  likely_business_model: "Likely Business Model",
  payment_triggers: "Payment Triggers",
  open_source_cloud_enterprise_path: "Open Source / Cloud / Enterprise Path",
  growth_channels: "Growth Channels",
  distribution_advantages: "Distribution Advantages",
  ecosystem_or_network_effects: "Ecosystem or Network Effects",
  commercialization_friction: "Commercialization Friction",
  competition_and_replacement_analysis: "Competition & Replacement Analysis",
  advantages_vs_replacements: "Advantages vs Replacements",
  disadvantages_or_switching_costs: "Disadvantages or Switching Costs",
  differentiation_moats: "Differentiation Moats",
  easy_to_copy_parts: "Easy-to-Copy Parts",
  competitive_risks: "Competitive Risks",
  next_competitor_signals_to_check: "Next Competitor Signals to Check",
  product_opportunity_scorecard: "Product Opportunity Scorecard",
  overall_score: "Overall Score",
  dimension: "Dimension",
  score_rationale: "Score Rationale",
  layer: "Layer",
  component: "Component",
  input_output: "Input / Output",
  architecture_risks: "Architecture Risks",
  mitigation_or_next_check: "Mitigation or Next Check",
  developer_map: "Developer Map",
  why_start_here: "Why Start Here",
  expected_learning: "Expected Learning",
  extension_points: "Extension Points",
  change_type: "Change Type",
  solution_or_next_check: "Solution or Next Check",
  stated_or_inferred: "Stated or Inferred",
  strategic_meaning: "Strategic Meaning",
  evidence_limits: "Evidence Limits",
  stack_overview: "Stack Overview",
  engineering_maturity: "Engineering Maturity",
  gaps: "Gaps",
  recommended_checks: "Recommended Checks",
  tradeoffs: "Trade-offs",
  choice: "Choice",
  benefit: "Benefit",
  cost_or_risk: "Cost or Risk",
  adoption_signals: "Adoption Signals",
  signal: "Signal",
  interpretation: "Interpretation",
  maintenance_pressure: "Maintenance Pressure",
  visible_signals: "Visible Signals",
  setup_clarity: "Setup Clarity",
  contribution_type: "Contribution Type",
  why_this_area: "Why This Area",
  missing_contributor_information: "Missing Contributor Information",
  risks_limits_and_open_questions: "Risks, Limits & Open Questions",
  risk_type: "Risk Type",
  item: "Item",
  next_research_step: "Next Research Step",
  role_based_action_plan: "Role-Based Action Plan",
  founder: "Founder",
  product_manager: "Product Manager",
  engineering_lead: "Engineering Lead",
  investor_or_competitive_researcher: "Investor / Competitive Researcher",
  open_source_maintainer: "Open-Source Maintainer",
  final_judgment: "Final Judgment",
  worth_continued_investigation: "Worth Continued Investigation",
  strongest_opportunity: "Strongest Opportunity",
  highest_priority_validation: "Highest-Priority Validation",
  recommended_next_step: "Recommended Next Step",
  report_confidence: "Report Confidence",
  metrics_framework: "Metrics Framework",
  north_star_metric: "North Star Metric",
  activation_metrics: "Activation Metrics",
  retention_metrics: "Retention Metrics",
  conversion_metrics: "Conversion Metrics",
  usage_depth_metrics: "Usage Depth Metrics",
  quality_metrics: "Quality Metrics",
  community_or_ecosystem_metrics: "Community / Ecosystem Metrics",
  observable_repo_signals: "Observable Repo Signals",
  missing_data: "Missing Data",
  evidence_summary: "Evidence Summary",
  evidence_items: "Evidence Items",
  tree_entries: "Tree Entries",
  metrics: "Metrics",
  passed: "Passed",
  rewrite_instructions: "Rewrite Instructions",
}

function formatReportKey(key: string, lang: "zh" | "en" = "zh"): string {
  const labels = lang === "zh"
    ? { ...reportKeyLabelsZh, ...reportKeyLabelsZhOverride }
    : { ...reportKeyLabelsEn, ...reportKeyLabelsEnOverride }
  if (labels[key]) return labels[key]
  return key
    .replace(/^_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildReportMarkdown({
  content,
  fallbackMarkdown,
  title,
  sectionName,
  repoName,
  reportLang,
  generatedBy,
  generatedAt,
  t,
}: {
  content?: Record<string, unknown> | null
  fallbackMarkdown?: string
  title: string
  sectionName: string
  repoName: string
  reportLang: "zh" | "en"
  generatedBy?: string | null
  generatedAt?: string | null
  t: Dictionary["analysisContent"]
}) {
  const lines: string[] = [`# ${title}`, ""]

  lines.push(`> ${t.repository}: ${repoName}`)
  lines.push(`> ${t.reportType}: ${sectionName}`)
  if (generatedBy) lines.push(`> ${t.generatedBy}: ${generatedBy}`)
  if (generatedAt) lines.push(`> ${t.generatedAt}: ${generatedAt}`)
  lines.push("")

  if (!content) {
    lines.push(fallbackMarkdown || "")
    return lines.join("\n").trimEnd() + "\n"
  }

  for (const [key, value] of Object.entries(content)) {
    if (key === "title" || key === "mermaid") continue
    if (key === "_meta") continue

    lines.push(`## ${formatReportKey(key, reportLang)}`)
    lines.push("")
    lines.push(...valueToMarkdown(value, reportLang, 0, t))
    lines.push("")
  }

  if (typeof content.mermaid === "string" && content.mermaid.trim()) {
    lines.push("## Mermaid")
    lines.push("")
    lines.push("```mermaid")
    lines.push(content.mermaid.trim())
    lines.push("```")
    lines.push("")
  }

  if (content._meta) {
    lines.push(`## ${t.generationContext}`)
    lines.push("")
    lines.push(...valueToMarkdown(summarizeReportMeta(content._meta, reportLang), reportLang, 0, t))
    lines.push("")
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
}

function valueToMarkdown(value: unknown, reportLang: "zh" | "en", depth: number, t: Dictionary["analysisContent"]): string[] {
  if (value === null || value === undefined || value === "") {
    return [t.insufficientEvidence]
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [t.noData]

    const lines: string[] = []
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        const record = item as Record<string, unknown>
        const label = getMarkdownItemLabel(record)
        lines.push(`${"  ".repeat(depth)}- ${label}`)
        for (const [key, nestedValue] of Object.entries(record)) {
          if (isMarkdownLabelKey(key)) continue
          const nestedLines = valueToMarkdown(nestedValue, reportLang, depth + 1, t)
          lines.push(`${"  ".repeat(depth + 1)}- **${formatReportKey(key, reportLang)}**: ${nestedLines[0] || ""}`)
          lines.push(...nestedLines.slice(1).map((line) => `${"  ".repeat(depth + 2)}${line}`))
        }
      } else {
        lines.push(`${"  ".repeat(depth)}- ${String(item)}`)
      }
    }
    return lines
  }

  if (typeof value === "object") {
    const lines: string[] = []
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const nestedLines = valueToMarkdown(nestedValue, reportLang, depth + 1, t)
      lines.push(`${"  ".repeat(depth)}- **${formatReportKey(key, reportLang)}**: ${nestedLines[0] || ""}`)
      lines.push(...nestedLines.slice(1).map((line) => `${"  ".repeat(depth + 1)}${line}`))
    }
    return lines.length > 0 ? lines : [t.noData]
  }

  return [String(value)]
}

function getMarkdownItemLabel(record: Record<string, unknown>) {
  const label = record.name || record.title || record.area || record.role || record.phase || record.question || record.capability || record.persona
  return label ? String(label) : "Item"
}

function isMarkdownLabelKey(key: string) {
  return ["name", "title", "area", "role", "phase", "question", "capability", "persona"].includes(key)
}

function downloadMarkdownFile(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
}

function LiveGenerationState({ section }: { section: AnalysisSection }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const progress = section.progress || 8

  const stages = [
    { label: t.stage1, completed: progress >= 10 },
    { label: t.stage2, completed: progress >= 24 },
    { label: t.stage3, completed: progress >= 42 },
    { label: t.stage4, completed: progress >= 58 },
    { label: t.stage5, completed: progress >= 76 },
    { label: t.stage6, completed: progress >= 94 },
  ]
  const activeStage = stages.find((stage) => !stage.completed)?.label || t.completingReport

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4 h-24 w-24">
            <svg className="h-full w-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 251.2} 251.2`}
                className="text-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
            </div>
          </div>
          <h3 className="mb-1 text-lg font-medium text-foreground">
            {t.generating} {section.name}
          </h3>
          <p className="text-sm text-muted-foreground">{activeStage}</p>
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.label} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  stage.completed ? "bg-success" : "bg-muted"
                )}
              >
                {stage.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  stage.completed ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
              {!stage.completed && index === stages.findIndex((item) => !item.completed) && (
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t.estimatedTime}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generation Progress Component
function GeneratingState({ section }: { section: AnalysisSection }) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const progress = section.progress || 0
  const stages = [
    { label: t.genStage1, completed: progress >= 20 },
    { label: t.genStage2, completed: progress >= 35 },
    { label: t.genStage3, completed: progress >= 50 },
    { label: t.genStage4, completed: progress >= 65 },
    { label: t.genStage5, completed: progress >= 80 },
    { label: t.genStage6, completed: progress >= 95 }
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-lg">
        {/* Progress Circle */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 mb-4">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 251.2} 251.2`}
                className="text-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
            </div>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">{t.generatingReport}</h3>
          <p className="text-sm text-muted-foreground">{section.progressStage}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                stage.completed ? "bg-success" : "bg-muted"
              )}>
                {stage.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <span className={cn(
                "text-sm",
                stage.completed ? "text-foreground" : "text-muted-foreground"
              )}>
                {stage.label}
              </span>
              {!stage.completed && index === stages.findIndex(s => !s.completed) && (
                <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />
              )}
            </div>
          ))}
        </div>

        {/* Estimated Time */}
        <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t.estimatedTimeAbout}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportModeSwitch({
  reportMode,
  onReportModeChange,
}: {
  reportMode: "fast" | "deep"
  onReportModeChange?: (mode: "fast" | "deep") => void
}) {
  const { dict } = useApp()
  const t = dict.analysisContent
  return (
    <div className="inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-input p-0.5">
      <button
        type="button"
        className={cn(
          "h-full whitespace-nowrap rounded-sm px-2.5 text-xs transition-colors",
          reportMode === "fast"
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onReportModeChange?.("fast")}
      >
        {t.fastMode}
      </button>
      <button
        type="button"
        className={cn(
          "h-full whitespace-nowrap rounded-sm px-2.5 text-xs transition-colors",
          reportMode === "deep"
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onReportModeChange?.("deep")}
      >
        {t.deepMode}
      </button>
    </div>
  )
}

// Not Generated State Component
function NotGeneratedState({
  section,
  repoName,
  onGenerate,
  isGenerating,
  reportLang = "zh",
  onReportLangChange,
  reportMode = "fast",
  onReportModeChange,
  llmConfigured = true,
}: {
  section: AnalysisSection
  repoName: string
  onGenerate?: (section: AnalysisSection) => void
  isGenerating?: boolean
  reportLang?: "zh" | "en"
  onReportLangChange?: (lang: "zh" | "en") => void
  reportMode?: "fast" | "deep"
  onReportModeChange?: (mode: "fast" | "deep") => void
  llmConfigured?: boolean
}) {
  const { dict } = useApp()
  const t = dict.analysisContent

  if (!llmConfigured) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-6">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t.notConfiguredTitle}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t.notConfiguredDesc}
          </p>
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => { window.location.href = "/settings" }}
          >
            <Settings className="h-4 w-4" />
            {t.goToSettings}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-md text-center">
        {/* Sparkle Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2">
          {t.generateSection} {section.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          AI {reportMode === "fast" ? t.aiWillFast : t.aiWillDeep} <span className="text-foreground font-medium">{repoName}</span> {section.description.toLowerCase()}
        </p>

        {/* Time & Quota Info */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{section.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>{t.aiDriven}</span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground">{t.outputLang}</span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                reportLang === "zh"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onReportLangChange?.("zh")}
            >
              中文
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                reportLang === "en"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onReportLangChange?.("en")}
            >
              English
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground">{t.analysisMode}</span>
          <ReportModeSwitch reportMode={reportMode} onReportModeChange={onReportModeChange} />
        </div>

        {/* Generate Button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => onGenerate?.(section)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {reportMode === "fast" ? t.generateFast : t.generateDeep}
        </Button>
      </div>
    </div>
  )
}

// Main Component
export function AnalysisContent({
  section,
  repoName,
  onGenerate,
  isGenerating,
  generatedContent,
  generatedBy,
  generatedAt,
  reportLang = "zh",
  onReportLangChange,
  reportMode = "fast",
  onReportModeChange,
  reportId,
  llmConfigured = true,
}: AnalysisContentProps) {
  const { dict } = useApp()
  const t = dict.analysisContent
  const reportTitle = typeof generatedContent?.title === "string"
    ? generatedContent.title
    : section.name
  const handleDownloadMarkdown = () => {
    const markdown = buildReportMarkdown({
      content: generatedContent,
      fallbackMarkdown: undefined,
      title: reportTitle,
      sectionName: section.name,
      repoName,
      reportLang,
      generatedBy,
      generatedAt,
      t,
    })
    const filename = `${sanitizeFilename(repoName)}-${sanitizeFilename(section.id)}-${reportMode}-${reportLang}.md`
    downloadMarkdownFile(markdown, filename)
  }

  const handleShare = useCallback(() => {
    if (!reportId) {
      toast.error(t.reportNotGenerated)
      return
    }
    const url = `${window.location.origin}/public/report/${reportId}`
    navigator.clipboard.writeText(url).then(
      () => toast.success(t.publicLinkCopied),
      () => toast.error(t.copyFailed)
    )
  }, [reportId, t.reportNotGenerated, t.publicLinkCopied, t.copyFailed])

  // Handle different states
  if (isGenerating) {
    return <LiveGenerationState section={section} />
  }

  if (section.status === "generating") {
    return <GeneratingState section={section} />
  }

  if (section.status === "not_generated") {
    return (
      <NotGeneratedState
        section={section}
        repoName={repoName}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        reportLang={reportLang}
        onReportLangChange={onReportLangChange}
        reportMode={reportMode}
        onReportModeChange={onReportModeChange}
        llmConfigured={llmConfigured}
      />
    )
  }

  // Cached / Ready state - show content
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Content Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-border bg-card/30 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {reportTitle}
          </h2>
          {section.status === "cached" && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                {t.cached}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t.updatedAt} {section.cachedAt}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <ReportModeSwitch reportMode={reportMode} onReportModeChange={onReportModeChange} />
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">{t.regenerate}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleDownloadMarkdown}
          >
            <Download className="h-4 w-4" />
            <span className="text-xs">{t.exportMd}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="text-xs">{t.share}</span>
          </Button>
        </div>
      </div>

      {/* Content Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="max-w-4xl p-4 md:p-6 pb-24">
          {generatedContent ? (
            <StructuredReportContent content={generatedContent} reportLang={reportLang} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">{t.reportNotAvailable}</p>
              <p className="text-xs mt-1">{t.tryRegenerate}</p>
            </div>
          )}

          {typeof generatedContent?.mermaid === "string" && (
            <MermaidPlaceholder code={generatedContent.mermaid} />
          )}

          {/* Feedback Section */}
          <Separator className="my-8" />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{t.helpfulQuestion}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ThumbsUp className="h-4 w-4" />
                <span>{t.helpful}</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ThumbsDown className="h-4 w-4" />
                <span>{t.needsImprovement}</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span>{t.feedbackCorrection}</span>
              </Button>
            </div>
          </div>

          {/* AI Disclaimer */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{t.aiDisclaimerTitle}</strong>
                  {t.aiDisclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
