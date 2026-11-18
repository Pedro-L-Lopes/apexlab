import type { Metadata } from "next";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getAdminProductsList,
  type AdminProductStatus,
} from "@/lib/queries/admin";
import { ProductsTableClient } from "@/components/admin/products-table-client";

export const metadata: Metadata = {
  title: "Produtos",
};

const uuidSchema = z.string().uuid();

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ supabase }, rawParams] = await Promise.all([
    requireAdminPage(),
    searchParams,
  ]);
  const { products, categories } = await getAdminProductsList(supabase);

  const rawStatus = Array.isArray(rawParams.status)
    ? rawParams.status[0]
    : rawParams.status;
  const initialStatusFilter: "all" | AdminProductStatus =
    rawStatus === "active" || rawStatus === "draft" || rawStatus === "hidden"
      ? rawStatus
      : "all";

  const rawIds = Array.isArray(rawParams.ids)
    ? rawParams.ids.join(",")
    : rawParams.ids;
  const initialCreatedIds = rawIds
    ? Array.from(
        new Set(
          rawIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => uuidSchema.safeParse(id).success)
        )
      ).slice(0, 50)
    : [];

  return (
    <ProductsTableClient
      initialProducts={products}
      categories={categories}
      initialStatusFilter={initialStatusFilter}
      initialCreatedIds={initialCreatedIds}
    />
  );
}
