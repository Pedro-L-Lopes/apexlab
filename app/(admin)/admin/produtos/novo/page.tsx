import type { Metadata } from "next";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminImportJobById } from "@/lib/import/jobs";
import { getAdminCategories } from "@/lib/queries/admin";
import { slugify } from "@/lib/utils";
import {
  ProductFormClient,
  type AdminProductPrefill,
} from "@/components/admin/product-form-client";

export const metadata: Metadata = {
  title: "Novo produto",
};

interface AdminNewProductPageProps {
  searchParams: Promise<{ importJobId?: string }>;
}

export default async function AdminNewProductPage({
  searchParams,
}: AdminNewProductPageProps) {
  const [{ supabase }, resolvedParams] = await Promise.all([
    requireAdminPage(),
    searchParams,
  ]);
  const categories = await getAdminCategories(supabase);

  let initialPrefill: AdminProductPrefill | null = null;
  const rawJobId = resolvedParams.importJobId?.trim();

  if (rawJobId && z.string().uuid().safeParse(rawJobId).success) {
    const job = await getAdminImportJobById(supabase, rawJobId);
    if (job) {
      const extracted = job.extracted_data;
      const imageUrls = Array.from(
        new Set(
          [
            ...(extracted.cover_image_url ? [extracted.cover_image_url] : []),
            ...extracted.images,
          ].filter(Boolean)
        )
      );

      initialPrefill = {
        importJobId: job.id,
        name: extracted.title,
        slug: slugify(extracted.title),
        description: extracted.description || null,
        category_id: extracted.category_id ?? null,
        price: extracted.price ?? null,
        material: extracted.material ?? null,
        tags: extracted.tags ?? [],
        images: imageUrls.map((url, idx) => ({
          url,
          is_cover: idx === 0,
        })),
        private_data: {
          stl_url: extracted.stl_url ?? job.stl_url ?? null,
          source_url: job.source_url,
          license: extracted.license ?? null,
        },
        warning: job.error_message ?? extracted.extraction_warning ?? null,
        duplicateProduct: job.duplicate_product
          ? {
              id: job.duplicate_product.id,
              name: job.duplicate_product.name,
              slug: job.duplicate_product.slug,
            }
          : null,
      };
    }
  }

  return (
    <ProductFormClient
      key={initialPrefill?.importJobId ?? "manual-new"}
      initialProduct={null}
      categories={categories}
      initialPrefill={initialPrefill}
    />
  );
}
