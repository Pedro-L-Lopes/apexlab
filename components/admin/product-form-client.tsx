"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowLeft,
  Crown,
  ExternalLink,
  EyeOff,
  GripVertical,
  Link2,
  Lock,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  AdminCategoryItem,
  AdminProductDetail,
  AdminProductStatus,
} from "@/lib/queries/admin";
import {
  saveProductAction,
  type SaveProductInput,
} from "@/lib/actions/admin-products";
import { cn, formatCurrencyBRL, slugify } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SwitchToggle } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StackedCard } from "@/components/ui/stacked-card";
import { useToast } from "@/components/ui/toast";
import { ImportLinkDialog } from "@/components/admin/import-link-dialog";

export interface AdminProductPrefill {
  importJobId?: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number | null;
  material: string | null;
  tags: string[];
  images: Array<{ url: string; is_cover: boolean }>;
  private_data: {
    stl_url: string | null;
    source_url: string | null;
    license: string | null;
  };
  warning?: string | null;
  duplicateProduct?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface ProductFormClientProps {
  initialProduct: AdminProductDetail | null;
  categories: AdminCategoryItem[];
  initialPrefill?: AdminProductPrefill | null;
}

interface EditableImage {
  uid: string;
  url: string;
  is_cover: boolean;
}

interface EditableAttribute {
  key: string;
  value: string;
}

interface EditableVariant {
  uid: string;
  id?: string;
  name: string;
  price: string;
  width_mm: string;
  height_mm: string;
  depth_mm: string;
  weight_g: string;
  active: boolean;
  attributes: EditableAttribute[];
}

function toStringOrEmpty(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parseNullableInt(raw: string): number | null {
  const num = parseNullableNumber(raw);
  return num === null ? null : Math.round(num);
}

function attributesFromJson(raw: unknown): EditableAttribute[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const list: EditableAttribute[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      list.push({ key, value: String(value) });
    }
  }
  return list;
}

function SortableImageCard({
  image,
  onSetCover,
  onRemove,
}: {
  image: EditableImage;
  onSetCover: (uid: string) => void;
  onRemove: (uid: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-[20px] border bg-surface shadow-xs",
        image.is_cover ? "border-accent ring-2 ring-accent/20" : "border-line",
        isDragging && "z-20 opacity-80 shadow-lg"
      )}
    >
      <div className="relative aspect-[4/5] w-full bg-bg">
        <Image
          src={image.url}
          alt="Imagem do produto"
          fill
          sizes="180px"
          className="object-cover"
        />
      </div>

      {/* Drag handle */}
      <button
        type="button"
        aria-label="Arrastar imagem para reordenar"
        className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-xs backdrop-blur-xs cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(image.uid)}
        aria-label="Remover imagem"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-[#B42318] shadow-xs backdrop-blur-xs hover:bg-[#FEE4E2] cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Cover badge / action */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => onSetCover(image.uid)}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold transition cursor-pointer",
            image.is_cover
              ? "bg-accent text-accent-foreground"
              : "bg-bg text-muted hover:bg-accent-soft hover:text-accent"
          )}
        >
          <Crown className="h-3 w-3" />
          {image.is_cover ? "Capa" : "Definir capa"}
        </button>
      </div>
    </div>
  );
}

