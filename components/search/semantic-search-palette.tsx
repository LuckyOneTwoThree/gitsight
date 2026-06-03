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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-provider";

const hotSearchIntentKeys = [
  { id: 1, key: "example1" as const, icon: TrendingUp, color: "text-orange-400" },
  { id: 2, key: "example2" as const, icon: Code2, color: "text-blue-400" },
  { id: 3, key: "example3" as const, icon: Database, color: "text-emerald-400" },
  { id: 4, key: "example4" as const, icon: Brain, color: "text-purple-400" },
  { id: 5, key: "example5" as const, icon: Rocket, color: "text-pink-400" },
  { id: 6, key: "example6" as const, icon: Zap, color: "text-yellow-400" },
];

interface IntentTag {
  type: "domain" | "category" | "feature" | "language" | "scenario" | "scale";
  value: string;
}

const tagTypeMap: Record<string, "tagDomain" | "tagCategory" | "tagFeature" | "tagLanguage" | "tagScenario" | "tagScale"> = {
  domain: "tagDomain",
  category: "tagCategory",
  feature: "tagFeature",
  language: "tagLanguage",
  scenario: "tagScenario",
  scale: "tagScale",
};

function getTagColor(type: IntentTag["type"]): string {
  const colors: Record<IntentTag["type"], string> = {
    domain: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    category: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    feature: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    language: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    scenario: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    scale: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return colors[type];
}

function IntentParser({
  tags,
  isLoading,
  t,
}: {
  tags: IntentTag[];
  isLoading: boolean;
  t: ReturnType<typeof useApp>["dict"]["searchPalette"];
}) {
  if (tags.length === 0 && !isLoading) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{t.intentParsing}</span>
        {isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      {isLoading && tags.length === 0 && (
        <p className="text-xs text-muted-foreground">{t.parsingIntent}</p>
      )}
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
                <span className="opacity-70">{t[tagTypeMap[tag.type]]}:</span>
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
  t,
}: {
  intent: (typeof hotSearchIntentKeys)[0];
  onClick: () => void;
  t: ReturnType<typeof useApp>["dict"]["searchPalette"];
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
        {t[intent.key]}
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
  const { dict } = useApp();
  const t = dict.searchPalette;
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [intentTags, setIntentTags] = useState<IntentTag[]>([]);
  const [isParsingIntent, setIsParsingIntent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced intent parsing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setIntentTags([]);
      setIsParsingIntent(false);
      return;
    }

    setIsParsingIntent(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), parseIntentOnly: true }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.intentTags) {
            setIntentTags(data.intentTags);
          }
        }
      } catch {
        // ignore parse errors
      } finally {
        setIsParsingIntent(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("q", searchText.trim());
      router.push(`/search/results?${searchParams.toString()}`);
      setIsOpen(false);
      setQuery("");
      setIntentTags([]);
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

  const showIntentParser = intentTags.length > 0 || isParsingIntent;
  const showHotIntents = !isSearching && !showIntentParser;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="top-[20%] max-w-2xl translate-y-0 gap-0 overflow-hidden border-border/50 bg-background/95 p-0 backdrop-blur-xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t.title}</DialogTitle>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-border/50 px-4 py-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={t.placeholder}
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isSearching}
            />
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : isParsingIntent ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : query.length > 0 ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : null}
          </div>
        </form>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            {isSearching && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t.searching}</span>
              </div>
            )}

            {!isSearching && showIntentParser && (
              <IntentParser tags={intentTags} isLoading={isParsingIntent} t={t} />
            )}

            {showHotIntents && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>{t.hotSearchIntents}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {hotSearchIntentKeys.map((intent) => (
                    <QuickActionTile
                      key={intent.id}
                      intent={intent}
                      onClick={() => handleQuickSearch(t[intent.key])}
                      t={t}
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
              <span>{t.searchButton}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd>
              <span>{t.closeButton}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Kbd>
              <span className="text-[10px]">⌘</span>
            </Kbd>
            <Kbd>K</Kbd>
            <span>{t.quickInvoke}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { dict } = useApp();
  const t = dict.searchPalette;

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
        <span className="flex-1 text-left">{t.aiSemanticSearch}</span>
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
