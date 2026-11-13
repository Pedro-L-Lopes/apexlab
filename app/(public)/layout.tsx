import * as React from "react";
import type { Metadata } from "next";
import { getPublicSiteSettings } from "@/lib/queries/public";
import { getContrastTextColor } from "@/lib/utils";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: {
      default: settings.name,
      template: `%s · ${settings.name}`,
    },
    description:
      settings.description?.trim() ||
      "Vitrine de produtos de impressão 3D sob demanda.",
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSiteSettings();
  const accent = settings.primary_color || "#1F4FFF";
  const accentForeground = getContrastTextColor(accent);

  const themeStyle = {
    "--accent": accent,
    "--accent-foreground": accentForeground,
    "--accent-strong": `color-mix(in srgb, ${accent} 82%, black)`,
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
    "--bg-glow": `radial-gradient(circle at top right, color-mix(in srgb, ${accent} 12%, transparent), transparent 60%)`,
  } as React.CSSProperties;

  return (
    <div style={themeStyle} className="min-h-screen flex flex-col overflow-x-clip">
      <PublicHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <PublicFooter settings={settings} />
    </div>
  );
}
