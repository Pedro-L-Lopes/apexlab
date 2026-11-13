import Link from "next/link";
import Image from "next/image";
import { Box, MessageCircle } from "lucide-react";
import type { PublicSiteSettings } from "@/lib/queries/public";
import { buildWhatsAppGeneralUrl } from "@/lib/whatsapp";
import { PublicHomeBrandLink } from "@/components/public/public-header-nav";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface PublicFooterProps {
  settings: PublicSiteSettings;
}

function buildInstagramHref(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function PublicFooter({ settings }: PublicFooterProps) {
  const whatsappUrl = buildWhatsAppGeneralUrl(
    settings.whatsapp,
    `Olá! Vi o catálogo ${settings.name} e gostaria de fazer um pedido.`
  );
  const instagramUrl = buildInstagramHref(settings.instagram);

  return (
    <footer className="mt-20 border-t border-line/90 bg-surface/80">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2.5 max-w-md">
          <PublicHomeBrandLink className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            {settings.logo_url ? (
              <span className="relative flex h-8 w-8 overflow-hidden rounded-xl border border-line bg-surface">
                <Image
                  src={settings.logo_url}
                  alt={settings.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Box className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <span className="font-display text-base font-extrabold tracking-[-0.02em] text-ink">
              {settings.name}
            </span>
          </PublicHomeBrandLink>
          <p className="text-[13px] leading-relaxed text-muted">
            {settings.description?.trim() ||
              "Peças impressas em 3D sob demanda com acabamento preciso e atendimento direto."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/catalogo"
            className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft"
          >
            Ver catálogo
          </Link>

          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft"
            >
              <InstagramIcon className="h-3.5 w-3.5 text-accent" />
              Instagram
            </a>
          ) : null}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground shadow-xs transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
