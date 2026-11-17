"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Box,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftDashed,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import type { AdminShellCounts, AdminSiteSettings } from "@/lib/queries/admin";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type SidebarMode = "expanded" | "icons" | "hidden";

const SIDEBAR_STORAGE_KEY = "catalogo3d:admin-sidebar-mode";

const sidebarListeners = new Set<() => void>();

function subscribeSidebarMode(callback: () => void) {
  sidebarListeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    sidebarListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSidebarModeSnapshot(): SidebarMode {
  try {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === "expanded" || saved === "icons" || saved === "hidden") {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }
  return "expanded";
}

function getSidebarModeServerSnapshot(): SidebarMode {
  return "expanded";
}

const SIDEBAR_MODE_META: Record<
  SidebarMode,
  {
    label: string;
    nextAction: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  expanded: {
    label: "Expandida",
    nextAction: "Recolher para só ícones",
    icon: PanelLeftClose,
  },
  icons: {
    label: "Só ícones",
    nextAction: "Ocultar barra lateral",
    icon: PanelLeftDashed,
  },
  hidden: {
    label: "Oculta",
    nextAction: "Expandir barra lateral",
    icon: PanelLeftOpen,
  },
};

const SIDEBAR_GRADIENT_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-deep) 100%)",
  color: "#FFFFFF",
};

const SIDEBAR_MUTED_STYLE: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.72)",
};

