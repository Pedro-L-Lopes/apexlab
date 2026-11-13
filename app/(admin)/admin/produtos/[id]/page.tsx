import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories, getAdminProductById } from "@/lib/queries/admin";
import { ProductFormClient } from "@/components/admin/product-form-client";

export const metadata: Metadata = {
  title: "Editar produto",
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ supabase }, { id }] = await Promise.all([
    requireAdminPage(),
    params,
  ]);

  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const [product, categories] = await Promise.all([
    getAdminProductById(supabase, id),
    getAdminCategories(supabase),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductFormClient initialProduct={product} categories={categories} />
  );
}
