"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Layers,
  MessageCircle,
  Palette,
  Ruler,
  Scale,
} from "lucide-react";
import type {
  PublicCategory,
  PublicProductImage,
  PublicProductListing,
  PublicProductVariant,
  PublicSiteSettings,
} from "@/lib/queries/public";
import { buildWhatsAppProductUrl } from "@/lib/whatsapp";
import { formatCurrencyBRL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SelectableChip } from "@/components/ui/controls";
import { StackedCard } from "@/components/ui/stacked-card";
import { ProductGallery } from "@/components/public/product-gallery";

interface ProductDetailClientProps {
  product: PublicProductListing;
  category: PublicCategory | null;
  images: PublicProductImage[];
  variants: PublicProductVariant[];
  related: PublicProductListing[];
  siteSettings: PublicSiteSettings | null;
}

function formatPrintTime(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

function formatDimensions(
  width: number | null,
  height: number | null,
  depth: number | null
): string | null {
  const parts = [width, height, depth].filter(
    (value): value is number => typeof value === "number" && value > 0
  );
  if (parts.length === 0) return null;
  if (width && height && depth) {
    return `${width} × ${height} × ${depth} mm`;
  }
  return `${parts.join(" × ")} mm`;
}

function extractVariantAttributes(
  attributes: unknown
): Array<{ key: string; value: string }> {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return [];
  }
  const entries: Array<{ key: string; value: string }> = [];
  for (const [key, rawValue] of Object.entries(
    attributes as Record<string, unknown>
  )) {
    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      entries.push({
        key,
        value: typeof rawValue === "boolean" ? (rawValue ? "Sim" : "Não") : String(rawValue),
      });
    }
  }
  return entries;
}

