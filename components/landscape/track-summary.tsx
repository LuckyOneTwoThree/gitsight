"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { techRouteColors } from "@/lib/constants";
import {
  Sparkles,
  TrendingUp,
  GitBranch,
  Users,
  Star,
  Zap,
  Rocket,
} from "lucide-react";

interface TrackSummary {
  name: string;
  description: string;
  techRoutes: {
    name: string;
    description: string;
    representative: string;
    keywords: string[];
  }[];
  stats: {
    totalProjects: number;
    totalContributors: number;
    weekGrowth: string;
    avgStars: number;
  };
  risingStars: { name: string; reason: string }[];
}

interface TrackSummaryProps {
  summary: TrackSummary;
}

export function TrackSummaryCard({ summary }: TrackSummaryProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="flex flex-col xl:flex-row min-w-0">
          {/* Left: Main Summary */}
          <div className="flex-1 p-4 md:p-6 min-w-0">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {summary.name}
                </h2>
                <p className="text-xs text-muted-foreground">AI 赛道综述</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                <Zap className="h-3 w-3 mr-1" />
                实时更新
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {summary.description}
            </p>

            {/* Tech Routes */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                主流技术路线
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                {summary.techRoutes.map((route) => (
                  <div
                    key={route.name}
                    className="rounded-lg border border-border bg-muted/30 p-3 transition-all hover:border-primary/20 hover:bg-muted/50 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: techRouteColors[route.name] || "#6b7280",
                        }}
                      />
                      <span className="text-sm font-medium truncate">{route.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5 line-clamp-2">
                      {route.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <GitBranch className="h-3 w-3 shrink-0" />
                      <span className="truncate">代表: {route.representative}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Stats & Rising Stars */}
          <div className="xl:w-[320px] shrink-0 border-t xl:border-t-0 xl:border-l border-border bg-muted/20 p-4 md:p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Star className="h-3 w-3 shrink-0" />
                  <span className="text-[10px]">项目总数</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {summary.stats.totalProjects}
                </p>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Users className="h-3 w-3 shrink-0" />
                  <span className="text-[10px]">贡献者</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {(summary.stats.totalContributors / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3 shrink-0" />
                  <span className="text-[10px]">周增长率</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {summary.stats.weekGrowth}
                </p>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Star className="h-3 w-3 shrink-0" />
                  <span className="text-[10px]">平均 Star</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {(summary.stats.avgStars / 1000).toFixed(1)}k
                </p>
              </div>
            </div>

            {/* Rising Stars */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Rocket className="h-3 w-3 shrink-0" />
                本周飙升黑马
              </h3>
              <div className="space-y-2">
                {summary.risingStars.map((star) => (
                  <div
                    key={star.name}
                    className="flex items-start gap-2.5 rounded-lg bg-background/60 p-3 transition-all hover:bg-background/80 cursor-pointer"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <TrendingUp className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{star.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] border-primary/20 text-primary shrink-0 px-1 py-0"
                        >
                          +Hot
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {star.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
