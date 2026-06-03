"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { ComparisonProject } from "@/lib/analysis-sections";
import { useApp } from "@/components/app-provider";

const COLORS = [
  "hsl(var(--primary))",
  "oklch(0.65 0.2 145)",
  "oklch(0.65 0.2 250)",
  "oklch(0.7 0.18 30)",
  "oklch(0.65 0.2 310)",
  "oklch(0.7 0.15 80)",
];

interface CompareRadarProps {
  projects: ComparisonProject[];
}

function normalize(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((value / max) * 100);
}

export function CompareRadarChart({ projects }: CompareRadarProps) {
  if (projects.length < 2) return null;

  const { dict } = useApp();
  const t = dict.compare;

  const maxStars = Math.max(...projects.map((p) => p.stars), 1);
  const maxForks = Math.max(...projects.map((p) => p.forks), 1);
  const maxContributors = Math.max(...projects.map((p) => p.contributors), 1);
  const maxPrMerge = 100;

  const data = [
    { dimension: "Star", ...Object.fromEntries(projects.map((p, i) => [`p${i}`, normalize(p.stars, maxStars)])) },
    { dimension: "Fork", ...Object.fromEntries(projects.map((p, i) => [`p${i}`, normalize(p.forks, maxForks)])) },
    { dimension: t.radarContributors, ...Object.fromEntries(projects.map((p, i) => [`p${i}`, normalize(p.contributors, maxContributors)])) },
    { dimension: t.radarPrMergeRate, ...Object.fromEntries(projects.map((p, i) => [`p${i}`, normalize(p.prMergeRate, maxPrMerge)])) },
    { dimension: t.radarActivity, ...Object.fromEntries(projects.map((p, i) => [`p${i}`, p.starsWeek > 0 ? Math.min(Math.round((p.starsWeek / maxStars) * 500), 100) : 10])) },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{t.radarTitle}</h3>
      <div style={{ width: "100%", height: 320, minWidth: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          {projects.map((p, i) => (
            <Radar
              key={p.id}
              name={p.name}
              dataKey={`p${i}`}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
          />
        </RadarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
