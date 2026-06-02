"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
} from "lucide-react";
import { toast } from "sonner";
import { PushChannels } from "@/components/settings/push-channels";

const llmProviders = [
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini" },
  { value: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
  { value: "kimi", label: "Kimi (Moonshot)", defaultModel: "moonshot-v1-32k" },
  { value: "mimo", label: "MiMo (小米)", defaultModel: "mimo-v2.5-pro" },
  { value: "openrouter", label: "OpenRouter", defaultModel: "xiaomi/mimo-v2.5-pro" },
];

const tabs = [
  { id: "llm", label: "LLM 配置", icon: Brain },
  { id: "github", label: "GitHub Token", icon: Github },
  { id: "channels", label: "推送渠道", icon: Bell },
  { id: "preferences", label: "通用偏好", icon: Settings },
  { id: "backup", label: "数据备份", icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("llm");
  const { dict } = useApp();
  const t = dict.settings;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div
        className="main-content flex flex-1 flex-col"
      >
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
      </div>
    </div>
  );
}

function LLMSettings() {
  const { config, refreshConfig } = useApp();
  const [provider, setProvider] = useState(config?.llm_provider || "openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(config?.llm_model || "gpt-4.1-mini");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setProvider(config.llm_provider || "openai");
      setModel(config.llm_model || "gpt-4.1-mini");
    }
  }, [config]);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const found = llmProviders.find((p) => p.value === value);
    if (found) setModel(found.defaultModel);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_provider: provider,
          llm_api_key: apiKey || undefined,
          llm_model: model,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      await refreshConfig();
      setApiKey("");
      setMessage("LLM 配置已保存");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [provider, apiKey, model, refreshConfig]);

  const hasExistingKey = config?.llm_api_key === "****";

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            LLM 模型配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">LLM Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {llmProviders.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              API Key
              {hasExistingKey && (
                <Badge variant="outline" className="text-[10px] text-success border-success/30">
                  已配置
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasExistingKey ? "输入新 Key 以替换（留空保持不变）" : "输入你的 API Key"}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">模型名称</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="模型名称"
            />
            <p className="text-xs text-muted-foreground">
              切换 Provider 时会自动填入推荐模型，你也可以手动修改
            </p>
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
              {isSaving ? "保存中..." : "保存更改"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GitHubTokenSettings() {
  const { config, refreshConfig } = useApp();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasExistingToken = config?.github_token === "****";

  const handleSave = useCallback(async () => {
    if (!token.trim()) {
      setError("请输入 GitHub Token");
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
      if (!res.ok) throw new Error("保存失败");
      await refreshConfig();
      setToken("");
      setMessage("GitHub Token 已保存");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [token, refreshConfig]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Github className="h-4 w-4 text-primary" />
            GitHub Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              Personal Access Token
              {hasExistingToken && (
                <Badge variant="outline" className="text-[10px] text-success border-success/30">
                  已配置
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={hasExistingToken ? "输入新 Token 以替换（留空保持不变）" : "ghp_xxxxxxxxxxxx"}
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
              用于访问 GitHub API 获取仓库数据。建议使用 Fine-grained Token，仅需 public_repo 权限。
            </p>
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
              {isSaving ? "保存中..." : "保存更改"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSettings() {
  const { config, refreshConfig, locale, setLocale, theme, setTheme } = useApp();
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
      if (!res.ok) throw new Error("保存失败");
      await refreshConfig();
      setMessage("偏好设置已保存");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [locale, theme, refreshConfig]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            界面语言
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
            主题
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={theme || "system"} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">跟随系统</SelectItem>
              <SelectItem value="light">浅色</SelectItem>
              <SelectItem value="dark">深色</SelectItem>
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
          {isSaving ? "保存中..." : "保存更改"}
        </Button>
      </div>
    </div>
  );
}

function BackupSettings() {
  const [backups, setBackups] = useState<Array<{ filename: string; size: number; created_at: string }>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

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
      if (!res.ok) throw new Error("备份失败");
      await res.json();
      toast.success("备份创建成功");
      loadBackups();
    } catch {
      toast.error("备份创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`确定要恢复备份 ${filename} 吗？当前数据将被替换。`)) return;
    setRestoringFile(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error("恢复失败");
      const data = await res.json();
      if (data.success) {
        toast.success("数据已恢复，请刷新页面");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("恢复失败");
      }
    } catch {
      toast.error("恢复失败");
    } finally {
      setRestoringFile(null);
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
            数据备份与恢复
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            备份包含所有项目数据、分析报告、收藏列表和订阅规则。恢复备份将替换当前所有数据。
          </p>
          <div className="flex gap-3">
            <Button size="sm" className="gap-2" onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {isCreating ? "备份中..." : "创建备份"}
            </Button>
          </div>

          {backups.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-foreground">历史备份</h3>
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-3 shrink-0"
                      onClick={() => handleRestore(backup.filename)}
                      disabled={restoringFile === backup.filename}
                    >
                      {restoringFile === backup.filename ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "恢复"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backups.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无备份记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
