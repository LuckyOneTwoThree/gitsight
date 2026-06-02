"use client"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Gauge } from "lucide-react"
import { useApp } from "@/components/app-provider"

export interface ScoreDetail {
  total: number
  grade: string
  velocity: number
  community: number
  maturity: number
}

interface ScoreDetailDialogProps {
  score: ScoreDetail
  repoName: string
  children: React.ReactNode
}

function ScoreRing({ score, size = 64, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 80 ? "hsl(var(--primary))" : score >= 60 ? "hsl(var(--chart-3))" : score >= 40 ? "#eab308" : "hsl(var(--destructive))"

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" />
    </svg>
  )
}

function DimensionBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const { dict } = useApp();
  const t = dict.scoreDetail;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t.weight} {weight}</span>
          <span className={cn(
            "font-semibold",
            score >= 80 ? "text-primary" : score >= 60 ? "text-chart-3" : score >= 40 ? "text-yellow-600" : "text-destructive"
          )}>{score}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score >= 80 ? "bg-primary" : score >= 60 ? "bg-chart-3" : score >= 40 ? "bg-yellow-500" : "bg-destructive"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreDetailDialog({ score, repoName, children }: ScoreDetailDialogProps) {
  const { dict } = useApp();
  const t = dict.scoreDetail;

  const GRADE_LABELS: Record<string, string> = {
    "A+": t.gradeAPlus,
    "A": t.gradeA,
    "B": t.gradeB,
    "C": t.gradeC,
    "D": t.gradeD,
  };
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            RepoIntel Score — {repoName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-center gap-6">
            <div className="relative">
              <ScoreRing score={score.total} size={80} strokeWidth={6} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{score.total}</span>
                <span className="text-xs text-muted-foreground">{score.grade}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{score.grade}</div>
              <div className="text-sm text-muted-foreground">{GRADE_LABELS[score.grade] || ""}</div>
            </div>
          </div>

          <div className="space-y-4">
            <DimensionBar label={t.velocity} score={score.velocity} weight="40%" />
            <DimensionBar label={t.community} score={score.community} weight="35%" />
            <DimensionBar label={t.maturity} score={score.maturity} weight="25%" />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>{t.description1}</p>
            <p className="mt-1">{t.description2}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
