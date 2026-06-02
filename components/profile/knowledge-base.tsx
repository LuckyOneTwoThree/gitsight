"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  reportTypeLabels,
  reportTypeColors,
} from "@/lib/constants";

interface SavedReport {
  id: string
  repoName: string
  repoOwner: string
  type: string
  title: string
  ownerAvatar: string
  savedAt: string
  starCount: number
}

interface ComparisonProject {
  name: string
  ownerAvatar: string
}

interface ComparisonHistory {
  id: string
  title: string
  projects: ComparisonProject[]
  projectCount: number
  createdAt: string
}
import {
  FileText,
  GitCompare,
  Bookmark,
  ExternalLink,
  Trash2,
  Clock,
  Star,
  MoreHorizontal,
} from "lucide-react";

interface KnowledgeBaseProps {
  reports: SavedReport[];
  comparisons: ComparisonHistory[];
}

function ReportCard({
  report,
  onRemove,
}: {
  report: SavedReport;
  onRemove: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Type Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant="outline"
            className="text-[10px] font-medium"
            style={{
              borderColor: `${reportTypeColors[report.type]}30`,
              backgroundColor: `${reportTypeColors[report.type]}10`,
              color: reportTypeColors[report.type],
            }}
          >
            {reportTypeLabels[report.type]}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={() => onRemove(report.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2 leading-relaxed">
          {report.title}
        </h4>

        {/* Repo Info */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={report.ownerAvatar}
            alt={report.repoOwner}
            className="h-4 w-4 rounded-full"
          />
          <span className="text-xs text-muted-foreground">
            {report.repoOwner}/{report.repoName}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{report.savedAt}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>{(report.starCount / 1000).toFixed(1)}k</span>
          </div>
        </div>

        {/* Hover Action */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 pt-6 bg-gradient-to-t from-card via-card/95 to-transparent transition-all duration-200",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          <Link href={`/repo/${report.repoOwner}/${report.repoName}`}>
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              查看报告
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonCard({
  comparison,
  onRemove,
}: {
  comparison: ComparisonHistory;
  onRemove: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant="outline"
            className="text-[10px] border-primary/20 text-primary"
          >
            <GitCompare className="h-3 w-3 mr-1" />
            {comparison.projectCount} 个项目
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={() => onRemove(comparison.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-foreground mb-3">
          {comparison.title}
        </h4>

        {/* Project Avatars */}
        <div className="flex items-center mb-3">
          <div className="flex -space-x-2">
            {comparison.projects.map((project, index) => (
              <div
                key={project.name}
                className="relative h-7 w-7 rounded-full border-2 border-card overflow-hidden"
                style={{ zIndex: comparison.projects.length - index }}
              >
                <img
                  src={project.ownerAvatar}
                  alt={project.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <span className="ml-2 text-xs text-muted-foreground">
            {comparison.projects.map((p) => p.name).join("、")}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{comparison.createdAt}</span>
          </div>
        </div>

        {/* Hover Action */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 pt-6 bg-gradient-to-t from-card via-card/95 to-transparent transition-all duration-200",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          <Link href="/compare">
            <Button size="sm" className="gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              查看对比
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function KnowledgeBase({ reports, comparisons }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState("reports");
  const [savedReports, setSavedReports] = useState(reports);
  const [savedComparisons, setSavedComparisons] = useState(comparisons);

  const handleRemoveReport = (id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRemoveComparison = (id: string) => {
    setSavedComparisons((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Bookmark className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">知识库管理</CardTitle>
              <p className="text-xs text-muted-foreground">
                已收藏的报告与历史对比矩阵
              </p>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="reports" className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5" />
                收藏报告
                <Badge variant="secondary" className="text-[9px] ml-1">
                  {savedReports.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="comparisons" className="gap-2 text-xs">
                <GitCompare className="h-3.5 w-3.5" />
                对比历史
                <Badge variant="secondary" className="text-[9px] ml-1">
                  {savedComparisons.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="reports" className="mt-0">
            {savedReports.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onRemove={handleRemoveReport}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">暂无收藏的报告</p>
                <p className="text-xs mt-1">
                  在项目详情页点击收藏按钮即可添加
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparisons" className="mt-0">
            {savedComparisons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedComparisons.map((comparison) => (
                  <ComparisonCard
                    key={comparison.id}
                    comparison={comparison}
                    onRemove={handleRemoveComparison}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GitCompare className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">暂无对比历史</p>
                <p className="text-xs mt-1">
                  在对比工作台生成矩阵后即可保存
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
