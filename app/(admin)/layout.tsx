import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminShellData } from "@/lib/queries/admin";
import { getContrastTextColor } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: {
    default: "Painel Admin",
    template: "%s · Admin",
  },
  robots: { index: false, follow: false },
};

function AdminLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-bg flex">
      <div className="hidden lg:block w-64 shrink-0 bg-accent/90 p-5">
        <Skeleton className="h-10 w-44 bg-white/20" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-9 w-full bg-white/15" />
          <Skeleton className="h-9 w-full bg-white/15" />
          <Skeleton className="h-9 w-full bg-white/15" />
          <Skeleton className="h-9 w-full bg-white/15" />
        </div>
      </div>
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-44 rounded-[26px]" />
          <Skeleton className="h-44 rounded-[26px]" />
          <Skeleton className="h-44 rounded-[26px]" />
        </div>
      </div>
    </div>
  );
}

async function AdminAuthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireAdminPage();
  const { settings, counts } = await getAdminShellData(supabase);

  const accent = settings.primary_color || "#1F4FFF";
  const accentForeground = getContrastTextColor(accent);

  const themeStyle = {
    "--accent": accent,
    "--accent-foreground": accentForeground,
    "--accent-strong": `color-mix(in srgb, ${accent} 82%, black)`,
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
    "--bg-glow": `radial-gradient(circle at top right, color-mix(in srgb, ${accent} 10%, transparent), transparent 60%)`,
  } as React.CSSProperties;

  return (
    <div style={themeStyle}>
      <AdminShell
        settings={settings}
        counts={counts}
        userEmail={user.email ?? "Administrador"}
      >
        {children}
      </AdminShell>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutSkeleton />}>
      <AdminAuthorizedLayout>{children}</AdminAuthorizedLayout>
    </Suspense>
  );
}
