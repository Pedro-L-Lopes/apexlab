"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Box,
  CheckSquare,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FolderInput,
  Plus,
  Square,
  Star,
  Trash2,
} from "lucide-react";
import type {
  AdminCategoryItem,
  AdminProductListItem,
  AdminProductStatus,
} from "@/lib/queries/admin";
import {
  batchProductsAction,
  deleteProductAction,
  duplicateProductAction,
  toggleProductFeaturedAction,
  toggleProductStatusAction,
} from "@/lib/actions/admin-products";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/input";
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

interface ProductsTableClientProps {
  initialProducts: AdminProductListItem[];
  categories: AdminCategoryItem[];
  initialStatusFilter?: "all" | AdminProductStatus;
}

const STATUS_INFO: Record<
  AdminProductStatus,
  { label: string; variant: "active" | "draft" | "hidden" }
> = {
  active: { label: "Ativo", variant: "active" },
  draft: { label: "Rascunho", variant: "draft" },
  hidden: { label: "Oculto", variant: "hidden" },
};

export function ProductsTableClient({
  initialProducts,
  categories,
  initialStatusFilter = "all",
}: ProductsTableClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [products, setProducts] = React.useState(initialProducts);
  const [prevInitial, setPrevInitial] = React.useState(initialProducts);
  if (prevInitial !== initialProducts) {
    setPrevInitial(initialProducts);
    setProducts(initialProducts);
  }
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | AdminProductStatus
  >(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [batchCategory, setBatchCategory] = React.useState<string>("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [batchBusy, setBatchBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminProductListItem | null>(null);

  const statusCounts = React.useMemo(() => {
    let active = 0;
    let draft = 0;
    let hidden = 0;
    for (const p of products) {
      if (p.status === "active") active += 1;
      else if (p.status === "draft") draft += 1;
      else hidden += 1;
    }
    return { all: products.length, active, draft, hidden };
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter === "none" && p.category_id !== null) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "none" &&
        p.category_id !== categoryFilter
      ) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.slug} ${p.material ?? ""} ${p.category_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categoryFilter, products, search, statusFilter]);

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredProducts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      for (const p of filteredProducts) next.add(p.id);
      setSelectedIds(Array.from(next));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = async (product: AdminProductListItem) => {
    const nextStatus: AdminProductStatus =
      product.status === "active" ? "hidden" : "active";
    setBusyId(product.id);
    const res = await toggleProductStatusAction(product.id, nextStatus);
    setBusyId(null);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao atualizar status",
        description: res.error,
      });
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );
    toast({
      variant: "success",
      title:
        nextStatus === "active" ? "Produto publicado" : "Produto ocultado",
      description: product.name,
    });
    router.refresh();
  };

  const handleToggleFeatured = async (product: AdminProductListItem) => {
    const next = !product.featured;
    setBusyId(product.id);
    const res = await toggleProductFeaturedAction(product.id, next);
    setBusyId(null);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao atualizar destaque",
        description: res.error,
      });
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, featured: next } : p))
    );
    toast({
      variant: "success",
      title: next ? "Adicionado aos destaques" : "Removido dos destaques",
      description: product.name,
    });
    router.refresh();
  };

  const handleDuplicate = async (product: AdminProductListItem) => {
    setBusyId(product.id);
    const res = await duplicateProductAction(product.id);
    setBusyId(null);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao duplicar",
        description: res.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: "Produto duplicado como rascunho",
      description: `${product.name} (Cópia)`,
    });
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    const res = await deleteProductAction(target.id);
    setBusyId(null);
    setDeleteTarget(null);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao excluir",
        description: res.error,
      });
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== target.id));
    setSelectedIds((prev) => prev.filter((id) => id !== target.id));
    toast({
      variant: "success",
      title: "Produto excluído",
      description: target.name,
    });
    router.refresh();
  };

  const runBatch = async (
    action: "publish" | "hide" | "category",
    categoryId?: string | null
  ) => {
    if (selectedIds.length === 0) return;
    setBatchBusy(true);
    const res = await batchProductsAction({
      ids: selectedIds,
      action,
      categoryId,
    });
    setBatchBusy(false);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro na ação em lote",
        description: res.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: "Ação em lote aplicada",
      description: `${selectedIds.length} ${
        selectedIds.length === 1 ? "produto atualizado" : "produtos atualizados"
      }.`,
    });
    setSelectedIds([]);
    setBatchCategory("");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title={
          <>
            Produtos<span className="text-accent">.</span>
          </>
        }
        subtitle={`${filteredProducts.length} ${
          filteredProducts.length === 1 ? "item exibido" : "itens exibidos"
        } de ${products.length} no total`}
        actions={
          <Link
            href="/admin/produtos/novo"
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </Link>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto pb-1">
          <PillTabs<"all" | AdminProductStatus>
            layoutId="admin-products-status-tabs"
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { value: "all", label: "Todos", count: statusCounts.all },
              { value: "active", label: "Ativos", count: statusCounts.active },
              { value: "draft", label: "Rascunhos", count: statusCounts.draft },
              { value: "hidden", label: "Ocultos", count: statusCounts.hidden },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            resultLabel={`${filteredProducts.length} itens`}
            className="w-full sm:w-64"
          />

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger
              aria-label="Filtrar por categoria"
              className="w-full sm:w-52"
            >
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barra de ações em lote */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-accent/25 bg-accent-soft px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckSquare className="h-4 w-4 text-accent" />
            <span>
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "selecionado" : "selecionados"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={batchBusy}
              onClick={() => runBatch("publish")}
            >
              <Eye className="h-3.5 w-3.5" />
              Publicar
            </Button>

            <Button
              size="sm"
              variant="secondary"
              disabled={batchBusy}
              onClick={() => runBatch("hide")}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Ocultar
            </Button>

            <div className="flex items-center gap-1.5">
              <Select
                value={batchCategory}
                onValueChange={(value) => {
                  setBatchCategory(value);
                  runBatch("category", value === "none" ? null : value);
                }}
              >
                <SelectTrigger className="h-8 w-44 rounded-full text-xs">
                  <FolderInput className="h-3.5 w-3.5 text-muted" />
                  <SelectValue placeholder="Mudar categoria" />
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
            </div>

            <Button
              size="sm"
              variant="ghost"
              disabled={batchBusy}
              onClick={() => setSelectedIds([])}
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <button
                type="button"
                onClick={toggleSelectAll}
                aria-label="Selecionar todos os produtos visíveis"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-ink cursor-pointer"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4 text-accent" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            </TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Destaque</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              const badge = STATUS_INFO[product.status];
              const isBusy = busyId === product.id;

              return (
                <TableRow
                  key={product.id}
                  className={cn(isSelected && "bg-accent-soft/45")}
                >
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleRow(product.id)}
                      aria-label={`Selecionar ${product.name}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-ink cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="min-w-[240px]">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-bg"
                      >
                        {product.cover_image_url ? (
                          <Image
                            src={product.cover_image_url}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-muted">
                            <Box className="h-4 w-4" />
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produtos/${product.id}`}
                          className="block truncate font-semibold text-ink hover:text-accent"
                        >
                          {product.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="truncate">/{product.slug}</span>
                          {product.variants_count > 0 && (
                            <span className="shrink-0 text-[11px] font-medium text-accent">
                              · {product.variants_count} opções
                            </span>
                          )}
                          {product.status === "active" && !product.license && (
                            <span
                              title="Sem licença comercial preenchida"
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Sem licença
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted">
                    {product.category_name ?? "—"}
                  </TableCell>

                  <TableCell className="font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(product.price)}
                  </TableCell>

                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleFeatured(product)}
                      aria-label={
                        product.featured
                          ? `Remover ${product.name} dos destaques`
                          : `Destacar ${product.name}`
                      }
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer disabled:opacity-50",
                        product.featured
                          ? "bg-amber-50 text-amber-500"
                          : "text-muted hover:bg-accent-soft hover:text-ink"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          product.featured && "fill-amber-400"
                        )}
                      />
                    </button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleStatus(product)}
                        title={
                          product.status === "active"
                            ? "Ocultar da vitrine"
                            : "Publicar na vitrine"
                        }
                        aria-label={
                          product.status === "active" ? "Ocultar" : "Publicar"
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink cursor-pointer disabled:opacity-50"
                      >
                        {product.status === "active" ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDuplicate(product)}
                        title="Duplicar produto"
                        aria-label={`Duplicar ${product.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink cursor-pointer disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <Link
                        href={`/admin/produtos/${product.id}`}
                        title="Editar produto"
                        aria-label={`Editar ${product.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-accent"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(product)}
                        title="Excluir produto"
                        aria-label={`Excluir ${product.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-[#FEE4E2] hover:text-[#B42318] cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted">
                Nenhum produto encontrado para estes filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Diálogo de exclusão */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong className="text-ink">{deleteTarget?.name}</strong>? Essa
              ação remove imagens, variantes e dados internos do produto e não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === deleteTarget?.id}
              onClick={handleConfirmDelete}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
