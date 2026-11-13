"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { PackageSearch, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { PublicCategory, PublicProductListing } from "@/lib/queries/public";
import { EASE_DEFAULT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/input";
import { PillTabs } from "@/components/ui/pill-tabs";
import { DensitySelector, type GridDensity } from "@/components/ui/density-selector";
import { SelectableChip } from "@/components/ui/controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StackedCard } from "@/components/ui/stacked-card";
import { Button } from "@/components/ui/button";

export type CatalogSortOption =
  | "destaque"
  | "menor-preco"
  | "maior-preco"
  | "recentes";

interface CatalogClientProps {
  categories: PublicCategory[];
  products: PublicProductListing[];
  initialCategory: string;
  initialSubcategory: string;
  initialTag: string;
  initialQuery: string;
  initialSort: CatalogSortOption;
  initialPage: number;
}

const PAGE_SIZE = 24;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getEffectivePrice(product: PublicProductListing): number | null {
  return product.starting_price ?? product.price;
}

const DESKTOP_GRID_CLASS: Record<GridDensity, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function CatalogClient({
  categories,
  products,
  initialCategory,
  initialSubcategory,
  initialTag,
  initialQuery,
  initialSort,
  initialPage,
}: CatalogClientProps) {
  const [selectedCategory, setSelectedCategory] = React.useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] =
    React.useState(initialSubcategory);
  const [selectedTag, setSelectedTag] = React.useState(initialTag);
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [sortBy, setSortBy] = React.useState<CatalogSortOption>(initialSort);
  const [page, setPage] = React.useState(Math.max(1, initialPage));
  const [density, setDensity] = React.useState<GridDensity>(3);

  const categoryById = React.useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories]
  );

  const parentCategories = React.useMemo(
    () =>
      categories
        .filter((cat) => cat.parent_id === null)
        .sort((a, b) => a.position - b.position),
    [categories]
  );

  const childrenByParentId = React.useMemo(() => {
    const map = new Map<string, PublicCategory[]>();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      const list = map.get(cat.parent_id) ?? [];
      list.push(cat);
      map.set(cat.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [categories]);

  const activeParent = React.useMemo(
    () => parentCategories.find((cat) => cat.slug === selectedCategory) ?? null,
    [parentCategories, selectedCategory]
  );

  const activeSubcategories = React.useMemo(
    () => (activeParent ? childrenByParentId.get(activeParent.id) ?? [] : []),
    [activeParent, childrenByParentId]
  );

  const activeSubcategoryObj = React.useMemo(
    () =>
      activeSubcategories.find((sub) => sub.slug === selectedSubcategory) ?? null,
    [activeSubcategories, selectedSubcategory]
  );

  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    for (const product of products) {
      for (const tag of product.tags) {
        if (tag.trim()) tagSet.add(tag.trim());
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const categoryTabs = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.category_id) continue;
      const cat = categoryById.get(product.category_id);
      if (!cat) continue;
      const rootId = cat.parent_id ?? cat.id;
      counts.set(rootId, (counts.get(rootId) ?? 0) + 1);
    }

    return [
      { value: "todos", label: "Todos", count: products.length },
      ...parentCategories.map((cat) => ({
        value: cat.slug,
        label: cat.name,
        count: counts.get(cat.id) ?? 0,
      })),
    ];
  }, [categoryById, parentCategories, products]);

  const filteredProducts = React.useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());

    const matching = products.filter((product) => {
      if (activeParent) {
        if (activeSubcategoryObj) {
          if (product.category_id !== activeSubcategoryObj.id) return false;
        } else {
          const validIds = new Set([
            activeParent.id,
            ...activeSubcategories.map((sub) => sub.id),
          ]);
          if (!product.category_id || !validIds.has(product.category_id)) {
            return false;
          }
        }
      }

      if (selectedTag && !product.tags.includes(selectedTag)) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = normalizeText(
          [
            product.name,
            product.description ?? "",
            product.material ?? "",
            ...product.tags,
          ].join(" ")
        );
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });

    return [...matching].sort((a, b) => {
      if (sortBy === "menor-preco") {
        const priceA = getEffectivePrice(a) ?? Number.POSITIVE_INFINITY;
        const priceB = getEffectivePrice(b) ?? Number.POSITIVE_INFINITY;
        if (priceA !== priceB) return priceA - priceB;
        return a.position - b.position;
      }
      if (sortBy === "maior-preco") {
        const priceA = getEffectivePrice(a) ?? Number.NEGATIVE_INFINITY;
        const priceB = getEffectivePrice(b) ?? Number.NEGATIVE_INFINITY;
        if (priceA !== priceB) return priceB - priceA;
        return a.position - b.position;
      }
      if (sortBy === "recentes") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [
    activeParent,
    activeSubcategories,
    activeSubcategoryObj,
    products,
    searchQuery,
    selectedTag,
    sortBy,
  ]);

  const visibleProducts = React.useMemo(
    () => filteredProducts.slice(0, page * PAGE_SIZE),
    [filteredProducts, page]
  );

  const hasMore = filteredProducts.length > visibleProducts.length;
  const remainingCount = filteredProducts.length - visibleProducts.length;

  const hasActiveFilters =
    selectedCategory !== "todos" ||
    selectedSubcategory !== "" ||
    selectedTag !== "" ||
    searchQuery.trim() !== "" ||
    sortBy !== "destaque";

  // Sync URL query params silently without full page reload
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "todos") {
      params.set("categoria", selectedCategory);
    }
    if (activeSubcategoryObj) {
      params.set("subcategoria", activeSubcategoryObj.slug);
    }
    if (selectedTag) {
      params.set("tag", selectedTag);
    }
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (sortBy !== "destaque") {
      params.set("ordem", sortBy);
    }
    if (page > 1) {
      params.set("pagina", String(page));
    }

    const qs = params.toString();
    const targetUrl = qs ? `/catalogo?${qs}` : "/catalogo";
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== targetUrl) {
      window.history.replaceState(null, "", targetUrl);
    }
  }, [
    activeSubcategoryObj,
    page,
    searchQuery,
    selectedCategory,
    selectedTag,
    sortBy,
  ]);

  const handleCategoryChange = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    setSelectedSubcategory("");
    setPage(1);
  };

  const handleSubcategoryToggle = (slug: string) => {
    setSelectedSubcategory((prev) => (prev === slug ? "" : slug));
    setPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? "" : tag));
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as CatalogSortOption);
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedCategory("todos");
    setSelectedSubcategory("");
    setSelectedTag("");
    setSearchQuery("");
    setSortBy("destaque");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        eyebrow="Catálogo completo"
        title={
          <>
            Catálogo<span className="text-accent">.</span>
          </>
        }
        subtitle={`${filteredProducts.length} ${
          filteredProducts.length === 1 ? "peça disponível" : "peças disponíveis"
        } · impressão 3D sob demanda`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar produto..."
              resultLabel={`${filteredProducts.length} ${
                filteredProducts.length === 1 ? "resultado" : "resultados"
              }`}
              className="w-full sm:w-64"
            />

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger
                aria-label="Ordenar catálogo"
                className="w-full sm:w-44"
              >
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="destaque">Destaques</SelectItem>
                <SelectItem value="menor-preco">Menor preço</SelectItem>
                <SelectItem value="maior-preco">Maior preço</SelectItem>
                <SelectItem value="recentes">Mais recentes</SelectItem>
              </SelectContent>
            </Select>

            <DensitySelector
              value={density}
              onChange={setDensity}
              layoutId="catalog-density-pill"
              className="hidden lg:inline-flex"
            />
          </div>
        }
      />

      {/* Category & tag filters */}
      <div className="mt-8 space-y-3">
        <div className="overflow-x-auto pb-1">
          <PillTabs
            items={categoryTabs}
            value={selectedCategory}
            onChange={handleCategoryChange}
            layoutId="catalog-category-pill"
            variant="rail"
          />
        </div>

        {activeSubcategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Subcategorias:
            </span>
            <SelectableChip
              selected={selectedSubcategory === ""}
              onClick={() => {
                setSelectedSubcategory("");
                setPage(1);
              }}
            >
              Todas
            </SelectableChip>
            {activeSubcategories.map((sub) => (
              <SelectableChip
                key={sub.id}
                selected={selectedSubcategory === sub.slug}
                onClick={() => handleSubcategoryToggle(sub.slug)}
              >
                {sub.name}
              </SelectableChip>
            ))}
          </div>
        )}

        {(allTags.length > 0 || hasActiveFilters) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {allTags.map((tag) => (
              <SelectableChip
                key={tag}
                selected={selectedTag === tag}
                onClick={() => handleTagToggle(tag)}
              >
                #{tag}
              </SelectableChip>
            ))}

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Product Grid */}
      {visibleProducts.length > 0 ? (
        <>
          <motion.div
            layout
            className={cn(
              "mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 sm:gap-6",
              DESKTOP_GRID_CLASS[density]
            )}
          >
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((product) => {
                const categoryName = product.category_id
                  ? categoryById.get(product.category_id)?.name
                  : undefined;
                const displayPrice = getEffectivePrice(product);

                return (
                  <motion.div
                    key={product.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: EASE_DEFAULT }}
                  >
                    <StackedCard
                      title={product.name}
                      subtitle={categoryName ?? product.material ?? undefined}
                      price={displayPrice}
                      hasPriceFromPrefix={
                        product.active_variants_count > 1 &&
                        displayPrice !== null
                      }
                      optionsCount={product.active_variants_count}
                      imageUrl={product.cover_image_url}
                      href={`/produto/${product.slug}`}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setPage((prev) => prev + 1)}
              >
                Carregar mais ({remainingCount}{" "}
                {remainingCount === 1 ? "restante" : "restantes"})
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-12 rounded-[26px] border border-dashed border-line bg-surface-glass px-6 py-16 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <PackageSearch className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">
            Nenhuma peça encontrada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Não encontramos peças para os filtros selecionados. Tente outro termo
            ou limpe os filtros para ver todo o catálogo.
          </p>
          <div className="mt-6">
            <Button type="button" variant="primary" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
