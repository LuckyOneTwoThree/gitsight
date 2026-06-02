"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { getDictionary, type Locale, type Dictionary } from "@/lib/i18n"

interface AppConfig {
  github_token: string
  llm_api_key: string
  llm_provider: string
  llm_model: string
  language: string
  theme: string
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
    void refreshConfig()
  }, [refreshConfig])

  // Sync config theme and language on initial load
  useEffect(() => {
    if (config?.theme) {
      setNextTheme(config.theme)
    }
    if (config?.language) {
      setLocaleState(config.language as Locale)
    }
  }, [config?.theme, config?.language, setNextTheme])

  const isConfigured = Boolean(config?.github_token) && Boolean(config?.llm_api_key)

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next)
    try {
      await fetch("/api/desktop/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      })
      // Update config locally so settings page picks up the change
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
      // Update config locally so settings page picks up the change
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