interface AdminShellProps {
  settings: AdminSiteSettings;
  counts: AdminShellCounts;
  userEmail: string;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  matchExact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminShell({
  settings,
  counts,
  userEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const sidebarMode = React.useSyncExternalStore(
    subscribeSidebarMode,
    getSidebarModeSnapshot,
    getSidebarModeServerSnapshot
  );

  const cycleSidebarMode = () => {
    const next: SidebarMode =
      sidebarMode === "expanded"
        ? "icons"
        : sidebarMode === "icons"
          ? "hidden"
          : "expanded";
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
    sidebarListeners.forEach((listener) => listener());
  };

  const modeMeta = SIDEBAR_MODE_META[sidebarMode];
  const ModeIcon = modeMeta.icon;
  const userInitial = (userEmail.trim().charAt(0) || "A").toUpperCase();

  const sections: NavSection[] = [
    {
      title: "Visão geral",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          matchExact: true,
        },
      ],
    },
    {
      title: "Catálogo",
      items: [
        {
          label: "Produtos",
          href: "/admin/produtos",
          icon: Package,
          count: counts.productsTotal,
        },
        {
          label: "Categorias",
          href: "/admin/categorias",
          icon: FolderKanban,
          count: counts.categoriesTotal,
        },
        {
          label: "Importar",
          href: "/admin/importar",
          icon: Link2,
          count: counts.importJobsTotal,
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          label: "Configurações",
          href: "/admin/configuracoes",
          icon: Settings,
        },
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.matchExact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const renderNav = (layoutPrefix: string, iconOnly = false) => (
    <nav
      aria-label="Menu administrativo"
      className={iconOnly ? "space-y-3" : "space-y-6"}
    >
      {sections.map((section, sectionIndex) => (
        <div key={section.title} className="space-y-1.5">
          {iconOnly ? (
            sectionIndex > 0 && (
              <div
                className="mx-auto my-2 w-8 border-t border-white/15"
                aria-hidden="true"
              />
            )
          ) : (
            <p
              style={SIDEBAR_MUTED_STYLE}
              className="px-3 text-[10px] font-bold uppercase tracking-[0.16em]"
            >
              {section.title}
            </p>
          )}
          <ul className={cn("space-y-1", iconOnly && "flex flex-col items-center")}>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-label={
                      iconOnly
                        ? `${item.label}${typeof item.count === "number" ? ` (${item.count})` : ""}`
                        : undefined
                    }
                    title={
                      iconOnly
                        ? `${item.label}${typeof item.count === "number" ? ` (${item.count})` : ""}`
                        : undefined
                    }
                    className={cn(
                      "relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                      iconOnly
                        ? "group flex h-11 w-11 items-center justify-center rounded-2xl"
                        : "flex items-center justify-between rounded-full px-3.5 py-2.5 text-sm",
                      active
                        ? "font-semibold text-white"
                        : "font-medium text-white/90 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${layoutPrefix}-active-pill`}
                        transition={SPRING_SNAPPY}
                        className={cn(
                          "absolute inset-0 border border-white/25 bg-white/[0.18] shadow-xs",
                          iconOnly ? "rounded-2xl" : "rounded-full"
                        )}
                        aria-hidden="true"
                      />
                    )}

                    {iconOnly ? (
                      <>
                        <Icon className="relative z-10 h-5 w-5 shrink-0 text-white" />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-deep px-3 py-1.5 text-xs font-semibold text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                        >
                          <span>{item.label}</span>
                          {typeof item.count === "number" && (
                            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                              {item.count}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10 flex items-center gap-2.5 text-white">
                          <Icon className="h-4 w-4 shrink-0 text-white" />
                          <span>{item.label}</span>
                        </span>
                        {typeof item.count === "number" && (
                          <span className="relative z-10 rounded-full bg-white/[0.18] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div
      data-sidebar-mode={sidebarMode}
      className="min-h-screen bg-bg text-ink flex overflow-x-clip"
    >
      {/* Desktop Sidebar */}
      <aside
        aria-label="Barra lateral administrativa"
        data-sidebar-mode={sidebarMode}
        style={SIDEBAR_GRADIENT_STYLE}
        className={cn(
          sidebarMode === "hidden" && "hidden",
          sidebarMode === "expanded" &&
            "hidden lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between lg:overflow-y-auto p-5 shadow-card",
          sidebarMode === "icons" &&
            "hidden lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-screen lg:w-20 lg:shrink-0 lg:flex-col lg:items-center lg:justify-between px-3 py-5 shadow-card"
        )}
      >
        {sidebarMode === "icons" ? (
          <>
            <div className="flex w-full flex-col items-center gap-5">
              <Link
                href="/admin"
                title={settings.name}
                aria-label={settings.name}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/[0.16] text-white transition hover:bg-white/25"
              >
                <Box className="h-4 w-4 text-white" />
              </Link>

              <button
                type="button"
                data-testid="sidebar-inline-toggle"
                onClick={cycleSidebarMode}
                title={`${modeMeta.label} — ${modeMeta.nextAction}`}
                aria-label={modeMeta.nextAction}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-white transition hover:bg-white/25 cursor-pointer"
              >
                <ModeIcon className="h-4 w-4 text-white" />
              </button>

              {renderNav("desktop-admin-nav", true)}
            </div>

            <div className="border-t border-white/15 pt-4">
              <span
                title={`Sessão ativa: ${userEmail}`}
                aria-label={`Sessão ativa: ${userEmail}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.14] text-xs font-bold text-white"
              >
                {userInitial}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-8">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href="/admin"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1.5 py-1 transition hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/[0.16] text-white">
                    <Box className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-extrabold tracking-tight text-white">
                      {settings.name}
                    </p>
                    <p
                      style={SIDEBAR_MUTED_STYLE}
                      className="text-[11px] font-medium"
                    >
                      Painel admin
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  data-testid="sidebar-inline-toggle"
                  onClick={cycleSidebarMode}
                  title={`${modeMeta.label} — ${modeMeta.nextAction}`}
                  aria-label={modeMeta.nextAction}
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-white transition hover:bg-white/25 cursor-pointer"
                >
                  <ModeIcon className="h-4 w-4 text-white" />
                </button>
              </div>

              {renderNav("desktop-admin-nav", false)}
            </div>

            <div className="space-y-3 border-t border-white/15 pt-4">
              <div className="px-2">
                <p
                  style={SIDEBAR_MUTED_STYLE}
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                >
                  Sessão ativa
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-white">
                  {userEmail}
                </p>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-ink-deep/40 backdrop-blur-xs"
          />
          <aside
            style={SIDEBAR_GRADIENT_STYLE}
            className="relative z-10 flex w-72 max-w-[85vw] flex-col justify-between p-5 text-white shadow-2xl"
          >
            <div className="space-y-7">
              <div className="flex items-center justify-between">
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-w-0 items-center gap-2.5 font-display text-base font-extrabold text-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/[0.16]">
                    <Box className="h-4 w-4 text-white" />
                  </span>
                  <span className="truncate">{settings.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.16] text-white"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              {renderNav("mobile-admin-nav", false)}
            </div>

            <div className="border-t border-white/15 pt-4">
              <p
                style={SIDEBAR_MUTED_STYLE}
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
              >
                Sessão ativa
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-white">
                {userEmail}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line/90 bg-surface-glass backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu administrativo"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink lg:hidden cursor-pointer"
              >
                <Menu className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-testid="sidebar-mode-toggle"
                onClick={cycleSidebarMode}
                title={`${modeMeta.label} — ${modeMeta.nextAction}`}
                aria-label={`Alternar barra lateral (atual: ${modeMeta.label}). Próxima ação: ${modeMeta.nextAction}`}
                className="hidden lg:inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:border-ink/20 hover:bg-bg cursor-pointer"
              >
                <ModeIcon className="h-3.5 w-3.5 text-muted" />
                <span>{modeMeta.label}</span>
              </button>

              <Link
                href="/admin"
                className="font-display text-sm font-bold text-ink truncate lg:hidden"
              >
                {settings.name} · Admin
              </Link>
              <span className="hidden text-xs font-medium text-muted lg:inline">
                Gerência do catálogo
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "h-9 px-2.5 sm:px-3.5",
                })}
              >
                <ExternalLink className="h-3.5 w-3.5 text-accent-ink" />
                <span>Ver site</span>
              </Link>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "h-9 px-2.5 sm:px-3 text-muted hover:text-ink",
                  })}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-8 sm:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
