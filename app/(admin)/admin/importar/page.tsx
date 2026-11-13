import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminImportJobs } from "@/lib/import/jobs";
import { getAdminCategories } from "@/lib/queries/admin";
import { ImportBatchClient } from "@/components/admin/import-batch-client";

export const metadata: Metadata = {
  title: "Importar em lote",
};

export default async function AdminImportPage() {
  const { supabase } = await requireAdminPage();
  const [jobs, categories] = await Promise.all([
    getAdminImportJobs(supabase, 100),
    getAdminCategories(supabase),
  ]);

  return <ImportBatchClient initialJobs={jobs} categories={categories} />;
}
