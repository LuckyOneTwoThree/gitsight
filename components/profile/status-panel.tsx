"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Zap,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Shield,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";

interface StatusPanelProps {
  totalReports: number;
  totalComparisons: number;
  totalAlerts: number;
}

export function StatusPanel({ totalReports, totalComparisons, totalAlerts }: StatusPanelProps) {
  const { dict } = useApp();
  const t = dict.statusPanel;
  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left: User Info */}
          <div className="flex-1 p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    R
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {t.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium bg-primary/20 text-primary"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {dict.common.active}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {dict.common.notConfigured}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  {dict.sidebar.settings}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: dict.repo.generateDeep, value: dict.common.yes },
                { label: dict.alerts.title, value: dict.common.yes },
                { label: dict.compare.title, value: dict.common.yes },
                { label: "Private Repo", value: dict.common.yes },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-lg bg-background/60 px-3 py-2.5"
                >
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {feature.label}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {feature.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dict.common.notConfigured}</span>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="lg:w-[360px] border-t lg:border-t-0 lg:border-l border-border p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">
              {t.title}
            </h3>
            <div className="space-y-5">
              {[
                { label: dict.profile.analysisReports, value: totalReports, max: Math.max(totalReports, 10) },
                { label: dict.compare.title, value: totalComparisons, max: Math.max(totalComparisons, 10) },
                { label: dict.alerts.title, value: totalAlerts, max: Math.max(totalAlerts, 5) },
              ].map((stat) => {
                const percentage = Math.round((stat.value / stat.max) * 100);
                return (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {stat.value}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t.title}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {dict.common.active}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
