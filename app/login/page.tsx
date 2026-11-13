import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Box } from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getPublicSiteSettings } from "@/lib/queries/public";
import { LoginForm } from "@/app/login/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Entrar · Painel Admin",
  robots: { index: false, follow: false },
};

function LoginSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full rounded-[14px]" />
      <Skeleton className="h-11 w-full rounded-[14px]" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, rawParams] = await Promise.all([
    verifyAdminSession(),
    searchParams,
  ]);

  if (session.authorized) {
    redirect("/admin");
  }

  const nextParam = Array.isArray(rawParams.next)
    ? rawParams.next[0]
    : rawParams.next;
  const errorParam = Array.isArray(rawParams.error)
    ? rawParams.error[0]
    : rawParams.error;

  return (
    <LoginForm
      nextPath={nextParam}
      initialUnauthorized={errorParam === "nao-autorizado"}
      signedInEmail={session.user?.email ?? null}
    />
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settings = await getPublicSiteSettings();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-ink overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/12 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao catálogo
          </Link>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Box className="h-3.5 w-3.5" />
            {settings.name}
          </span>
        </div>

        <section className="rounded-[28px] border border-line/90 bg-surface/95 p-7 shadow-card sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Área restrita
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink">
              Gerência<span className="text-accent">.</span>
            </h1>
            <p className="text-sm text-muted">
              Acesse com sua conta de administrador para gerenciar produtos,
              categorias e configurações da vitrine.
            </p>
          </div>

          <Suspense fallback={<LoginSkeleton />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
