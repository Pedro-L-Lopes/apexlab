"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  Copy,
  ImagePlus,
  Loader2,
  Lock,
  Plus,
  Save,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AdminCategoryItem } from "@/lib/queries/admin";
import {
  saveManualBatchProductsAction,
  type ManualBatchCreatedItem,
  type ManualBatchFailedItem,
  type ManualBatchRowInput,
} from "@/lib/actions/admin-manual-batch";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const STORAGE_KEY = "catalogo3d:admin-manual-spreadsheet-v1";
const MAX_ROWS_PER_SUBMIT = 50;
const UPLOAD_CONCURRENCY = 3;

export interface SpreadsheetRow {
  id: string;
  coverImageUrl: string | null;
  name: string;
  categoryId: string;
  price: string;
  tags: string;
  colors: string;
  stlUrl: string;
}

type FillColumnTarget = "categoryId" | "price" | "tags" | "colors" | "stlUrl";

interface StoredSpreadsheetState {
  batchStatus: "draft" | "active";
  rows: SpreadsheetRow[];
}

function makeUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRow(defaultCategoryId = ""): SpreadsheetRow {
  return {
    id: makeUid(),
    coverImageUrl: null,
    name: "",
    categoryId: defaultCategoryId,
    price: "",
    tags: "",
    colors: "",
    stlUrl: "",
  };
}

function isRowBlank(row: SpreadsheetRow): boolean {
  return (
    !row.coverImageUrl &&
    !row.name.trim() &&
    !row.categoryId &&
    !row.price.trim() &&
    !row.tags.trim() &&
    !row.colors.trim() &&
    !row.stlUrl.trim()
  );
}

export function filenameToProductName(filename: string): string {
  const base = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function normalizeLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parsePriceValue(raw: string): { valid: boolean; value: number | null } {
  const cleaned = raw.trim().replace(/^r\$\s*/i, "").replace(",", ".");
  if (!cleaned) return { valid: true, value: null };
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999999) {
    return { valid: false, value: null };
  }
  return { valid: true, value: Math.round(parsed * 100) / 100 };
}

function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCommaList(raw: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trimmed);
  }
  return items;
}

function validateSpreadsheetRow(
  row: SpreadsheetRow,
  serverError?: string
): { valid: boolean; error: string | null } {
  if (serverError) {
    return { valid: false, error: serverError };
  }
  if (row.name.trim().length < 2) {
    return { valid: false, error: "Nome obrigatório (mín. 2 caracteres)" };
  }
  const parsedPrice = parsePriceValue(row.price);
  if (!parsedPrice.valid) {
    return { valid: false, error: "Preço numérico inválido" };
  }
  if (!isValidHttpUrl(row.stlUrl)) {
    return { valid: false, error: "URL do STL inválida (http/https)" };
  }
  if (row.coverImageUrl && !isValidHttpUrl(row.coverImageUrl)) {
    return { valid: false, error: "URL da imagem de capa inválida" };
  }
  return { valid: true, error: null };
}

const HEADER_TOKENS = new Set([
  "imagem",
  "imagem de capa",
  "capa",
  "foto",
  "nome",
  "produto",
  "titulo",
  "categoria",
  "preco",
  "valor",
  "tags",
  "tag",
  "cores",
  "cor",
  "stl",
  "link stl",
  "link do stl",
  "status",
]);

function looksLikeImageCell(value: string): boolean {
  if (!value) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  return /\.(webp|png|jpe?g|gif|avif)(\?|$)/i.test(value) || value.includes("/storage/v1/object/");
}

