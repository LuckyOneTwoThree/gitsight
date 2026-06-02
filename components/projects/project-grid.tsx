"use client";

import { ProjectCard, type ProjectData } from "./project-card";
import { ProjectCardSkeleton } from "./project-card-skeleton";
import { cn } from "@/lib/utils";

interface ProjectGridProps {
  projects: ProjectData[];
  isLoading?: boolean;
  viewMode?: "grid" | "list";
  onAddToCompare?: (project: ProjectData) => void;
  onGenerateReport?: (project: ProjectData) => void;
  onToggleWatchlist?: (project: ProjectData) => void;
  watchedIds?: Set<string>;
}

export function ProjectGrid({
  projects,
  isLoading = false,
  viewMode = "grid",
  onAddToCompare,
  onGenerateReport,
  onToggleWatchlist,
  watchedIds,
}: ProjectGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1"
        )}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        viewMode === "grid"
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          : "grid-cols-1"
      )}
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onAddToCompare={onAddToCompare}
          onGenerateReport={onGenerateReport}
          onToggleWatchlist={onToggleWatchlist}
          isWatched={watchedIds?.has(project.id)}
        />
      ))}
    </div>
  );
}
