"use client";

import * as React from "react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import {
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  Code2,
  Database,
  Brain,
  Rocket,
  ArrowRight,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const hotSearchIntents = [
  {
    id: 1,
    text: "本周飙升的 Rust Web3 项目",
    icon: TrendingUp,
    color: "text-orange-400",
  },
  {
    id: 2,
    text: "适合单人开发的低代码平台",
    icon: Code2,
    color: "text-blue-400",
  },
  {
    id: 3,
    text: "医疗行业轻量级图数据库",
    icon: Database,
    color: "text-emerald-400",
  },
  {
    id: 4,
    text: "AI Agent 开发框架对比",
    icon: Brain,
    color: "text-purple-400",
  },
  {
    id: 5,
    text: "新兴 LLM 应用脚手架",
    icon: Rocket,
    color: "text-pink-400",
  },
  {
    id: 6,
    text: "高性能实时协作编辑器",
    icon: Zap,
    color: "text-yellow-400",
  },
];

interface IntentTag {
  type: "领域" | "类别" | "特性" | "语言" | "场景" | "规模";
  value: string;
}

function getTagColor(type: IntentTag["type"]): string {
  const colors: Record<IntentTag["type"], string> = {
    领域: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    类别: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    特性: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    语言: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    场景: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    规模: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return colors[type];
}

function AIListeningIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-1000",
            isActive
              ? "animate-ping bg-primary/40"
              : "bg-muted-foreground/20"
          )}
        />
        <div
          className={cn(
            "relative z-10 h-2.5 w-2.5 rounded-full transition-colors duration-300",
            isActive ? "bg-primary" : "bg-muted-foreground/50"
          )}
        />
        {isActive && (
          <div
            className="absolute inset-0 animate-pulse rounded-full bg-primary/30"
            style={{ animationDuration: "2s" }}
          />
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-300",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {isActive ? "AI 正在监听" : "AI 待命中"}
      </span>
    </div>
  );
}

function IntentParser({
  tags,
  isLoading,
}: {
  tags: IntentTag[];
  isLoading: boolean;
}) {
  if (tags.length === 0 && !isLoading) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">AI 意图拆解</span>
        {isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag, index) => (
            <React.Fragment key={`${tag.type}-${tag.value}`}>
              {index > 0 && (
                <span className="text-muted-foreground">+</span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 border px-2.5 py-1 text-xs font-medium",
                  getTagColor(tag.type)
                )}
              >
                <span className="opacity-70">{tag.type}:</span>
                <span>{tag.value}</span>
              </Badge>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionTile({
  intent,
  onClick,
}: {
  intent: (typeof hotSearchIntents)[0];
  onClick: () => void;
}) {
  const Icon = intent.icon;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 p-3 text-left transition-all hover:border-primary/50 hover:bg-card/80"
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 transition-colors group-hover:bg-primary/10",
          intent.color
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm text-foreground/90 transition-colors group-hover:text-foreground">
        {intent.text}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
    </button>
  );
}

interface SemanticSearchPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SemanticSearchPalette({
  open: controlledOpen,
  onOpenChange,
}: SemanticSearchPaletteProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("q", searchText.trim());
      router.push(`/search/results?${searchParams.toString()}`);
      setIsOpen(false);
      setQuery("");
    } finally {
      setIsSearching(false);
    }
  }, [isSearching, router, setIsOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleQuickSearch = (text: string) => {
    handleSearch(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="top-[20%] max-w-2xl translate-y-0 gap-0 overflow-hidden border-border/50 bg-background/95 p-0 backdrop-blur-xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">AI 语义搜索</DialogTitle>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-border/50 px-4 py-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="例如：寻找医疗行业的轻量级图数据库平替..."
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isSearching}
            />
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <AIListeningIndicator isActive={query.length > 0} />
            )}
          </div>
        </form>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            {isSearching && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI 正在搜索并分析...</span>
              </div>
            )}

            {!isSearching && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>热门搜索意图</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {hotSearchIntents.map((intent) => (
                    <QuickActionTile
                      key={intent.id}
                      intent={intent}
                      onClick={() => handleQuickSearch(intent.text)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Kbd>Enter</Kbd>
              <span>搜索</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd>
              <span>关闭</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Kbd>
              <span className="text-[10px]">⌘</span>
            </Kbd>
            <Kbd>K</Kbd>
            <span>快速唤起</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground",
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">AI 语义搜索...</span>
        <div className="flex items-center gap-1">
          <Kbd className="h-5 min-w-5">
            <span className="text-[10px]">⌘</span>
          </Kbd>
          <Kbd className="h-5 min-w-5">K</Kbd>
        </div>
      </button>
      <SemanticSearchPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
