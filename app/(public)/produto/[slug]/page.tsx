import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicProductBySlug,
  getPublicSiteSettings,
} from "@/lib/queries/public";
import { ProductDetailClient } from "@/components/public/product-detail-client";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicSiteSettings(),
  ]);

  if (!detail) {
    return {
      title: "Produto não encontrado",
    };
  }

  const storeName = settings?.name?.trim() || "Catálogo 3D";
  const description =
    detail.product.description?.trim() ||
    `${detail.product.name} — impressão 3D sob encomenda em ${storeName}.`;
  const coverUrl =
    detail.images[0]?.url ?? detail.product.cover_image_url ?? undefined;

  return {
    title: detail.product.name,
    description,
    openGraph: {
      title: `${detail.product.name} · ${storeName}`,
      description,
      images: coverUrl ? [{ url: coverUrl, alt: detail.product.name }] : undefined,
    },
  };
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <Skeleton className="aspect-[4/5] w-full rounded-[26px]" />
        </div>
        <div className="space-y-4 lg:col-span-6">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-44 w-full rounded-[22px]" />
        </div>
      </div>
    </div>
  );
}

async function ProductDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, siteSettings] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicSiteSettings(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={detail.product}
      category={detail.category}
      images={detail.images}
      variants={detail.variants}
      related={detail.related}
      siteSettings={siteSettings}
    />
  );
}

export default function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
