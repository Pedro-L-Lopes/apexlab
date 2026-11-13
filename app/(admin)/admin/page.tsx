import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Box,
  Edit3,
  EyeOff,
  FileText,
  FolderKanban,
  Link2,
  Plus,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminDashboardData } from "@/lib/queries/admin";
import { formatCurrencyBRL } from "@/lib/utils";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Dashboard",
};

const STATUS_BADGE = {
  active: { label: "Ativo", variant: "active" as const },
  draft: { label: "Rascunho", variant: "draft" as const },
  hidden: { label: "Oculto", variant: "hidden" as const },
};

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminPage();
  const { counts, recentProducts } = await getAdminDashboardData(supabase);

  const activeSharePct =
    counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Visão geral"
        title={
          <>
            Dashboard<span className="text-accent">.</span>
          </>
        }
        subtitle={`${counts.total} ${
          counts.total === 1 ? "produto cadastrado" : "produtos cadastrados"
        } · ${counts.categoriesTotal} ${
          counts.categoriesTotal === 1 ? "categoria" : "categorias"
        }`}
        actions={
          <Link
            href="/admin/produtos/novo"
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </Link>
        }
      />

      {/* Bento Grid */}
      <section aria-label="Resumo do catálogo" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Card sólido em --accent: Produtos ativos */}
        <Link
          href="/admin/produtos?status=active"
          className="group flex flex-col justify-between rounded-[28px] bg-gradient-to-br from-accent to-accent-strong p-6 text-accent-foreground shadow-card transition hover:-translate-y-0.5 md:col-span-2 xl:col-span-1"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold opacity-90">
              Produtos ativos
            </span>
            <span className="rounded-full bg-current/15 px-3 py-1 text-[11px] font-semibold">
              ● Na vitrine
            </span>
          </div>

          <div className="my-5 flex items-baseline gap-2.5">
            <AnimatedCounter
              value={counts.active}
              className="font-display text-5xl font-extrabold tracking-[-0.03em] tabular-nums"
            />
            <span className="text-sm font-semibold opacity-80">
              / {counts.total}
            </span>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-current/20">
              <div
                style={{ width: `${activeSharePct}%` }}
                className="h-full rounded-full bg-current transition-all duration-500"
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
              {activeSharePct}% publicados no catálogo
            </p>
          </div>
        </Link>

        {/* Rascunhos */}
        <Link
          href="/admin/produtos?status=draft"
          className="group flex flex-col justify-between rounded-[24px] border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Rascunhos</p>
              <p className="text-xs text-muted">Aguardando revisão</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4338CA]">
              <FileText className="h-4 w-4" />
            </span>
          </div>

          <AnimatedCounter
            value={counts.draft}
            className="my-5 font-display text-5xl font-extrabold tracking-[-0.03em] text-ink tabular-nums"
          />

          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink group-hover:underline">
            Ver rascunhos
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>

        {/* Ocultos */}
        <Link
          href="/admin/produtos?status=hidden"
          className="group flex flex-col justify-between rounded-[24px] border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Ocultos</p>
              <p className="text-xs text-muted">Fora da vitrine pública</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F2F4F8] text-muted">
              <EyeOff className="h-4 w-4" />
            </span>
          </div>

          <AnimatedCounter
            value={counts.hidden}
            className="my-5 font-display text-5xl font-extrabold tracking-[-0.03em] text-ink tabular-nums"
          />

          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted group-hover:text-ink">
            Gerenciar ocultos
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>

        {/* Categorias */}
        <Link
          href="/admin/categorias"
          className="group flex flex-col justify-between rounded-[24px] border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Categorias</p>
              <p className="text-xs text-muted">
                {counts.categoriesHome} em destaque na home
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <FolderKanban className="h-4 w-4" />
            </span>
          </div>

          <AnimatedCounter
            value={counts.categoriesActive}
            className="my-5 font-display text-5xl font-extrabold tracking-[-0.03em] text-ink tabular-nums"
          />

          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink group-hover:underline">
            Organizar categorias
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </section>

      {/* Bottom Bento Row: Últimos editados + Cartão escuro Importar */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Lista dos últimos produtos editados */}
        <div className="rounded-[24px] border border-line bg-surface p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                Últimos produtos editados
              </h2>
              <p className="text-xs text-muted">
                Atualizações mais recentes do catálogo
              </p>
            </div>

            <Link
              href="/admin/produtos"
              className="text-xs font-semibold text-accent-ink hover:underline"
            >
              Ver todos
            </Link>
          </div>

          {recentProducts.length > 0 ? (
            <ul className="divide-y divide-line/70">
              {recentProducts.map((product) => {
                const badge = STATUS_BADGE[product.status];
                return (
                  <li key={product.id}>
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-[#F7FAFF] -mx-2 px-2 rounded-2xl"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-bg">
                          {product.cover_image_url ? (
                            <Image
                              src={product.cover_image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted">
                              <Box className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {product.category_name ?? "Sem categoria"} ·{" "}
                            {formatCurrencyBRL(product.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Edit3 className="h-4 w-4 text-muted" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-muted">
                Nenhum produto cadastrado ainda.
              </p>
              <Link
                href="/admin/produtos/novo"
                className={buttonVariants({
                  variant: "soft",
                  size: "sm",
                  className: "mt-4",
                })}
              >
                Cadastrar primeiro produto
              </Link>
            </div>
          )}
        </div>

        {/* Cartão escuro com atalho Importar produtos */}
        <div className="flex flex-col justify-between rounded-[28px] bg-ink-deep p-6 text-white shadow-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-300">
                <Link2 className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                {counts.importJobsTotal} registros
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-300">
                Produtividade
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                Importar produtos
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Traga títulos, descrições e fotos a partir de links externos de
                modelos 3D direto para rascunho.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              href="/admin/importar"
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                className: "w-full justify-between",
              })}
            >
              <span>Importar produtos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/admin/configuracoes"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Configurar WhatsApp e marca
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
