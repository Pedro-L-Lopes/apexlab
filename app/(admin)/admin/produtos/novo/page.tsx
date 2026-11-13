import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories } from "@/lib/queries/admin";
import { ProductFormClient } from "@/components/admin/product-form-client";

export const metadata: Metadata = {
  title: "Novo produto",
};

export default async function AdminNewProductPage() {
  const { supabase } = await requireAdminPage();
  const categories = await getAdminCategories(supabase);

  return <ProductFormClient initialProduct={null} categories={categories} />;
}
