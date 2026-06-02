"use client";

import { useState } from "react";
import { Plus, Search, Star, GitFork, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { repoToComparisonProject } from "@/lib/compare-utils";
import type { ResolveRepoResponse } from "@/lib/repo-api";
import type { ComparisonProject } from "@/lib/mock-compare-data";

interface ProjectSelectorProps {
  selectedProjects: ComparisonProject[];
  availableProjects: ComparisonProject[];
  onRemoveProject: (projectId: string) => void;
  onAddProject: (project: ComparisonProject) => void;
  maxProjects?: number;
  isLoadingProjects?: boolean;
  disabled?: boolean;
}

export function ProjectSelector({
  selectedProjects,
  availableProjects,
  onRemoveProject,
  onAddProject,
  maxProjects = 6,
  isLoadingProjects,
  disabled,
}: ProjectSelectorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [isResolvingRepo, setIsResolvingRepo] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const selectableProjects = availableProjects.filter(
    (project) => !selectedProjects.some((selected) => selected.id === project.id)
  );

  const filteredProjects = selectableProjects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.owner.toLowerCase().includes(query) ||
      project.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleResolveRepo = async () => {
    const value = repoUrl.trim();
    if (!value || disabled) return;

    setIsResolvingRepo(true);
    setResolveError(null);

    try {
      const response = await fetch("/api/repos/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "无法解析这个 GitHub 仓库");
      }

      const repo = (await response.json()) as ResolveRepoResponse;
      onAddProject(repoToComparisonProject(repo));
      setRepoUrl("");
      setSearchOpen(false);
      setSearchQuery("");
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : "解析失败");
    } finally {
      setIsResolvingRepo(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">已选择项目</h2>
          <Badge variant="secondary" className="text-xs">
            {selectedProjects.length}/{maxProjects}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          选择 2-6 个仓库进行横向对比
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {selectedProjects.map((project) => (
          <div
            key={project.id}
            className="group relative flex items-center gap-2 sm:gap-3 rounded-lg border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 transition-all hover:border-primary/40"
          >
            <Avatar className="h-7 w-7 sm:h-9 sm:w-9">
              <AvatarImage src={project.ownerAvatar} alt={project.owner} />
              <AvatarFallback className="bg-muted text-[10px] sm:text-xs">
                {project.owner[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="max-w-[80px] sm:max-w-[120px] truncate text-sm font-medium text-foreground">
                  {project.name}
                </span>
                <Badge
                  variant="outline"
                  className="border-transparent px-1.5 text-[10px]"
                  style={{
                    backgroundColor: `${project.languageColor}20`,
                    color: project.languageColor,
                  }}
                >
                  {project.language}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {formatNumber(project.stars)}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  {formatNumber(project.forks)}
                </span>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onRemoveProject(project.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>移除项目</TooltipContent>
            </Tooltip>
          </div>
        ))}

        {selectedProjects.length < maxProjects && (
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled}
                className="h-[56px] sm:h-[72px] min-w-[140px] sm:min-w-[180px] gap-2 border-dashed border-border hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4" />
                添加对比项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>添加对比项目</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 min-w-0 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索已同步仓库名称、Owner 或标签"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[240px] sm:max-h-[300px] space-y-2 overflow-y-auto">
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在加载已同步仓库
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      暂无可添加仓库，可在下方粘贴 GitHub 地址解析
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between gap-2 sm:gap-3 rounded-lg border border-border p-2.5 sm:p-3 transition-colors hover:bg-accent cursor-pointer"
                      >
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                            <AvatarImage src={project.ownerAvatar} alt={project.owner} />
                            <AvatarFallback className="bg-muted text-[10px] sm:text-xs">
                              {project.owner[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="truncate text-xs sm:text-sm font-medium text-foreground">
                                {project.owner}/{project.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-transparent px-1.5 text-[10px] shrink-0"
                                style={{
                                  backgroundColor: `${project.languageColor}20`,
                                  color: project.languageColor,
                                }}
                              >
                                {project.language}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5 shrink-0">
                                <Star className="h-3 w-3" />
                                {formatNumber(project.stars)}
                              </span>
                              <span className="line-clamp-1">{project.description}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 gap-1 h-7 text-xs"
                          disabled={disabled}
                          onClick={() => {
                            onAddProject(project);
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          添加
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      placeholder="或直接粘贴 GitHub 仓库 URL"
                      className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-8 sm:h-9"
                      disabled={disabled || isResolvingRepo || !repoUrl.trim()}
                      onClick={handleResolveRepo}
                    >
                      {isResolvingRepo ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      )}
                      解析
                    </Button>
                  </div>
                  {resolveError && (
                    <p className="mt-2 text-xs text-destructive">{resolveError}</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
