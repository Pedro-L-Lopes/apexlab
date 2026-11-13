"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Box,
  Layers,
  MessageCircle,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { EASE_DEFAULT, fadeInUp, staggerContainer } from "@/lib/motion";
import type {
  PublicCategory,
  PublicProductListing,
  PublicSiteSettings,
} from "@/lib/queries/public";
import { buildWhatsAppGeneralUrl } from "@/lib/whatsapp";
import { StackedCard } from "@/components/ui/stacked-card";

interface HomeContentProps {
  settings: PublicSiteSettings;
  categories: PublicCategory[];
  products: PublicProductListing[];
}

export function HomeContent({
  settings,
  categories,
  products,
}: HomeContentProps) {
  const homeCategories = categories.filter((cat) => cat.show_on_home);
  const featuredProducts = products.filter((p) => p.featured);
  const showcasedProducts =
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);

  const countByCategory = new Map<string, number>();
  for (const product of products) {
    if (product.category_id) {
      countByCategory.set(
        product.category_id,
        (countByCategory.get(product.category_id) ?? 0) + 1
      );
    }
  }
  const categoryNameById = new Map<string, string>(
    categories.map((cat) => [cat.id, cat.name])
  );

  const whatsappUrl = buildWhatsAppGeneralUrl(
    settings.whatsapp,
    `Olá! Vi a vitrine do ${settings.name} e quero fazer uma encomenda 3D.`
  );

  const heroSubtitle =
    settings.description?.trim() ||
    "Objetos autorais e funcionais impressos em 3D sob encomenda. Escolha o modelo, personalize o acabamento e peça direto pelo WhatsApp.";

  return (
    <div className="mx-auto max-w-[1320px] space-y-16 px-4 pt-8 pb-6 sm:space-y-20 sm:px-8 sm:pt-12">
      {/* 1. Hero curto */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_DEFAULT }}
        className="relative overflow-hidden rounded-[28px] border border-line/90 bg-surface/90 p-6 shadow-card sm:p-10 lg:p-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/12 blur-3xl"
        />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              <span
                className="inline-block h-[2px] w-4 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span>Impressão 3D sob encomenda</span>
            </p>

            <h1 className="font-display text-[40px] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink sm:text-[58px] lg:text-[64px]">
              {settings.name}
              <span className="text-accent">.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/catalogo"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-6 text-[15px] font-semibold text-ink shadow-xs transition-all hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <MessageCircle
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  />
                  Pedir no WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[24px] bg-gradient-to-br from-accent to-accent-strong p-5 text-accent-foreground shadow-card">
              <Sparkles className="h-5 w-5 opacity-85" aria-hidden="true" />
              <p className="mt-5 font-display text-3xl font-extrabold tracking-[-0.03em] tabular-nums">
                {products.length}
              </p>
              <p className="mt-1 text-xs font-medium opacity-85">
                modelos prontos para impressão
              </p>
            </div>

            <div className="rounded-[24px] bg-ink-deep p-5 text-white shadow-card">
              <Layers className="h-5 w-5 text-blue-300" aria-hidden="true" />
              <p className="mt-5 font-display text-3xl font-extrabold tracking-[-0.03em] tabular-nums">
                {categories.length}
              </p>
              <p className="mt-1 text-xs font-medium text-white/75">
                coleções curadas em destaque
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Categorias em destaque (show_on_home) */}
      {homeCategories.length > 0 ? (
        <section aria-labelledby="home-categories-heading" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
                <span
                  className="inline-block h-[2px] w-4 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>Coleções</span>
              </p>
              <h2
                id="home-categories-heading"
                className="mt-1.5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]"
              >
                Explore por categoria<span className="text-accent">.</span>
              </h2>
            </div>

            <Link
              href="/catalogo"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Ver catálogo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {homeCategories.map((cat, idx) => {
              const count = countByCategory.get(cat.id) ?? 0;
              return (
                <motion.div key={cat.id} variants={fadeInUp}>
                  <Link
                    href={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
                    className="group flex h-full flex-col justify-between rounded-[24px] border border-line/90 bg-surface p-6 shadow-card transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_14px_34px_rgba(31,79,255,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                        <Box className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-[#F1F5FD] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted tabular-nums">
                        {count} {count === 1 ? "peça" : "peças"}
                      </span>
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                          0{idx + 1}
                        </span>
                        <h3 className="mt-1 font-display text-xl font-bold tracking-[-0.02em] text-ink">
                          {cat.name}
                        </h3>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      ) : null}

      {/* 3. Produtos em destaque (featured) */}
      <section aria-labelledby="home-featured-heading" className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              <span
                className="inline-block h-[2px] w-4 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span>Destaques da vitrine</span>
            </p>
            <h2
              id="home-featured-heading"
              className="mt-1.5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]"
            >
              Peças selecionadas<span className="text-accent">.</span>
            </h2>
          </div>

          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            Ver todas ({products.length})
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {showcasedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {showcasedProducts.map((product) => {
              const catName = product.category_id
                ? categoryNameById.get(product.category_id)
                : undefined;
              const subtitleParts = [catName, product.material].filter(Boolean);

              return (
                <StackedCard
                  key={product.id}
                  href={`/produto/${product.slug}`}
                  title={product.name}
                  subtitle={subtitleParts.join(" · ") || undefined}
                  price={product.starting_price ?? product.price}
                  hasPriceFromPrefix={product.active_variants_count > 1}
                  optionsCount={product.active_variants_count}
                  imageUrl={product.cover_image_url}
                  imageAlt={product.name}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-line bg-surface p-10 text-center shadow-card">
            <p className="font-display text-lg font-bold text-ink">
              Nenhum produto em destaque no momento
            </p>
            <p className="mt-1 text-sm text-muted">
              Explore o catálogo completo ou aguarde novas adições à vitrine.
            </p>
          </div>
        )}
      </section>

      {/* 4. Bloco "Como pedir" em 3 passos */}
      <section aria-labelledby="home-steps-heading" className="space-y-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
            <span
              className="inline-block h-[2px] w-4 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span>Simples e direto</span>
          </p>
          <h2
            id="home-steps-heading"
            className="mt-1.5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]"
          >
            Como pedir<span className="text-accent">.</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Escolha a peça",
              description:
                "Navegue pelo catálogo, compare medidas na ficha técnica e selecione a variante ideal.",
              icon: Box,
              dark: false,
            },
            {
              step: "02",
              title: "Chame no WhatsApp",
              description:
                "Com um clique, envie a mensagem já preenchida com o nome do modelo, variante e link.",
              icon: MessageCircle,
              dark: false,
            },
            {
              step: "03",
              title: "Receba sua impressão",
              description:
                "Confirmamos cor, prazo de produção e entrega para imprimir sua peça sob medida.",
              icon: PackageCheck,
              dark: true,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={
                  item.dark
                    ? "flex flex-col justify-between rounded-[24px] bg-ink-deep p-6 text-white shadow-card"
                    : "flex flex-col justify-between rounded-[24px] border border-line bg-surface p-6 shadow-card"
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className={
                      item.dark
                        ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-blue-300"
                        : "flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent"
                    }
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className={
                      item.dark
                        ? "font-display text-sm font-bold text-white/60"
                        : "font-display text-sm font-bold text-muted"
                    }
                  >
                    PASSO {item.step}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p
                    className={
                      item.dark
                        ? "mt-2 text-sm leading-relaxed text-white/75"
                        : "mt-2 text-sm leading-relaxed text-muted"
                    }
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
