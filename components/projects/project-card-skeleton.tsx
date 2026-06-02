"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectCardSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Title */}
        <Skeleton className="mb-2 h-5 w-3/4" />

        {/* Description */}
        <div className="mb-4 space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Sparkline */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>

        {/* Tags */}
        <div className="mb-4 flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* License */}
        <Skeleton className="h-4 w-10" />
      </CardContent>
    </Card>
  );
}
