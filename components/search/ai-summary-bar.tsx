"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

interface IntentTag {
  type: "domain" | "category" | "feature" | "language" | "scenario" | "scale";
  label: string;
  value: string;
}

interface AISummaryBarProps {
  query: string;
  resultCount: number;
  intentTags: IntentTag[];
  summaryText: string;
  insights?: {
    avgMatchScore: number;
    topLanguage: string;
    avgStars: string;
    recentActivity: string;
  };
  suggestions?: string[];
  relatedSearches?: string[];
  onRefresh?: () => void;
  isLoading?: boolean;
  onRelatedSearchClick?: (query: string) => void;
}

const tagTypeColors: Record<string, string> = {
  domain: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  category: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  feature: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  language: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  scenario: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  scale: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

const tagTypeLabels: Record<string, string> = {}; // populated via dict in component

export function AISummaryBar({
  query,
  resultCount,
  intentTags,
  summaryText,
  insights,
  suggestions,
  relatedSearches,
  onRefresh,
  isLoading,
  onRelatedSearchClick,
}: AISummaryBarProps) {
  const { dict } = useApp();
  const t = dict.aiSummaryBar;
  const s = dict.search;
  const tagTypeLabels: Record<string, string> = {
    domain: t.tagDomain,
    category: t.tagCategory,
    feature: t.tagFeature,
    language: t.tagLanguage,
    scenario: t.tagScenario,
    scale: t.tagScale,
  };
  const [expanded, setExpanded] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // 打字机效果
  useEffect(() => {
    if (!summaryText) return;
    
    setDisplayText("");
    setIsTyping(true);
    let index = 0;
    
    const timer = setInterval(() => {
      if (index < summaryText.length) {
        setDisplayText(summaryText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [summaryText]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      {/* 背景装饰 */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-info/5 blur-3xl" />
      
      <div className="relative p-5">
        {/* 头部：AI 图标和刷新按钮 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t.aiSummary}</h3>
              <p className="text-xs text-muted-foreground">{s.intentParsing}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            {s.intentParsing}
          </Button>
        </div>

        {/* 搜索意图标签 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{s.intentParsing}：</span>
          {intentTags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className={cn("text-xs", tagTypeColors[tag.type])}
            >
              {tagTypeLabels[tag.type]}: {tag.value}
            </Badge>
          ))}
        </div>

        {/* AI 总结文本 */}
        <div className="mb-4 rounded-lg bg-background/50 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-chart-3" />
            <div>
              <p className="text-sm leading-relaxed text-foreground">
                {displayText}
                {isTyping && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 快速数据洞察 */}
        {insights && (
          <div className={cn(
            "grid gap-3 transition-all duration-300",
            expanded ? "grid-cols-2 md:grid-cols-4" : "grid-cols-4"
          )}>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{s.matchScore}</p>
                <p className="text-sm font-semibold text-primary">{insights.avgMatchScore}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-chart-3" />
              <div>
                <p className="text-xs text-muted-foreground">{s.languageFilter}</p>
                <p className="text-sm font-semibold text-foreground">{insights.topLanguage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Sparkles className="h-4 w-4 text-info" />
              <div>
                <p className="text-xs text-muted-foreground">{dict.searchCard.stars}</p>
                <p className="text-sm font-semibold text-foreground">{insights.avgStars}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Clock className="h-4 w-4 text-chart-4" />
              <div>
                <p className="text-xs text-muted-foreground">{dict.statusPanel.running}</p>
                <p className="text-sm font-semibold text-foreground">{insights.recentActivity}</p>
              </div>
            </div>
          </div>
        )}

        {/* 展开/收起更多细节 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {dict.common.close}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {t.suggestions}
            </>
          )}
        </Button>

        {/* 展开后的额外内容 */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {suggestions && suggestions.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">{t.suggestions}</h4>
                <div className="space-y-2">
                  {suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-info" : "bg-chart-3")} />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {relatedSearches && relatedSearches.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">{t.relatedSearches}</h4>
                <div className="flex flex-wrap gap-2">
                  {relatedSearches.map((search, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => onRelatedSearchClick?.(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 结果数量 */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          {s.resultsCount.replace("{count}", String(resultCount))}
        </div>
      </div>
    </div>
  );
}
