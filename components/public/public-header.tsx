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
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface-glass backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <PublicHomeBrandLink className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          {settings.logo_url ? (
            <span className="relative flex h-9 w-9 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <Image
                src={settings.logo_url}
                alt={settings.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs">
              <Box className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <span className="font-display text-base font-extrabold tracking-[-0.02em] text-ink sm:text-lg">
            {settings.name}
          </span>
        </PublicHomeBrandLink>

        <div className="flex items-center gap-2 sm:gap-3">
          <React.Suspense
            fallback={
              <nav aria-label="Navegação principal" className="flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted"
                >
                  Início
                </Link>
                <Link
                  href="/catalogo"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted"
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
              className="hidden sm:inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground shadow-xs transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
