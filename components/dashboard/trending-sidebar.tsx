"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import {
  Star,
  TrendingUp,
  Flame,
  ExternalLink,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { LANGUAGE_COLORS } from "@/lib/repo-api";
import { useApp } from "@/components/app-provider";

interface TrendingItem {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  stars: number;
  starsToday: number;
  starsWeek: number;
  language: string;
  languageColor: string;
}

interface HotTopic {
  name: string;
  count: number;
  trend: "up" | "down" | "stable";
}

export function TrendingSidebar() {
  const router = useRouter();
  const { dict } = useApp();
  const d = dict.dashboard;
  const c = dict.common;
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/stats/trending?range=weekly&limit=10");
        if (!response.ok) throw new Error(c.error);
        const payload = await response.json();
        if (cancelled) return;

        const items: TrendingItem[] = (payload.trending || []).map(
          (repo: Record<string, unknown>) => ({
            id: String(repo.id || ""),
            name: String(repo.name || ""),
            owner: String(repo.owner || ""),
            ownerAvatar: String(repo.owner_avatar_url || "") || `https://avatars.githubusercontent.com/${repo.owner}`,
            stars: Number(repo.stars || 0),
            starsToday: Number(repo.stars_today || 0),
            starsWeek: Number(repo.stars_week || 0),
            language: String(repo.language || "Unknown"),
            languageColor:
              LANGUAGE_COLORS[String(repo.language || "")] || "#8b8b8b",
          })
        );

        const topics: HotTopic[] = (payload.hotTopics || []).map(
          (topic: Record<string, unknown>) => ({
            name: String(topic.name || ""),
            count: Number(topic.count || 0),
            trend: (topic.trend as "up" | "down" | "stable") || "up",
          })
        );

        setTrendingItems(items);
        setHotTopics(topics);
      } catch {
        setTrendingItems([]);
        setHotTopics([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <aside className="hidden w-[320px] flex-shrink-0 xl:block">
      <div className="space-y-6 xl:sticky xl:top-[88px]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                {d.trendingThisWeek}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                {d.viewAll}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : trendingItems.length > 0 ? (
              <div className="space-y-1">
                {trendingItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group grid grid-cols-[20px_24px_1fr_56px] items-center gap-x-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/repo/${item.owner}/${item.name}`)}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.ownerAvatar} alt={item.owner} />
                      <AvatarFallback className="text-[10px]">
                        {item.owner[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 overflow-hidden">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {item.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.owner}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary whitespace-nowrap">
                        <TrendingUp className="h-3 w-3" />
                        +{item.starsWeek > 0 ? formatNumber(item.starsWeek) : formatNumber(item.starsToday)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        <Star className="h-3 w-3" />
                        {formatNumber(item.stars)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">{c.noData}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Flame className="h-4 w-4 text-orange-500" />
                {d.hotTechTags}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hotTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hotTopics.map((topic) => (
                  <Badge
                    key={topic.name}
                    variant="secondary"
                    className="cursor-pointer gap-1.5 bg-muted px-3 py-1.5 transition-colors hover:bg-accent"
                  >
                    <span className="text-foreground">{topic.name}</span>
                    <span className="text-xs text-muted-foreground">{topic.count}</span>
                    {topic.trend === "up" && (
                      <TrendingUp className="h-3 w-3 text-primary" />
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <p className="text-xs">{c.noData}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                {d.externalBuzz}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-orange-500/10 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/20 shrink-0">
                  <span className="text-sm font-bold text-orange-500">HN</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Hacker News</p>
                  <p className="text-xs text-muted-foreground">...</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-sky-500/10 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 shrink-0">
                  <span className="text-sm font-bold text-sky-500">X</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">X / Twitter</p>
                  <p className="text-xs text-muted-foreground">...</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/20 shrink-0">
                  <span className="text-sm font-bold text-rose-500">PH</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Product Hunt</p>
                  <p className="text-xs text-muted-foreground">...</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
