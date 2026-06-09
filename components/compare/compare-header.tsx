"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Share2,
  RefreshCw,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  GitCompare,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

interface CompareHeaderProps {
  projectCount: number;
  isBusy?: boolean;
  onExport?: (format: "markdown" | "csv") => void;
  onShare?: () => void;
  onRefresh?: () => void;
  onClearAll?: () => void;
}

export function CompareHeader({
  projectCount,
  isBusy,
  onExport,
  onShare,
  onRefresh,
  onClearAll,
}: CompareHeaderProps) {
  const { dict } = useApp();
  const t = dict.compare;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <GitCompare className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <Badge variant="secondary" className="bg-primary/20 text-xs text-primary">
                MVP
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.subtitle}
            </p>
          </div>
          <div className="hidden h-8 w-px bg-border md:block" />
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm text-muted-foreground">{t.currentCompare}</span>
            <Badge variant="outline" className="border-border">
              {projectCount} {t.projectCountUnit}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-input" disabled={isBusy}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t.export}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport?.("markdown")}>
                <FileText className="mr-2 h-4 w-4" />
                {t.exportMarkdown}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t.exportCsv}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="gap-2 border-border bg-input" onClick={onShare} disabled={isBusy}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.common.share}</span>
          </Button>

          <Button variant="outline" size="icon" className="border-border bg-input" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {projectCount > 0 && (
            <Button variant="outline" className="gap-2 border-border bg-input hover:border-destructive/40 hover:text-destructive" onClick={onClearAll}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.clearAll}</span>
            </Button>
          )}

          <div className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>{t.syncedRepos}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
