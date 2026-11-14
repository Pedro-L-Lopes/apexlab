import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Box, MessageCircle } from "lucide-react";
import type { PublicSiteSettings } from "@/lib/queries/public";
import { buildWhatsAppGeneralUrl } from "@/lib/whatsapp";
import {
  PublicHeaderNav,
  PublicHomeBrandLink,
} from "@/components/public/public-header-nav";

interface PublicHeaderProps {
  settings: PublicSiteSettings;
}

export function PublicHeader({ settings }: PublicHeaderProps) {
  const whatsappUrl = buildWhatsAppGeneralUrl(
    settings.whatsapp,
    `Olá! Vim pelo catálogo ${settings.name} e gostaria de tirar uma dúvida.`
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <div className="pointer-events-auto flex h-12 items-center justify-between gap-2 rounded-full border border-line bg-surface-glass px-2.5 pl-3 shadow-card backdrop-blur-md sm:h-14 sm:gap-4 sm:px-4 sm:pl-4">
          <PublicHomeBrandLink className="flex min-w-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:gap-3">
            {settings.logo_url ? (
              <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-line bg-surface shadow-xs sm:h-9 sm:w-9">
                <Image
                  src={settings.logo_url}
                  alt={settings.name}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xs sm:h-9 sm:w-9">
                <Box className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </span>
            )}
            <span className="truncate font-display text-sm font-extrabold tracking-[-0.02em] text-ink sm:text-base">
              {settings.name}
            </span>
          </PublicHomeBrandLink>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <React.Suspense
              fallback={
                <nav
                  aria-label="Navegação principal"
                  className="flex items-center gap-0.5 sm:gap-1"
                >
                  <Link
                    href="/"
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted sm:px-3.5 sm:py-1.5"
                  >
                    Início
                  </Link>
                  <Link
                    href="/catalogo"
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted sm:px-3.5 sm:py-1.5"
                  >
                    Catálogo
                  </Link>
                </nav>
              }
            >
              <PublicHeaderNav />
            </React.Suspense>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar no WhatsApp"
                className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-full bg-accent p-0 text-xs font-semibold text-accent-foreground shadow-xs transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-9 sm:w-auto sm:px-4"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