export function ProductFormClient({
  initialProduct,
  categories,
  initialPrefill = null,
}: ProductFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(initialProduct);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const [name, setName] = React.useState(
    initialProduct?.name ?? initialPrefill?.name ?? ""
  );
  const [slug, setSlug] = React.useState(
    initialProduct?.slug ?? initialPrefill?.slug ?? ""
  );
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initialProduct));
  const [description, setDescription] = React.useState(
    initialProduct?.description ?? initialPrefill?.description ?? ""
  );
  const [categoryId, setCategoryId] = React.useState<string>(
    initialProduct?.category_id ?? initialPrefill?.category_id ?? "none"
  );
  const [status, setStatus] = React.useState<AdminProductStatus>(
    initialProduct?.status ?? "draft"
  );
  const [featured, setFeatured] = React.useState(
    initialProduct?.featured ?? false
  );
  const [position, setPosition] = React.useState(
    String(initialProduct?.position ?? 0)
  );
  const [price, setPrice] = React.useState(
    toStringOrEmpty(initialProduct?.price ?? initialPrefill?.price)
  );
  const [material, setMaterial] = React.useState(
    initialProduct?.material ?? initialPrefill?.material ?? ""
  );
  const [printTimeMin, setPrintTimeMin] = React.useState(
    toStringOrEmpty(initialProduct?.print_time_min)
  );
  const [widthMm, setWidthMm] = React.useState(
    toStringOrEmpty(initialProduct?.width_mm)
  );
  const [heightMm, setHeightMm] = React.useState(
    toStringOrEmpty(initialProduct?.height_mm)
  );
  const [depthMm, setDepthMm] = React.useState(
    toStringOrEmpty(initialProduct?.depth_mm)
  );
  const [weightG, setWeightG] = React.useState(
    toStringOrEmpty(initialProduct?.weight_g)
  );

  // Tags & Colors
  const [tags, setTags] = React.useState<string[]>(
    initialProduct?.tags ?? initialPrefill?.tags ?? []
  );
  const [tagInput, setTagInput] = React.useState("");
  const [colors, setColors] = React.useState<string[]>(
    initialProduct?.colors ?? []
  );
  const [colorInput, setColorInput] = React.useState("");

  // Images
  const [images, setImages] = React.useState<EditableImage[]>(() =>
    (initialProduct?.images ?? initialPrefill?.images ?? []).map((img, idx) => ({
      uid:
        "id" in img && typeof img.id === "string"
          ? img.id
          : `img-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      url: img.url,
      is_cover: img.is_cover,
    }))
  );
  const [uploadingImages, setUploadingImages] = React.useState(false);

  // Variants
  const [variants, setVariants] = React.useState<EditableVariant[]>(() =>
    (initialProduct?.variants ?? []).map((v, idx) => ({
      uid: v.id ?? `var-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      id: v.id,
      name: v.name,
      price: toStringOrEmpty(v.price),
      width_mm: toStringOrEmpty(v.width_mm),
      height_mm: toStringOrEmpty(v.height_mm),
      depth_mm: toStringOrEmpty(v.depth_mm),
      weight_g: toStringOrEmpty(v.weight_g),
      active: v.active,
      attributes: attributesFromJson(v.attributes),
    }))
  );

  // Private fields (product_private)
  const [stlUrl, setStlUrl] = React.useState(
    initialProduct?.private_data.stl_url ??
      initialPrefill?.private_data.stl_url ??
      ""
  );
  const [sourceUrl, setSourceUrl] = React.useState(
    initialProduct?.private_data.source_url ??
      initialPrefill?.private_data.source_url ??
      ""
  );
  const [license, setLicense] = React.useState(
    initialProduct?.private_data.license ??
      initialPrefill?.private_data.license ??
      ""
  );
  const [cost, setCost] = React.useState(
    toStringOrEmpty(initialProduct?.private_data.cost)
  );
  const [notes, setNotes] = React.useState(
    initialProduct?.private_data.notes ?? ""
  );

  const [saving, setSaving] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const addChip = (
    rawValue: string,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: () => void
  ) => {
    const items = rawValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;

    const existingLower = new Set(currentList.map((i) => i.toLowerCase()));
    const additions: string[] = [];
    for (const item of items) {
      if (!existingLower.has(item.toLowerCase())) {
        existingLower.add(item.toLowerCase());
        additions.push(item);
      }
    }
    if (additions.length > 0) {
      setter([...currentList, ...additions]);
    }
    clearInput();
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);

    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
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
            title: `Falha ao enviar ${file.name}`,
            description: json.error ?? "Verifique o arquivo e tente novamente.",
          });
        } else {
          uploadedUrls.push(json.url);
        }
      } catch {
        toast({
          variant: "error",
          title: `Erro de conexão ao enviar ${file.name}`,
        });
      }
    }

    setUploadingImages(false);
    if (uploadedUrls.length > 0) {
      setImages((prev) => {
        const hasCover = prev.some((img) => img.is_cover);
        const nextItems = uploadedUrls.map((url, idx) => ({
          uid: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          url,
          is_cover: !hasCover && idx === 0,
        }));
        return [...prev, ...nextItems];
      });
      toast({
        variant: "success",
        title: `${uploadedUrls.length} ${
          uploadedUrls.length === 1 ? "imagem enviada" : "imagens enviadas"
        }`,
        description: "Convertida(s) para WebP (máx. 1600px).",
      });
    }
  };

  const handleDragEndImages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIdx = prev.findIndex((i) => i.uid === active.id);
      const newIdx = prev.findIndex((i) => i.uid === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleSetCover = (uid: string) => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, is_cover: img.uid === uid }))
    );
  };

  const handleRemoveImage = (uid: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.uid !== uid);
      if (filtered.length > 0 && !filtered.some((img) => img.is_cover)) {
        filtered[0] = { ...filtered[0], is_cover: true };
      }
      return filtered;
    });
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        uid: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        price: "",
        width_mm: "",
        height_mm: "",
        depth_mm: "",
        weight_g: "",
        active: true,
        attributes: [],
      },
    ]);
  };

  const updateVariant = (
    uid: string,
    patch: Partial<EditableVariant>
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v))
    );
  };

  const removeVariant = (uid: string) => {
    setVariants((prev) => prev.filter((v) => v.uid !== uid));
  };

  const submitWithStatus = async (targetStatus: AdminProductStatus) => {
    setSaving(true);

    const payload: SaveProductInput = {
      id: initialProduct?.id,
      import_job_id: initialPrefill?.importJobId,
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim() || null,
      category_id: categoryId === "none" ? null : categoryId,
      status: targetStatus,
      featured,
      position: parseNullableInt(position) ?? 0,
      price: parseNullableNumber(price),
      material: material.trim() || null,
      print_time_min: parseNullableInt(printTimeMin),
      width_mm: parseNullableNumber(widthMm),
      height_mm: parseNullableNumber(heightMm),
      depth_mm: parseNullableNumber(depthMm),
      weight_g: parseNullableNumber(weightG),
      tags,
      colors,
      images: images.map((img, idx) => ({
        url: img.url,
        position: idx,
        is_cover: img.is_cover,
      })),
      variants: variants
        .filter((v) => v.name.trim().length > 0)
        .map((v, idx) => {
          const attrRecord: Record<string, string> = {};
          for (const pair of v.attributes) {
            if (pair.key.trim() && pair.value.trim()) {
              attrRecord[pair.key.trim()] = pair.value.trim();
            }
          }
          return {
            id: v.id,
            name: v.name.trim(),
            price: parseNullableNumber(v.price),
            width_mm: parseNullableNumber(v.width_mm),
            height_mm: parseNullableNumber(v.height_mm),
            depth_mm: parseNullableNumber(v.depth_mm),
            weight_g: parseNullableNumber(v.weight_g),
            attributes: attrRecord,
            active: v.active,
            position: idx,
          };
        }),
      private_data: {
        stl_url: stlUrl.trim() || null,
        source_url: sourceUrl.trim() || null,
        license: license.trim() || null,
        cost: parseNullableNumber(cost),
        notes: notes.trim() || null,
      },
    };

    const res = await saveProductAction(payload);
    setSaving(false);

    if (!res.ok || !res.data) {
      toast({
        variant: "error",
        title: "Erro ao salvar produto",
        description: res.error,
      });
      return;
    }

    setStatus(targetStatus);
    setSlug(res.data.slug);
    toast({
      variant: "success",
      title:
        targetStatus === "active"
          ? "Produto salvo e publicado"
          : targetStatus === "hidden"
            ? "Produto salvo como oculto"
            : "Rascunho salvo",
      description: "Cache da vitrine atualizado imediatamente.",
    });

    if (!isEditing) {
      router.push(`/admin/produtos/${res.data.id}`);
    } else {
      router.refresh();
    }
  };

  // Preview computations
  const previewCategory = categories.find((c) => c.id === categoryId);
  const previewCover =
    images.find((img) => img.is_cover)?.url ?? images[0]?.url ?? null;
  const activeVariants = variants.filter((v) => v.active && v.name.trim());
  const baseNumericPrice = parseNullableNumber(price);
  const variantNumericPrices = activeVariants
    .map((v) => parseNullableNumber(v.price) ?? baseNumericPrice)
    .filter((v): v is number => v !== null);
  const previewStartingPrice =
    variantNumericPrices.length > 0
      ? Math.min(...variantNumericPrices)
      : baseNumericPrice;

  const missingLicenseOnPublish = !license.trim();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/produtos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para produtos
        </Link>

        {isEditing && status === "active" && slug && (
          <Link
            href={`/produto/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="h-3.5 w-3.5 text-accent" />
            Ver na vitrine
          </Link>
        )}
      </div>

      <PageHeader
        eyebrow={isEditing ? "Editar produto" : "Novo produto"}
        title={
          <>
            {name.trim() || "Novo produto"}
            <span className="text-accent">.</span>
          </>
        }
        subtitle="Preencha os dados públicos, variações, imagens e metadados internos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setImportDialogOpen(true)}
              >
                <Link2 className="h-4 w-4 text-accent" />
                Importar por link
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => submitWithStatus("draft")}
            >
              <Save className="h-4 w-4" />
              Salvar rascunho
            </Button>

            {status === "active" && (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => submitWithStatus("hidden")}
              >
                <EyeOff className="h-4 w-4" />
                Ocultar
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              disabled={saving}
              onClick={() => submitWithStatus("active")}
            >
              <Send className="h-4 w-4" />
              {saving ? "Salvando..." : "Publicar"}
            </Button>
          </div>
        }
      />

      {initialPrefill && (
        <div className="space-y-2 rounded-[22px] border border-accent/25 bg-accent-soft/60 px-5 py-4 text-xs text-ink">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4 text-accent" />
              Pré-preenchido por importação externa (salve como rascunho ou publique)
            </div>
            {initialPrefill.private_data.source_url && (
              <a
                href={initialPrefill.private_data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                Abrir origem
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {initialPrefill.warning && (
            <div className="flex items-start gap-2 rounded-xl border border-[#F59E0B]/30 bg-[#FEF3C7]/70 px-3 py-2 text-[#92400E]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{initialPrefill.warning}</span>
            </div>
          )}

          {initialPrefill.duplicateProduct && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F59E0B]/35 bg-[#FEF3C7] px-3 py-2 text-[#92400E]">
              <span>
                <strong>Atenção — possível duplicado:</strong> esta origem já está
                vinculada ao produto{" "}
                <strong>{initialPrefill.duplicateProduct.name}</strong>.
              </span>
              <Link
                href={`/admin/produtos/${initialPrefill.duplicateProduct.id}`}
                className="font-semibold underline"
              >
                Abrir existente
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Aviso não-bloqueante sobre licença vazia */}
      {missingLicenseOnPublish && (
        <div className="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Licença comercial não informada</p>
            <p className="text-xs text-amber-800/90">
              Você ainda pode publicar normalmente, mas recomendamos registrar a
              licença no bloco Interno abaixo antes de comercializar modelos de
              terceiros.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna principal de edição */}
        <div className="space-y-6 lg:col-span-8">
          {/* Dados básicos */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-ink">
                Informações principais
              </h2>
              <Badge
                variant={
                  status === "active"
                    ? "active"
                    : status === "draft"
                      ? "draft"
                      : "hidden"
                }
              >
                {status === "active"
                  ? "Ativo"
                  : status === "draft"
                    ? "Rascunho"
                    : "Oculto"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Nome do produto *
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex.: Vaso Geométrico Voronoi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Slug (URL) *
                </label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="vaso-geometrico-voronoi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Categoria
                </label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Descrição pública
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva acabamento, usos recomendados e diferenciais da peça..."
                  className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/80 shadow-xs transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Preço base (R$) — vazio = Sob consulta
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex.: 54.90"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Ordem no catálogo (posição)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <SwitchToggle
                  checked={featured}
                  onCheckedChange={setFeatured}
                  label="Produto em destaque"
                  description="Exibir na seção de destaques da página inicial"
                />
              </div>
            </div>
          </section>

          {/* Ficha técnica, tags e cores */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Ficha técnica e atributos
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Material
                </label>
                <Input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Ex.: PLA Silk, PETG, Resina 8K"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Tempo estimado (min)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={printTimeMin}
                  onChange={(e) => setPrintTimeMin(e.target.value)}
                  placeholder="Ex.: 210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Largura (mm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Altura (mm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Profundidade (mm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={depthMm}
                  onChange={(e) => setDepthMm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Peso (g)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightG}
                  onChange={(e) => setWeightG(e.target.value)}
                />
              </div>
            </div>

            {/* Cores disponíveis */}
            <div className="space-y-2 border-t border-line pt-4">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Cores disponíveis (ficha técnica)
              </label>
              <div className="flex gap-2">
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addChip(colorInput, colors, setColors, () =>
                        setColorInput("")
                      );
                    }
                  }}
                  placeholder="Digite uma cor e pressione Enter (ex.: Azul Cobalto, Branco)"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    addChip(colorInput, colors, setColors, () =>
                      setColorInput("")
                    )
                  }
                >
                  Adicionar
                </Button>
              </div>
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1 text-xs font-medium text-ink"
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() =>
                          setColors((prev) => prev.filter((c) => c !== color))
                        }
                        aria-label={`Remover cor ${color}`}
                        className="text-muted hover:text-ink cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2 border-t border-line pt-4">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Tags de filtro (#)
              </label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addChip(tagInput, tags, setTags, () => setTagInput(""));
                    }
                  }}
                  placeholder="Digite uma tag e pressione Enter (ex.: Minimalista, Setup)"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    addChip(tagInput, tags, setTags, () => setTagInput(""))
                  }
                >
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setTags((prev) => prev.filter((t) => t !== tag))
                        }
                        aria-label={`Remover tag ${tag}`}
                        className="opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Imagens com upload + DnD */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">
                  Imagens do produto
                </h2>
                <p className="text-xs text-muted">
                  Arraste para reordenar. Conversão automática para WebP (máx.
                  1600px, até 5 MB por arquivo).
                </p>
              </div>

              <label
                className={cn(
                  buttonVariants({ variant: "soft", size: "sm" }),
                  uploadingImages && "pointer-events-none opacity-60"
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {uploadingImages ? "Enviando..." : "Enviar imagens"}
                </span>
                <input
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  multiple
                  disabled={uploadingImages}
                  onChange={(e) => {
                    void handleUploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            {images.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndImages}
              >
                <SortableContext
                  items={images.map((i) => i.uid)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {images.map((img) => (
                      <SortableImageCard
                        key={img.uid}
                        image={img}
                        onSetCover={handleSetCover}
                        onRemove={handleRemoveImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="rounded-[18px] border border-dashed border-line bg-bg/60 py-10 text-center text-xs text-muted">
                Nenhuma imagem adicionada ainda.
              </div>
            )}
          </section>

          {/* Variantes */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">
                  Variações (opcional)
                </h2>
                <p className="text-xs text-muted">
                  Tamanhos, versões ou cores com preço e dimensões próprias.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar variação
              </Button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-4">
                {variants.map((variant, vIdx) => (
                  <div
                    key={variant.uid}
                    className="rounded-[18px] border border-line bg-bg/50 p-4 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Variação #{vIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variant.active}
                            onChange={(e) =>
                              updateVariant(variant.uid, {
                                active: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded accent-accent"
                          />
                          Ativa
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.uid)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#B42318] hover:underline cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Nome *
                        </label>
                        <Input
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(variant.uid, { name: e.target.value })
                          }
                          placeholder="Ex.: Grande (24cm)"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Preço (herda se vazio)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(variant.uid, {
                              price: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Largura (mm)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variant.width_mm}
                          onChange={(e) =>
                            updateVariant(variant.uid, {
                              width_mm: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Altura (mm)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variant.height_mm}
                          onChange={(e) =>
                            updateVariant(variant.uid, {
                              height_mm: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Peso (g)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variant.weight_g}
                          onChange={(e) =>
                            updateVariant(variant.uid, {
                              weight_g: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Atributos chave/valor */}
                    <div className="space-y-2 border-t border-line/70 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Atributos (chave / valor)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateVariant(variant.uid, {
                              attributes: [
                                ...variant.attributes,
                                { key: "", value: "" },
                              ],
                            })
                          }
                          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                        >
                          + Atributo
                        </button>
                      </div>

                      {variant.attributes.map((attr, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <Input
                            value={attr.key}
                            onChange={(e) => {
                              const next = [...variant.attributes];
                              next[aIdx] = { ...attr, key: e.target.value };
                              updateVariant(variant.uid, { attributes: next });
                            }}
                            placeholder="Chave (ex.: tamanho)"
                            className="h-9 text-xs"
                          />
                          <Input
                            value={attr.value}
                            onChange={(e) => {
                              const next = [...variant.attributes];
                              next[aIdx] = { ...attr, value: e.target.value };
                              updateVariant(variant.uid, { attributes: next });
                            }}
                            placeholder="Valor (ex.: G)"
                            className="h-9 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = variant.attributes.filter(
                                (_, idx) => idx !== aIdx
                              );
                              updateVariant(variant.uid, { attributes: next });
                            }}
                            aria-label="Remover atributo"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-[#B42318] cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Sem variações configuradas. O produto usará o preço e medidas
                principais.
              </p>
            )}
          </section>

          {/* Bloco Interno (product_private) */}
          <section className="rounded-[24px] border border-[#CFD8EA] bg-[#F8FAFF] p-6 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  <Lock className="h-3.5 w-3.5" />
                  Uso exclusivo do administrador
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-ink">
                  Dados internos (nunca públicos)
                </h2>
                <p className="text-xs text-muted">
                  Armazenado em <code>product_private</code> com proteção RLS.
                  Nunca aparece na vitrine, API pública ou código HTML público.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Link do arquivo STL / 3MF
                </label>
                <Input
                  value={stlUrl}
                  onChange={(e) => setStlUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Link de origem do modelo (source_url)
                </label>
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://makerworld.com/..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Licença
                </label>
                <Input
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="Ex.: Autoral / Comercial Patreon"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Custo interno estimado (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Notas internas de impressão
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Perfil do fatiador, suportes, bico, observações..."
                  className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/80 shadow-xs transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Coluna lateral: Pré-visualização ao vivo */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="sticky top-24 space-y-5 rounded-[24px] border border-line bg-surface p-6 shadow-card">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Pré-visualização
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">
                Como fica na vitrine
              </h2>
            </div>

            <StackedCard
              title={name.trim() || "Nome do produto"}
              subtitle={
                previewCategory?.name ?? (material.trim() || "Impressão 3D")
              }
              price={previewStartingPrice}
              hasPriceFromPrefix={
                activeVariants.length > 1 && previewStartingPrice !== null
              }
              optionsCount={activeVariants.length}
              status={status}
              imageUrl={previewCover}
            />

            <div className="rounded-[18px] border border-line bg-bg/70 p-4 text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted">URL pública:</span>
                <span className="truncate font-semibold text-ink">
                  /produto/{slug || "..."}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Preço exibido:</span>
                <span className="font-semibold text-ink">
                  {formatCurrencyBRL(previewStartingPrice)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Cores:</span>
                <span className="truncate font-semibold text-ink">
                  {colors.length > 0 ? colors.join(", ") : "Não definidas"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {!isEditing && (
        <ImportLinkDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
        />
      )}
    </div>
  );
}
