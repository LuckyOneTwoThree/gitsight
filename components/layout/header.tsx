"use client";

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
  Star,
  Radar,
  Zap,
  Sparkles,
  Activity,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

interface HeaderProps {
  sortBy: string;
  onSortByChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  lastFetchedAt?: Date | null;
  languageFilter?: string;
  onLanguageFilterChange?: (value: string) => void;
}

export function Header({
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  lastFetchedAt,
  languageFilter,
  onLanguageFilterChange,
}: HeaderProps) {
  const { dict } = useApp();
  const d = dict.discover;
  const c = dict.common;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-auto min-h-16 items-center justify-between gap-2 px-4 md:px-6 py-2">
        {/* Left: Title */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 shrink-0">
          <div className="shrink-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Radar className="h-5 w-5 text-primary" />
              <span>{d.title}</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{d.subtitle}</p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Sort By Selector */}
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[110px] md:w-[130px] border-border bg-input">
              <SelectValue placeholder={d.sortBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="velocity">
                <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary" /> {d.sortByVelocity}</span>
              </SelectItem>
              <SelectItem value="stars">
                <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-yellow-500" /> {d.sortByStars}</span>
              </SelectItem>
              <SelectItem value="newest">
                <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-green-500" /> {d.sortByNewest}</span>
              </SelectItem>
              <SelectItem value="active">
                <span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-blue-500" /> {d.sortByActive}</span>
              </SelectItem>
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
                <Badge className="mr-2 bg-muted">{dict.landscape.filterAll}</Badge>
                {languageFilter === "all" || !languageFilter ? "✓ " : ""}{d.filterByLanguage}
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
            <span>{lastFetchedAt ? `${Math.max(1, Math.floor((Date.now() - lastFetchedAt.getTime()) / 60000))} ${dict.landscape.updatedMinutesAgo}` : c.loading}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
