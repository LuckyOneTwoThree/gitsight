"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import {
  Star,
  GitFork,
  Users,
  Clock,
  Check,
  X,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import type { ComparisonProject } from "@/lib/analysis-sections";
import { featureDimensions } from "@/lib/constants";
import { useApp } from "@/components/app-provider";

interface ComparisonMatrixProps {
  projects: ComparisonProject[];
}

type DimensionTab = "basic" | "tech" | "features" | "business";

export function ComparisonMatrix({ projects }: ComparisonMatrixProps) {
  const { dict } = useApp();
  const t = dict.compare;
  const [activeTab, setActiveTab] = useState<DimensionTab>("basic");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true,
    integration: true,
    enterprise: true,
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 渲染功能状态单元格
  const renderFeatureCell = (value: boolean | string | undefined) => {
    if (value === true) {
      return (
        <div className="flex items-center justify-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
            <Check className="h-4 w-4 text-primary" />
          </div>
        </div>
      );
    }
    if (value === false) {
      return (
        <div className="flex items-center justify-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      );
    }
    if (!value) {
      return (
        <div className="flex items-center justify-center">
          <Minus className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="text-xs border-warning/30 bg-warning/10 text-warning">
          {value}
        </Badge>
      </div>
    );
  };

  // 表头：项目信息
  const renderProjectHeader = () => (
    <TableHeader className="sticky top-0 z-10 bg-card">
      <TableRow className="border-border hover:bg-transparent">
        <TableHead className="w-[160px] bg-muted/30 font-medium">
          {t.selectAtLeast2}
        </TableHead>
        {projects.map((project) => (
          <TableHead key={project.id} className="min-w-[140px] bg-muted/30">
            <div className="flex flex-col items-center gap-2 py-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={project.ownerAvatar} alt={project.owner} />
                <AvatarFallback className="bg-muted">
                  {project.owner[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="font-semibold text-foreground">{project.name}</div>
                <div className="text-xs text-muted-foreground">{project.owner}</div>
              </div>
              <a
                href={`https://github.com/${project.owner}/${project.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                GitHub
              </a>
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );

  // 基础数据对比
  const renderBasicData = () => (
    <TableBody>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            Star
          </div>
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="font-semibold text-foreground">{formatNumber(p.stars)}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 text-muted-foreground" />
            Fork
          </div>
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-foreground">{formatNumber(p.forks)}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {dict.landscape.contributors}
          </div>
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-foreground">{p.contributors}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {dict.repoHeader.lastUpdated}
          </div>
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-muted-foreground">{p.lastUpdate}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          PR {dict.common.min}/{dict.common.max}
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-foreground">{p.prMergeRate}%</span>
              <Progress value={p.prMergeRate} className="h-1.5 w-16" />
            </div>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Issue
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <Badge variant="outline" className="text-xs">
              {p.issueResponseTime}
            </Badge>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Release
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-muted-foreground">{p.releaseFrequency}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Created
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-muted-foreground">{p.createdAt}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          License
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <Badge variant="secondary" className="text-xs">
              {p.license}
            </Badge>
          </TableCell>
        ))}
      </TableRow>
    </TableBody>
  );

  // 技术方案对比
  const renderTechData = () => (
    <TableBody>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          {dict.repoHeader.language}
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <Badge
              variant="outline"
              className="border-transparent"
              style={{
                backgroundColor: `${p.languageColor}20`,
                color: p.languageColor,
              }}
            >
              {p.language}
            </Badge>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Tech Stack
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id}>
            <div className="flex flex-wrap justify-center gap-1">
              {p.techStack.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-[10px]">
                  {tech}
                </Badge>
              ))}
            </div>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Frameworks
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id}>
            <div className="flex flex-wrap justify-center gap-1">
              {p.frameworks.map((fw) => (
                <Badge key={fw} variant="outline" className="text-[10px]">
                  {fw}
                </Badge>
              ))}
            </div>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Deploy
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id}>
            <div className="flex flex-wrap justify-center gap-1">
              {p.deployment.map((dep) => (
                <Badge key={dep} variant="secondary" className="text-[10px]">
                  {dep}
                </Badge>
              ))}
            </div>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Database
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id}>
            <div className="flex flex-wrap justify-center gap-1">
              {p.database?.map((db) => (
                <Badge key={db} variant="outline" className="text-[10px]">
                  {db}
                </Badge>
              )) || <span className="text-muted-foreground">-</span>}
            </div>
          </TableCell>
        ))}
      </TableRow>
    </TableBody>
  );

  // 功能模块对比
  const renderFeaturesData = () => (
    <TableBody>
      {Object.entries(featureDimensions).map(([sectionKey, section]) => (
        <React.Fragment key={sectionKey}>
          {/* Section Header */}
          <TableRow
            className="border-border cursor-pointer hover:bg-accent/50"
            onClick={() => toggleSection(sectionKey)}
          >
            <TableCell
              colSpan={projects.length + 1}
              className="bg-muted/30 py-2"
            >
              <div className="flex items-center gap-2">
                {expandedSections[sectionKey] ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">{section.label}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {section.items.length}
                </Badge>
              </div>
            </TableCell>
          </TableRow>
          {/* Section Items */}
          {expandedSections[sectionKey] &&
            section.items.map((item) => {
              // 检查是否为功能空白（所有项目都没有该功能）
              const isFeatureGap = projects.every(
                (p) => p.features[item.key] === false
              );
              return (
                <TableRow
                  key={item.key}
                  className={cn(
                    "border-border",
                    isFeatureGap && "bg-warning/5"
                  )}
                >
                  <TableCell className="bg-muted/10 font-medium">
                    <div className="flex items-center gap-2">
                      {item.label}
                      {isFeatureGap && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3.5 w-3.5 text-warning" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{t.featureGaps}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  {projects.map((p) => (
                    <TableCell key={p.id}>
                      {renderFeatureCell(p.features[item.key])}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </React.Fragment>
      ))}
    </TableBody>
  );

  // 商业模式对比
  const renderBusinessData = () => (
    <TableBody>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Business
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <Badge variant="outline" className="text-xs">
              {p.businessModel}
            </Badge>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Pricing
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-sm text-foreground">{p.pricing}</span>
          </TableCell>
        ))}
      </TableRow>
      <TableRow className="border-border">
        <TableCell className="bg-muted/10 font-medium">
          Target
        </TableCell>
        {projects.map((p) => (
          <TableCell key={p.id} className="text-center">
            <span className="text-sm text-muted-foreground">{p.targetAudience}</span>
          </TableCell>
        ))}
      </TableRow>
    </TableBody>
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Tabs */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t.aiInsights}</h2>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DimensionTab)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="basic" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold">Basic</TabsTrigger>
              <TabsTrigger value="tech" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold">Tech</TabsTrigger>
              <TabsTrigger value="features" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold">Features</TabsTrigger>
              <TabsTrigger value="business" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold">Business</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[600px] overflow-auto overflow-x-auto">
        <Table className="min-w-full">
          {renderProjectHeader()}
          {activeTab === "basic" && renderBasicData()}
          {activeTab === "tech" && renderTechData()}
          {activeTab === "features" && renderFeaturesData()}
          {activeTab === "business" && renderBusinessData()}
        </Table>
      </div>
    </div>
  );
}
