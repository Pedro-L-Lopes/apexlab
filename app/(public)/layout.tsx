import * as React from "react";
import type { Metadata } from "next";
import { getPublicSiteSettings } from "@/lib/queries/public";
import { buildStoreThemeVars } from "@/lib/utils";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const description =
    settings.description?.trim() ||
    "Vitrine de produtos de impressão 3D sob demanda.";

  return {
    title: {
      default: settings.name,
      template: `%s · ${settings.name}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: settings.name,
      title: settings.name,
      description,
    },
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSiteSettings();
  const themeStyle = buildStoreThemeVars(
    settings.primary_color
  ) as React.CSSProperties;

  return (
    <div style={themeStyle} className="min-h-screen flex flex-col overflow-x-clip">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-card focus:ring-2 focus:ring-accent"
      >
        Pular para o conteúdo principal
      </a>
      <PublicHeader settings={settings} />
      <main id="conteudo-principal" className="flex-1">
        {children}
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}
