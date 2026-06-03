"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Star,
  GitFork,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Target,
  Gauge,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

export interface SearchResultData {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  starsToday: number;
  starsWeek: number;
  lastUpdate: string;
  license: string;
  tags: string[];
  sparklineData: number[];
  aiSummary: string;
  // 搜索结果专属字段
  matchScore: number; // 0-100
  matchReason: string;
  matchedIntents: {
    type: "domain" | "category" | "feature" | "language" | "scenario" | "scale";
    label: string;
    matched: boolean;
  }[];
  externalSource?: {
    type: "hackernews" | "twitter" | "producthunt";
    label: string;
  };
  intelScore?: number;
  intelGrade?: string;
}

interface SearchResultCardProps {
  result: SearchResultData;
  onAddToCompare?: (result: SearchResultData) => void;
  onGenerateReport?: (result: SearchResultData) => void;
  rank?: number;
}

export function SearchResultCard({
  result,
  onAddToCompare,
  onGenerateReport,
  rank,
}: SearchResultCardProps) {
  const { dict } = useApp();
  const t = dict.searchCard;
  const s = dict.search;
  const [isHovered, setIsHovered] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const trendPositive = result.starsWeek > 0;

  // 根据匹配度返回颜色
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-primary";
    if (score >= 70) return "text-chart-3";
    return "text-muted-foreground";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return "bg-primary/10 border-primary/30";
    if (score >= 70) return "bg-chart-3/10 border-chart-3/30";
    return "bg-muted border-border";
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-card transition-all duration-200 cursor-pointer",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-5">
        {/* Match Score Badge - 右上角 */}
        <div className="absolute right-4 top-4">
          <Tooltip>
            <TooltipTrigger>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                  getMatchScoreBg(result.matchScore)
                )}
              >
                <Target className={cn("h-3.5 w-3.5", getMatchScoreColor(result.matchScore))} />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    getMatchScoreColor(result.matchScore)
                  )}
                >
                  {result.matchScore}%
                </span>
                <span className="text-xs text-muted-foreground">{s.matchScore}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{s.intentParsing}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Rank Badge */}
        {rank && rank <= 3 && (
          <div className="absolute left-0 top-4">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-r-full font-bold text-sm",
                rank === 1 && "bg-chart-3 text-chart-3-foreground",
                rank === 2 && "bg-muted-foreground/30 text-foreground",
                rank === 3 && "bg-chart-3/50 text-chart-3-foreground"
              )}
            >
              {rank}
            </div>
          </div>
        )}

        {/* Header: Owner & External Source */}
        <div className="mb-3 flex items-center justify-between pr-28">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={result.ownerAvatar} alt={result.owner} />
              <AvatarFallback className="bg-muted text-xs">
                {result.owner[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{result.owner}</span>
          </div>
          {result.externalSource && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium",
                result.externalSource.type === "hackernews" &&
                  "border-orange-500/30 bg-orange-500/10 text-orange-400",
                result.externalSource.type === "twitter" &&
                  "border-sky-500/30 bg-sky-500/10 text-sky-400",
                result.externalSource.type === "producthunt" &&
                  "border-rose-500/30 bg-rose-500/10 text-rose-400"
              )}
            >
              {result.externalSource.label}
            </Badge>
          )}
        </div>

        {/* Clickable Area: Name + Summary */}
        <Link
          href={`/repo/${result.owner}/${result.name}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
        >
          <h3 className="mb-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {result.name}
          </h3>
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {result.aiSummary}
          </p>
        </Link>

        {/* Match Reason - 智能理由 */}
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{s.intentParsing}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{result.matchReason}</p>
        </div>

        {/* Matched Intents */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {result.matchedIntents.map((intent, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                intent.matched
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {intent.matched && <CheckCircle2 className="h-3 w-3" />}
              <span>{intent.label}</span>
            </div>
          ))}
        </div>

        {/* Trend Indicator */}
        <div className="mb-4 flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">{dict.dashboard.thisWeek}</span>
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendPositive ? "text-primary" : "text-destructive"
            )}
          >
            {trendPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendPositive ? "+" : ""}
            {formatNumber(result.starsWeek)} stars
          </span>
        </div>

        {/* Stats Row */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          {result.intelScore != null && result.intelScore > 0 && (
            <div className="flex items-center gap-1.5">
              <Gauge className={cn(
                "h-3.5 w-3.5",
                result.intelGrade === "A+" || result.intelGrade === "A" ? "text-primary" :
                result.intelGrade === "B" ? "text-chart-3" :
                result.intelGrade === "C" ? "text-yellow-500" :
                "text-muted-foreground"
              )} />
              <span className={cn(
                "font-medium",
                result.intelGrade === "A+" || result.intelGrade === "A" ? "text-primary" :
                result.intelGrade === "B" ? "text-chart-3" :
                result.intelGrade === "C" ? "text-yellow-600" :
                "text-muted-foreground"
              )}>
                {result.intelScore}
              </span>
              <span className="text-xs text-muted-foreground">{result.intelGrade}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {formatNumber(result.stars)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitFork className="h-3.5 w-3.5" />
            <span>{formatNumber(result.forks)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{result.lastUpdate}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="border-transparent px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${result.languageColor}20`,
              color: result.languageColor,
            }}
          >
            {result.language}
          </Badge>
          {result.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
          {result.tags.length > 3 && (
            <Badge
              variant="secondary"
              className="bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              +{result.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* License */}
        <div className="text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">{result.license}</span>
        </div>

        {/* Hover Actions */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-card via-card/95 to-transparent pb-4 pt-8 transition-all duration-200",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-border bg-background/80 backdrop-blur-sm"
            onClick={() => onAddToCompare?.(result)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.addToCompare}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground"
            onClick={() => onGenerateReport?.(result)}
          >
            <FileText className="h-3.5 w-3.5" />
            {t.viewDetails}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
