import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminImportJobs } from "@/lib/import/jobs";
import { getAdminCategories } from "@/lib/queries/admin";
import {
  ImportWorkspaceClient,
  type ImportWorkspaceTab,
} from "@/components/admin/import-workspace-client";

export const metadata: Metadata = {
  title: "Importar produtos",
};

export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const [{ supabase }, resolvedParams] = await Promise.all([
    requireAdminPage(),
    searchParams,
  ]);
  const [jobs, categories] = await Promise.all([
    getAdminImportJobs(supabase, 100),
    getAdminCategories(supabase),
  ]);

  const initialTab: ImportWorkspaceTab =
    resolvedParams.aba === "manual" ? "manual" : "links";

  return (
    <ImportWorkspaceClient
      initialJobs={jobs}
      categories={categories}
      initialTab={initialTab}
    />
  );
}
