import type { MetadataRoute } from "next";
import { getPublicProductsListing } from "@/lib/queries/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogo`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const products = await getPublicProductsListing();
    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/produto/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...baseEntries, ...productEntries];
  } catch {
    return baseEntries;
  }
}
