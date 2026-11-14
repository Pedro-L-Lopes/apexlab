"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
  ArrowRight,
  Box,
  MessageCircle,
  PackageCheck,
} from "lucide-react";
import { EASE_DEFAULT, fadeInUp, staggerContainer } from "@/lib/motion";
import type {
  HeroMode,
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
  const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
  const countByCategory = new Map<string, number>();

  for (const product of products) {
    if (!product.category_id) continue;
    countByCategory.set(
      product.category_id,
      (countByCategory.get(product.category_id) ?? 0) + 1
    );
    const cat = categoryById.get(product.category_id);
    if (cat?.parent_id) {
      countByCategory.set(
        cat.parent_id,
        (countByCategory.get(cat.parent_id) ?? 0) + 1
      );
    }
  }

  const categoriesWithActiveProducts = categories.filter(
    (cat) => (countByCategory.get(cat.id) ?? 0) > 0
  );
  const homeCategories = categoriesWithActiveProducts
    .filter((cat) => cat.show_on_home)
    .slice(0, 6);

  const selectedHomeCategory = settings.home_category_id
    ? categoryById.get(settings.home_category_id) ?? null
    : null;

  const homeCategoryProducts = selectedHomeCategory
    ? products
        .filter((p) => {
          if (!p.category_id) return false;
          if (p.category_id === selectedHomeCategory.id) return true;
          return categoryById.get(p.category_id)?.parent_id === selectedHomeCategory.id;
        })
        .sort((a, b) => a.position - b.position)
    : [];

  const featuredProducts = products.filter((p) => p.featured);
  const showcasedProducts = selectedHomeCategory
    ? homeCategoryProducts.slice(0, 8)
    : (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 8);

  let sectionViewAllHref = "/catalogo";
  if (selectedHomeCategory) {
    const parentCat = selectedHomeCategory.parent_id
      ? categoryById.get(selectedHomeCategory.parent_id)
      : null;
    sectionViewAllHref = parentCat
      ? `/catalogo?categoria=${encodeURIComponent(parentCat.slug)}&subcategoria=${encodeURIComponent(selectedHomeCategory.slug)}`
      : `/catalogo?categoria=${encodeURIComponent(selectedHomeCategory.slug)}`;
  }

  const sectionEyebrow = selectedHomeCategory
    ? "Categoria em destaque"
    : "Destaques da vitrine";
  const sectionTitle = selectedHomeCategory
    ? selectedHomeCategory.name
    : "Peças selecionadas";
  const sectionTotalCount = selectedHomeCategory
    ? homeCategoryProducts.length
    : products.length;

  const categoryNameById = new Map<string, string>(
    categories.map((cat) => [cat.id, cat.name])
  );

  const whatsappUrl = buildWhatsAppGeneralUrl(
    settings.whatsapp,
    `Olá! Vi a vitrine do ${settings.name} e quero fazer uma encomenda 3D.`
  );

  const heroSubtitle =
    settings.description?.trim() ||
    "Peças 3D autorais e funcionais sob encomenda.";

  const bannerUrl = settings.banner_url?.trim() || null;
  const effectiveHeroMode: HeroMode =
    settings.hero_mode === "image" && !bannerUrl ? "text" : settings.hero_mode;

  const statsSummary = `${products.length} ${
    products.length === 1 ? "produto ativo" : "produtos ativos"
  } · ${categoriesWithActiveProducts.length} ${
    categoriesWithActiveProducts.length === 1
      ? "categoria com produtos ativos"
      : "categorias com produtos ativos"
  }`;

  return (
    <div className="mx-auto max-w-[1320px] space-y-12 px-4 pt-4 pb-6 sm:space-y-16 sm:px-8 sm:pt-6">
      {/* 1. Hero compacto (text | image | none) */}
      {effectiveHeroMode === "image" && bannerUrl ? (
        <motion.section
          data-hero-mode="image"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_DEFAULT }}
          className="relative aspect-[2/1] max-h-[220px] w-full overflow-hidden rounded-[24px] border border-line/90 bg-ink-deep shadow-card sm:aspect-[3/1] sm:max-h-[280px] sm:rounded-[28px]"
        >
          <Image
            src={bannerUrl}
            alt={settings.name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 1320px"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink-deep/85 via-ink-deep/45 to-ink-deep/15"
          />
          <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:p-8 lg:px-10">
            <div className="min-w-0 space-y-1 sm:space-y-1.5">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 sm:text-xs">
                {statsSummary}
              </p>
              <h1 className="truncate font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-[38px] lg:text-[44px]">
                {settings.name}
                <span className="text-accent">.</span>
              </h1>
              <p className="line-clamp-1 max-w-xl text-xs text-white/85 sm:text-sm">
                {heroSubtitle}
              </p>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0 sm:gap-2.5">
              <Link
                href="/catalogo"
                className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-accent px-3 text-[12px] font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
              >
                Explorar catálogo
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </Link>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-white/25 bg-surface/95 px-3 text-[12px] font-semibold text-ink shadow-xs transition-all hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" aria-hidden="true" />
                  Pedir no WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      {effectiveHeroMode === "text" ? (
        <motion.section
          data-hero-mode="text"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_DEFAULT }}
          className="relative overflow-hidden rounded-[24px] border border-line/90 bg-surface/90 px-4 py-4 shadow-card sm:rounded-[28px] sm:px-8 sm:py-6 lg:px-10 lg:py-7"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 space-y-1.5 sm:space-y-2">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.09em] text-accent-ink sm:text-xs sm:tracking-[0.12em]">
                <span
                  className="inline-block h-[2px] w-4 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span className="min-w-0">Impressão 3D · {statsSummary}</span>
              </p>

              <h1 className="font-display text-[28px] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[38px] lg:text-[44px]">
                {settings.name}
                <span className="text-accent">.</span>
              </h1>

              <p className="line-clamp-1 max-w-2xl text-[13px] leading-snug text-muted sm:text-base">
                {heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 lg:shrink-0 lg:gap-2.5 lg:pt-0">
              <Link
                href="/catalogo"
                className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-accent px-3 text-[12px] font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 active:scale-[0.98] sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
              >
                Explorar catálogo
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </Link>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-[12px] font-semibold text-ink shadow-xs transition-all hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
                >
                  <MessageCircle
                    className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  Pedir no WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      {/* 2. Categorias em destaque (show_on_home) */}
      {homeCategories.length > 0 ? (
        <section aria-labelledby="home-categories-heading" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-ink">
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
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
            >
              Ver catálogo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="-mx-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
          >
            {homeCategories.map((cat) => {
              const count = countByCategory.get(cat.id) ?? 0;
              return (
                <motion.div
                  key={cat.id}
                  variants={fadeInUp}
                  className="w-[41%] min-w-[144px] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:shrink"
                >
                  <Link
                    href={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
                    className="group flex h-24 flex-col justify-between rounded-[20px] border border-line/90 bg-surface px-3.5 py-3 shadow-card transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_28px_rgba(31,79,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:px-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                        <Box className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-[#F1F5FD] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted tabular-nums whitespace-nowrap">
                        {count} {count === 1 ? "peça" : "peças"}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 font-display text-[13.5px] font-bold leading-[1.18] tracking-[-0.02em] text-ink sm:text-sm">
                      {cat.name}
                    </h3>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      ) : null}

      {/* 3. Produtos da home (categoria configurada ou destaques) */}
      <section aria-labelledby="home-featured-heading" className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-ink">
              <span
                className="inline-block h-[2px] w-4 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span>{sectionEyebrow}</span>
            </p>
            <h2
              id="home-featured-heading"
              className="mt-1.5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]"
            >
              {sectionTitle}
              <span className="text-accent">.</span>
            </h2>
          </div>

          <Link
            href={sectionViewAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
          >
            Ver todos ({sectionTotalCount})
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
              {selectedHomeCategory
                ? "Nenhum produto ativo nesta categoria"
                : "Nenhum produto em destaque no momento"}
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
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-ink">
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
