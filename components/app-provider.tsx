"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { getDictionary, type Locale, type Dictionary } from "@/lib/i18n"

interface LlmProviderUI {
  id: string
  provider: string
  base_url: string
  model: string
  hasApiKey: boolean
}

interface AppConfig {
  github_token: string
  language: string
  theme: string
  llm_providers: LlmProviderUI[]
  llm_active_provider_id: string
}

interface AppContextValue {
  config: AppConfig | null
  isConfigured: boolean
  isLoading: boolean
  refreshConfig: () => Promise<void>
  locale: Locale
  dict: Dictionary
  setLocale: (locale: Locale) => void
  theme: string | undefined
  setTheme: (theme: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [locale, setLocaleState] = useState<Locale>("zh")
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme()
  const mountedRef = useRef(false)
  const syncedRef = useRef(false)

  const dict = getDictionary(locale)

  const refreshConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/desktop/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config ?? null)
      }
    } catch {
      setConfig(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refreshConfig()
    return () => { mountedRef.current = false }
  }, [refreshConfig])

  // Sync config theme and language on initial load only (once)
  useEffect(() => {
    if (!mountedRef.current || syncedRef.current) return
    if (!config) return
    syncedRef.current = true
    if (config.theme) {
      setNextTheme(config.theme)
    }
    if (config.language) {
      setLocaleState(config.language as Locale)
    }
  }, [config, setNextTheme])

  const isConfigured = Boolean(config?.llm_providers?.some(p => p.hasApiKey))

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next)
    try {
      await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      })
      setConfig((prev) => prev ? { ...prev, language: next } : prev)
    } catch {}
  }, [])

  const setTheme = useCallback(async (next: string) => {
    setNextTheme(next)
    try {
      await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      })
      setConfig((prev) => prev ? { ...prev, theme: next } : prev)
    } catch {}
  }, [setNextTheme])

  return (
    <AppContext.Provider
      value={{
        config,
        isConfigured,
        isLoading,
        refreshConfig,
        locale,
        dict,
        setLocale,
        theme: nextTheme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
