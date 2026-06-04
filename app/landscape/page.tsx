"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { TrackSummaryCard } from "@/components/landscape/track-summary";
import { BubbleChart } from "@/components/landscape/bubble-chart";
import { ProjectRanking } from "@/components/landscape/project-ranking";
import { IntelligenceSubscription } from "@/components/landscape/intelligence-subscription";
import {
  Map,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface LandscapeProject {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  starsWeek: number;
  recentActivity: number;
  communitySize: number;
  topics: string[];
  techRoute: string | null;
  aiSummary: string;
}

interface TechRouteInfo {
  name: string;
  description: string;
  representative: string;
  keywords: string[];
}

interface TrackSummaryData {
  name: string;
  description: string;
  techRoutes: TechRouteInfo[];
  stats: {
    totalProjects: number;
    totalContributors: number;
    weekGrowth: string;
    avgStars: number;
  };
  risingStars: { name: string; reason: string }[];
}

interface TrackOption {
  value: string;
  label: string;
  projectCount: number;
}

const defaultTracks: TrackOption[] = [
  { value: "ai-ml", label: "AI / ML", projectCount: 0 },
  { value: "ai-agent", label: "AI Agent", projectCount: 0 },
];

export default function LandscapePage() {
  return (
    <Suspense>
      <LandscapeContent />
    </Suspense>
  )
}

function LandscapeContent() {
  const searchParams = useSearchParams();
  const { dict } = useApp();
  const t = dict.landscape;
  const [selectedTrack, setSelectedTrack] = useState(() => searchParams.get("track") || "ai-agent");
  const [projects, setProjects] = useState<LandscapeProject[]>([]);
  const [summary, setSummary] = useState<TrackSummaryData | null>(null);
  const [tracks, setTracks] = useState<TrackOption[]>([
    { value: "ai-ml", label: "AI / ML", projectCount: 0 },
    { value: "ai-agent", label: "AI Agent", projectCount: 0 },
    { value: "rag", label: t.trackRag, projectCount: 0 },
    { value: "frontend", label: t.trackFrontend, projectCount: 0 },
    { value: "devops", label: t.trackDevops, projectCount: 0 },
    { value: "database", label: t.trackDatabase, projectCount: 0 },
    { value: "dev-tools", label: t.trackDevTools, projectCount: 0 },
    { value: "web3", label: t.trackWeb3, projectCount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date>(new Date());

  const loadData = useCallback(async (track: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/landscape?track=${track}`);
      if (!response.ok) throw new Error(dict.common.loadingFailed);
      const payload = await response.json();
      setProjects(payload.projects || []);
      setSummary(payload.summary || null);
      if (payload.availableTracks) {
        setTracks(payload.availableTracks);
      }
      setLoadedAt(new Date());
    } catch {
      setProjects([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedTrack);
  }, [selectedTrack, loadData]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-auto min-h-16 items-center justify-between gap-2 px-4 md:px-6 py-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 shrink-0">
              <div className="shrink-0">
                <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  <span className="hidden sm:inline">{t.title}</span>
                  <span className="sm:hidden">{t.trackShort}</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {t.subtitle}
                </p>
              </div>

              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="w-[140px] md:w-[200px] border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map((track) => (
                    <SelectItem key={track.value} value={track.value}>
                      {track.label}
                      {track.projectCount > 0 && ` (${track.projectCount})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border bg-input"
                onClick={() => void loadData(selectedTrack)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{t.refreshData}</span>
              </Button>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span>{t.liveData}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col xl:flex-row gap-4 md:gap-6 p-4 md:p-6">
          <div className="flex-1 space-y-6 min-w-0">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {summary && (
                  <section>
                    <TrackSummaryCard summary={summary} />
                  </section>
                )}

                {projects.length > 0 ? (
                  <section>
                    <BubbleChart projects={projects} />
                  </section>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Map className="h-12 w-12 mb-4 opacity-40" />
                    <p className="text-sm font-medium">{t.noProjects}</p>
                    <p className="text-xs mt-1">
                      {t.noProjectsHint}
                    </p>
                  </div>
                )}

                {projects.length > 0 && (
                  <section>
                    <ProjectRanking projects={projects} />
                  </section>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground py-2 gap-1">
                  <span>{projects.length} {t.totalProjectsAnalyzed}</span>
                  <span>
                    {t.dataUpdatedPrefix} {Math.max(1, Math.floor((Date.now() - loadedAt.getTime()) / 60000))} {dict.landscape.updatedMinutesAgo}
                  </span>
                </div>
              </>
            )}
          </div>

          <aside className="w-full xl:w-[300px] 2xl:w-[340px] shrink-0">
            <div className="xl:sticky xl:top-20">
              <IntelligenceSubscription />
            </div>
          </aside>
        </main>
    </>
  );
}
