"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  ArrowRight,
  FileText,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

interface AIInsightsProps {
  markdownReport?: string | null;
  isLoading?: boolean;
  onGenerateReport?: () => void;
}

export function AIInsights({ markdownReport, isLoading, onGenerateReport }: AIInsightsProps) {
  const { dict } = useApp();
  const t = dict.compare;
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-info/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t.aiInsights}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.deepAnalysisHint}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          <Sparkles className="mr-1 h-3 w-3" />
          AI
        </Badge>
      </div>

      {/* Report Content */}
      {markdownReport ? (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t.aiInsights}</CardTitle>
                <CardDescription className="text-xs">{t.deepAnalysis}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={markdownReport} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium text-foreground">
                {isLoading ? t.generatingReport : t.noReportYet}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                {isLoading
                  ? t.generating
                  : t.noReportHint}
              </p>
              {!isLoading && onGenerateReport && (
                <Button className="mt-4 gap-2" onClick={onGenerateReport}>
                  <Zap className="h-4 w-4" />
                  {t.generateReport}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <div className="flex items-center justify-center gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {t.deepAnalysis}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.deepAnalysisHint}
          </p>
        </div>
        <Button className="ml-auto gap-2" onClick={onGenerateReport} disabled={isLoading}>
          {t.generateReport}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
