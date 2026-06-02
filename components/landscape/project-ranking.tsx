"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { techRouteColors } from "@/lib/constants";
import {
  Trophy,
  Star,
  TrendingUp,
  GitFork,
} from "lucide-react";

interface LandscapeProject {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  starsWeek: number;
  recentActivity: number;
  communitySize: number;
  topics: string[];
  techRoute: string | null;
  aiSummary: string;
}

interface ProjectRankingProps {
  projects: LandscapeProject[];
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

const rankStyles: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  2: "bg-slate-400/15 text-slate-500 border-slate-400/30",
  3: "bg-orange-500/15 text-orange-600 border-orange-500/30",
};

export function ProjectRanking({ projects }: ProjectRankingProps) {
  const router = useRouter();

  const ranked = [...projects]
    .sort((a, b) => b.starsWeek - a.starsWeek || b.stars - a.stars)
    .slice(0, 20);

  if (ranked.length === 0) return null;

  return (
    <Card className="border-border bg-card min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
          <CardTitle className="text-base font-semibold">项目排行榜</CardTitle>
        </div>
        <CardDescription className="text-xs">
          按周 Star 增量排序 · Top {ranked.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {ranked.map((project, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={project.id}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2.5 transition-all cursor-pointer",
                  "hover:bg-muted/50"
                )}
                onClick={() => router.push(`/repo/${project.owner}/${project.name}`)}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    isTop3
                      ? rankStyles[rank]
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {rank}
                </div>

                <img
                  src={project.ownerAvatar}
                  alt={project.owner}
                  className="h-5 w-5 shrink-0 rounded-full"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </span>
                    {project.techRoute && (
                      <Badge
                        variant="outline"
                        className="text-[9px] shrink-0 px-1.5 py-0"
                        style={{
                          borderColor: `${techRouteColors[project.techRoute]}40`,
                          color: techRouteColors[project.techRoute],
                        }}
                      >
                        {project.techRoute}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {project.language}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-1 text-primary font-medium">
                    <TrendingUp className="h-3 w-3" />
                    +{formatNumber(project.starsWeek)}
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3" />
                    {formatNumber(project.stars)}
                  </div>
                  <div className="hidden md:flex items-center gap-1 text-muted-foreground">
                    <GitFork className="h-3 w-3" />
                    {formatNumber(project.forks)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
