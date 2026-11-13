import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories } from "@/lib/queries/admin";
import { CategoriesClient } from "@/components/admin/categories-client";

export const metadata: Metadata = {
  title: "Categorias",
};

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdminPage();
  const categories = await getAdminCategories(supabase);

  return <CategoriesClient initialCategories={categories} />;
}
