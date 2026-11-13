import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getAdminProductsList,
  type AdminProductStatus,
} from "@/lib/queries/admin";
import { ProductsTableClient } from "@/components/admin/products-table-client";

export const metadata: Metadata = {
  title: "Produtos",
};

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

  return (
    <ProductsTableClient
      initialProducts={products}
      categories={categories}
      initialStatusFilter={initialStatusFilter}
    />
  );
}
