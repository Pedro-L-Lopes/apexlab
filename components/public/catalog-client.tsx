"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  PackageSearch,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { PublicCategory, PublicProductListing } from "@/lib/queries/public";
import { EASE_DEFAULT, SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/input";
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

const SORT_LABELS: Record<CatalogSortOption, string> = {
  destaque: "Destaques",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
  recentes: "Mais recentes",
};

const SORT_OPTIONS: { value: CatalogSortOption; label: string }[] = [
  { value: "destaque", label: "Destaques" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "recentes", label: "Mais recentes" },
];

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
  const [density, setDensity] = React.useState<GridDensity>(4);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [tagSearch, setTagSearch] = React.useState("");

  const shouldReduceMotion = useReducedMotion();
  const filtersContainerRef = React.useRef<HTMLDivElement | null>(null);
  const categoryRailRef = React.useRef<HTMLDivElement | null>(null);
  const stickyTodosRef = React.useRef<HTMLDivElement | null>(null);
  const categoryBtnRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

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

  const { directCategoryCounts, parentCategoryCounts } = React.useMemo(() => {
    const direct = new Map<string, number>();
    const parent = new Map<string, number>();

    for (const product of products) {
      if (!product.category_id) continue;
      const cat = categoryById.get(product.category_id);
      if (!cat) continue;

      direct.set(cat.id, (direct.get(cat.id) ?? 0) + 1);
      const rootId = cat.parent_id ?? cat.id;
      parent.set(rootId, (parent.get(rootId) ?? 0) + 1);
    }

    return { directCategoryCounts: direct, parentCategoryCounts: parent };
  }, [categoryById, products]);

  const visibleParentCategories = React.useMemo(
    () =>
      parentCategories.filter((cat) => (parentCategoryCounts.get(cat.id) ?? 0) > 0),
    [parentCategories, parentCategoryCounts]
  );

  const activeParent = React.useMemo(
    () =>
      visibleParentCategories.find((cat) => cat.slug === selectedCategory) ?? null,
    [visibleParentCategories, selectedCategory]
  );

  const resolvedCategory = activeParent ? activeParent.slug : "todos";

  const activeSubcategories = React.useMemo(() => {
    if (!activeParent) return [];
    return (childrenByParentId.get(activeParent.id) ?? []).filter(
      (sub) => (directCategoryCounts.get(sub.id) ?? 0) > 0
    );
  }, [activeParent, childrenByParentId, directCategoryCounts]);

  const activeSubcategoryObj = React.useMemo(
    () =>
      activeSubcategories.find((sub) => sub.slug === selectedSubcategory) ?? null,
    [activeSubcategories, selectedSubcategory]
  );

  const tagStats = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const seenInProduct = new Set<string>();
      for (const rawTag of product.tags) {
        const tag = rawTag.trim();
        if (!tag || seenInProduct.has(tag)) continue;
        seenInProduct.add(tag);
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag, "pt-BR");
      });
  }, [products]);

  const filteredTagStats = React.useMemo(() => {
    const query = normalizeText(tagSearch.trim());
    if (!query) return tagStats;
    return tagStats.filter((item) => normalizeText(item.tag).includes(query));
  }, [tagSearch, tagStats]);

  const categoryTabs = React.useMemo(
    () => [
      { value: "todos", label: "Todos", count: products.length },
      ...visibleParentCategories.map((cat) => ({
        value: cat.slug,
        label: cat.name,
        count: parentCategoryCounts.get(cat.id) ?? 0,
      })),
    ],
    [parentCategoryCounts, products.length, visibleParentCategories]
  );

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

  const panelFilterCount =
    (selectedTag ? 1 : 0) + (sortBy !== "destaque" ? 1 : 0);

  const hasActiveFilters =
    Boolean(activeParent) ||
    Boolean(activeSubcategoryObj) ||
    selectedTag !== "" ||
    searchQuery.trim() !== "" ||
    sortBy !== "destaque";

  // Sync URL query params silently without full page reload
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (activeParent) {
      params.set("categoria", activeParent.slug);
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
    activeParent,
    activeSubcategoryObj,
    page,
    searchQuery,
    selectedTag,
    sortBy,
  ]);

  // Close Filters panel on Escape or outside click
  React.useEffect(() => {
    if (!filtersOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (!filtersContainerRef.current?.contains(target)) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [filtersOpen]);

  // Center the active category horizontally inside the scrollable rail without vertical scrolling
  const hasMountedRailRef = React.useRef(false);
  React.useEffect(() => {
    const rail = categoryRailRef.current;
    if (!rail) return;

    const isInitial = !hasMountedRailRef.current;
    hasMountedRailRef.current = true;
    const behavior: ScrollBehavior =
      shouldReduceMotion || isInitial ? "auto" : "smooth";

    if (resolvedCategory === "todos") {
      rail.scrollTo({ left: 0, behavior });
      return;
    }

    const btn = categoryBtnRefs.current.get(resolvedCategory);
    if (!btn) return;

    const stickyWidth = stickyTodosRef.current?.offsetWidth ?? 96;
    const visibleCenterOffset =
      stickyWidth + Math.max(0, rail.clientWidth - stickyWidth) / 2;
    const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const targetLeft = Math.min(
      maxScrollLeft,
      Math.max(0, btnCenter - visibleCenterOffset)
    );

    rail.scrollTo({ left: targetLeft, behavior });
  }, [resolvedCategory, shouldReduceMotion]);

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
    setTagSearch("");
    setPage(1);
  };

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (activeParent) {
    activeChips.push({
      key: `cat-${activeParent.slug}`,
      label: `Categoria: ${activeParent.name}`,
      onRemove: () => {
        setSelectedCategory("todos");
        setSelectedSubcategory("");
        setPage(1);
      },
    });
  }
  if (activeSubcategoryObj) {
    activeChips.push({
      key: `sub-${activeSubcategoryObj.slug}`,
      label: `Subcategoria: ${activeSubcategoryObj.name}`,
      onRemove: () => {
        setSelectedSubcategory("");
        setPage(1);
      },
    });
  }
  if (selectedTag) {
    activeChips.push({
      key: `tag-${selectedTag}`,
      label: `#${selectedTag}`,
      onRemove: () => {
        setSelectedTag("");
        setPage(1);
      },
    });
  }
  if (searchQuery.trim()) {
    activeChips.push({
      key: "query",
      label: `Busca: "${searchQuery.trim()}"`,
      onRemove: () => {
        setSearchQuery("");
        setPage(1);
      },
    });
  }
  if (sortBy !== "destaque") {
    activeChips.push({
      key: "sort",
      label: `Ordem: ${SORT_LABELS[sortBy]}`,
      onRemove: () => {
        setSortBy("destaque");
        setPage(1);
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
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
          <DensitySelector
            value={density}
            onChange={setDensity}
            layoutId="catalog-density-pill"
            className="hidden lg:inline-flex"
          />
        }
      />

      {/* Compact filter bar (same layout on mobile & desktop, directly over page background) */}
      <div className="mt-7">
        {/* Row 1: Search + Filters button + Popover / Bottom sheet */}
        <div
          ref={filtersContainerRef}
          className="relative z-30 flex items-center gap-2.5"
        >
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar produto..."
            className="min-w-0 flex-1"
          />

          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters-panel"
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              filtersOpen || panelFilterCount > 0
                ? "border-accent/40 bg-accent-soft text-accent-ink shadow-2xs"
                : "border-line bg-surface text-ink shadow-2xs hover:border-line-strong hover:bg-bg/70"
            )}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Filtros</span>
            {panelFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground tabular-nums">
                {panelFilterCount}
              </span>
            ) : null}
          </button>

          <AnimatePresence>
            {filtersOpen ? (
              <>
                <motion.div
                  key="catalog-filters-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.01 : 0.18 }}
                  onClick={() => setFiltersOpen(false)}
                  className="fixed inset-0 z-50 bg-ink-deep/40 backdrop-blur-[2px] md:hidden"
                  aria-hidden="true"
                />

                <motion.div
                  key="catalog-filters-panel"
                  id="catalog-filters-panel"
                  role="dialog"
                  aria-label="Filtros e ordenação"
                  initial={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
                  }
                  transition={{
                    duration: shouldReduceMotion ? 0.01 : 0.2,
                    ease: EASE_DEFAULT,
                  }}
                  className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[28px] border-t border-line bg-surface p-5 pb-6 shadow-hover md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:z-30 md:mt-2.5 md:max-h-[75vh] md:w-[390px] md:rounded-[24px] md:border md:border-line"
                >
                  <div
                    className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line md:hidden"
                    aria-hidden="true"
                  />

                  <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <h2 className="font-display text-base font-bold text-ink">
                        Filtros e ordenação
                      </h2>
                      <p className="text-xs text-muted">
                        Combine tags e ordene os resultados
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      aria-label="Fechar filtros"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
                    {/* Tags inside panel, ordered most-used first with search */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Tags
                        </span>
                        <span className="text-[11px] font-medium text-muted tabular-nums">
                          {tagStats.length}{" "}
                          {tagStats.length === 1 ? "disponível" : "disponíveis"}
                        </span>
                      </div>

                      {tagStats.length > 0 ? (
                        <>
                          <div className="relative mt-2">
                            <Search
                              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                              aria-hidden="true"
                            />
                            <input
                              type="search"
                              value={tagSearch}
                              onChange={(event) => setTagSearch(event.target.value)}
                              placeholder="Buscar tag..."
                              aria-label="Buscar tag"
                              className="h-9 w-full rounded-[12px] border border-line bg-bg/60 pl-8 pr-8 text-xs text-ink placeholder:text-muted/75 focus:border-accent/50 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
                            />
                            {tagSearch ? (
                              <button
                                type="button"
                                onClick={() => setTagSearch("")}
                                aria-label="Limpar busca de tags"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>

                          {filteredTagStats.length > 0 ? (
                            <div className="mt-2.5 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto py-0.5">
                              {filteredTagStats.map(({ tag, count }) => {
                                const isSelected = selectedTag === tag;
                                return (
                                  <SelectableChip
                                    key={tag}
                                    selected={isSelected}
                                    onClick={() => handleTagToggle(tag)}
                                    className="px-3 py-1 text-xs"
                                  >
                                    <span>#{tag}</span>
                                    <span
                                      className={cn(
                                        "text-[10px] tabular-nums",
                                        isSelected
                                          ? "text-accent-foreground/80"
                                          : "text-muted"
                                      )}
                                    >
                                      {count}
                                    </span>
                                  </SelectableChip>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-muted">
                              Nenhuma tag encontrada para &ldquo;{tagSearch}&rdquo;.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-muted">
                          Nenhuma tag cadastrada nos produtos ativos.
                        </p>
                      )}
                    </div>

                    {/* Sort options inside panel */}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Ordenar por
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {SORT_OPTIONS.map((option) => (
                          <SelectableChip
                            key={option.value}
                            selected={sortBy === option.value}
                            onClick={() => handleSortChange(option.value)}
                            className="justify-center py-2 text-xs"
                          >
                            {option.label}
                          </SelectableChip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      disabled={!hasActiveFilters}
                      className="text-muted hover:text-ink"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Limpar tudo
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Ver {filteredProducts.length}{" "}
                      {filteredProducts.length === 1 ? "peça" : "peças"}
                    </Button>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Row 2: Categories in a single horizontal scrollable line directly on page background */}
        <div className="relative mt-4">
          <div
            ref={categoryRailRef}
            role="tablist"
            aria-label="Categorias do catálogo"
            className="flex items-center gap-1.5 overflow-x-auto snap-x snap-mandatory py-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Fixed "Todos" item at the start */}
            <div
              ref={stickyTodosRef}
              className="sticky left-0 z-20 flex shrink-0 items-center bg-bg py-0.5 pr-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={resolvedCategory === "todos"}
                onClick={() => handleCategoryChange("todos")}
                className={cn(
                  "relative inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  resolvedCategory === "todos"
                    ? "text-accent-foreground"
                    : "text-muted hover:bg-surface/75 hover:text-ink"
                )}
              >
                {resolvedCategory === "todos" ? (
                  <motion.span
                    layoutId="catalog-category-pill"
                    transition={
                      shouldReduceMotion ? { duration: 0 } : SPRING_SNAPPY
                    }
                    className="absolute inset-0 rounded-full bg-accent shadow-xs"
                  />
                ) : null}
                <span className="relative z-10">Todos</span>
                <span
                  className={cn(
                    "relative z-10 text-[11px] font-medium tabular-nums",
                    resolvedCategory === "todos"
                      ? "text-accent-foreground/85"
                      : "text-muted"
                  )}
                >
                  {products.length}
                </span>
              </button>
              <span aria-hidden="true" className="ml-2 h-4 w-px bg-line/90" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -right-4 w-4 bg-gradient-to-r from-bg to-transparent"
              />
            </div>

            {categoryTabs
              .filter((tab) => tab.value !== "todos")
              .map((tab) => {
                const isActive = resolvedCategory === tab.value;
                return (
                  <button
                    key={tab.value}
                    ref={(el) => {
                      if (el) {
                        categoryBtnRefs.current.set(tab.value, el);
                      } else {
                        categoryBtnRefs.current.delete(tab.value);
                      }
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCategoryChange(tab.value)}
                    className={cn(
                      "relative inline-flex shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      isActive
                        ? "text-accent-foreground"
                        : "text-muted hover:bg-surface/75 hover:text-ink"
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="catalog-category-pill"
                        transition={
                          shouldReduceMotion ? { duration: 0 } : SPRING_SNAPPY
                        }
                        className="absolute inset-0 rounded-full bg-accent shadow-xs"
                      />
                    ) : null}
                    <span className="relative z-10">{tab.label}</span>
                    <span
                      className={cn(
                        "relative z-10 text-[11px] font-medium tabular-nums",
                        isActive ? "text-accent-foreground/85" : "text-muted"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg to-transparent"
          />
        </div>

        {/* Subcategories secondary smaller row (only when selected category has children with active products) */}
        {activeSubcategories.length > 0 ? (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 pr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Subcategorias:
            </span>
            <SelectableChip
              selected={selectedSubcategory === ""}
              onClick={() => {
                setSelectedSubcategory("");
                setPage(1);
              }}
              className="shrink-0 whitespace-nowrap px-3 py-1 text-[11px]"
            >
              Todas
            </SelectableChip>
            {activeSubcategories.map((sub) => (
              <SelectableChip
                key={sub.id}
                selected={selectedSubcategory === sub.slug}
                onClick={() => handleSubcategoryToggle(sub.slug)}
                className="shrink-0 whitespace-nowrap px-3 py-1 text-[11px]"
              >
                {sub.name}
              </SelectableChip>
            ))}
          </div>
        ) : null}

        {/* Result count + removable active filter chips + Limpar tudo + compact Sort select */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "peça" : "peças"}
            </span>

            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remover filtro ${chip.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink shadow-2xs transition-colors hover:border-line-strong hover:bg-bg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="max-w-[200px] truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0 text-muted" aria-hidden="true" />
              </button>
            ))}

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-accent-ink hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Limpar tudo
              </button>
            ) : null}
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger
              aria-label="Ordenar peças"
              className="h-8 w-auto min-w-[148px] shrink-0 rounded-full border-line bg-surface px-3 text-xs font-medium text-ink shadow-2xs"
            >
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product Grid */}
      {visibleProducts.length > 0 ? (
        <>
          <motion.div
            layout
            className={cn(
              "mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 sm:gap-6",
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
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
