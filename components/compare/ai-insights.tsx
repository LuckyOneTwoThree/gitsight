"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Target,
  Layers,
  ExternalLink,
  ArrowRight,
  Zap,
  Star,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type {
  PainPoint,
  FeatureGap,
  DifferentiationSuggestion,
} from "@/lib/mock-compare-data";
// MVP: mock data - replace with API when available
import {
  mockPainPoints,
  mockFeatureGaps,
  mockDifferentiationSuggestions,
} from "@/lib/mock-compare-data";

export function AIInsights() {
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-destructive" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-primary" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getDifficultyColor = (difficulty: "easy" | "medium" | "hard") => {
    switch (difficulty) {
      case "easy":
        return "bg-primary/20 text-primary border-primary/30";
      case "medium":
        return "bg-warning/20 text-warning border-warning/30";
      case "hard":
        return "bg-destructive/20 text-destructive border-destructive/30";
    }
  };

  const getImpactColor = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return "bg-primary/20 text-primary";
      case "medium":
        return "bg-info/20 text-info";
      case "low":
        return "bg-muted text-muted-foreground";
    }
  };

  const getDemandColor = (demand: "high" | "medium" | "low") => {
    switch (demand) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-info/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              新产品切入点与机会列表
            </h2>
            <p className="text-sm text-muted-foreground">
              AI 基于竞品分析自动挖掘市场机会与差异化方向
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          <Sparkles className="mr-1 h-3 w-3" />
          AI 生成
        </Badge>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pain Points - Takes 1 column on large screens */}
        <Card className="lg:row-span-2 border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base">高频未满足痛点</CardTitle>
                <CardDescription className="text-xs">TOP 10</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockPainPoints.map((point, index) => (
              <div
                key={point.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30"
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    index < 3
                      ? "bg-destructive/20 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground line-clamp-2">
                      {point.title}
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        {getTrendIcon(point.trend)}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {point.trend === "up" && "需求上升"}
                          {point.trend === "down" && "需求下降"}
                          {point.trend === "stable" && "需求稳定"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={point.frequency}
                        className="h-1.5 w-16"
                      />
                      <span className="text-xs text-muted-foreground">
                        {point.frequency}%
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {point.issueCount} Issues
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feature Gap Matrix */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20">
                  <Layers className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-base">功能空白矩阵</CardTitle>
                  <CardDescription className="text-xs">
                    竞品均未实现的功能需求
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {mockFeatureGaps.length} 个空白点
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {mockFeatureGaps.map((gap) => (
                <div
                  key={gap.feature}
                  className="group rounded-lg border border-border bg-background p-4 transition-all hover:border-warning/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-warning/10">
                        <XCircle className="h-3.5 w-3.5 text-warning" />
                      </div>
                      <span className="font-medium text-foreground">
                        {gap.feature}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", getDemandColor(gap.demand))}
                    >
                      {gap.demand === "high" && "高需求"}
                      {gap.demand === "medium" && "中需求"}
                      {gap.demand === "low" && "低需求"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {gap.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">
                      {gap.category}
                    </Badge>
                    {gap.competitors.length > 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        部分实现: {gap.competitors.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-warning">
                        完全空白
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Differentiation Suggestions */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">潜在差异化方向建议</CardTitle>
                  <CardDescription className="text-xs">
                    AI 推荐的产品切入点
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDifferentiationSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className="group relative rounded-lg border border-border bg-gradient-to-r from-background to-background p-4 transition-all hover:border-primary/30 hover:from-primary/5 hover:to-background"
                >
                  {/* Highlight badge for top suggestions */}
                  {index === 0 && (
                    <div className="absolute -top-2 right-4">
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        <Star className="mr-1 h-3 w-3" />
                        推荐优先
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {suggestion.title}
                        </h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {/* Tags */}
                        {suggestion.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                        <div className="flex-1" />
                        {/* Difficulty & Impact */}
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                getDifficultyColor(suggestion.difficulty)
                              )}
                            >
                              {suggestion.difficulty === "easy" && "易实现"}
                              {suggestion.difficulty === "medium" && "中等"}
                              {suggestion.difficulty === "hard" && "困难"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>实现难度</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                getImpactColor(suggestion.impact)
                              )}
                            >
                              <Target className="mr-1 h-3 w-3" />
                              {suggestion.impact === "high" && "高影响"}
                              {suggestion.impact === "medium" && "中影响"}
                              {suggestion.impact === "low" && "低影响"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>预期影响力</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <div className="flex items-center justify-center gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            想要深入分析某个切入点？
          </h3>
          <p className="text-sm text-muted-foreground">
            生成详细的《市场机会与产品切入点报告》
          </p>
        </div>
        <Button className="ml-auto gap-2">
          生成完整报告
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
