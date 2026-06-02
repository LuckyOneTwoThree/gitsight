"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Mail,
  Webhook,
  MessageCircle,
  Smartphone,
  Check,
  X,
  Settings,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  config: Record<string, string>;
  updated_at: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  Mail,
  Webhook,
  MessageCircle,
  Smartphone,
};

export function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadIntegrations() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/integrations");
        if (!response.ok) throw new Error("无法加载推送渠道");
        const payload = (await response.json()) as { integrations: Integration[] };
        if (cancelled) return;
        setIntegrations(payload.integrations);
      } catch (err) {
        if (cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleIntegration = async (integration: Integration) => {
    setIsSaving(integration.id);
    setError(null);

    try {
      const response = await fetch("/api/auth/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: integration.id,
          enabled: !integration.enabled,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "更新失败");
      }

      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === integration.id
            ? { ...item, enabled: !item.enabled, updated_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setIsSaving(null);
    }
  };

  const handleConfigure = (integration: Integration) => {
    if (integration.id === "webhook") {
      setEditingId(integration.id);
      setWebhookUrl(integration.config?.url || "");
    }
  };

  const saveWebhookConfig = async () => {
    setIsSaving("webhook");
    setError(null);

    try {
      const response = await fetch("/api/auth/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: "webhook",
          enabled: true,
          config: { url: webhookUrl },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "保存失败");
      }

      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === "webhook"
            ? { ...item, enabled: true, config: { url: webhookUrl }, updated_at: new Date().toISOString() }
            : item
        )
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              推送渠道集成
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              配置你的情报推送渠道，支持邮件、Webhook、飞书、微信
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {integrations.filter((i) => i.enabled).length} /{" "}
            {integrations.length || 4} 已连接
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="space-y-3">
              {integrations.map((integration) => {
                const Icon = iconMap[integration.icon] || Mail;
                const isEditing = editingId === integration.id;
                const isSavingThis = isSaving === integration.id;

                return (
                  <div
                    key={integration.id}
                    className={cn(
                      "group rounded-lg border p-4 transition-all duration-200",
                      integration.enabled
                        ? "border-border bg-card"
                        : "border-border/50 bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            integration.enabled ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              integration.enabled ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground">
                              {integration.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1",
                                integration.enabled
                                  ? "border-primary/20 text-primary"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {integration.enabled ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                              {integration.enabled ? "已连接" : "未连接"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {integration.description}
                          </p>
                          {integration.enabled && integration.updated_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              更新于 {new Date(integration.updated_at).toLocaleDateString()}
                            </p>
                          )}

                          {isEditing && (
                            <div className="mt-3 flex items-center gap-2">
                              <Input
                                placeholder="https://your-webhook-url.com"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                className="h-8 text-xs flex-1"
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => void saveWebhookConfig()}
                                disabled={isSavingThis}
                              >
                                {isSavingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setEditingId(null)}
                              >
                                取消
                              </Button>
                            </div>
                          )}
                          {integration.enabled && integration.config?.url && !isEditing && (
                            <div className="mt-2 flex items-center gap-2">
                              <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[300px]">
                                {integration.config.url}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {integration.enabled && integration.id === "webhook" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleConfigure(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Switch
                          checked={integration.enabled}
                          onCheckedChange={() => void toggleIntegration(integration)}
                          disabled={isSavingThis}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