export function ProductDetailClient({
  product,
  category,
  images,
  variants,
  related,
  siteSettings,
}: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(variants[0]?.id ?? null);

  const productUrl = React.useSyncExternalStore(
    () => () => {},
    () => window.location.href,
    () => {
      const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(
        /\/$/,
        ""
      );
      return siteBase
        ? `${siteBase}/produto/${product.slug}`
        : `/produto/${product.slug}`;
    }
  );

  const selectedVariant = React.useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants]
  );

  const effectivePrice = selectedVariant
    ? selectedVariant.price ?? product.price
    : product.starting_price ?? product.price;

  const hasVariedPrices = React.useMemo(() => {
    const prices = variants
      .map((variant) => variant.price ?? product.price)
      .filter((value): value is number => value !== null);
    return new Set(prices).size > 1;
  }, [product.price, variants]);

  const effectiveWidth = selectedVariant?.width_mm ?? product.width_mm;
  const effectiveHeight = selectedVariant?.height_mm ?? product.height_mm;
  const effectiveDepth = selectedVariant?.depth_mm ?? product.depth_mm;
  const effectiveWeight = selectedVariant?.weight_g ?? product.weight_g;

  const formattedTime = formatPrintTime(product.print_time_min);
  const formattedDimensions = formatDimensions(
    effectiveWidth,
    effectiveHeight,
    effectiveDepth
  );
  const variantAttributes = extractVariantAttributes(
    selectedVariant?.attributes
  );

  const hasSpecs =
    Boolean(product.material) ||
    Boolean(formattedTime) ||
    Boolean(formattedDimensions) ||
    effectiveWeight !== null ||
    product.colors.length > 0 ||
    variantAttributes.length > 0;

  const whatsappUrl = siteSettings
    ? buildWhatsAppProductUrl({
        whatsapp: siteSettings.whatsapp,
        template: siteSettings.whatsapp_message_template,
        productName: product.name,
        variantName: selectedVariant?.name,
        productUrl,
      })
    : null;

  return (
    <div
      className={
        whatsappUrl
          ? "mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-20 sm:pt-10"
          : "mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10"
      }
    >
      {/* Breadcrumb */}
      <nav
        aria-label="Navegação estrutural"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted"
      >
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1 rounded-full py-1 pr-2 text-ink transition hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Catálogo
        </Link>

        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
            <Link
              href={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}
              className="transition hover:text-ink"
            >
              {category.name}
            </Link>
          </>
        )}

        <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
        <span className="truncate text-muted">{product.name}</span>
      </nav>

      {/* Main Two-Column Section */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <ProductGallery images={images} productName={product.name} />
        </div>

        <div className="flex flex-col lg:col-span-6">
          {/* Badges & Category */}
          <div className="flex flex-wrap items-center gap-2">
            {category && <Badge variant="options">{category.name}</Badge>}
            {product.featured && <Badge variant="accent">Destaque</Badge>}
            {variants.length > 0 && (
              <Badge variant="options">
                {variants.length}{" "}
                {variants.length === 1 ? "variação" : "variações"}
              </Badge>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {product.name}
          </h1>

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {effectivePrice !== null ? (
              <span className="font-display text-3xl font-bold text-ink">
                {formatCurrencyBRL(effectivePrice)}
              </span>
            ) : (
              <span className="font-display text-2xl font-bold text-ink">
                Sob consulta
              </span>
            )}

            {hasVariedPrices && product.starting_price !== null && (
              <span className="text-xs font-medium text-muted">
                A partir de {formatCurrencyBRL(product.starting_price)}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted sm:text-base">
              {product.description}
            </p>
          )}

          {/* Variants Selector */}
          {variants.length > 0 && (
            <div className="mt-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Escolha a variação
                </span>
                {selectedVariant && (
                  <span className="text-xs font-medium text-ink">
                    {selectedVariant.name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const isSelected = variant.id === selectedVariant?.id;
                  const variantPrice = variant.price ?? product.price;
                  return (
                    <SelectableChip
                      key={variant.id}
                      selected={isSelected}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <span>{variant.name}</span>
                      {variantPrice !== null && (
                        <span
                          className={
                            isSelected ? "text-accent-foreground/85" : "text-muted"
                          }
                        >
                          · {formatCurrencyBRL(variantPrice)}
                        </span>
                      )}
                    </SelectableChip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ficha Técnica */}
          {hasSpecs && (
            <div className="mt-7 rounded-[22px] border border-line bg-surface-glass p-5 shadow-card">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Ficha técnica
              </h2>

              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {product.material && (
                  <div className="flex items-start gap-2.5">
                    <Layers className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs text-muted">Material</dt>
                      <dd className="font-medium text-ink">{product.material}</dd>
                    </div>
                  </div>
                )}

                {formattedTime && (
                  <div className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs text-muted">Tempo estimado</dt>
                      <dd className="font-medium text-ink">{formattedTime}</dd>
                    </div>
                  </div>
                )}

                {formattedDimensions && (
                  <div className="flex items-start gap-2.5">
                    <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs text-muted">Dimensões</dt>
                      <dd className="font-medium text-ink">
                        {formattedDimensions}
                      </dd>
                    </div>
                  </div>
                )}

                {effectiveWeight !== null && (
                  <div className="flex items-start gap-2.5">
                    <Scale className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs text-muted">Peso aproximado</dt>
                      <dd className="font-medium text-ink">
                        {effectiveWeight} g
                      </dd>
                    </div>
                  </div>
                )}

                {variantAttributes.map((attr) => (
                  <div key={attr.key} className="col-span-1">
                    <dt className="text-xs capitalize text-muted">
                      {attr.key}
                    </dt>
                    <dd className="font-medium text-ink">{attr.value}</dd>
                  </div>
                ))}
              </dl>

              {product.colors.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Palette className="h-3.5 w-3.5 text-accent" />
                    <span>Cores disponíveis</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.colors.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/catalogo?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:border-ink/30 hover:text-ink"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Desktop WhatsApp CTA (hidden when whatsapp is empty) */}
          {whatsappUrl && (
            <div className="mt-8 hidden lg:block">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "w-full",
                })}
              >
                <MessageCircle className="h-4 w-4" />
                Pedir no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-12 sm:mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Sugestões do catálogo
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Você também pode gostar
              </h2>
            </div>

            {category && (
              <Link
                href={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}
                className="text-sm font-medium text-accent transition hover:underline"
              >
                Ver categoria
              </Link>
            )}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {related.map((item) => {
              const displayPrice = item.starting_price ?? item.price;
              return (
                <StackedCard
                  key={item.id}
                  title={item.name}
                  subtitle={item.material ?? undefined}
                  price={displayPrice}
                  hasPriceFromPrefix={
                    item.active_variants_count > 1 && displayPrice !== null
                  }
                  optionsCount={item.active_variants_count}
                  imageUrl={item.cover_image_url}
                  href={`/produto/${item.slug}`}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Mobile Sticky WhatsApp Bar (hidden when whatsapp is empty) */}
      {whatsappUrl && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur-md lg:hidden">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "primary",
              size: "lg",
              className: "w-full",
            })}
          >
            <MessageCircle className="h-4 w-4" />
            Pedir no WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
