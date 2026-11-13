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
  Settings,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import type { AdminShellCounts, AdminSiteSettings } from "@/lib/queries/admin";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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

  const renderNav = (layoutPrefix: string) => (
    <nav aria-label="Menu administrativo" className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center justify-between rounded-full px-3.5 py-2.5 text-sm font-medium transition-opacity",
                      active
                        ? "opacity-100 font-semibold"
                        : "opacity-80 hover:opacity-100"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${layoutPrefix}-active-pill`}
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-full bg-current/15 backdrop-blur-xs border border-current/15"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === "number" && (
                      <span className="relative z-10 rounded-full bg-current/15 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                        {item.count}
                      </span>
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
    <div className="min-h-screen bg-bg text-ink flex overflow-x-clip">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-gradient-to-b from-accent to-accent-strong text-accent-foreground p-5 shadow-card">
        <div className="space-y-8">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:opacity-90"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-current/15 border border-current/20">
              <Box className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold tracking-tight">
                {settings.name}
              </p>
              <p className="text-[11px] font-medium opacity-75">Painel admin</p>
            </div>
          </Link>

          {renderNav("desktop-admin-nav")}
        </div>

        <div className="space-y-3 border-t border-current/15 pt-4">
          <div className="px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-65">
              Sessão ativa
            </p>
            <p className="mt-0.5 truncate text-xs font-medium opacity-90">
              {userEmail}
            </p>
          </div>
        </div>
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
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col justify-between bg-gradient-to-b from-accent to-accent-strong text-accent-foreground p-5 shadow-2xl">
            <div className="space-y-7">
              <div className="flex items-center justify-between">
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 font-display text-base font-extrabold"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-current/15">
                    <Box className="h-4 w-4" />
                  </span>
                  <span className="truncate">{settings.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-current/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderNav("mobile-admin-nav")}
            </div>

            <div className="border-t border-current/15 pt-4 text-xs opacity-85 truncate">
              {userEmail}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line/90 bg-surface-glass backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu administrativo"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink lg:hidden cursor-pointer"
              >
                <Menu className="h-4 w-4" />
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

            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "h-9 px-3.5",
                })}
              >
                <ExternalLink className="h-3.5 w-3.5 text-accent" />
                <span>Ver site</span>
              </Link>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "h-9 px-3 text-muted hover:text-ink",
                  })}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sair</span>
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
