"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Save,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import type { AdminCategoryItem } from "@/lib/queries/admin";
import type { AdminImportJobItem, ImportJobStatus } from "@/lib/import/jobs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

interface ImportBatchClientProps {
  initialJobs: AdminImportJobItem[];
  categories: AdminCategoryItem[];
  embedded?: boolean;
}

interface ParsedBatchLine {
  source_url: string;
  stl_url: string | null;
}

const MAX_CONCURRENCY = 3;
const QUEUE_DISPATCH_DELAY_MS = 350;

function parseBatchLines(rawText: string): ParsedBatchLine[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedBatchLine[] = [];
  for (const line of lines) {
    // Suporta "link_do_modelo, link_do_stl" (vírgula, ponto e vírgula ou tab)
    const parts = line.split(/[,\t;]+/).map((p) => p.trim());
    const sourceUrl = parts[0] ?? "";
    if (!sourceUrl) continue;
    const stlUrl = parts[1] ? parts[1] : null;
    parsed.push({ source_url: sourceUrl, stl_url: stlUrl });
  }
  return parsed;
}

function normalizeUrlForClientDuplicate(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    const str = parsed.toString();
    return str.endsWith("/") && parsed.pathname !== "/" ? str.slice(0, -1) : str;
  } catch {
    return trimmed;
  }
}

