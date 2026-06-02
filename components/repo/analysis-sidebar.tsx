"use client"

import { cn } from "@/lib/utils"
import {
  BookOpen,
  Check,
  FileText,
  GitPullRequest,
  HeartPulse,
  History,
  Layers,
  Lightbulb,
  Loader2,
  Network,
  Route,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AnalysisSection } from "@/lib/mock-repo-data"

interface AnalysisSidebarProps {
  sections: AnalysisSection[]
  activeSection: string
  generatingSectionIds?: Set<string>
  onSectionChange: (id: string) => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  FileText,
  Route,
  Network,
  BookOpen,
  HeartPulse,
  History,
  Lightbulb,
  GitPullRequest,
  Layers,
  Shield,
}

function getStatusIcon(status: AnalysisSection["status"]) {
  switch (status) {
    case "cached":
    case "ready":
      return <Check className="h-3.5 w-3.5 text-success" />
    case "generating":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />
    case "not_generated":
      return <Sparkles className="h-3.5 w-3.5 text-primary" />
    default:
      return null
  }
}

function getStatusLabel(section: AnalysisSection) {
  switch (section.status) {
    case "cached":
      return <span className="text-[10px] text-muted-foreground">已缓存</span>
    case "generating":
      return <span className="text-[10px] text-info">生成中</span>
    case "not_generated":
      return <span className="text-[10px] text-primary">{section.estimatedTime}</span>
    default:
      return null
  }
}

function AnalysisButton({
  section,
  active,
  isGenerating,
  onClick,
}: {
  section: AnalysisSection
  active: boolean
  isGenerating?: boolean
  onClick: () => void
}) {
  const IconComponent = iconMap[section.icon] || Sparkles
  const effectiveStatus = isGenerating ? "generating" : section.status

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all",
        active ? "border-primary/20 bg-primary/10" : "border-transparent hover:bg-muted/50"
      )}
    >
      <div className={cn("relative mt-0.5 rounded-md p-1", active ? "bg-primary/20" : "bg-muted")}>
        <IconComponent className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-[13px] font-medium", active ? "text-primary" : "text-foreground")}>
            {section.name}
          </span>
          {getStatusIcon(effectiveStatus)}
        </div>
        <p className="line-clamp-1 text-[10px] text-muted-foreground">{section.description}</p>
        <div className="mt-0.5 flex items-center gap-2 leading-none">
          {getStatusLabel({ ...section, status: effectiveStatus })}
          {effectiveStatus === "generating" && <Progress value={section.progress || 35} className="h-1 flex-1" />}
        </div>
      </div>
    </button>
  )
}

export function AnalysisSidebar({
  sections,
  activeSection,
  generatingSectionIds,
  onSectionChange,
}: AnalysisSidebarProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-card/30">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-medium text-foreground">AI 分析视角</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">选择不同视角深度解析项目</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2">
          {sections.map((section) => (
            <AnalysisButton
              key={section.id}
              section={section}
              active={activeSection === section.id}
              isGenerating={generatingSectionIds?.has(section.id)}
              onClick={() => onSectionChange(section.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
