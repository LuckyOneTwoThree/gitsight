"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Github, Sparkles, ArrowRight, ArrowLeft } from "lucide-react"
import { useApp } from "@/components/app-provider"

const PROVIDERS = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4.1-mini" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  { id: "qwen", name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-plus" },
  { id: "kimi", name: "Kimi", baseUrl: "https://api.moonshot.ai/v1", defaultModel: "moonshot-v1-32k" },
  { id: "mimo", name: "MiMo (小米)", baseUrl: "https://api.mimo.ai/v1", defaultModel: "mimo-v2.5-pro" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "google/gemini-2.5-flash-preview" },
]

export default function SetupPage() {
  const router = useRouter()
  const { dict } = useApp()
  const t = dict.setup
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
          if (data.config.llm_providers?.length > 0) {
            const active = data.config.llm_providers.find(
              (p: { id: string }) => p.id === data.config.llm_active_provider_id
            ) || data.config.llm_providers[0]
            if (active.provider) setProvider(active.provider)
            if (active.base_url) setBaseUrl(active.base_url)
            if (active.model) setModel(active.model)
          }
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
      const providerId = `${provider}-setup`
      const res = await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_token: githubToken,
          llm_providers: [{ id: providerId, provider, base_url: baseUrl, model }],
          llm_active_provider_id: providerId,
          llm_api_keys: apiKey ? { [providerId]: apiKey } : undefined,
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
      title: t.welcomeTitle,
      description: t.welcomeDesc,
      icon: <Sparkles className="h-12 w-12 text-indigo-500" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {t.welcomeBody1}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.welcomeBody2}
          </p>
        </div>
      ),
    },
    {
      title: t.step2Title,
      description: t.githubTokenDesc,
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
              {t.githubTokenHint}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: t.aiModelTitle,
      description: t.aiModelDesc,
      icon: <Sparkles className="h-12 w-12 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.llmProviderLabel}</Label>
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
              {t.baseUrlHint}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">{t.modelLabel}</Label>
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
      title: t.setupComplete,
      description: t.setupCompleteDesc,
      icon: <CheckCircle className="h-12 w-12 text-green-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="rounded-lg border p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.githubTokenRow}</span>
              <span>{githubToken ? `✓ ${dict.common.configured}` : `○ ${t.configuredAnonymous}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.llmProviderRow}</span>
              <span>{PROVIDERS.find((p) => p.id === provider)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.apiKeyRow}</span>
              <span>{apiKey ? `✓ ${dict.common.configured}` : `✗ ${t.notConfiguredMark}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.modelRow}</span>
              <span>{model}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.canChangeInSettings}
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
              {t.previous}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                {t.next}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving || !apiKey}>
                {saving ? t.savingText : t.startUsing}
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