function parsePriceInput(raw: string): number | null {
  const clean = raw.trim().replace(",", ".");
  if (!clean) return null;
  const num = Number(clean);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function StatusBadge({
  status,
  hasProduct,
}: {
  status: ImportJobStatus;
  hasProduct: boolean;
}) {
  if (hasProduct) {
    return <Badge variant="active">Rascunho criado</Badge>;
  }
  switch (status) {
    case "pending":
      return <Badge variant="draft">Pendente</Badge>;
    case "processing":
      return (
        <Badge variant="accent" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processando
        </Badge>
      );
    case "done":
      return <Badge variant="active">Pronto (OK)</Badge>;
    case "error":
      return (
        <Badge
          variant="hidden"
          className="border-[#B42318]/25 bg-[#FEE4E2] text-[#B42318]"
        >
          Erro
        </Badge>
      );
  }
}

export function ImportBatchClient({
  initialJobs,
  categories,
  embedded = false,
}: ImportBatchClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [jobs, setJobs] = React.useState<AdminImportJobItem[]>(initialJobs);
  const [prevInitial, setPrevInitial] = React.useState(initialJobs);
  if (prevInitial !== initialJobs) {
    setPrevInitial(initialJobs);
    setJobs(initialJobs);
  }

  const [rawLines, setRawLines] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<
    "all" | "pending" | "done" | "error" | "saved"
  >("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [priceDrafts, setPriceDrafts] = React.useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const job of initialJobs) {
        map[job.id] =
          job.extracted_data.price !== null &&
          job.extracted_data.price !== undefined
            ? String(job.extracted_data.price)
            : "";
      }
      return map;
    }
  );
  const [uploadingJobId, setUploadingJobId] = React.useState<string | null>(null);
  const [queueRunning, setQueueRunning] = React.useState(false);
  const [queueProgress, setQueueProgress] = React.useState({
    done: 0,
    total: 0,
  });
  const [savingSelected, setSavingSelected] = React.useState(false);

  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const parsedInputLines = React.useMemo(
    () => parseBatchLines(rawLines),
    [rawLines]
  );

  // Detecta também URLs repetidas dentro da própria fila de importação
  const queueUrlOccurrences = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      const norm = normalizeUrlForClientDuplicate(job.source_url);
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
    return counts;
  }, [jobs]);

  const counts = React.useMemo(() => {
    let pending = 0;
    let processing = 0;
    let okReady = 0;
    let errors = 0;
    let saved = 0;

    for (const job of jobs) {
      if (job.product_id) {
        saved += 1;
      } else if (job.status === "pending") {
        pending += 1;
      } else if (job.status === "processing") {
        processing += 1;
      } else if (job.status === "done") {
        okReady += 1;
      } else if (job.status === "error") {
        errors += 1;
      }
    }

    return {
      all: jobs.length,
      pending: pending + processing,
      done: okReady,
      error: errors,
      saved,
    };
  }, [jobs]);

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      if (filterTab === "saved") return Boolean(job.product_id);
      if (filterTab === "done") return !job.product_id && job.status === "done";
      if (filterTab === "error") return !job.product_id && job.status === "error";
      if (filterTab === "pending") {
        return (
          !job.product_id &&
          (job.status === "pending" || job.status === "processing")
        );
      }
      return true;
    });
  }, [jobs, filterTab]);

  const updateLocalJob = React.useCallback((updatedJob: AdminImportJobItem) => {
    setJobs((prev) =>
      prev.map((item) => (item.id === updatedJob.id ? updatedJob : item))
    );
    setPriceDrafts((prev) => ({
      ...prev,
      [updatedJob.id]:
        updatedJob.extracted_data.price !== null &&
        updatedJob.extracted_data.price !== undefined
          ? String(updatedJob.extracted_data.price)
          : "",
    }));
  }, []);

  /**
   * Fila de processamento com concorrência máxima de 3 requisições simultâneas
   * e pequeno delay entre disparos, sem travar caso uma ou mais URLs falhem.
   */
  const runQueueForIds = async (jobIds: string[]) => {
    if (jobIds.length === 0) return;

    setQueueRunning(true);
    setQueueProgress({ done: 0, total: jobIds.length });

    let cursor = 0;
    let completed = 0;

    const worker = async (workerIndex: number) => {
      if (workerIndex > 0) {
        await delay(workerIndex * QUEUE_DISPATCH_DELAY_MS);
      }

      while (true) {
        const myIndex = cursor;
        cursor += 1;
        if (myIndex >= jobIds.length) break;

        const targetId = jobIds[myIndex];
        setJobs((prev) =>
          prev.map((j) =>
            j.id === targetId
              ? { ...j, status: "processing", error_message: null }
              : j
          )
        );

        try {
          const res = await fetch("/api/admin/import/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: targetId }),
          });
          const payload = (await res.json()) as {
            job?: AdminImportJobItem;
            error?: string;
          };

          if (res.ok && payload.job) {
            updateLocalJob(payload.job);
          } else {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === targetId
                  ? {
                      ...j,
                      status: "error",
                      error_message:
                        payload.error ?? "Erro ao processar este link.",
                    }
                  : j
              )
            );
          }
        } catch {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === targetId
                ? {
                    ...j,
                    status: "error",
                    error_message: "Falha de conexão durante a extração.",
                  }
                : j
            )
          );
        }

        completed += 1;
        setQueueProgress({ done: completed, total: jobIds.length });
        await delay(QUEUE_DISPATCH_DELAY_MS);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENCY, jobIds.length);
    await Promise.all(
      Array.from({ length: workerCount }, (_, idx) => worker(idx))
    );

    setQueueRunning(false);
    router.refresh();
  };

  const handleStartBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedInputLines.length === 0) {
      toast({
        variant: "error",
        title: "Nenhuma linha informada",
        description:
          "Cole ao menos uma linha no formato link_do_modelo, link_do_stl.",
      });
      return;
    }

    setQueueRunning(true);
    try {
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedInputLines }),
      });

      const payload = (await res.json()) as {
        jobs?: AdminImportJobItem[];
        error?: string;
      };

      if (!res.ok || !payload.jobs) {
        setQueueRunning(false);
        toast({
          variant: "error",
          title: "Erro ao criar fila",
          description: payload.error ?? "Tente novamente.",
        });
        return;
      }

      const createdJobs = payload.jobs;
      setJobs((prev) => [...createdJobs, ...prev]);
      setPriceDrafts((prev) => {
        const next = { ...prev };
        for (const job of createdJobs) {
          next[job.id] =
            job.extracted_data.price !== null &&
            job.extracted_data.price !== undefined
              ? String(job.extracted_data.price)
              : "";
        }
        return next;
      });
      setRawLines("");
      setFilterTab("all");

      // Seleciona automaticamente itens não-duplicados da nova leva
      const autoSelect = createdJobs
        .filter((j) => !j.duplicate_product)
        .map((j) => j.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...autoSelect])));

      await runQueueForIds(createdJobs.map((j) => j.id));

      toast({
        variant: "success",
        title: "Processamento da fila concluído",
        description: `${createdJobs.length} ${
          createdJobs.length === 1 ? "item processado" : "itens processados"
        }. Revise a pré-visualização antes de salvar.`,
      });
    } catch {
      setQueueRunning(false);
      toast({
        variant: "error",
        title: "Erro ao iniciar fila",
        description: "Falha de rede ao enviar os links.",
      });
    }
  };

  const persistRowPatch = async (
    jobId: string,
    patch: {
      stl_url?: string | null;
      extracted_data?: {
        title?: string;
        category_id?: string | null;
        price?: number | null;
        cover_image_url?: string | null;
        images?: string[];
      };
    }
  ) => {
    try {
      const res = await fetch("/api/admin/import/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, ...patch }),
      });
      const payload = (await res.json()) as { job?: AdminImportJobItem };
      if (res.ok && payload.job) {
        updateLocalJob(payload.job);
      }
    } catch {
      toast({
        variant: "error",
        title: "Erro ao salvar alteração da linha",
      });
    }
  };

  const handleTitleChange = (jobId: string, title: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, extracted_data: { ...j.extracted_data, title } }
          : j
      )
    );
  };

  const handleStlChange = (jobId: string, stlUrl: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              stl_url: stlUrl,
              extracted_data: { ...j.extracted_data, stl_url: stlUrl },
            }
          : j
      )
    );
  };

  const handleManualImageUpload = async (
    jobId: string,
    files: FileList | null
  ) => {
    const file = files?.[0];
    if (!file) return;

    setUploadingJobId(jobId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "imports");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !payload.url) {
        toast({
          variant: "error",
          title: "Erro ao enviar imagem",
          description: payload.error ?? "Verifique o arquivo (máx. 5 MB).",
        });
        return;
      }

      const currentJob = jobs.find((j) => j.id === jobId);
      const nextImages = [
        payload.url,
        ...(currentJob?.extracted_data.images ?? []).filter(
          (u) => u !== payload.url
        ),
      ];

      await persistRowPatch(jobId, {
        extracted_data: {
          cover_image_url: payload.url,
          images: nextImages,
        },
      });

      toast({
        variant: "success",
        title: "Imagem enviada para a pré-visualização",
      });
    } finally {
      setUploadingJobId(null);
    }
  };

  const handleReprocessErrors = async () => {
    const errorIds = jobs
      .filter((j) => !j.product_id && (j.status === "error" || j.status === "pending"))
      .map((j) => j.id);
    if (errorIds.length === 0) return;
    await runQueueForIds(errorIds);
  };

  const handleSaveSelected = async () => {
    const selectedJobs = jobs.filter(
      (j) => selectedIds.includes(j.id) && !j.product_id
    );
    if (selectedJobs.length === 0) {
      toast({
        variant: "default",
        title: "Nenhum item elegível selecionado",
        description:
          "Selecione linhas que ainda não foram convertidas em rascunho.",
      });
      return;
    }

    setSavingSelected(true);
    try {
      const payloadItems = selectedJobs.map((job) => ({
        jobId: job.id,
        title: job.extracted_data.title.trim() || "Modelo 3D importado",
        description: job.extracted_data.description || null,
        category_id: job.extracted_data.category_id ?? null,
        price: parsePriceInput(priceDrafts[job.id] ?? ""),
        cover_image_url: job.extracted_data.cover_image_url,
        images: job.extracted_data.images,
        stl_url: job.stl_url?.trim() || null,
        source_url: job.source_url,
        license: job.extracted_data.license,
        material: job.extracted_data.material,
        tags: job.extracted_data.tags,
      }));

      const res = await fetch("/api/admin/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });

      const payload = (await res.json()) as {
        created?: Array<{
          jobId: string;
          productId: string;
          name: string;
          slug: string;
        }>;
        failed?: Array<{ jobId: string; error: string }>;
        jobs?: AdminImportJobItem[];
        error?: string;
      };

      if (!res.ok) {
        toast({
          variant: "error",
          title: "Erro ao salvar selecionados",
          description: payload.error ?? "Tente novamente.",
        });
        return;
      }

      if (payload.jobs && payload.jobs.length > 0) {
        const refreshedMap = new Map(payload.jobs.map((j) => [j.id, j]));
        setJobs((prev) => prev.map((j) => refreshedMap.get(j.id) ?? j));
      }

      const createdCount = payload.created?.length ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      setSelectedIds([]);

      toast({
        variant: failedCount > 0 ? "default" : "success",
        title: `${createdCount} ${
          createdCount === 1
            ? "rascunho salvo com sucesso"
            : "rascunhos salvos com sucesso"
        }`,
        description:
          failedCount > 0
            ? `${failedCount} linha(s) não puderam ser salvas.`
            : "Imagens copiadas para o Storage e links de STL protegidos em product_private.",
      });
      router.refresh();
    } catch {
      toast({
        variant: "error",
        title: "Erro de rede ao salvar rascunhos",
      });
    } finally {
      setSavingSelected(false);
    }
  };

  const handleDeleteJobs = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/import/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        toast({ variant: "error", title: "Erro ao remover itens" });
        return;
      }
      setJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast({ variant: "success", title: "Itens removidos da fila" });
      router.refresh();
    } catch {
      toast({ variant: "error", title: "Falha de conexão ao remover" });
    }
  };

  const selectableVisibleIds = filteredJobs
    .filter((j) => !j.product_id)
    .map((j) => j.id);
  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !selectableVisibleIds.includes(id))
      );
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...selectableVisibleIds]))
      );
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedReadyCount = jobs.filter(
    (j) => selectedIds.includes(j.id) && !j.product_id
  ).length;

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          eyebrow="Produtividade"
          title={
            <>
              Importar em lote<span className="text-accent">.</span>
            </>
          }
          subtitle={`${jobs.length} ${
            jobs.length === 1 ? "item registrado" : "itens registrados"
          } na fila · extração segura em português`}
          actions={
            <Link
              href="/admin/produtos?status=draft"
              className={buttonVariants({ variant: "secondary", size: "md" })}
            >
              Ver rascunhos
            </Link>
          }
        />
      )}

      {/* Lembrete de licença comercial */}
      <div className="flex items-start gap-3 rounded-[22px] border border-[#F59E0B]/35 bg-[#FEF3C7]/60 px-5 py-3.5 text-xs text-[#92400E]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Uso comercial e direitos autorais:</strong> publique na
          vitrine apenas peças de criação própria ou modelos cuja licença
          autorize venda comercial. Os links originais e arquivos{" "}
          <strong>STL / 3MF</strong> são salvos exclusivamente na área privada (
          <code>product_private</code>) e nunca aparecem no site público.
        </div>
      </div>

      {/* Caixa para colar links em lote */}
      <form
        onSubmit={handleStartBatch}
        className="rounded-[26px] border border-line bg-surface p-5 shadow-card sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              Colar links para importação
            </h2>
            <p className="text-xs text-muted">
              Informe uma linha por produto no formato{" "}
              <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px] text-ink">
                link_do_modelo, link_do_stl
              </code>{" "}
              (o link do STL é opcional).
            </p>
          </div>

          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-ink">
            {parsedInputLines.length}{" "}
            {parsedInputLines.length === 1
              ? "linha detectada"
              : "linhas detectadas"}
          </span>
        </div>

        <textarea
          value={rawLines}
          onChange={(e) => setRawLines(e.target.value)}
          disabled={queueRunning}
          rows={5}
          placeholder={`https://makerworld.com/en/models/12345-organizador-mesa, https://drive.google.com/file/d/exemplo-stl\nhttps://www.printables.com/model/67890-vaso-voronoi`}
          aria-label="Lista de links para importação em lote"
          className="w-full rounded-[20px] border border-line bg-bg/60 p-4 font-mono text-xs leading-relaxed text-ink placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted">
            Fila controlada: máximo de{" "}
            <strong className="text-ink">3 requisições simultâneas</strong> com
            intervalo de segurança. Falhas individuais não travam os demais itens.
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={queueRunning || parsedInputLines.length === 0}
          >
            {queueRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando {queueProgress.done}/{queueProgress.total || "..."}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Processar em fila ({parsedInputLines.length})
              </>
            )}
          </Button>
        </div>

        {queueRunning && queueProgress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-muted">
              <span>Progresso da fila</span>
              <span>
                {queueProgress.done} de {queueProgress.total} concluídos
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (queueProgress.done / Math.max(queueProgress.total, 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </form>

      {/* Filtros e ações da pré-visualização */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto pb-1">
            <PillTabs<"all" | "pending" | "done" | "error" | "saved">
              layoutId="import-jobs-tabs"
              value={filterTab}
              onChange={setFilterTab}
              items={[
                { value: "all", label: "Todos", count: counts.all },
                { value: "pending", label: "Na fila", count: counts.pending },
                { value: "done", label: "Prontos", count: counts.done },
                { value: "error", label: "Com erro", count: counts.error },
                { value: "saved", label: "Salvos", count: counts.saved },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {counts.error > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={queueRunning}
                onClick={handleReprocessErrors}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reprocessar erros ({counts.error})
              </Button>
            )}

            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={queueRunning || savingSelected}
                onClick={() => void handleDeleteJobs(selectedIds)}
              >
                <Trash2 className="h-3.5 w-3.5 text-[#B42318]" />
                Remover ({selectedIds.length})
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={queueRunning || savingSelected || selectedReadyCount === 0}
              onClick={handleSaveSelected}
            >
              {savingSelected ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando rascunhos...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar selecionados ({selectedReadyCount})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabela editável de pré-visualização */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  aria-label="Selecionar itens elegíveis visíveis"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-ink cursor-pointer"
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Capa</TableHead>
              <TableHead className="min-w-[260px]">
                Título e origem
              </TableHead>
              <TableHead className="min-w-[175px]">Categoria</TableHead>
              <TableHead className="min-w-[132px]">Preço (R$)</TableHead>
              <TableHead className="min-w-[220px]">STL (privado)</TableHead>
              <TableHead className="min-w-[160px]">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const isSelected = selectedIds.includes(job.id);
                const isSaved = Boolean(job.product_id);
                const normUrl = normalizeUrlForClientDuplicate(job.source_url);
                const isDuplicateInQueue =
                  !isSaved && (queueUrlOccurrences.get(normUrl) ?? 0) > 1;
                const isDuplicate =
                  Boolean(job.duplicate_product) || isDuplicateInQueue;
                const coverUrl = job.extracted_data.cover_image_url;
                const isUploading = uploadingJobId === job.id;

                return (
                  <TableRow
                    key={job.id}
                    className={cn(
                      isSelected && "bg-accent-soft/35",
                      isSaved && "opacity-90"
                    )}
                  >
                    <TableCell>
                      <button
                        type="button"
                        disabled={isSaved}
                        onClick={() => toggleSelectOne(job.id)}
                        aria-label={`Selecionar ${job.extracted_data.title}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-accent" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>

                    {/* Capa + upload manual */}
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-line bg-bg flex items-center justify-center">
                          {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coverUrl}
                              alt={job.extracted_data.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="h-5 w-5 text-muted/60" />
                          )}
                        </div>

                        {!isSaved && (
                          <>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[job.id] = el;
                              }}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                void handleManualImageUpload(
                                  job.id,
                                  e.target.files
                                );
                                e.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() =>
                                fileInputRefs.current[job.id]?.click()
                              }
                              className="text-[11px] font-semibold text-accent-ink hover:underline cursor-pointer disabled:opacity-50"
                            >
                              {isUploading ? "Enviando..." : "Enviar foto"}
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Título editável + source_url + alerta de duplicado */}
                    <TableCell>
                      <div className="space-y-1.5">
                        <Input
                          value={job.extracted_data.title}
                          disabled={isSaved}
                          onChange={(e) =>
                            handleTitleChange(job.id, e.target.value)
                          }
                          onBlur={(e) =>
                            void persistRowPatch(job.id, {
                              extracted_data: { title: e.target.value.trim() },
                            })
                          }
                          aria-label={`Título de ${job.source_url}`}
                          className="h-9 text-xs font-semibold"
                        />

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                          <a
                            href={job.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[240px] items-center gap-1 truncate hover:text-accent-ink"
                            title={job.source_url}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{job.source_url}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        </div>

                        {isDuplicate && (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/35 bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {job.duplicate_product ? (
                              <span>
                                Duplicado de{" "}
                                <Link
                                  href={`/admin/produtos/${job.duplicate_product.id}`}
                                  className="underline"
                                >
                                  {job.duplicate_product.name}
                                </Link>
                              </span>
                            ) : (
                              <span>Duplicado na fila</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Categoria editável */}
                    <TableCell>
                      <Select
                        value={job.extracted_data.category_id ?? "none"}
                        disabled={isSaved}
                        onValueChange={(value) => {
                          const nextCat = value === "none" ? null : value;
                          setJobs((prev) =>
                            prev.map((j) =>
                              j.id === job.id
                                ? {
                                    ...j,
                                    extracted_data: {
                                      ...j.extracted_data,
                                      category_id: nextCat,
                                    },
                                  }
                                : j
                            )
                          );
                          void persistRowPatch(job.id, {
                            extracted_data: { category_id: nextCat },
                          });
                        }}
                      >
                        <SelectTrigger
                          aria-label="Categoria do item importado"
                          className="h-9 text-xs"
                        >
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Preço editável */}
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        disabled={isSaved}
                        placeholder="Sob consulta"
                        value={priceDrafts[job.id] ?? ""}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({
                            ...prev,
                            [job.id]: e.target.value,
                          }))
                        }
                        onBlur={(e) =>
                          void persistRowPatch(job.id, {
                            extracted_data: {
                              price: parsePriceInput(e.target.value),
                            },
                          })
                        }
                        aria-label="Preço sugerido"
                        className="h-9 min-w-[110px] text-xs tabular-nums"
                      />
                    </TableCell>

                    {/* STL editável */}
                    <TableCell>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
                        <Input
                          type="url"
                          disabled={isSaved}
                          placeholder="Link privado do STL/3MF"
                          value={job.stl_url ?? ""}
                          onChange={(e) =>
                            handleStlChange(job.id, e.target.value)
                          }
                          onBlur={(e) =>
                            void persistRowPatch(job.id, {
                              stl_url: e.target.value.trim() || null,
                            })
                          }
                          aria-label="Link do STL privado"
                          className="h-9 pl-7 text-xs"
                        />
                      </div>
                    </TableCell>

                    {/* Status + mensagem de erro / aviso */}
                    <TableCell>
                      <div className="space-y-1">
                        <StatusBadge
                          status={job.status}
                          hasProduct={isSaved}
                        />
                        {job.error_message && !isSaved && (
                          <p className="max-w-[200px] text-[11px] leading-snug text-[#B42318]">
                            {job.error_message}
                          </p>
                        )}
                        {!job.error_message &&
                          job.extracted_data.extraction_warning &&
                          !isSaved && (
                            <p className="max-w-[200px] text-[11px] leading-snug text-[#92400E]">
                              {job.extracted_data.extraction_warning}
                            </p>
                          )}
                        {job.linked_product && (
                          <Link
                            href={`/admin/produtos/${job.linked_product.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-ink hover:underline"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Abrir rascunho
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    {/* Ações da linha */}
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {!isSaved && (
                          <>
                            <button
                              type="button"
                              disabled={queueRunning}
                              onClick={() => void runQueueForIds([job.id])}
                              title="Tentar extração novamente"
                              aria-label="Tentar novamente"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-bg hover:text-ink cursor-pointer disabled:opacity-40"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>

                            <Link
                              href={`/admin/produtos/novo?importJobId=${job.id}`}
                              title="Completar manualmente no formulário"
                              aria-label="Completar manualmente"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-accent"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                            </Link>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={queueRunning}
                          onClick={() => void handleDeleteJobs([job.id])}
                          title="Remover da fila"
                          aria-label="Remover item"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-[#FEE4E2] hover:text-[#B42318] cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted">
                  Nenhum item nesta aba. Cole links acima e clique em{" "}
                  <strong className="text-ink">Processar em fila</strong>.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
