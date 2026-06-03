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
  ExternalLink,
  Plus,
  FileText,
  Clock,
  MessageSquare,
  Gauge,
  Bookmark,
} from "lucide-react";
import { ScoreDetailDialog, type ScoreDetail } from "./score-detail-dialog";
import { Sparkline } from "@/components/charts/sparkline";
import { useApp } from "@/components/app-provider";

export interface ProjectData {
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
  externalSource?: {
    type: "hackernews" | "twitter" | "producthunt";
    label: string;
  };
  intelScore?: number;
  intelGrade?: string;
  velocityScore?: number;
  communityScore?: number;
  maturityScore?: number;
}

interface ProjectCardProps {
  project: ProjectData;
  onAddToCompare?: (project: ProjectData) => void;
  onGenerateReport?: (project: ProjectData) => void;
  onToggleWatchlist?: (project: ProjectData) => void;
  isWatched?: boolean;
}

export function ProjectCard({
  project,
  onAddToCompare,
  onGenerateReport,
  onToggleWatchlist,
  isWatched,
}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { dict } = useApp();
  const t = dict.projectCard;

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const trendPositive = project.starsWeek > 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-card transition-all duration-200 cursor-pointer",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3 sm:p-5">
        {/* Header: Owner & External Source & Intel Score */}
        <div className="mb-2 sm:mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
              <AvatarImage src={project.ownerAvatar} alt={project.owner} />
              <AvatarFallback className="bg-muted text-[10px] sm:text-xs">
                {project.owner[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm text-muted-foreground">{project.owner}</span>
          </div>
          <div className="flex items-center gap-2">
            {project.intelScore != null && project.intelScore > 0 && (
              <ScoreDetailDialog
                score={{ total: project.intelScore, grade: project.intelGrade || "D", velocity: project.velocityScore || 0, community: project.communityScore || 0, maturity: project.maturityScore || 0 }}
                repoName={project.name}
              >
                <div className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors hover:opacity-80",
                  project.intelGrade === "A+" ? "bg-primary/10 border-primary/30 text-primary" :
                  project.intelGrade === "A" ? "bg-primary/10 border-primary/30 text-primary" :
                  project.intelGrade === "B" ? "bg-chart-3/10 border-chart-3/30 text-chart-3" :
                  project.intelGrade === "C" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600" :
                  "bg-muted border-border text-muted-foreground"
                )}>
                  <Gauge className="h-3 w-3" />
                  <span>{project.intelScore}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{project.intelGrade}</span>
                </div>
              </ScoreDetailDialog>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center rounded-full p-1 transition-colors",
                    isWatched ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={(e) => { e.stopPropagation(); onToggleWatchlist?.(project); }}
                >
                  <Bookmark className={cn("h-4 w-4", isWatched && "fill-current")} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isWatched ? t.removeBookmark : t.bookmark}</TooltipContent>
            </Tooltip>
            {project.externalSource && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium",
                      project.externalSource.type === "hackernews" &&
                        "border-orange-500/30 bg-orange-500/10 text-orange-400",
                      project.externalSource.type === "twitter" &&
                        "border-sky-500/30 bg-sky-500/10 text-sky-400",
                      project.externalSource.type === "producthunt" &&
                        "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {project.externalSource.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t.externalBuzzSource}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Clickable Area: Name + Summary */}
        <Link
          href={`/repo/${project.owner}/${project.name}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
        >
          <h3 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="mb-2 sm:mb-4 line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {project.aiSummary}
          </p>
        </Link>

        {/* Trend Indicator with Sparkline */}
        <div className="mb-2 sm:mb-4 flex items-center gap-2 sm:gap-3 rounded-md bg-muted/30 px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex-1 min-w-0 hidden sm:block">
            {project.sparklineData && project.sparklineData.length > 1 ? (
              <Sparkline data={project.sparklineData} height={28} />
            ) : (
              <span className="text-xs text-muted-foreground">{t.noTrendData}</span>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 flex items-center gap-1 text-xs font-medium",
              trendPositive ? "text-primary" : "text-destructive"
            )}
          >
            {trendPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendPositive ? "+" : ""}
            {formatNumber(project.starsWeek)} stars
          </span>
        </div>

        {/* Stats Row */}
        <div className="mb-2 sm:mb-4 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium text-foreground">
              {formatNumber(project.stars)}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <GitFork className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{project.forks > 0 ? formatNumber(project.forks) : "—"}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{project.lastUpdate}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-2 sm:mb-4 flex flex-wrap gap-1 sm:gap-1.5">
          <Badge
            variant="outline"
            className="border-transparent px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${project.languageColor}20`,
              color: project.languageColor,
            }}
          >
            {project.language}
          </Badge>
          {Array.isArray(project.tags) && project.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
          {Array.isArray(project.tags) && project.tags.length > 3 && (
            <Badge
              variant="secondary"
              className="bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              +{project.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* License */}
        {project.license && project.license !== "Unknown" && (
          <div className="text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">{project.license}</span>
          </div>
        )}

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
            onClick={() => onAddToCompare?.(project)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.addToCompare}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground"
            onClick={() => onGenerateReport?.(project)}
          >
            <FileText className="h-3.5 w-3.5" />
            {t.generateReport}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
