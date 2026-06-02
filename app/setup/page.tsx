"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Github, Sparkles, ArrowRight, ArrowLeft } from "lucide-react"

const PROVIDERS = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4.1-mini" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  { id: "kimi", name: "Kimi (Moonshot)", baseUrl: "https://api.moonshot.ai/v1", defaultModel: "moonshot-v1-32k" },
  { id: "mimo", name: "MiMo (Xiaomi)", baseUrl: "https://token-plan-cn.xiaomimimo.com/v1", defaultModel: "mimo-v2.5-pro" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "xiaomi/mimo-v2.5-pro" },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [githubToken, setGithubToken] = useState("")
  const [provider, setProvider] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1")
  const [model, setModel] = useState("gpt-4.1-mini")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/desktop/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.isConfigured) {
          router.replace("/")
        }
        if (data.config) {
          if (data.config.github_token) setGithubToken(data.config.github_token)
          if (data.config.llm_provider) setProvider(data.config.llm_provider)
          if (data.config.llm_api_key) setApiKey(data.config.llm_api_key)
          if (data.config.llm_base_url) setBaseUrl(data.config.llm_base_url)
          if (data.config.llm_model) setModel(data.config.llm_model)
        }
      })
      .catch(() => {})
  }, [router])

  const handleProviderChange = (id: string) => {
    const p = PROVIDERS.find((x) => x.id === id)
    if (p) {
      setProvider(id)
      setBaseUrl(p.baseUrl)
      setModel(p.defaultModel)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_token: githubToken,
          llm_provider: provider,
          llm_api_key: apiKey,
          llm_base_url: baseUrl,
          llm_model: model,
        }),
      })
      if (res.ok) {
        router.replace("/")
      }
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    {
      title: "欢迎来到 RepoIntel",
      description: "开源项目情报与分析工具，只需两步即可开始使用",
      icon: <Sparkles className="h-12 w-12 text-indigo-500" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            RepoIntel 帮助你深度分析任何 GitHub 开源项目，
            生成架构解读、逆向 PRD、技术栈分析等 9 种专业报告。
          </p>
          <p className="text-sm text-muted-foreground">
            所有数据存储在本地，完全由你掌控。
          </p>
        </div>
      ),
    },
    {
      title: "配置 GitHub Token",
      description: "用于访问 GitHub API 获取项目数据",
      icon: <Github className="h-12 w-12 text-white" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-token">GitHub Personal Access Token</Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              前往 GitHub Settings → Developer settings → Personal access tokens 生成。
              只需 public_repo 权限即可。不配置则使用匿名访问（60次/小时限制）。
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "配置 AI 模型",
      description: "选择 LLM 提供商并填入 API Key",
      icon: <Sparkles className="h-12 w-12 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>LLM 提供商</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              如使用代理或自定义端点，可修改此项。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            <Input
              id="model"
              placeholder="gpt-4.1-mini"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      title: "配置完成",
      description: "一切就绪，开始探索开源世界",
      icon: <CheckCircle className="h-12 w-12 text-green-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="rounded-lg border p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GitHub Token</span>
              <span>{githubToken ? "✓ 已配置" : "○ 未配置（匿名模式）"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LLM 提供商</span>
              <span>{PROVIDERS.find((p) => p.id === provider)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span>{apiKey ? "✓ 已配置" : "✗ 未配置"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">模型</span>
              <span>{model}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            你可以随时在设置页面修改这些配置。
          </p>
        </div>
      ),
    },
  ]

  const current = steps[step]
  const canProceed = step === 0 || (step === 1 && true) || (step === 2 && apiKey.length > 0) || step === 3

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{current.icon}</div>
          <CardTitle className="text-2xl">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {current.content}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                下一步
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving || !apiKey}>
                {saving ? "保存中..." : "开始使用"}
                {!saving && <Sparkles className="ml-2 h-4 w-4" />}
              </Button>
            )}
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step ? "bg-indigo-500" : i < step ? "bg-indigo-300" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
