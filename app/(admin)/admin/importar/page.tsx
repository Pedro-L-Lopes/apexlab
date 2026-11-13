import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Link2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Importar",
};

export default async function AdminImportPage() {
  await requireAdminPage();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fase 5"
        title={
          <>
            Importar<span className="text-accent">.</span>
          </>
        }
        subtitle="Importação por link individual e processamento em lote"
      />

      <div className="rounded-[26px] border border-dashed border-line bg-surface p-8 text-center shadow-card sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Link2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          Importador preparado para a Fase 5
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          O módulo de extração por link individual e em lote com fila segura
          será ativado na próxima fase. Enquanto isso, você já pode cadastrar
          produtos manualmente.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/admin/produtos/novo"
            className={buttonVariants({ variant: "primary" })}
          >
            Novo produto manual
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
