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
import type { Dictionary } from "@/lib/i18n"
import { useApp } from "@/components/app-provider"

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


export function PublicReportPage() {
  const params = useParams<{ reportId: string }>()
  const { dict } = useApp()
  const t = dict.publicReport
  const [data, setData] = useState<PublicReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/reports/${params.reportId}`)
        if (!res.ok) {
          setError(res.status === 404 ? t.notFoundDesc : dict.common.loadingFailed)
          return
        }
        setData(await res.json())
      } catch {
        setError(dict.common.loadingFailed)
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
          <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">{error || t.notFound}</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.backToHome}
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
                GitSight
              </Button>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{t.title}</span>
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
                <Badge variant="outline">{getSectionLabel(t, data.section_type)}</Badge>
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
                <span className="text-sm font-medium">{t.qualityScore}</span>
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
                <span className="text-muted-foreground">{t.evidenceSupport}</span>
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
                  {quality.hasUnknowns ? t.declaredUnknowns : t.undeclaredUnknowns}
                </span>
              </div>
              {quality.critiqueScore !== null && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">{t.critiqueScore}</span>
                    <span className="font-medium text-foreground">{quality.critiqueScore}/100</span>
                  </div>
                </>
              )}
              {data.generated_by && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">{t.generatedByModel.replace("{model}", data.generated_by || "")}</span>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-border bg-muted/30">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.noQualityAnalysis}</span>
              {data.generated_by && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">{t.generatedByModel.replace("{model}", data.generated_by || "")}</span>
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
                {t.generateYourOwn}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.evidenceChainDesc}
              </p>
              <Link href="/">
                <Button className="gap-2">
                  {t.startUsingGitSight}
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
  const { dict } = useApp()
  const t = dict.publicReport
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

function formatFieldLabel(key: string): string {
  const { dict } = useApp()
  const kl = dict.publicReport.keyLabels
  const labels: Record<string, string> = {
    title: kl.title,
    summary: kl.summary,
    problem: kl.problem,
    core_capabilities: kl.core_capabilities,
    suitable_users: kl.suitable_users,
    cover_summary: kl.cover_summary,
    positioning: kl.positioning,
    target_users_and_jtbd: kl.target_users_and_jtbd,
    feature_system: kl.feature_system,
    tech_stack: kl.tech_stack,
    architecture_summary: kl.architecture_summary,
    modules: kl.modules,
    quickstart: kl.quickstart,
    entry_points: kl.entry_points,
    critical_path: kl.critical_path,
    mvp_scope: kl.mvp_scope,
    milestones: kl.milestones,
    evolution_pattern: kl.evolution_pattern,
    categories: kl.categories,
    assessment: kl.assessment,
    health_score: kl.health_score,
    strengths: kl.strengths,
    concerns: kl.concerns,
    getting_started: kl.getting_started,
    contribution_areas: kl.contribution_areas,
    pr_process: kl.pr_process,
    confidence: kl.confidence,
    evidence_refs: kl.evidence_refs,
    source_tags: kl.source_tags,
  }

  if (labels[key]) return labels[key]

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSectionLabel(t: Dictionary["publicReport"], sectionType: string): string {
  const map: Record<string, string> = {
    tldr: t.sectionTldr,
    reverse_prd: t.sectionReversePrd,
    architecture: t.sectionArchitecture,
    code_wiki: t.sectionCodeWiki,
    timeline: t.sectionTimeline,
    tech_stack: t.sectionTechStack,
    community: t.sectionCommunity,
    contribution_guide: t.sectionContributionGuide,
  }
  return map[sectionType] || sectionType
}
