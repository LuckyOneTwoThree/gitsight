"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Map,
  GitCompare,
  TrendingUp,
  Users,
  Layers,
  ArrowRight,
  Sparkles,
  Target,
  ExternalLink,
  Zap,
} from "lucide-react";

export interface LandscapeEntry {
  id: string;
  name: string;
  projectCount: number;
  trending: boolean;
  description: string;
}

export interface CompareRecommendation {
  projects: {
    id: string;
    name: string;
    owner: string;
    avatar: string;
    matchScore: number;
  }[];
  reason: string;
}

interface RelatedTopic {
  name: string;
  count: number;
}

interface SearchSidebarProps {
  landscapes: LandscapeEntry[];
  compareRecommendation: CompareRecommendation;
  relatedTopics: RelatedTopic[];
}

export function SearchSidebar({
  landscapes,
  compareRecommendation,
  relatedTopics,
}: SearchSidebarProps) {
  const router = useRouter();

  const handleStartCompare = () => {
    const pendingNames = compareRecommendation.projects.map(
      (p) => `${p.owner}/${p.name}`
    );
    sessionStorage.setItem(
      "repo-intel:compare-pending",
      JSON.stringify(pendingNames)
    );
    router.push("/compare");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-info/20">
              <Map className="h-3.5 w-3.5 text-info" />
            </div>
            相关赛道
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            根据搜索意图自动匹配的技术领域
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {landscapes.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              暂无匹配赛道
            </p>
          )}
          {landscapes.map((landscape) => (
            <Link
              key={landscape.id}
              href={`/landscape?track=${landscape.id}`}
              className={cn(
                "group block w-full rounded-lg border border-transparent bg-muted/50 p-3 transition-all",
                "hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground group-hover:text-primary">
                  {landscape.name}
                </span>
                {landscape.trending && (
                  <Badge variant="outline" className="border-chart-3/30 bg-chart-3/10 text-chart-3 text-[10px]">
                    <TrendingUp className="mr-1 h-2.5 w-2.5" />
                    热门
                  </Badge>
                )}
              </div>
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                {landscape.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <Layers className="mr-1 inline h-3 w-3" />
                  {landscape.projectCount} 个项目
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
          <Link href="/landscape">
            <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground hover:text-foreground">
              <Map className="h-3.5 w-3.5" />
              浏览全部赛道图谱
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
              <GitCompare className="h-3.5 w-3.5 text-primary" />
            </div>
            横向对比推荐
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            基于搜索结果的最佳对比组合
          </p>
        </CardHeader>
        <CardContent>
          {compareRecommendation.projects.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              至少需要 2 个搜索结果才能推荐对比
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-center gap-1">
                {compareRecommendation.projects.map((project, index) => (
                  <div key={project.id} className="flex items-center">
                    <Link href={`/repo/${project.owner}/${project.name}`} className="group relative">
                      <Avatar className="h-10 w-10 border-2 border-card ring-2 ring-primary/20 transition-all group-hover:ring-primary/50">
                        <AvatarImage src={project.avatar} alt={project.name} />
                        <AvatarFallback className="bg-muted text-xs">
                          {project.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {project.matchScore}
                      </div>
                    </Link>
                    {index < compareRecommendation.projects.length - 1 && (
                      <div className="mx-1 text-xs text-muted-foreground">vs</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                {compareRecommendation.projects.map((project) => (
                  <Link key={project.id} href={`/repo/${project.owner}/${project.name}`}>
                    <Badge
                      variant="secondary"
                      className="max-w-[120px] truncate bg-muted/80 text-xs font-normal hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    >
                      {project.owner}/{project.name}
                    </Badge>
                  </Link>
                ))}
              </div>

              {compareRecommendation.reason && (
                <div className="mb-4 rounded-lg bg-background/50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    推荐理由
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {compareRecommendation.reason}
                  </p>
                </div>
              )}

              <Button
                size="sm"
                className="w-full gap-1.5 bg-primary text-primary-foreground"
                onClick={handleStartCompare}
              >
                <GitCompare className="h-3.5 w-3.5" />
                开始横向对比
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-chart-3/20">
              <Zap className="h-3.5 w-3.5 text-chart-3" />
            </div>
            相关话题
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatedTopics.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              暂无相关话题
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((topic, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer border-border bg-muted/50 text-xs font-normal text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                  onClick={() => router.push(`/search/results?q=${encodeURIComponent(topic.name)}`)}
                >
                  {topic.name}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                    {topic.count}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-chart-4/20">
              <Target className="h-3.5 w-3.5 text-chart-4" />
            </div>
            快速操作
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5" />
            查看维护者活跃度分析
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            导出趋势报告
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            在 GitHub 中查看全部
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
