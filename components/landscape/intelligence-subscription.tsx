"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Mail,
  Webhook,
  MessageCircle,
  Send,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionRule {
  language: string;
  tag: string;
  starThreshold: string;
}

interface NotificationChannel {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const notificationChannels: NotificationChannel[] = [
  {
    id: "email",
    label: "邮件推送",
    icon: Mail,
    description: "每日摘要发送至邮箱",
  },
  {
    id: "webhook",
    label: "Webhook",
    icon: Webhook,
    description: "推送至自定义接口",
  },
  {
    id: "feishu",
    label: "飞书机器人",
    icon: MessageCircle,
    description: "飞书群消息通知",
  },
];

const languages = [
  { value: "any", label: "任意语言" },
  { value: "rust", label: "Rust" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "cpp", label: "C++" },
];

const tags = [
  { value: "any", label: "任意领域" },
  { value: "web3", label: "Web3" },
  { value: "llm-agent", label: "LLM Agent" },
  { value: "rag", label: "RAG" },
  { value: "devops", label: "DevOps" },
];

const starThresholds = [
  { value: "100", label: "周增 Star > 100" },
  { value: "500", label: "周增 Star > 500" },
  { value: "1000", label: "周增 Star > 1000" },
  { value: "2000", label: "周增 Star > 2000" },
];

export function IntelligenceSubscription() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rule, setRule] = useState<SubscriptionRule>({
    language: "rust",
    tag: "web3",
    starThreshold: "500",
  });
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["email"]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  const formatRuleText = () => {
    const lang = languages.find((l) => l.value === rule.language)?.label || rule.language;
    const tag = tags.find((t) => t.value === rule.tag)?.label || rule.tag;
    const threshold = starThresholds.find((s) => s.value === rule.starThreshold)?.label || rule.starThreshold;
    return `用 ${lang} 写的 ${tag} 项目，且 ${threshold}`;
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
                  <CardTitle className="text-sm font-semibold">精准情报订阅</CardTitle>
                  <CardDescription className="text-[11px]">
                    自定义条件，自动推送赛道新锐
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
                情报订阅 · 自动推送赛道新锐
              </span>
            </div>

            {/* Condition Builder */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                订阅条件
              </h4>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">编程语言</label>
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
                  <label className="text-xs text-muted-foreground mb-1 block">领域标签</label>
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
                  <label className="text-xs text-muted-foreground mb-1 block">Star 增速阈值</label>
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
                <p className="text-xs text-muted-foreground mb-1">订阅规则预览</p>
                <p className="text-sm font-medium text-foreground">{formatRuleText()}</p>
              </div>
            </div>

            <Separator />

            {/* Notification Channels */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                推送渠道
              </h4>
              <div className="space-y-2">
                {notificationChannels.map((channel) => {
                  const isSelected = selectedChannels.includes(channel.id);
                  const Icon = channel.icon;

                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer",
                        isSelected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/20"
                      )}
                      onClick={() => toggleChannel(channel.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{channel.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {channel.description}
                        </p>
                        {channel.id === "webhook" && isSelected && (
                          <Input
                            placeholder="https://your-webhook-url.com"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            className="mt-2 h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Active Subscriptions */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                当前订阅
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      用 TypeScript 写的 LLM Agent 项目，且周增 Star &gt; 1000
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">邮件</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    运行中
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Footer Action */}
          <div className="border-t border-border p-4">
            <Button
              className="w-full gap-2"
              onClick={handleSubscribe}
              disabled={isSubscribed || selectedChannels.length === 0}
            >
              {isSubscribed ? (
                <>
                  <Check className="h-4 w-4" />
                  订阅成功
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  创建订阅规则
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              每周推送《赛道新锐速递》，可随时取消
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