function parseTsvLinesToRows(
  rawText: string,
  categories: AdminCategoryItem[]
): { rows: SpreadsheetRow[]; skippedHeader: boolean } {
  const rawLines = rawText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (rawLines.length === 0) return { rows: [], skippedHeader: false };

  const matrix = rawLines.map((line) =>
    line.split("\t").map((cell) => cell.trim())
  );

  const categoryLookup = new Map<string, string>();
  for (const cat of categories) {
    categoryLookup.set(normalizeLookup(cat.name), cat.id);
    categoryLookup.set(normalizeLookup(cat.slug), cat.id);
  }

  let startIndex = 0;
  let skippedHeader = false;
  let hasLeadingImageColumn: boolean | null = null;

  const firstRowNormalized = matrix[0].map(normalizeLookup);
  const headerMatches = firstRowNormalized.filter((cell) =>
    HEADER_TOKENS.has(cell)
  ).length;
  if (headerMatches >= 2) {
    skippedHeader = true;
    startIndex = 1;
    const firstCol = firstRowNormalized[0] ?? "";
    hasLeadingImageColumn =
      firstCol === "imagem" ||
      firstCol === "imagem de capa" ||
      firstCol === "capa" ||
      firstCol === "foto";
  }

  const dataRows = matrix.slice(startIndex);
  if (dataRows.length === 0) return { rows: [], skippedHeader };

  if (hasLeadingImageColumn === null) {
    const sample = dataRows[0];
    hasLeadingImageColumn =
      sample.length >= 7 ||
      (sample.length >= 2 && looksLikeImageCell(sample[0] ?? ""));
  }

  const parsedRows: SpreadsheetRow[] = dataRows.map((cols) => {
    const offset = hasLeadingImageColumn ? 1 : 0;
    const rawCover = hasLeadingImageColumn ? (cols[0] ?? "") : "";
    const coverImageUrl =
      rawCover && isValidHttpUrl(rawCover) ? rawCover : null;
    const name = cols[offset] ?? "";
    const rawCategory = cols[offset + 1] ?? "";
    const rawPrice = (cols[offset + 2] ?? "").replace(/^r\$\s*/i, "").trim();
    const tags = cols[offset + 3] ?? "";
    const colors = cols[offset + 4] ?? "";
    const stlUrl = cols[offset + 5] ?? "";

    const matchedCategoryId = rawCategory
      ? categoryLookup.get(normalizeLookup(rawCategory)) ?? ""
      : "";

    return {
      id: makeUid(),
      coverImageUrl,
      name,
      categoryId: matchedCategoryId,
      price: rawPrice,
      tags,
      colors,
      stlUrl,
    };
  });

  return { rows: parsedRows, skippedHeader };
}

function loadStoredSpreadsheetState(
  validCategoryIds: Set<string>
): StoredSpreadsheetState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { batchStatus: "draft", rows: [createEmptyRow()] };
    }
    const parsed = JSON.parse(raw) as Partial<StoredSpreadsheetState>;
    const batchStatus = parsed.batchStatus === "active" ? "active" : "draft";
    const rows = Array.isArray(parsed.rows)
      ? parsed.rows
          .filter((r): r is SpreadsheetRow => Boolean(r && typeof r === "object"))
          .slice(0, 100)
          .map((r) => ({
            id: typeof r.id === "string" && r.id ? r.id : makeUid(),
            coverImageUrl:
              typeof r.coverImageUrl === "string" && r.coverImageUrl
                ? r.coverImageUrl
                : null,
            name: typeof r.name === "string" ? r.name : "",
            categoryId:
              typeof r.categoryId === "string" && validCategoryIds.has(r.categoryId)
                ? r.categoryId
                : "",
            price: typeof r.price === "string" ? r.price : "",
            tags: typeof r.tags === "string" ? r.tags : "",
            colors: typeof r.colors === "string" ? r.colors : "",
            stlUrl: typeof r.stlUrl === "string" ? r.stlUrl : "",
          }))
      : [];

    return {
      batchStatus,
      rows: rows.length > 0 ? rows : [createEmptyRow()],
    };
  } catch {
    return { batchStatus: "draft", rows: [createEmptyRow()] };
  }
}

const emptySubscribe = () => () => {};

export function ManualSpreadsheetClient({
  categories,
}: {
  categories: AdminCategoryItem[];
}) {
  const isHydrated = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isHydrated) {
    return (
      <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card space-y-4">
        <div className="h-6 w-56 rounded-lg bg-bg" />
        <div className="h-28 rounded-[20px] border border-dashed border-line bg-bg/60" />
        <div className="h-44 rounded-[20px] bg-bg/50" />
      </div>
    );
  }

  return <ManualSpreadsheetInner categories={categories} />;
}

