"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  Flame,
  TrendingUp,
  Clock,
  Star,
  Radar,
} from "lucide-react";

interface HeaderProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  lastFetchedAt?: Date | null;
  languageFilter?: string;
  onLanguageFilterChange?: (value: string) => void;
}

export function Header({
  timeRange,
  onTimeRangeChange,
  viewMode,
  onViewModeChange,
  activeTab,
  onTabChange,
  lastFetchedAt,
  languageFilter,
  onLanguageFilterChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-auto min-h-16 items-center justify-between gap-2 px-4 md:px-6 py-2">
        {/* Left: Title & Tabs */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 shrink-0">
          <div className="shrink-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Radar className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline">发现探索</span>
              <span className="sm:hidden">发现</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">实时追踪开源世界的热门动态</p>
          </div>
          
          <div className="hidden lg:block">
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="velocity" className="gap-2 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>短期飙升</span>
                </TabsTrigger>
                <TabsTrigger value="trending" className="gap-2 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm">
                  <Flame className="h-3.5 w-3.5" />
                  <span>热门榜单</span>
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm">
                  <Star className="h-3.5 w-3.5" />
                  <span>新兴黑马</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[110px] md:w-[130px] border-border bg-input">
              <Clock className="mr-1 md:mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="all">全部时间</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-border bg-input h-8">
                <Filter className="h-3.5 w-3.5" />
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("all")}>
                <Badge className="mr-2 bg-muted">全部</Badge>
                {languageFilter === "all" || !languageFilter ? "✓ " : ""}全部语言
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("TypeScript")}>
                <Badge className="mr-2 bg-[#3178c6]">TypeScript</Badge>
                {languageFilter === "TypeScript" ? "✓ " : ""}TypeScript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("JavaScript")}>
                <Badge className="mr-2 bg-[#f1e05a] text-black">JavaScript</Badge>
                {languageFilter === "JavaScript" ? "✓ " : ""}JavaScript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("Rust")}>
                <Badge className="mr-2 bg-[#dea584]">Rust</Badge>
                {languageFilter === "Rust" ? "✓ " : ""}Rust
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("Go")}>
                <Badge className="mr-2 bg-[#00ADD8]">Go</Badge>
                {languageFilter === "Go" ? "✓ " : ""}Go
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLanguageFilterChange?.("Python")}>
                <Badge className="mr-2 bg-[#3572A5]">Python</Badge>
                {languageFilter === "Python" ? "✓ " : ""}Python
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-border bg-input p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${viewMode === "grid" ? "bg-accent" : ""}`}
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${viewMode === "list" ? "bg-accent" : ""}`}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button variant="outline" size="icon" className="border-border bg-input h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Last Updated */}
          <div className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span>{lastFetchedAt ? `${Math.max(1, Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000))} 分钟前更新` : "加载中…"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
