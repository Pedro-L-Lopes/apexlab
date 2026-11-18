"use client";

import * as React from "react";
import Link from "next/link";
import type { AdminCategoryItem } from "@/lib/queries/admin";
import type { AdminImportJobItem } from "@/lib/import/jobs";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { ImportBatchClient } from "@/components/admin/import-batch-client";
import { ManualSpreadsheetClient } from "@/components/admin/manual-spreadsheet-client";

export type ImportWorkspaceTab = "links" | "manual";

interface ImportWorkspaceClientProps {
  initialJobs: AdminImportJobItem[];
  categories: AdminCategoryItem[];
  initialTab?: ImportWorkspaceTab;
}

export function ImportWorkspaceClient({
  initialJobs,
  categories,
  initialTab = "links",
}: ImportWorkspaceClientProps) {
  const [activeTab, setActiveTab] =
    React.useState<ImportWorkspaceTab>(initialTab);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produtividade"
        title={
          <>
            Importar produtos<span className="text-accent">.</span>
          </>
        }
        subtitle={
          activeTab === "links"
            ? `${initialJobs.length} ${
                initialJobs.length === 1 ? "item registrado" : "itens registrados"
              } na fila · extração segura em português`
            : "Grade editável estilo planilha · arraste várias fotos ou cole do Excel / Google Sheets"
        }
        actions={
          <Link
            href="/admin/produtos?status=draft"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            Ver rascunhos
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs<ImportWorkspaceTab>
          layoutId="admin-import-workspace-tabs"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              value: "links",
              label: "Por links",
              count: initialJobs.length,
            },
            {
              value: "manual",
              label: "Planilha manual",
            },
          ]}
        />
      </div>

      {activeTab === "links" ? (
        <ImportBatchClient
          initialJobs={initialJobs}
          categories={categories}
          embedded
        />
      ) : (
        <ManualSpreadsheetClient categories={categories} />
      )}
    </div>
  );
}
