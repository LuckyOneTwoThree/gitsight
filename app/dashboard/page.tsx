"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Sparkline } from "@/components/charts/sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { LANGUAGE_COLORS } from "@/lib/repo-api";
import { useApp } from "@/components/app-provider";
import { BarChart3, Star, TrendingUp, Coins } from "lucide-react";

interface DashboardData {
  total_projects: number;
  total_reports: number;
  stars_today: number;
  stars_week: number;
  total_stars: number;
  total_forks: number;
  stars_sparkline: number[];
  forks_sparkline: number[];
  language_distribution: { language: string; count: number }[];
  top_by_stars: { full_name: string; stars: number; stars_today: number; stars_week: number }[];
  top_by_velocity: { full_name: string; stars: number; stars_today: number; stars_week: number }[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tokenData, setTokenData] = useState<{ total_tokens: number; total_reports: number; by_model: Array<{ model: string; report_count: number; total_tokens: number }> } | null>(null);
  const { dict } = useApp();
  const t = dict.dashboard;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/projects/stats");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // ignore
      }
    }
    async function loadTokenUsage() {
      try {
        const res = await fetch("/api/token-usage");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setTokenData(json);
      } catch {
        // ignore
      }
    }
    load();
    loadTokenUsage();
    return () => { cancelled = true; };
  }, []);

  const maxLangCount = data ? Math.max(...data.language_distribution.map((l) => l.count), 1) : 1;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-6">
          {/* Overview Stats */}
          <StatsCards />

          <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
            {/* Language Distribution */}
            <Card className="border-border bg-card min-w-0">
              <CardContent className="p-4 md:p-5">
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">{t.languageDistribution}</h2>
                {data && data.language_distribution.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.language_distribution.map((item) => {
                      const color = LANGUAGE_COLORS[item.language] || "#8b8b8b";
                      const pct = (item.count / maxLangCount) * 100;
                      return (
                        <div key={item.language} className="flex items-center gap-2 md:gap-3">
                          <span className="w-20 md:w-24 shrink-0 truncate text-xs text-muted-foreground">{item.language}</span>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-medium text-foreground">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
                )}
              </CardContent>
            </Card>

            {/* Star Trend */}
            <Card className="border-border bg-card min-w-0">
              <CardContent className="p-4 md:p-5">
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">{t.starTrend}</h2>
                <div className="h-[120px]">
                  {data && data.stars_sparkline.length > 1 ? (
                    <Sparkline data={data.stars_sparkline} height={120} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-muted-foreground">{t.starTrendEmpty}</p>
                    </div>
                  )}
                </div>
                {data && (
                  <div className="mt-4 flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>{t.todayPlus}{formatNumber(data.stars_today)}</span>
                    <span>{t.thisWeek}{formatNumber(data.stars_week)}</span>
                    <span>{t.total} {formatNumber(data.total_stars)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
            {/* Top by Stars */}
            <Card className="border-border bg-card min-w-0">
              <CardContent className="p-4 md:p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Star className="h-4 w-4" /> {t.starRanking}
                </h2>
                {data && data.top_by_stars.length > 0 ? (
                  <div className="space-y-2">
                    {data.top_by_stars.map((item, i) => (
                      <Link
                        key={item.full_name}
                        href={`/repo/${item.full_name}`}
                        className="flex items-center gap-2 md:gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                      >
                        <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate text-sm text-foreground">{item.full_name}</span>
                        <span className="shrink-0 text-xs font-medium text-foreground">{formatNumber(item.stars)}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
                )}
              </CardContent>
            </Card>

            {/* Top by Velocity */}
            <Card className="border-border bg-card min-w-0">
              <CardContent className="p-4 md:p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> {t.velocityRanking}
                </h2>
                {data && data.top_by_velocity.length > 0 ? (
                  <div className="space-y-2">
                    {data.top_by_velocity.map((item, i) => (
                      <Link
                        key={item.full_name}
                        href={`/repo/${item.full_name}`}
                        className="flex items-center gap-2 md:gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                      >
                        <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate text-sm text-foreground">{item.full_name}</span>
                        <span className="shrink-0 text-xs font-medium text-primary">+{formatNumber(item.stars_week)}{t.perWeek}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Token Usage */}
          <Card className="border-border bg-card min-w-0">
            <CardContent className="p-4 md:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Coins className="h-4 w-4" /> {t.tokenUsage}
              </h2>
              {tokenData && tokenData.total_tokens > 0 ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-6 md:gap-8">
                    <div>
                      <span className="text-2xl font-bold text-foreground">{formatNumber(tokenData.total_tokens)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{t.totalTokenCost}</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-foreground">{tokenData.total_reports}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{t.reportsGenerated}</span>
                    </div>
                  </div>
                  {tokenData.by_model.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground">{t.byModel}</h3>
                      {tokenData.by_model.map((item) => {
                        const maxTokens = tokenData.by_model[0]?.total_tokens || 1;
                        const pct = (item.total_tokens / maxTokens) * 100;
                        return (
                          <div key={item.model} className="flex items-center gap-2 md:gap-3">
                            <span className="w-24 md:w-32 shrink-0 truncate text-xs text-muted-foreground">{item.model}</span>
                            <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden min-w-[60px]">
                              <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-16 md:w-20 shrink-0 text-right text-xs font-medium text-foreground">{formatNumber(item.total_tokens)} tokens</span>
                            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{item.report_count}{t.times}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t.tokenUsageEmpty}</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
