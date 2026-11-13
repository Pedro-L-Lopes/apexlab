"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CornerDownRight,
  Edit3,
  FolderKanban,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { AdminCategoryItem } from "@/lib/queries/admin";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  saveCategoryAction,
  toggleCategoryFlagAction,
} from "@/lib/actions/admin-categories";
import { cn, slugify } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwitchToggle } from "@/components/ui/controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface CategoriesClientProps {
  initialCategories: AdminCategoryItem[];
}

function SortableCategoryRow({
  category,
  parentName,
  depth = 0,
  busy,
  onToggleFlag,
  onEdit,
  onDelete,
}: {
  category: AdminCategoryItem;
  parentName?: string | null;
  depth?: number;
  busy: boolean;
  onToggleFlag: (
    id: string,
    field: "active" | "show_on_home",
    next: boolean
  ) => void;
  onEdit: (category: AdminCategoryItem) => void;
  onDelete: (category: AdminCategoryItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-4 shadow-xs transition sm:flex-row sm:items-center sm:justify-between",
        depth > 0 && "ml-5 sm:ml-8 border-dashed bg-[#FAFCFF]",
        isDragging && "z-20 opacity-85 shadow-lg border-accent"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label={`Arrastar ${category.name}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-ink cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {depth > 0 && (
          <CornerDownRight className="h-4 w-4 shrink-0 text-accent" />
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold text-ink truncate">
              {category.name}
            </span>
            <Badge variant={category.active ? "active" : "hidden"}>
              {category.active ? "Ativa" : "Inativa"}
            </Badge>
            {category.show_on_home && (
              <Badge variant="accent">Home</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            /{category.slug}
            {parentName ? ` · Subcategoria de ${parentName}` : ""} ·{" "}
            {category.product_count}{" "}
            {category.product_count === 1 ? "produto" : "produtos"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Ativa</span>
            <SwitchToggle
              checked={category.active}
              disabled={busy}
              onCheckedChange={(val) =>
                onToggleFlag(category.id, "active", val)
              }
              className="w-auto"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Na home</span>
            <SwitchToggle
              checked={category.show_on_home}
              disabled={busy}
              onCheckedChange={(val) =>
                onToggleFlag(category.id, "show_on_home", val)
              }
              className="w-auto"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(category)}
            aria-label={`Editar ${category.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-accent cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(category)}
            aria-label={`Excluir ${category.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-[#FEE4E2] hover:text-[#B42318] cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = React.useState(initialCategories);
  const [prevInitial, setPrevInitial] = React.useState(initialCategories);
  if (prevInitial !== initialCategories) {
    setPrevInitial(initialCategories);
    setCategories(initialCategories);
  }
  const [busy, setBusy] = React.useState(false);

  // Modal de criação / edição
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [formParentId, setFormParentId] = React.useState<string>("none");
  const [formActive, setFormActive] = React.useState(true);
  const [formShowOnHome, setFormShowOnHome] = React.useState(false);

  // Exclusão
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminCategoryItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ordena pais + filhos agrupados para exibição clara
  const orderedFlat = React.useMemo(() => {
    const parents = categories
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.position - b.position);
    const childrenByParent = new Map<string, AdminCategoryItem[]>();
    const orphans: AdminCategoryItem[] = [];
    const parentIds = new Set(parents.map((p) => p.id));

    for (const c of categories) {
      if (!c.parent_id) continue;
      if (!parentIds.has(c.parent_id)) {
        orphans.push(c);
        continue;
      }
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }

    const result: Array<{ item: AdminCategoryItem; depth: number; parentName?: string }> = [];
    for (const p of parents) {
      result.push({ item: p, depth: 0 });
      const children = (childrenByParent.get(p.id) ?? []).sort(
        (a, b) => a.position - b.position
      );
      for (const child of children) {
        result.push({ item: child, depth: 1, parentName: p.name });
      }
    }
    for (const orphan of orphans) {
      result.push({ item: orphan, depth: 0 });
    }
    return result;
  }, [categories]);

  const parentChoices = React.useMemo(
    () =>
      categories.filter((c) => c.parent_id === null && c.id !== editingId),
    [categories, editingId]
  );

  const openCreateModal = () => {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setSlugTouched(false);
    setFormParentId("none");
    setFormActive(true);
    setFormShowOnHome(false);
    setModalOpen(true);
  };

  const openEditModal = (cat: AdminCategoryItem) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setSlugTouched(true);
    setFormParentId(cat.parent_id ?? "none");
    setFormActive(cat.active);
    setFormShowOnHome(cat.show_on_home);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await saveCategoryAction({
      id: editingId ?? undefined,
      name: formName.trim(),
      slug: formSlug.trim() || slugify(formName),
      parent_id: formParentId === "none" ? null : formParentId,
      active: formActive,
      show_on_home: formShowOnHome,
    });
    setBusy(false);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao salvar categoria",
        description: res.error,
      });
      return;
    }

    setModalOpen(false);
    toast({
      variant: "success",
      title: editingId ? "Categoria atualizada" : "Categoria criada",
      description: formName.trim(),
    });
    router.refresh();
  };

  const handleToggleFlag = async (
    id: string,
    field: "active" | "show_on_home",
    next: boolean
  ) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: next } : cat))
    );
    const res = await toggleCategoryFlagAction(id, field, next);
    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao atualizar categoria",
        description: res.error,
      });
      router.refresh();
      return;
    }
    toast({
      variant: "success",
      title: "Categoria atualizada",
    });
    router.refresh();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIds = orderedFlat.map((entry) => entry.item.id);
    const oldIndex = currentIds.indexOf(String(active.id));
    const newIndex = currentIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedIds = arrayMove(currentIds, oldIndex, newIndex);
    const positionMap = new Map(reorderedIds.map((id, idx) => [id, idx]));

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        position: positionMap.get(cat.id) ?? cat.position,
      }))
    );

    const res = await reorderCategoriesAction(reorderedIds);
    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao salvar nova ordem",
        description: res.error,
      });
      router.refresh();
      return;
    }
    toast({
      variant: "success",
      title: "Ordem das categorias salva",
    });
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusy(true);
    const res = await deleteCategoryAction(target.id);
    setBusy(false);
    setDeleteTarget(null);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao excluir categoria",
        description: res.error,
      });
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== target.id));
    toast({
      variant: "success",
      title: "Categoria excluída",
      description: target.name,
    });
    router.refresh();
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Organização"
        title={
          <>
            Categorias<span className="text-accent">.</span>
          </>
        }
        subtitle={`${categories.length} ${
          categories.length === 1 ? "categoria" : "categorias"
        } · arraste para reordenar`}
        actions={
          <Button type="button" variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        }
      />

      {orderedFlat.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedFlat.map((entry) => entry.item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {orderedFlat.map(({ item, depth, parentName }) => (
                <SortableCategoryRow
                  key={item.id}
                  category={item}
                  depth={depth}
                  parentName={parentName}
                  busy={busy}
                  onToggleFlag={handleToggleFlag}
                  onEdit={openEditModal}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-[24px] border border-dashed border-line bg-surface p-12 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">
            Nenhuma categoria cadastrada
          </h2>
          <p className="mt-1 text-sm text-muted">
            Crie categorias e subcategorias para organizar o catálogo.
          </p>
          <div className="mt-5">
            <Button type="button" variant="primary" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Criar primeira categoria
            </Button>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription>
              Defina o nome, slug e se ela aparece na vitrine ou na página
              inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Nome *
              </label>
              <Input
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!slugTouched) setFormSlug(slugify(e.target.value));
                }}
                placeholder="Ex.: Decoração & Casa"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Slug *
              </label>
              <Input
                value={formSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setFormSlug(e.target.value);
                }}
                placeholder="decoracao-casa"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Categoria pai (opcional)
              </label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (categoria principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Nenhuma (categoria principal)
                  </SelectItem>
                  {parentChoices.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-[16px] border border-line bg-bg/60 p-3.5">
              <SwitchToggle
                checked={formActive}
                onCheckedChange={setFormActive}
                label="Categoria ativa"
                description="Visível nos filtros públicos"
              />
              <SwitchToggle
                checked={formShowOnHome}
                onCheckedChange={setFormShowOnHome}
                label="Destacar na Home"
                description="Exibir na seção Explore por categoria"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Salvando..." : "Salvar categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong className="text-ink">{deleteTarget?.name}</strong>? Os
              produtos vinculados ficarão sem categoria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={handleConfirmDelete}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
