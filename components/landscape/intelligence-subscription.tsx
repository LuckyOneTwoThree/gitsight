"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Bell,
  Webhook,
  MessageCircle,
  Send,
  Check,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import type { Dictionary } from "@/lib/i18n";

interface SubscriptionRule {
  language: string;
  tag: string;
  starThreshold: string;
}

interface AlertRule {
  id: string;
  name: string;
  conditions: {
    languages: string[];
    tags: string[];
    starThreshold: number;
  };
  frequency: string;
  channels: {
    channelIds: string[];
  };
  isActive: boolean;
  pushCount: number;
}

interface PushChannel {
  id: string;
  name: string;
  type: string;
}

const getLanguages = (t: Dictionary["intelligenceSubscription"]) => [
  { value: "any", label: t.anyLanguage },
  { value: "rust", label: "Rust" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "cpp", label: "C++" },
];

const getTags = (t: Dictionary["intelligenceSubscription"]) => [
  { value: "any", label: t.anyDomain },
  { value: "web3", label: "Web3" },
  { value: "llm-agent", label: "LLM Agent" },
  { value: "rag", label: "RAG" },
  { value: "devops", label: "DevOps" },
];

const getStarThresholds = (t: Dictionary["intelligenceSubscription"]) => [
  { value: "100", label: t.weeklyStarGt100 },
  { value: "500", label: t.weeklyStarGt500 },
  { value: "1000", label: t.weeklyStarGt1000 },
  { value: "2000", label: t.weeklyStarGt2000 },
];

const getChannelTypeLabels = (t: Dictionary["intelligenceSubscription"]): Record<string, string> => ({
  feishu: t.feishu,
  wecom: t.wecom,
  dingtalk: t.dingtalk,
  pushplus: t.pushplus,
  qmsg: t.qmsg,
  bark: t.bark,
  discord: t.discord,
  telegram: t.telegram,
  wxpusher: t.wxpusher,
  serverchan: t.serverchan,
  webhook: t.webhook,
});