function ManualSpreadsheetInner({
  categories,
}: {
  categories: AdminCategoryItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const validCategoryIds = React.useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const [initialState] = React.useState(() =>
    loadStoredSpreadsheetState(validCategoryIds)
  );
  const [batchStatus, setBatchStatus] = React.useState<"draft" | "active">(
    initialState.batchStatus
  );
  const [rows, setRows] = React.useState<SpreadsheetRow[]>(initialState.rows);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [uploadingRows, setUploadingRows] = React.useState<
    Record<string, boolean>
  >({});
  const [serverErrors, setServerErrors] = React.useState<
    Record<string, string>
  >({});
  const [showValidation, setShowValidation] = React.useState(false);
  const [savingAll, setSavingAll] = React.useState(false);
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] =
    React.useState(false);

  const [fillColumn, setFillColumn] =
    React.useState<FillColumnTarget>("categoryId");
  const [fillValue, setFillValue] = React.useState("");

  const [pasteText, setPasteText] = React.useState("");
  const [pasteAreaOpen, setPasteAreaOpen] = React.useState(false);

  const [batchSummary, setBatchSummary] = React.useState<{
    created: ManualBatchCreatedItem[];
    failed: ManualBatchFailedItem[];
    skippedInvalidCount: number;
  } | null>(null);

  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);

  // Persistência local automática no navegador
  React.useEffect(() => {
    try {
      const payload: StoredSpreadsheetState = { batchStatus, rows };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [batchStatus, rows]);

  const updateRow = (rowId: string, patch: Partial<SpreadsheetRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
    setServerErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const uploadSingleCoverFile = async (rowId: string, file: File) => {
    setUploadingRows((prev) => ({ ...prev, [rowId]: true }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "products");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast({
          variant: "error",
          title: `Erro ao enviar ${file.name}`,
          description: json.error ?? "Verifique o formato e tamanho (máx. 5 MB).",
        });
      } else {
        updateRow(rowId, { coverImageUrl: json.url });
      }
    } catch {
      toast({
        variant: "error",
        title: `Falha de conexão ao enviar ${file.name}`,
      });
    } finally {
      setUploadingRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    }
  };

  const handleBulkImageFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) {
      toast({
        variant: "error",
        title: "Nenhum arquivo de imagem válido selecionado",
        description: "Envie imagens WebP, JPEG ou PNG (máx. 5 MB).",
      });
      return;
    }

    const newEntries = files.map((file) => ({
      file,
      row: {
        ...createEmptyRow(),
        name: filenameToProductName(file.name),
      },
    }));

    setRows((prev) => {
      const hasOnlySingleBlank = prev.length === 1 && isRowBlank(prev[0]);
      const base = hasOnlySingleBlank ? [] : prev;
      return [...base, ...newEntries.map((entry) => entry.row)];
    });
    setBatchSummary(null);

    // Upload com concorrência limitada
    const queue = [...newEntries];
    const workers = Array.from({
      length: Math.min(UPLOAD_CONCURRENCY, queue.length),
    }).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        await uploadSingleCoverFile(item.row.id, item.file);
      }
    });
    await Promise.all(workers);

    toast({
      variant: "success",
      title: `${files.length} ${
        files.length === 1 ? "linha criada com foto" : "linhas criadas com fotos"
      }`,
      description: "Nomes sugeridos automaticamente. Revise antes de salvar.",
    });
  };

  const applyPastedTsv = (rawText: string) => {
    const { rows: parsedRows, skippedHeader } = parseTsvLinesToRows(
      rawText,
      categories
    );
    if (parsedRows.length === 0) {
      toast({
        variant: "error",
        title: "Nenhuma linha válida encontrada ao colar",
        description:
          "Copie linhas com colunas separadas por Tab do Excel ou Google Sheets.",
      });
      return false;
    }

    setRows((prev) => {
      const hasOnlySingleBlank = prev.length === 1 && isRowBlank(prev[0]);
      const base = hasOnlySingleBlank ? [] : prev;
      return [...base, ...parsedRows];
    });
    setBatchSummary(null);
    toast({
      variant: "success",
      title: `${parsedRows.length} ${
        parsedRows.length === 1 ? "linha colada" : "linhas coladas"
      }`,
      description: skippedHeader
        ? "Cabeçalho detectado e ignorado automaticamente."
        : "Conteúdo preenchido na ordem das colunas.",
    });
    return true;
  };

  const handleGridPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    // Só intercepta se houver tabulação ou múltiplas linhas (cópia de planilha)
    const isTabular = text.includes("\t") || text.trim().includes("\n");
    if (!isTabular) return;

    e.preventDefault();
    applyPastedTsv(text);
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const direction = e.shiftKey ? -1 : 1;
    const targetRow = rowIndex + direction;

    if (targetRow >= 0 && targetRow < rows.length) {
      const selector = `[data-grid-row="${targetRow}"][data-grid-col="${colIndex}"]`;
      const el = document.querySelector<HTMLElement>(selector);
      el?.focus();
      return;
    }

    if (direction > 0 && targetRow === rows.length && rows.length < MAX_ROWS_PER_SUBMIT) {
      const nextRow = createEmptyRow();
      setRows((prev) => [...prev, nextRow]);
      window.requestAnimationFrame(() => {
        const selector = `[data-grid-row="${targetRow}"][data-grid-col="${colIndex}"]`;
        document.querySelector<HTMLElement>(selector)?.focus();
      });
    }
  };

  const addRow = () => {
    const newRow = createEmptyRow();
    setRows((prev) => [...prev, newRow]);
    const targetIndex = rows.length;
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-grid-row="${targetIndex}"][data-grid-col="0"]`
        )
        ?.focus();
    });
  };

  const duplicateRow = (row: SpreadsheetRow, index: number) => {
    const copy: SpreadsheetRow = {
      ...row,
      id: makeUid(),
      name: row.name ? `${row.name} (Cópia)` : "",
    };
    setRows((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return filtered.length > 0 ? filtered : [createEmptyRow()];
    });
    setSelectedIds((prev) => prev.filter((id) => id !== rowId));
  };

  const toggleSelectRow = (rowId: string) => {
    setSelectedIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  };

  const handleApplyFillColumn = () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const patchValue =
      fillColumn === "categoryId" && fillValue === "__none__" ? "" : fillValue;

    setRows((prev) =>
      prev.map((row) =>
        selectedSet.has(row.id) ? { ...row, [fillColumn]: patchValue } : row
      )
    );
    toast({
      variant: "success",
      title: `Coluna aplicada em ${selectedIds.length} ${
        selectedIds.length === 1 ? "linha" : "linhas"
      }`,
    });
  };

  const handleClearGrid = () => {
    setRows([createEmptyRow()]);
    setSelectedIds([]);
    setServerErrors({});
    setShowValidation(false);
    setBatchSummary(null);
  };

  const nonBlankRows = rows.filter((row) => !isRowBlank(row));
  const uploadingCount = Object.keys(uploadingRows).length;

  const handleSaveAll = async () => {
    if (uploadingCount > 0) {
      toast({
        variant: "error",
        title: "Aguarde o envio das imagens terminar",
      });
      return;
    }

    setShowValidation(true);
    setBatchSummary(null);

    if (nonBlankRows.length === 0) {
      toast({
        variant: "error",
        title: "Preencha ao menos um produto antes de salvar",
      });
      return;
    }

    if (nonBlankRows.length > MAX_ROWS_PER_SUBMIT) {
      toast({
        variant: "error",
        title: `Limite de ${MAX_ROWS_PER_SUBMIT} linhas por envio`,
        description: `Você possui ${nonBlankRows.length} linhas preenchidas. Remova ${
          nonBlankRows.length - MAX_ROWS_PER_SUBMIT
        } antes de enviar.`,
      });
      return;
    }

    const validPayloads: ManualBatchRowInput[] = [];
    let invalidLocalCount = 0;

    for (const row of nonBlankRows) {
      const check = validateSpreadsheetRow(row);
      if (!check.valid) {
        invalidLocalCount += 1;
        continue;
      }
      const parsedPrice = parsePriceValue(row.price);
      validPayloads.push({
        rowId: row.id,
        name: row.name.trim(),
        category_id: row.categoryId || null,
        price: parsedPrice.value,
        tags: parseCommaList(row.tags),
        colors: parseCommaList(row.colors),
        cover_image_url: row.coverImageUrl || null,
        stl_url: row.stlUrl.trim() || null,
      });
    }

    if (validPayloads.length === 0) {
      toast({
        variant: "error",
        title: "Nenhuma linha válida pronta para salvar",
        description: "Corrija as linhas destacadas em vermelho.",
      });
      return;
    }

    setSavingAll(true);
    const res = await saveManualBatchProductsAction({
      status: batchStatus,
      rows: validPayloads,
    });
    setSavingAll(false);

    if (!res.ok || !res.data) {
      toast({
        variant: "error",
        title: "Erro ao salvar produtos em lote",
        description: res.error,
      });
      return;
    }

    const { created, failed } = res.data;
    const createdRowIds = new Set(created.map((item) => item.rowId));
    const nextServerErrors: Record<string, string> = {};
    for (const fail of failed) {
      nextServerErrors[fail.rowId] = fail.error;
    }
    setServerErrors(nextServerErrors);

    setRows((prev) => {
      const remaining = prev.filter(
        (r) => !createdRowIds.has(r.id) && !isRowBlank(r)
      );
      return remaining.length > 0 ? remaining : [createEmptyRow()];
    });
    setSelectedIds((prev) => prev.filter((id) => !createdRowIds.has(id)));

    setBatchSummary({
      created,
      failed,
      skippedInvalidCount: invalidLocalCount,
    });

    const totalErrors = failed.length + invalidLocalCount;
    toast({
      variant: totalErrors > 0 ? "default" : "success",
      title: `${created.length} ${
        created.length === 1 ? "produto criado" : "produtos criados"
      }`,
      description:
        totalErrors > 0
          ? `${totalErrors} linha(s) com erro permaneceram na grade para correção.`
          : "Produtos salvos e cache público atualizado.",
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Lembrete STL privado + licença */}
      <div className="flex items-start gap-3 rounded-[22px] border border-[#F59E0B]/35 bg-[#FEF3C7]/60 px-5 py-3.5 text-xs text-[#92400E]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Cadastro rápido em lote (até {MAX_ROWS_PER_SUBMIT} por envio):</strong>{" "}
          os dados ficam salvos automaticamente no navegador mesmo se você recarregar a página. Links de{" "}
          <strong>STL / 3MF</strong> são gravados apenas em <code>product_private</code>.
        </div>
      </div>

      {/* Dropzone de múltiplas fotos */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOverDropzone(true);
        }}
        onDragLeave={() => setIsDraggingOverDropzone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOverDropzone(false);
          void handleBulkImageFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-between gap-4 rounded-[24px] border-2 border-dashed px-5 py-5 transition-colors sm:flex-row",
          isDraggingOverDropzone
            ? "border-accent bg-accent-soft/70"
            : "border-line bg-surface/90 hover:border-accent/40"
        )}
      >
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <Upload className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-ink">
              Arraste várias fotos de uma vez para criar linhas automaticamente
            </p>
            <p className="text-xs text-muted">
              Cada arquivo vira uma linha com nome sugerido (WebP 1600px, máx. 5 MB) · ou cole células do Excel / Google Sheets direto na grade (<kbd className="rounded bg-bg px-1 py-0.5 font-mono text-[10px]">Ctrl+V</kbd>).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPasteAreaOpen((v) => !v)}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Colar da planilha
          </Button>
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => bulkFileInputRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Selecionar fotos
          </Button>
          <input
            ref={bulkFileInputRef}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            multiple
            data-testid="manual-bulk-file-input"
            onChange={(e) => {
              void handleBulkImageFiles(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </div>
      </div>

      {/* Caixa opcional para colar TSV explícito */}
      {pasteAreaOpen && (
        <div className="rounded-[22px] border border-line bg-surface p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-ink">
                Colar linhas copiadas do Excel / Google Sheets (TSV)
              </p>
              <p className="text-[11px] text-muted">
                Ordem esperada: Nome, Categoria, Preço, Tags, Cores, Link do STL (ou iniciando por URL da Imagem). Cabeçalho opcional é ignorado automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPasteAreaOpen(false)}
              aria-label="Fechar área de colar"
              className="rounded-full p-1 text-muted hover:text-ink cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            rows={4}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Nome\tCategoria\tPreço\tTags\tCores\tLink do STL\nChaveiro Renas\tChaveiros\t12,00\tNatal, Presente\tMarrom, Vermelho\thttps://drive.google.com/...`}
            className="w-full rounded-[16px] border border-line bg-bg/60 p-3 font-mono text-xs text-ink focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (applyPastedTsv(pasteText)) {
                  setPasteText("");
                  setPasteAreaOpen(false);
                }
              }}
            >
              Importar linhas coladas
            </Button>
          </div>
        </div>
      )}

      {/* Resumo após "Salvar tudo" */}
      {batchSummary && (
        <div
          data-testid="manual-batch-summary"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-accent/25 bg-accent-soft px-5 py-4"
        >
          <div className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
            <div>
              <p className="font-bold text-ink">
                {batchSummary.created.length}{" "}
                {batchSummary.created.length === 1
                  ? "produto criado com sucesso"
                  : "produtos criados com sucesso"}
                {batchSummary.failed.length + batchSummary.skippedInvalidCount >
                0
                  ? ` · ${
                      batchSummary.failed.length +
                      batchSummary.skippedInvalidCount
                    } com erro (mantidos abaixo para ajuste)`
                  : ""}
              </p>
              <p className="text-xs text-muted">
                Slugs únicos gerados automaticamente e links de STL protegidos em{" "}
                <code>product_private</code>.
              </p>
            </div>
          </div>

          {batchSummary.created.length > 0 && (
            <Link
              href={`/admin/produtos?ids=${encodeURIComponent(
                batchSummary.created.map((c) => c.productId).join(",")
              )}`}
              data-testid="manual-created-products-link"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Ver recém-criados ({batchSummary.created.length})
            </Link>
          )}
        </div>
      )}

      {/* Barra superior de ações da planilha */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-line bg-surface px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Criar como:
            </span>
            <div
              role="radiogroup"
              aria-label="Status inicial dos produtos em lote"
              className="inline-flex rounded-full border border-line bg-bg p-0.5"
            >
              {(
                [
                  { value: "draft", label: "Rascunho (padrão)" },
                  { value: "active", label: "Ativo" },
                ] as const
              ).map((opt) => {
                const selected = batchStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`manual-batch-status-${opt.value}`}
                    onClick={() => setBatchStatus(opt.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer",
                      selected
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-muted tabular-nums">
            {nonBlankRows.length}/{MAX_ROWS_PER_SUBMIT} preenchidas
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar linha
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearGrid}
            disabled={savingAll}
          >
            Limpar grade
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="manual-save-all-btn"
            disabled={savingAll || uploadingCount > 0}
            onClick={() => void handleSaveAll()}
          >
            {savingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savingAll ? "Salvando..." : "Salvar tudo"}
          </Button>
        </div>
      </div>

      {/* Barra contextual "Preencher coluna" para linhas selecionadas */}
      {selectedIds.length > 0 && (
        <div
          data-testid="manual-fill-column-bar"
          className="flex flex-wrap items-center gap-2.5 rounded-[20px] border border-accent/25 bg-accent-soft px-4 py-3"
        >
          <span className="text-xs font-bold text-ink">
            Preencher coluna em {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "linha" : "linhas"}:
          </span>

          <Select
            value={fillColumn}
            onValueChange={(value) => {
              setFillColumn(value as FillColumnTarget);
              setFillValue("");
            }}
          >
            <SelectTrigger
              aria-label="Escolher coluna para preencher"
              className="h-8 w-40 rounded-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="categoryId">Categoria</SelectItem>
              <SelectItem value="price">Preço (R$)</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
              <SelectItem value="colors">Cores</SelectItem>
              <SelectItem value="stlUrl">Link do STL</SelectItem>
            </SelectContent>
          </Select>

          {fillColumn === "categoryId" ? (
            <Select value={fillValue || "__none__"} onValueChange={setFillValue}>
              <SelectTrigger
                aria-label="Valor da categoria para preencher"
                className="h-8 w-52 rounded-full text-xs"
              >
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={fillValue}
              onChange={(e) => setFillValue(e.target.value)}
              placeholder={
                fillColumn === "price"
                  ? "Ex.: 25,00"
                  : fillColumn === "tags"
                    ? "Ex.: Natal, Presente"
                    : fillColumn === "colors"
                      ? "Ex.: Vermelho, Branco"
                      : "https://..."
              }
              className="h-8 w-52 rounded-full text-xs"
            />
          )}

          <Button
            type="button"
            size="sm"
            variant="primary"
            data-testid="manual-apply-fill-btn"
            onClick={handleApplyFillColumn}
          >
            Aplicar coluna
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
          >
            Desmarcar
          </Button>
        </div>
      )}

      {/* Grade editável estilo planilha */}
      <div
        onPaste={handleGridPaste}
        className="w-full overflow-x-auto rounded-[24px] border border-line bg-surface shadow-card"
      >
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="border-b border-line bg-[#F8FAFE] text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label="Selecionar todas as linhas"
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted hover:text-ink cursor-pointer"
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="w-16 px-2 py-3">Capa</th>
              <th className="min-w-[190px] px-2 py-3">Nome *</th>
              <th className="w-44 px-2 py-3">Categoria</th>
              <th className="w-28 px-2 py-3">Preço (R$)</th>
              <th className="min-w-[150px] px-2 py-3">Tags (vírgula)</th>
              <th className="min-w-[130px] px-2 py-3">Cores</th>
              <th className="min-w-[180px] px-2 py-3">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-accent-ink" />
                  Link do STL
                </span>
              </th>
              <th className="w-36 px-2 py-3">Status</th>
              <th className="w-20 px-2 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line/70">
            {rows.map((row, rowIndex) => {
              const isSelected = selectedIds.includes(row.id);
              const isUploading = Boolean(uploadingRows[row.id]);
              const blank = isRowBlank(row);
              const validation = validateSpreadsheetRow(
                row,
                serverErrors[row.id]
              );
              const showRowError =
                Boolean(serverErrors[row.id]) ||
                (!blank && showValidation && !validation.valid);

              return (
                <tr
                  key={row.id}
                  data-testid="manual-spreadsheet-row"
                  className={cn(
                    "transition-colors",
                    showRowError
                      ? "bg-[#FEF2F2]/70"
                      : isSelected
                        ? "bg-accent-soft/45"
                        : "hover:bg-[#F7FAFF]"
                  )}
                >
                  {/* Seleção */}
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => toggleSelectRow(row.id)}
                      aria-label={`Selecionar linha ${rowIndex + 1}`}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted hover:text-ink cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  {/* Capa (clique ou arrastar) */}
                  <td className="px-2 py-2 align-middle">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          void uploadSingleCoverFile(row.id, file);
                        }
                      }}
                      className="relative flex h-11 w-11 items-center justify-center"
                    >
                      <label
                        title="Clique ou arraste a foto de capa"
                        className="relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line bg-bg hover:border-accent/50"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent-ink" />
                        ) : row.coverImageUrl ? (
                          <Image
                            src={row.coverImageUrl}
                            alt={row.name || `Capa ${rowIndex + 1}`}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <ImagePlus className="h-4 w-4 text-muted" />
                        )}
                        <input
                          type="file"
                          accept="image/webp,image/jpeg,image/png"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void uploadSingleCoverFile(row.id, file);
                            }
                            e.target.value = "";
                          }}
                          className="sr-only"
                        />
                      </label>
                      {row.coverImageUrl && !isUploading && (
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { coverImageUrl: null })}
                          aria-label={`Remover foto da linha ${rowIndex + 1}`}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[#B42318] border border-line shadow-xs hover:bg-[#FEE4E2] cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Nome */}
                  <td className="px-1.5 py-2 align-middle">
                    <input
                      type="text"
                      value={row.name}
                      data-grid-row={rowIndex}
                      data-grid-col={0}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)}
                      placeholder="Nome do produto"
                      aria-label={`Nome linha ${rowIndex + 1}`}
                      className={cn(
                        "h-9 w-full rounded-xl border bg-surface px-2.5 text-xs font-medium text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
                        showRowError && row.name.trim().length < 2
                          ? "border-[#D92D20]"
                          : "border-line"
                      )}
                    />
                  </td>

                  {/* Categoria */}
                  <td className="px-1.5 py-2 align-middle">
                    <select
                      value={row.categoryId}
                      data-grid-row={rowIndex}
                      data-grid-col={1}
                      onChange={(e) =>
                        updateRow(row.id, { categoryId: e.target.value })
                      }
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)}
                      aria-label={`Categoria linha ${rowIndex + 1}`}
                      className="h-9 w-full rounded-xl border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Preço */}
                  <td className="px-1.5 py-2 align-middle">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.price}
                      data-grid-row={rowIndex}
                      data-grid-col={2}
                      onChange={(e) =>
                        updateRow(row.id, { price: e.target.value })
                      }
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)}
                      placeholder="Sob consulta"
                      aria-label={`Preço linha ${rowIndex + 1}`}
                      className={cn(
                        "h-9 w-full rounded-xl border bg-surface px-2.5 text-xs tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
                        showRowError && !parsePriceValue(row.price).valid
                          ? "border-[#D92D20]"
                          : "border-line"
                      )}
                    />
                  </td>

                  {/* Tags */}
                  <td className="px-1.5 py-2 align-middle">
                    <input
                      type="text"
                      value={row.tags}
                      data-grid-row={rowIndex}
                      data-grid-col={3}
                      onChange={(e) => updateRow(row.id, { tags: e.target.value })}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)}
                      placeholder="Natal, Chaveiro"
                      aria-label={`Tags linha ${rowIndex + 1}`}
                      className="h-9 w-full rounded-xl border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </td>

                  {/* Cores */}
                  <td className="px-1.5 py-2 align-middle">
                    <input
                      type="text"
                      value={row.colors}
                      data-grid-row={rowIndex}
                      data-grid-col={4}
                      onChange={(e) =>
                        updateRow(row.id, { colors: e.target.value })
                      }
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                      placeholder="Preto, Branco"
                      aria-label={`Cores linha ${rowIndex + 1}`}
                      className="h-9 w-full rounded-xl border border-line bg-surface px-2.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </td>

                  {/* Link do STL */}
                  <td className="px-1.5 py-2 align-middle">
                    <input
                      type="url"
                      value={row.stlUrl}
                      data-grid-row={rowIndex}
                      data-grid-col={5}
                      onChange={(e) =>
                        updateRow(row.id, { stlUrl: e.target.value })
                      }
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5)}
                      placeholder="https://... (interno)"
                      aria-label={`Link STL linha ${rowIndex + 1}`}
                      className={cn(
                        "h-9 w-full rounded-xl border bg-surface px-2.5 text-xs font-mono text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
                        showRowError && !isValidHttpUrl(row.stlUrl)
                          ? "border-[#D92D20]"
                          : "border-line"
                      )}
                    />
                  </td>

                  {/* Status da linha */}
                  <td className="px-2 py-2 align-middle">
                    {isUploading ? (
                      <Badge variant="accent" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Foto...
                      </Badge>
                    ) : blank ? (
                      <span className="text-[11px] text-muted">Em branco</span>
                    ) : showRowError && validation.error ? (
                      <span
                        title={validation.error}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B42318]"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-2">{validation.error}</span>
                      </span>
                    ) : validation.valid ? (
                      <Badge variant="active">Pronta</Badge>
                    ) : (
                      <Badge variant="draft">Incompleta</Badge>
                    )}
                  </td>

                  {/* Ações rápidas da linha */}
                  <td className="px-2 py-2 align-middle text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(row, rowIndex)}
                        title="Duplicar linha"
                        aria-label={`Duplicar linha ${rowIndex + 1}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-accent-soft hover:text-ink cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        title="Remover linha"
                        aria-label={`Remover linha ${rowIndex + 1}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-[#FEE4E2] hover:text-[#B42318] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
