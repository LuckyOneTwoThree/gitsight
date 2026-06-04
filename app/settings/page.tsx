"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/components/app-provider";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  Key,
  Github,
  Brain,
  Languages,
  Sun,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Bell,
  Database,
  Download,
  Trash2,
  Plus,
  ChevronDown,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PushChannels } from "@/components/settings/push-channels";

const llmProviders = [
  // International
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini", defaultBaseUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-sonnet-4-20250514", defaultBaseUrl: "https://api.anthropic.com/v1" },
  { value: "google", label: "Google (Gemini)", defaultModel: "gemini-2.5-flash", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { value: "openrouter", label: "OpenRouter (免费额度)", defaultModel: "google/gemini-2.5-flash-preview", defaultBaseUrl: "https://openrouter.ai/api/v1" },
  // China Mainland
  { value: "deepseek", label: "DeepSeek (深度求索)", defaultModel: "deepseek-chat", defaultBaseUrl: "https://api.deepseek.com/v1" },
  { value: "qwen", label: "通义千问 (阿里)", defaultModel: "qwen-plus", defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { value: "zhipu", label: "智谱 (GLM)", defaultModel: "glm-4-flash", defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { value: "kimi", label: "Kimi (月之暗面)", defaultModel: "moonshot-v1-32k", defaultBaseUrl: "https://api.moonshot.ai/v1" },
  { value: "mimo", label: "MiMo (小米)", defaultModel: "mimo-v2.5-pro", defaultBaseUrl: "https://api.mimo.ai/v1" },
  { value: "volcengine", label: "豆包 (火山引擎)", defaultModel: "doubao-1.5-pro-32k", defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  { value: "baichuan", label: "百川 (Baichuan)", defaultModel: "Baichuan4", defaultBaseUrl: "https://api.baichuan-ai.com/v1" },
  { value: "yi", label: "零一万物 (Yi)", defaultModel: "yi-lightning", defaultBaseUrl: "https://api.lingyiwanwu.com/v1" },
  { value: "stepfun", label: "阶跃星辰 (StepFun)", defaultModel: "step-2-16k", defaultBaseUrl: "https://api.stepfun.com/v1" },
  { value: "minimax", label: "MiniMax", defaultModel: "MiniMax-Text-01", defaultBaseUrl: "https://api.minimax.chat/v1" },
  { value: "siliconflow", label: "SiliconFlow (硅基流动)", defaultModel: "Qwen/Qwen3-8B", defaultBaseUrl: "https://api.siliconflow.cn/v1" },
  // Custom
  { value: "custom", label: "自定义 (Custom)", defaultModel: "", defaultBaseUrl: "" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("llm");
  const { dict } = useApp();
  const t = dict.settings;

  const tabs = [
    { id: "llm", label: t.llmConfig, icon: Brain },
    { id: "github", label: t.githubToken, icon: Github },
    { id: "channels", label: t.pushChannels, icon: Bell },
    { id: "preferences", label: t.preferences, icon: Settings },
    { id: "backup", label: t.dataBackup, icon: Database },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Settings className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="md:w-[220px] shrink-0 md:border-r border-b md:border-b-0 border-border p-4 overflow-x-auto">
            <nav className="flex md:flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
            {activeTab === "llm" && <LLMSettings />}
            {activeTab === "github" && <GitHubTokenSettings />}
            {activeTab === "channels" && <PushChannels />}
            {activeTab === "preferences" && <PreferencesSettings />}
            {activeTab === "backup" && <BackupSettings />}
          </div>
        </main>
    </>
  );
}

function LLMSettings() {
  const { config, refreshConfig, dict } = useApp();
  const t = dict.settings;

  const [providers, setProviders] = useState<Array<{
    id: string; provider: string; base_url: string; model: string; hasApiKey: boolean;
  }>>([]);
  const [activeId, setActiveId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProviderType, setNewProviderType] = useState("openai");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  // Edit inline state
  const [editFields, setEditFields] = useState<Record<string, { base_url: string; model: string; apiKey: string }>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config?.llm_providers) {
      setProviders(config.llm_providers);
      setActiveId(config.llm_active_provider_id);
    }
  }, [config]);

  // When dialog selects a provider type, auto-fill defaults
  useEffect(() => {
    const defaults = llmProviders.find((p) => p.value === newProviderType);
    setNewBaseUrl(defaults?.defaultBaseUrl || "");
    setNewModel(defaults?.defaultModel || "");
  }, [newProviderType]);

  const getProviderLabel = (type: string) =>
    llmProviders.find((p) => p.value === type)?.label || type;

  const configuredProviders = providers.filter((p) => p.hasApiKey);

  // ── Switch active provider (immediate save) ──
  const handleSwitchActive = useCallback(async (id: string) => {
    setActiveId(id);
    setIsSaving(true);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_providers: providers.map(({ id, provider, base_url, model }) => ({ id, provider, base_url, model })),
          llm_active_provider_id: id,
        }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setMessage(t.llmSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [providers, refreshConfig, t]);

  // ── Add provider from dialog ──
  const handleConfirmAdd = useCallback(async () => {
    const newId = `${newProviderType}-${Date.now()}`;
    const updatedProviders = [
      ...providers,
      { id: newId, provider: newProviderType, base_url: newBaseUrl, model: newModel, hasApiKey: false },
    ];
    const keyUpdates: Record<string, string> = {};
    if (newApiKey) keyUpdates[newId] = newApiKey;

    setIsSaving(true);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_providers: updatedProviders.map(({ id, provider, base_url, model }) => ({ id, provider, base_url, model })),
          llm_active_provider_id: providers.length === 0 ? newId : activeId,
          llm_api_keys: Object.keys(keyUpdates).length > 0 ? keyUpdates : undefined,
        }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setShowAddDialog(false);
      setNewApiKey("");
      setMessage(t.llmSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [providers, activeId, newProviderType, newBaseUrl, newModel, newApiKey, refreshConfig, t]);

  // ── Remove provider ──
  const handleRemove = useCallback(async (id: string) => {
    if (!confirm(t.removeConfirm)) return;
    const remaining = providers.filter((p) => p.id !== id);
    const newActiveId = activeId === id ? (remaining[0]?.id || "") : activeId;

    setIsSaving(true);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_providers: remaining.map(({ id, provider, base_url, model }) => ({ id, provider, base_url, model })),
          llm_active_provider_id: newActiveId,
        }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setMessage(t.llmSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [providers, activeId, refreshConfig, t]);

  // ── Save edits for a single provider ──
  const handleSaveProvider = useCallback(async (id: string) => {
    const fields = editFields[id];
    if (!fields) return;

    const updatedProviders = providers.map((p) =>
      p.id === id ? { ...p, base_url: fields.base_url, model: fields.model } : p
    );
    const keyUpdates: Record<string, string> = {};
    if (fields.apiKey) keyUpdates[id] = fields.apiKey;

    setIsSaving(true);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_providers: updatedProviders.map(({ id, provider, base_url, model }) => ({ id, provider, base_url, model })),
          llm_active_provider_id: activeId,
          llm_api_keys: Object.keys(keyUpdates).length > 0 ? keyUpdates : undefined,
        }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setEditFields((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setMessage(t.llmSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [providers, activeId, editFields, refreshConfig, t]);

  const activeProvider = providers.find((p) => p.id === activeId);

  return (
    <div className="space-y-6">
      {/* ── Active Provider Selector ─────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {t.currentLlm}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t.currentLlmDesc}</p>
        </CardHeader>
        <CardContent className="pt-0">
          {configuredProviders.length > 0 ? (
            <div className="flex items-center gap-3">
              <Select value={activeId} onValueChange={handleSwitchActive}>
                <SelectTrigger className="w-[360px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {configuredProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {getProviderLabel(p.provider)} — {p.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeProvider && (
                <span className="text-xs text-muted-foreground">
                  {activeProvider.base_url}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noConfiguredLlm}</p>
          )}
          {message && (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> {message}
            </span>
          )}
          {error && (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Provider List ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t.configuredProviders} ({providers.length})
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-3 w-3" />
          {t.addProvider}
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">{t.noProvidersYet}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {providers.map((p) => {
            const isActive = p.id === activeId;
            const isEditing = !!editFields[p.id];
            const fields = isEditing
              ? editFields[p.id]
              : { base_url: p.base_url, model: p.model, apiKey: "" };

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-2.5 transition-colors",
                  isActive ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card",
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium truncate">{getProviderLabel(p.provider)}</span>
                    {isActive && <Badge variant="default" className="text-[10px] px-1 py-0 shrink-0">{t.activeBadge}</Badge>}
                    {p.hasApiKey ? (
                      <Badge variant="outline" className="text-[10px] text-success border-success/30 shrink-0">{dict.common.configured}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">{dict.common.notConfigured}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isActive && p.hasApiKey && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-5 px-1.5 text-[10px] text-primary hover:text-primary"
                        onClick={() => handleSwitchActive(p.id)}
                      >
                        {t.switchToThis}
                      </Button>
                    )}
                    {!isEditing && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-5 px-1.5 text-[10px]"
                        onClick={() => setEditFields((prev) => ({
                          ...prev,
                          [p.id]: { base_url: p.base_url, model: p.model, apiKey: "" },
                        }))}
                      >
                        {dict.common.edit}
                      </Button>
                    )}
                    {providers.length > 0 && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Compact info row */}
                {!isEditing && (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{p.model}</span>
                    <span className="shrink-0">·</span>
                    <span className="truncate font-mono">{p.base_url}</span>
                  </div>
                )}

                {/* Edit form (collapsible) */}
                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Base URL</Label>
                        <Input
                          value={fields.base_url}
                          onChange={(e) => setEditFields((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], base_url: e.target.value },
                          }))}
                          className="h-7 font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t.modelName}</Label>
                        <Input
                          value={fields.model}
                          onChange={(e) => setEditFields((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], model: e.target.value },
                          }))}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t.apiKey}</Label>
                      <div className="relative">
                        <Input
                          type={showApiKeys[p.id] ? "text" : "password"}
                          value={fields.apiKey}
                          onChange={(e) => setEditFields((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], apiKey: e.target.value },
                          }))}
                          placeholder={p.hasApiKey ? t.apiKeyReplacePlaceholder : t.apiKeyPlaceholder}
                          className="h-7 text-xs pr-7"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowApiKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        >
                          {showApiKeys[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditFields((prev) => { const n = { ...prev }; delete n[p.id]; return n; })}
                      >
                        {t.cancelAdd}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => handleSaveProvider(p.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {t.saveChanges}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Provider Dialog ───────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              {t.addLlmProvider}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: Select provider type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.selectProvider}</Label>
              <Select value={newProviderType} onValueChange={setNewProviderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {llmProviders.map((lp) => (
                    <SelectItem key={lp.value} value={lp.value}>{lp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Config fields */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-xs font-medium text-muted-foreground">{t.providerConfig}</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Base URL</Label>
                  <Input
                    value={newBaseUrl}
                    onChange={(e) => setNewBaseUrl(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t.modelName}</Label>
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder={t.modelNamePlaceholder}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t.apiKey}</Label>
                  <Input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder={t.apiKeyPlaceholder}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>{t.cancelAdd}</Button>
            <Button onClick={handleConfirmAdd} disabled={isSaving || !newApiKey.trim()}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              {t.confirmAdd}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GitHubTokenSettings() {
  const { config, refreshConfig, dict } = useApp();
  const t = dict.settings;
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasExistingToken = config?.github_token === "****";

  const handleSave = useCallback(async () => {
    if (!token.trim()) {
      setError(t.githubTokenRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_token: token }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setToken("");
      setMessage(t.githubTokenSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [token, refreshConfig, t.saveFailed, t.githubTokenRequired]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Github className="h-4 w-4 text-primary" />
            {t.githubToken}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              {t.personalAccessToken}
              {hasExistingToken && (
                <Badge variant="outline" className="text-[10px] text-success border-success/30">
                  {dict.common.configured}
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={hasExistingToken ? t.tokenReplacePlaceholder : t.tokenPlaceholder}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.tokenHint}
            </p>
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
              <Star className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary/80">{t.tokenStarSyncHint}</p>
            </div>
          </div>

          {message && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? t.saving : t.saveChanges}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSettings() {
  const { config, refreshConfig, locale, setLocale, theme, setTheme, dict } = useApp();
  const t = dict.settings;
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale, theme }),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await refreshConfig();
      setMessage(t.preferencesSaved);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [locale, theme, refreshConfig, t.saveFailed, t.preferencesSaved]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            {t.interfaceLanguage}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={locale} onValueChange={(v) => setLocale(v as "zh" | "en")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sun className="h-4 w-4 text-primary" />
            {t.theme}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={theme || "system"} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t.followSystem}</SelectItem>
              <SelectItem value="light">{t.light}</SelectItem>
              <SelectItem value="dark">{t.dark}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? t.saving : t.saveChanges}
        </Button>
      </div>
    </div>
  );
}

function BackupSettings() {
  const { dict } = useApp();
  const t = dict.settings;
  const [backups, setBackups] = useState<Array<{ filename: string; size: number; created_at: string }>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) return;
      const data = await res.json();
      setBackups(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      if (!res.ok) throw new Error(t.backupFailed);
      await res.json();
      toast.success(t.backupCreated);
      loadBackups();
    } catch {
      toast.error(t.backupCreateFailed);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(t.restoreConfirm.replace('{filename}', filename))) return;
    setRestoringFile(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error(t.restoreFailed);
      const data = await res.json();
      if (data.success) {
        toast.success(t.dataRestored);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(t.restoreFailed);
      }
    } catch {
      toast.error(t.restoreFailed);
    } finally {
      setRestoringFile(null);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/backup/download?filename=${encodeURIComponent(filename)}`, "_blank");
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(t.deleteConfirm.replace('{filename}', filename))) return;
    setDeletingFile(filename);
    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t.deleteBackupFailed);
      toast.success(t.backupDeleted);
      loadBackups();
    } catch {
      toast.error(t.deleteBackupFailed);
    } finally {
      setDeletingFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            {t.backupAndRestore}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.backupDesc}
          </p>
          <div className="flex gap-3">
            <Button size="sm" className="gap-2" onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {isCreating ? t.creatingBackup : t.createBackup}
            </Button>
          </div>

          {backups.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-foreground">{t.historyBackups}</h3>
              <div className="space-y-1.5">
                {backups.map((backup) => (
                  <div
                    key={backup.filename}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(backup.created_at)} · {formatSize(backup.size)}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDownload(backup.filename)}
                        title={t.downloadBackup}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleRestore(backup.filename)}
                        disabled={restoringFile === backup.filename}
                      >
                        {restoringFile === backup.filename ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t.restore
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(backup.filename)}
                        disabled={deletingFile === backup.filename}
                        title={t.deleteBackup}
                      >
                        {deletingFile === backup.filename ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backups.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.noBackups}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
