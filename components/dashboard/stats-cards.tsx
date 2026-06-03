"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import {
  TrendingUp,
  Zap,
  Star,
  GitFork,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  sparklineData: number[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

export function StatsCards() {
  const { dict } = useApp();
  const d = dict.dashboard;
  const c = dict.common;
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/projects/stats");
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        const starsToday = data.stars_today || 0;
        const totalProjects = data.total_projects || 0;
        const totalStars = data.total_stars || 0;
        const totalForks = data.total_forks || 0;
        const starsSparkline: number[] = data.stars_sparkline || [];
        const forksSparkline: number[] = data.forks_sparkline || [];

        setStats([
          {
            label: d.todayPlus.trim(),
            value: formatNumber(starsToday),
            change: starsToday > 0 ? `+${formatNumber(starsToday)}` : c.noData,
            changeType: starsToday > 0 ? "positive" : "neutral",
            icon: TrendingUp,
            sparklineData: starsSparkline.length > 1 ? starsSparkline : (starsToday > 0 ? [0, starsToday * 0.3, starsToday * 0.5, starsToday * 0.7, starsToday * 0.85, starsToday] : [0, 0, 0, 0, 0, 0]),
          },
          {
            label: d.totalProjects,
            value: formatNumber(totalProjects),
            change: totalProjects > 0 ? `${totalProjects} ${d.syncedRepos}` : c.noData,
            changeType: totalProjects > 0 ? "positive" : "neutral",
            icon: Zap,
            sparklineData: totalProjects > 0 ? [1, Math.ceil(totalProjects * 0.2), Math.ceil(totalProjects * 0.4), Math.ceil(totalProjects * 0.6), Math.ceil(totalProjects * 0.8), totalProjects] : [0, 0, 0, 0, 0, 0],
          },
          {
            label: d.totalStars,
            value: formatNumber(totalStars),
            change: totalStars > 0 ? `${formatNumber(totalStars)} stars` : c.noData,
            changeType: totalStars > 0 ? "positive" : "neutral",
            icon: Star,
            sparklineData: starsSparkline.length > 1 ? starsSparkline : (totalStars > 0 ? [0, totalStars * 0.3, totalStars * 0.5, totalStars * 0.7, totalStars * 0.85, totalStars] : [0, 0, 0, 0, 0, 0]),
          },
          {
            label: d.totalForks,
            value: formatNumber(totalForks),
            change: totalForks > 0 ? `${formatNumber(totalForks)} forks` : c.noData,
            changeType: totalForks > 0 ? "positive" : "neutral",
            icon: GitFork,
            sparklineData: forksSparkline.length > 1 ? forksSparkline : (totalForks > 0 ? [0, totalForks * 0.3, totalForks * 0.5, totalForks * 0.7, totalForks * 0.85, totalForks] : [0, 0, 0, 0, 0, 0]),
          },
        ]);
      } catch {
        setStats([]);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, []);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border bg-card min-w-0">
          <CardContent className="p-2.5 sm:p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className="rounded-md bg-muted p-1 sm:p-2 shrink-0 ml-1.5 sm:ml-2">
                <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="mt-2 sm:mt-3">
              <Sparkline
                data={stat.sparklineData}
                color={
                  stat.changeType === "positive"
                    ? "oklch(0.75 0.18 145)"
                    : stat.changeType === "negative"
                    ? "oklch(0.55 0.22 25)"
                    : "oklch(0.6 0 0)"
                }
                height={28}
              />
            </div>

            <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
              {stat.changeType === "positive" ? (
                <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              ) : stat.changeType === "negative" ? (
                <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive rotate-90" />
              ) : (
                <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
              )}
              <span
                className={`text-[11px] sm:text-xs font-medium ${
                  stat.changeType === "positive"
                    ? "text-primary"
                    : stat.changeType === "negative"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
