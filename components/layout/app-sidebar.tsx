"use client";

import { useState, useEffect } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  GitCompare,
  Map,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Radar,
  Search,
  Settings,
  Sun,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SemanticSearchPalette } from "@/components/search/semantic-search-palette";
import { useApp } from "@/components/app-provider";
import { syncSidebarCssVar } from "@/hooks/use-sidebar";

const COLLAPSED_KEY = "repo-intel:sidebar-collapsed";

interface SidebarItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const primaryItems: SidebarItem[] = [
  { labelKey: "discover", href: "/", icon: Radar },
  { labelKey: "dashboard", href: "/dashboard", icon: BarChart3 },
  { labelKey: "watchlist", href: "/watchlist", icon: Bookmark },
  { labelKey: "semanticSearch", href: "/search", icon: Search },
  { labelKey: "compare", href: "/compare", icon: GitCompare },
  { labelKey: "landscape", href: "/landscape", icon: Map, badge: "Beta" },
  { labelKey: "alerts", href: "/alerts", icon: Bell },
];

const secondaryItems: SidebarItem[] = [
  { labelKey: "history", href: "/profile", icon: Zap },
  { labelKey: "settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { dict, locale, setLocale, theme, setTheme } = useApp();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  const [searchOpen, setSearchOpen] = useState(false);

  const t = dict.sidebar;

  // Sync CSS variable for sidebar width
  useEffect(() => {
    syncSidebarCssVar(collapsed);
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      window.dispatchEvent(new Event("sidebar-collapse-change"));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLocale = () => {
    setLocale(locale === "zh" ? "en" : "zh");
  };

  const getLabel = (key: string) => (t as Record<string, string>)[key] || key;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-3 px-5"
        )}
      >
        <Link
          href="/"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary"
        >
          <Zap className="h-4 w-4 text-primary-foreground" />
        </Link>
        <div
          className={cn(
            "flex flex-col overflow-hidden transition-all",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          <span className="truncate text-sm font-semibold text-foreground">{t.brandName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {t.brandSub}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn("h-7 w-7 shrink-0 text-muted-foreground", collapsed ? "ml-0" : "ml-auto")}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <div className={cn("shrink-0 p-4", collapsed && "px-2")}>
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className={cn(
            "w-full border-border bg-input text-muted-foreground hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-left text-sm transition-all",
              collapsed ? "hidden" : "flex-1 opacity-100"
            )}
          >
            {t.search}
          </span>
        </Button>
      </div>
      <SemanticSearchPalette open={searchOpen} onOpenChange={setSearchOpen} />

      <nav className={cn("flex-1 space-y-1 overflow-y-auto overflow-x-hidden", collapsed ? "px-2" : "px-3")}>
        <NavGroupLabel collapsed={collapsed}>{t.coreGroup}</NavGroupLabel>
        {primaryItems.map((item) => (
          <SidebarLink
            key={item.href}
            label={getLabel(item.labelKey)}
            href={item.href}
            icon={item.icon}
            badge={item.badge}
            active={
              item.href === "/"
                ? pathname === "/"
                : Boolean(pathname?.startsWith(item.href))
            }
            collapsed={collapsed}
          />
        ))}

        <div className="my-4 border-t border-border" />

        <NavGroupLabel collapsed={collapsed}>{t.otherGroup}</NavGroupLabel>
        {secondaryItems.map((item) => (
          <SidebarLink
            key={item.href}
            label={getLabel(item.labelKey)}
            href={item.href}
            icon={item.icon}
            active={Boolean(pathname?.startsWith(item.href))}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom: Quick toggles + Settings */}
      <div className={cn("shrink-0 border-t border-border", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-2")}>
          {/* Language toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocale}
                className={cn(
                  "h-8 text-xs font-medium text-muted-foreground hover:text-foreground",
                  collapsed ? "w-full px-0" : "px-2"
                )}
              >
                {locale === "zh" ? "中" : "EN"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {locale === "zh" ? "切换到 English" : "Switch to 中文"}
            </TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={cn(
                  "h-8 text-muted-foreground hover:text-foreground",
                  collapsed ? "w-full px-0" : "px-2"
                )}
              >
                {theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {theme === "dark" ? t.themeDark : t.themeLight}
            </TooltipContent>
          </Tooltip>

          {/* Settings link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center rounded-md text-muted-foreground hover:text-foreground transition-colors",
                  collapsed ? "h-8 w-full justify-center" : "h-8 flex-1 gap-2 px-2"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="text-sm">{t.settings}</span>
                )}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">{t.settings}</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

function NavGroupLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mb-2 overflow-hidden whitespace-nowrap px-2 transition-all",
        collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</span>
    </div>
  );
}

function SidebarLink({
  label,
  href,
  icon: Icon,
  badge,
  active,
  collapsed,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  active?: boolean;
  collapsed: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative flex items-center rounded-md border text-sm font-medium transition-all duration-150 cursor-pointer",
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
            active
              ? "border-primary/40 bg-primary/12 text-foreground shadow-sm ring-1 ring-primary/20"
              : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
              collapsed ? "hidden" : active ? "bg-primary opacity-100" : "opacity-0"
            )}
          />
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all",
              collapsed ? "hidden" : "flex-1 opacity-100"
            )}
          >
            {label}
          </span>
          {badge && (
            <Badge
              variant="secondary"
              className={cn("text-[10px]", collapsed && "hidden")}
            >
              {badge}
            </Badge>
          )}
        </Link>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}
