"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  ReferenceLine,
  Label,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { techRouteColors } from "@/lib/constants";
import {
  Star,
  TrendingUp,
  Users,
  GitFork,
  Filter,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

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

interface BubbleChartProps {
  projects: LandscapeProject[];
}

interface ChartDataPoint {
  x: number;
  y: number;
  z: number;
  project: LandscapeProject;
}

function CustomTooltip({
  active,
  payload,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  t: ReturnType<typeof useApp>["dict"]["landscape"];
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const project = data.project;

  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm p-4 shadow-xl min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            loading="lazy"
            src={project.ownerAvatar}
            alt={project.owner}
            className="h-5 w-5 rounded-full"
          />
          <span className="text-sm text-muted-foreground">{project.owner}</span>
        </div>
        {project.techRoute && (
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              borderColor: `${techRouteColors[project.techRoute]}40`,
              backgroundColor: `${techRouteColors[project.techRoute]}15`,
              color: techRouteColors[project.techRoute],
            }}
          >
            {project.techRoute}
          </Badge>
        )}
      </div>
      <h4 className="font-semibold text-foreground mb-1">{project.name}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {project.aiSummary}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Star className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {project.stars.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span className="font-medium text-foreground">
            +{project.starsWeek.toLocaleString()}{t.perWeek}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {project.communitySize.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitFork className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {project.forks.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BubbleChart({ projects }: BubbleChartProps) {
  const router = useRouter();
  const { dict } = useApp();
  const t = dict.landscape;
  const [selectedTechRoute, setSelectedTechRoute] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const techRoutes = useMemo(
    () => Array.from(new Set(projects.map((p) => p.techRoute).filter((route): route is string => Boolean(route)))),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (!selectedTechRoute) return projects;
    return projects.filter((p) => p.techRoute === selectedTechRoute);
  }, [projects, selectedTechRoute]);

  const chartData: ChartDataPoint[] = useMemo(
    () =>
      filteredProjects.map((project) => ({
        x: Math.log10(Math.max(project.stars, 1)),
        y: project.recentActivity,
        z: project.communitySize,
        project,
      })),
    [filteredProjects]
  );

  const handleBubbleClick = useCallback(
    (data: ChartDataPoint) => {
      if (data?.project) {
        router.push(`/repo/${data.project.owner}/${data.project.name}`);
      }
    },
    [router]
  );

  const maxLogStars = useMemo(
    () => Math.log10(Math.max(...projects.map((p) => p.stars), 10)) + 0.2,
    [projects]
  );

  const logTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let exp = 1; exp <= Math.floor(maxLogStars); exp++) {
      ticks.push(exp);
    }
    return ticks;
  }, [maxLogStars]);

  return (
    <Card className="border-border bg-card min-w-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{t.title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {t.bubbleChartDesc}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant={selectedTechRoute === null ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedTechRoute(null)}
              >
                {t.filterAll}
              </Button>
              {techRoutes.map((route) => (
                <Button
                  key={route}
                  variant={selectedTechRoute === route ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  style={
                    selectedTechRoute === route
                      ? {
                          backgroundColor: techRouteColors[route],
                          borderColor: techRouteColors[route],
                        }
                      : {
                          borderColor: `${techRouteColors[route]}40`,
                          color: techRouteColors[route],
                        }
                  }
                  onClick={() => setSelectedTechRoute(route)}
                >
                  {route}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[350px] md:h-[500px] w-full min-w-0" style={{ minWidth: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                type="number"
                dataKey="x"
                name="Stars"
                domain={[0, maxLogStars]}
                ticks={logTicks}
                tickFormatter={(value: number) => {
                  const stars = Math.pow(10, value)
                  if (stars >= 1000) return `${(stars / 1000).toFixed(0)}k`
                  return stars.toString()
                }}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              >
                <Label
                  value={t.bubbleChart}
                  position="insideBottom"
                  offset={-10}
                  style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                name="Activity"
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              >
                <Label
                  value={t.risingStars}
                  angle={-90}
                  position="insideLeft"
                  style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
              </YAxis>
              <ZAxis
                type="number"
                dataKey="z"
                range={[120, 800]}
                name="Community"
              />
              <Tooltip
                content={<CustomTooltip t={t} />}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                opacity={0.4}
                label={{
                  value: t.risingStars,
                  position: "insideTopRight",
                  fill: "hsl(var(--primary))",
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                x={Math.log10(50000)}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                opacity={0.4}
                label={{
                  value: t.avgStars,
                  position: "insideTopLeft",
                  fill: "hsl(var(--primary))",
                  fontSize: 10,
                }}
              />
              <Scatter
                data={chartData}
                onClick={(_, index) => handleBubbleClick(chartData[index])}
                onMouseEnter={(_, index) =>
                  setHoveredProject(chartData[index]?.project?.id || null)
                }
                onMouseLeave={() => setHoveredProject(null)}
                cursor="pointer"
              >
                {chartData.map((entry, index) => {
                  const project = entry.project;
                  const isHovered = hoveredProject === project.id;
                  const color = project.techRoute
                    ? techRouteColors[project.techRoute]
                    : "#6b7280";

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={color}
                      fillOpacity={isHovered ? 0.9 : 0.65}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 1}
                      strokeOpacity={isHovered ? 1 : 0.5}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 flex-wrap border-t border-border pt-4">
          {techRoutes.map((route) => (
            <div key={route} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: techRouteColors[route] }}
              />
              <span className="text-xs text-muted-foreground">{route}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" />
              <div className="h-3 w-3 rounded-full bg-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{t.communityScale}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