export function IntelligenceSubscription() {
  const { dict } = useApp()
  const t = dict.intelligenceSubscription
  const tc = dict.common
  const languages = getLanguages(t)
  const tags = getTags(t)
  const starThresholds = getStarThresholds(t)
  const CHANNEL_TYPE_LABELS = getChannelTypeLabels(t)

  const [isExpanded, setIsExpanded] = useState(false);
  const [rule, setRule] = useState<SubscriptionRule>({
    language: "rust",
    tag: "web3",
    starThreshold: "500",
  });
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [activeRules, setActiveRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing rules and channels
  const loadData = useCallback(async () => {
    try {
      const [rulesRes, channelsRes] = await Promise.all([
        fetch("/api/alerts/rules"),
        fetch("/api/alerts/channels"),
      ]);
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setActiveRules((data.rules || []).filter((r: AlertRule) => r.isActive));
      }
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSubscribe = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      const lang = rule.language === "any" ? [] : [rule.language];
      const tag = rule.tag === "any" ? [] : [rule.tag];
      const threshold = parseInt(rule.starThreshold, 10);

      const res = await fetch("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formatRuleText(),
          languages: lang,
          tags: tag,
          starThreshold: threshold,
          frequency: "weekly",
          channels: {
            channelIds: selectedChannelIds,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.error || t.createFailed);
      }

      toast.success(t.subscriptionCreated);
      await loadData();
      // Reset form
      setSelectedChannelIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.createFailed);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/alerts/rules?id=${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t.deleteFailed);
      toast.success(t.deleted);
      await loadData();
    } catch {
      toast.error(t.deleteFailed);
    }
  };

  const formatRuleText = () => {
    const lang = languages.find((l) => l.value === rule.language)?.label || rule.language;
    const tag = tags.find((tt) => tt.value === rule.tag)?.label || rule.tag;
    const threshold = starThresholds.find((s) => s.value === rule.starThreshold)?.label || rule.starThreshold;
    return t.ruleFormatText.replace("{lang}", lang).replace("{tag}", tag).replace("{threshold}", threshold);
  };

  const formatExistingRuleText = (r: AlertRule) => {
    const lang = r.conditions.languages.length > 0
      ? r.conditions.languages.map((l) => languages.find((ll) => ll.value === l)?.label || l).join("、")
      : t.anyLanguage;
    const tag = r.conditions.tags.length > 0
      ? r.conditions.tags.map((tt) => tags.find((ttag) => ttag.value === tt)?.label || tt).join("、")
      : t.anyDomain;
    const threshold = starThresholds.find((s) => s.value === String(r.conditions.starThreshold))?.label || `周增 Star > ${r.conditions.starThreshold}`;
    return t.ruleFormatText.replace("{lang}", lang).replace("{tag}", tag).replace("{threshold}", threshold);
  };

  const getChannelLabel = (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (ch) return ch.name || CHANNEL_TYPE_LABELS[ch.type] || ch.type;
    return channelId;
  };

  return (
    <>
      {/* Floating Button (Mobile/Tablet) */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsExpanded(true)}
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Sidebar (Desktop) / Sheet (Mobile) */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[340px] transform border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:w-full lg:transform-none lg:border lg:rounded-xl lg:shadow-none",
          isExpanded ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col lg:h-auto">
          {/* Header */}
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{t.title}</CardTitle>
                  <CardDescription className="text-[11px]">
                    {t.subtitle}
                  </CardDescription>
                </div>
              </div>
              <button
                className="lg:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(false)}
              >
                ✕
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-5 overflow-y-auto">
            {/* Pro Badge */}
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                {t.badge}
              </span>
            </div>

            {/* Condition Builder */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.subscriptionConditions}
              </h4>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t.programmingLanguage}</label>
                  <Select
                    value={rule.language}
                    onValueChange={(value) =>
                      setRule((prev) => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t.domainTag}</label>
                  <Select
                    value={rule.tag}
                    onValueChange={(value) =>
                      setRule((prev) => ({ ...prev, tag: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.value} value={tag.value}>
                          {tag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t.starVelocityThreshold}</label>
                  <Select
                    value={rule.starThreshold}
                    onValueChange={(value) =>
                      setRule((prev) => ({ ...prev, starThreshold: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {starThresholds.map((threshold) => (
                        <SelectItem key={threshold.value} value={threshold.value}>
                          {threshold.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rule Preview */}
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">{t.subscriptionRulePreview}</p>
                <p className="text-sm font-medium text-foreground">{formatRuleText()}</p>
              </div>
            </div>

            <Separator />

            {/* Notification Channels - from real configured channels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.pushChannels}
                </h4>
                {channels.length === 0 && (
                  <Link
                    href="/settings"
                    className="text-[10px] text-primary hover:underline"
                  >
                    {t.goConfigure}
                  </Link>
                )}
              </div>
              {channels.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
                  <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground/50" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t.noPushChannels}
                  </p>
                  <Link href="/settings" className="mt-1 inline-block text-[10px] text-primary hover:underline">
                    {t.goToSettingsConfigure}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map((channel) => {
                    const isSelected = selectedChannelIds.includes(channel.id);
                    const typeLabel = CHANNEL_TYPE_LABELS[channel.type] || channel.type;

                    return (
                      <div
                        key={channel.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-2.5 transition-all cursor-pointer",
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:border-primary/20"
                        )}
                        onClick={() => toggleChannel(channel.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{channel.name || typeLabel}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Active Subscriptions - from real data */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.currentSubscriptions}
              </h4>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : activeRules.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-3 text-center">
                  <p className="text-xs text-muted-foreground">{t.noActiveSubscriptions}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRules.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {r.name || formatExistingRuleText(r)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {r.channels.channelIds.length > 0 ? (
                            r.channels.channelIds.slice(0, 2).map((cid) => (
                              <span key={cid} className="text-[10px] text-muted-foreground">
                                {getChannelLabel(cid)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{t.noPushChannel}</span>
                          )}
                          {r.pushCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              · {t.pushCount.replace("{count}", String(r.pushCount))}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {tc.running}
                      </Badge>
                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {activeRules.length > 0 && (
                <Link
                  href="/alerts"
                  className="block text-center text-[10px] text-primary hover:underline"
                >
                  {t.manageAllRules}
                </Link>
              )}
            </div>
          </CardContent>

          {/* Footer Action */}
          <div className="border-t border-border p-4">
            <Button
              className="w-full gap-2"
              onClick={handleSubscribe}
              disabled={isSubscribing || selectedChannelIds.length === 0}
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.creating}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t.createSubscriptionRule}
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              {t.weeklyPushDigest}
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
