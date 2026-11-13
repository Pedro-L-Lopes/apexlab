import { Suspense } from "react";
import type { Metadata } from "next";
import { z } from "zod";
import {
  getPublicCategories,
  getPublicProductsListing,
  getPublicSiteSettings,
} from "@/lib/queries/public";
import {
  CatalogClient,
  type CatalogSortOption,
} from "@/components/public/catalog-client";
import { Skeleton } from "@/components/ui/skeleton";

const catalogSearchSchema = z.object({
  categoria: z.string().trim().max(80).optional(),
  subcategoria: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  ordem: z
    .enum(["destaque", "menor-preco", "maior-preco", "recentes"])
    .optional(),
  pagina: z.coerce.number().int().min(1).max(100).optional(),
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: "Catálogo",
    description:
      settings?.description?.trim() ||
      "Explore todas as peças impressas em 3D disponíveis sob encomenda.",
  };
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="mt-8 flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 sm:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-[26px]" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const normalizedInput = {
    categoria: Array.isArray(rawParams.categoria)
      ? rawParams.categoria[0]
      : rawParams.categoria,
    subcategoria: Array.isArray(rawParams.subcategoria)
      ? rawParams.subcategoria[0]
      : rawParams.subcategoria,
    tag: Array.isArray(rawParams.tag) ? rawParams.tag[0] : rawParams.tag,
    q: Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q,
    ordem: Array.isArray(rawParams.ordem)
      ? rawParams.ordem[0]
      : rawParams.ordem,
    pagina: Array.isArray(rawParams.pagina)
      ? rawParams.pagina[0]
      : rawParams.pagina,
  };

  const parsed = catalogSearchSchema.safeParse(normalizedInput);
  const queryValues = parsed.success ? parsed.data : {};

  const [categories, products] = await Promise.all([
    getPublicCategories(),
    getPublicProductsListing(),
  ]);

  let initialCategory = "todos";
  let initialSubcategory = "";

  if (queryValues.categoria) {
    const matched = categories.find((cat) => cat.slug === queryValues.categoria);
    if (matched) {
      if (matched.parent_id === null) {
        initialCategory = matched.slug;
      } else {
        const parent = categories.find((cat) => cat.id === matched.parent_id);
        if (parent) {
          initialCategory = parent.slug;
          initialSubcategory = matched.slug;
        }
      }
    }
  }

  if (queryValues.subcategoria) {
    const matchedSub = categories.find(
      (cat) => cat.slug === queryValues.subcategoria && cat.parent_id !== null
    );
    if (matchedSub) {
      initialSubcategory = matchedSub.slug;
      if (initialCategory === "todos") {
        const parent = categories.find((cat) => cat.id === matchedSub.parent_id);
        if (parent) initialCategory = parent.slug;
      }
    }
  }

  const initialSort: CatalogSortOption = queryValues.ordem ?? "destaque";

  return (
    <CatalogClient
      categories={categories}
      products={products}
      initialCategory={initialCategory}
      initialSubcategory={initialSubcategory}
      initialTag={queryValues.tag ?? ""}
      initialQuery={queryValues.q ?? ""}
      initialSort={initialSort}
      initialPage={queryValues.pagina ?? 1}
    />
  );
}

export default function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}
