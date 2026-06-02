"use client"

import { useSyncExternalStore } from "react"

const COLLAPSED_KEY = "repo-intel:sidebar-collapsed"

function getCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(COLLAPSED_KEY) === "true"
}

function getServerSnapshot(): boolean {
  return false
}

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === COLLAPSED_KEY) callback()
  }
  const onCustom = () => callback()
  window.addEventListener("storage", onStorage)
  window.addEventListener("sidebar-collapse-change", onCustom)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("sidebar-collapse-change", onCustom)
  }
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot)
}

/**
 * Sync the CSS custom property --sidebar-width on <html>.
 * Call once in a top-level component (e.g. AppSidebar).
 */
export function syncSidebarCssVar(collapsed: boolean): void {
  if (typeof document === "undefined") return
  document.documentElement.style.setProperty("--sidebar-width", collapsed ? "68px" : "260px")
}
