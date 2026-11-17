"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Image as ImageIcon,
  LayoutTemplate,
  MessageCircle,
  Palette,
  Save,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  AdminCategoryItem,
  AdminSiteSettings,
  AdminTagStat,
} from "@/lib/queries/admin";
import type { HeroMode } from "@/lib/queries/public";
import { updateSiteSettingsAction } from "@/lib/actions/admin-settings";
import { buildWhatsAppProductUrl } from "@/lib/whatsapp";
import { cn, getAccessibleSidebarColors, getContrastTextColor } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";

interface SettingsFormClientProps {
  initialSettings: AdminSiteSettings;
  activeCategories: AdminCategoryItem[];
  availableTags: AdminTagStat[];
}

const MAX_HOME_CATEGORIES = 3;
const MAX_HOME_TAGS = 2;

const HERO_MODE_OPTIONS: Array<{
  value: HeroMode;
  label: string;
  description: string;
}> = [
  {
    value: "text",
    label: "Texto compacto",
    description: "Faixa com nome da loja, resumo e busca rápida.",
  },
  {
    value: "image",
    label: "Banner de imagem",
    description: "Exibe o banner enviado; se não houver, usa texto.",
  },
  {
    value: "none",
    label: "Nenhum (oculto)",
    description: "Inicia direto pelas categorias e produtos.",
  },
];

const PRESET_COLORS = [
  "#1F4FFF",
  "#2563EB",
  "#0EA5E9",
  "#7C3AED",
  "#059669",
  "#E11D48",
  "#F59E0B",
  "#0E1630",
];

export function SettingsFormClient({
  initialSettings,
  activeCategories,
  availableTags,
}: SettingsFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const activeCategoryIdSet = React.useMemo(
    () => new Set(activeCategories.map((c) => c.id)),
    [activeCategories]
  );

  const initialCategoryIds = (
    initialSettings.home_category_ids.length > 0
      ? initialSettings.home_category_ids
      : initialSettings.home_category_id
        ? [initialSettings.home_category_id]
        : []
  )
    .filter((id) => activeCategoryIdSet.has(id))
    .slice(0, MAX_HOME_CATEGORIES);

  const [name, setName] = React.useState(initialSettings.name);
  const [description, setDescription] = React.useState(
    initialSettings.description
  );
  const [logoUrl, setLogoUrl] = React.useState(initialSettings.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = React.useState(
    initialSettings.banner_url ?? ""
  );
  const [heroMode, setHeroMode] = React.useState<HeroMode>(
    initialSettings.hero_mode
  );
  const [homeCategoryIds, setHomeCategoryIds] =
    React.useState<string[]>(initialCategoryIds);
  const [homeFeaturedTags, setHomeFeaturedTags] = React.useState<string[]>(
    initialSettings.home_featured_tags.slice(0, MAX_HOME_TAGS)
  );
  const [tagFilter, setTagFilter] = React.useState("");
  const [primaryColor, setPrimaryColor] = React.useState(
    initialSettings.primary_color || "#1F4FFF"
  );
  const [whatsapp, setWhatsapp] = React.useState(initialSettings.whatsapp);
  const [instagram, setInstagram] = React.useState(
    initialSettings.instagram ?? ""
  );
  const [template, setTemplate] = React.useState(
    initialSettings.whatsapp_message_template
  );

  const [uploadingField, setUploadingField] = React.useState<
    "logo" | "banner" | null
  >(null);
  const [saving, setSaving] = React.useState(false);

  const safeColor = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(primaryColor)
    ? primaryColor
    : "#1F4FFF";
  const previewContrast = getContrastTextColor(safeColor);
  const sidebarPreview = getAccessibleSidebarColors(safeColor);

  const previewWhatsappUrl = buildWhatsAppProductUrl({
    whatsapp: whatsapp || "5511999998888",
    template,
    productName: "Vaso Geométrico Voronoi",
    variantName: "Padrão (18cm)",
    productUrl: "https://seusite.com/produto/vaso-geometrico-voronoi",
  });

  const decodedPreviewMessage = React.useMemo(() => {
    if (!previewWhatsappUrl) return "";
    try {
      const url = new URL(previewWhatsappUrl);
      return url.searchParams.get("text") ?? "";
    } catch {
      return "";
    }
  }, [previewWhatsappUrl]);

  const handleUploadAsset = async (
    file: File | undefined,
    target: "logo" | "banner"
  ) => {
    if (!file) return;
    setUploadingField(target);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "branding");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast({
          variant: "error",
          title: "Erro ao enviar imagem",
          description: json.error ?? "Tente novamente.",
        });
      } else {
        if (target === "logo") setLogoUrl(json.url);
        else setBannerUrl(json.url);
        toast({
          variant: "success",
          title: target === "logo" ? "Logo enviado" : "Banner enviado",
        });
      }
    } catch {
      toast({ variant: "error", title: "Falha de rede no upload" });
    } finally {
      setUploadingField(null);
    }
  };

  const categoryById = React.useMemo(
    () => new Map(activeCategories.map((cat) => [cat.id, cat])),
    [activeCategories]
  );

  const filteredTags = React.useMemo(() => {
    const q = tagFilter.trim().toLowerCase();
    if (!q) return availableTags.slice(0, 24);
    return availableTags
      .filter((item) => item.tag.toLowerCase().includes(q))
      .slice(0, 24);
  }, [availableTags, tagFilter]);

  const toggleHomeTag = (tag: string) => {
    setHomeFeaturedTags((prev) => {
      const idx = prev.findIndex((t) => t.toLowerCase() === tag.toLowerCase());
      if (idx !== -1) {
        return prev.filter((_, i) => i !== idx);
      }
      if (prev.length >= MAX_HOME_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const moveHomeTag = (index: number, delta: -1 | 1) => {
    setHomeFeaturedTags((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleHomeCategory = (categoryId: string) => {
    setHomeCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (prev.length >= MAX_HOME_CATEGORIES) return prev;
      return [...prev, categoryId];
    });
  };

  const moveHomeCategory = (index: number, delta: -1 | 1) => {
    setHomeCategoryIds((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateSiteSettingsAction({
      name: name.trim(),
      description: description.trim(),
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      primary_color: safeColor,
      whatsapp: whatsapp.trim(),
      instagram: instagram.trim() || null,
      whatsapp_message_template: template.trim(),
      hero_mode: heroMode,
      home_category_ids: homeCategoryIds,
      home_featured_tags: homeFeaturedTags,
    });
    setSaving(false);

    if (!res.ok) {
      toast({
        variant: "error",
        title: "Erro ao salvar configurações",
        description: res.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: "Configurações salvas",
      description: "A identidade visual e contato da vitrine foram atualizados.",
    });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PageHeader
        eyebrow="Sistema"
        title={
          <>
            Configurações<span className="text-accent">.</span>
          </>
        }
        subtitle="Identidade da loja, cor de destaque e atendimento por WhatsApp"
        actions={
          <Button type="submit" variant="primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Identidade da marca */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Identidade da vitrine
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Nome da loja *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Estúdio Cobalto 3D"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Descrição (hero e rodapé)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Peças autorais e funcionais impressas em 3D sob encomenda."
                  className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/80 shadow-xs transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>

              {/* Logo & Banner uploads */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-[18px] border border-line bg-bg/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Logo da marca
                    </span>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="text-xs font-semibold text-[#B42318] hover:underline cursor-pointer"
                      >
                        <Trash2 className="inline h-3.5 w-3.5 mr-1" />
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt="Logo"
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <Box className="h-5 w-5 text-muted" />
                      )}
                    </div>

                    <label
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        uploadingField === "logo" && "opacity-60 pointer-events-none"
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingField === "logo" ? "Enviando..." : "Enviar logo"}
                      <input
                        type="file"
                        accept="image/webp,image/jpeg,image/png"
                        onChange={(e) => {
                          void handleUploadAsset(e.target.files?.[0], "logo");
                          e.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-[18px] border border-line bg-bg/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Banner (opcional)
                    </span>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        className="text-xs font-semibold text-[#B42318] hover:underline cursor-pointer"
                      >
                        <Trash2 className="inline h-3.5 w-3.5 mr-1" />
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
                      {bannerUrl ? (
                        <Image
                          src={bannerUrl}
                          alt="Banner"
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted" />
                      )}
                    </div>

                    <label
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        uploadingField === "banner" && "opacity-60 pointer-events-none"
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingField === "banner"
                        ? "Enviando..."
                        : "Enviar banner"}
                      <input
                        type="file"
                        accept="image/webp,image/jpeg,image/png"
                        onChange={(e) => {
                          void handleUploadAsset(e.target.files?.[0], "banner");
                          e.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Destaque da página inicial (Home) */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">
                Destaque da página inicial (Home)
              </h2>
            </div>

            <div className="space-y-2.5">
              <p
                id="hero-mode-label"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Modo do hero
              </p>
              <div
                role="radiogroup"
                aria-labelledby="hero-mode-label"
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {HERO_MODE_OPTIONS.map((option) => {
                  const selected = heroMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setHeroMode(option.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-[18px] border p-3.5 text-left transition-all cursor-pointer",
                        selected
                          ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                          : "border-line bg-bg/50 hover:border-muted/50 hover:bg-bg"
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-accent bg-accent text-white"
                              : "border-muted/50 bg-surface"
                          )}
                        >
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </span>
                      </span>
                      <span className="text-xs leading-relaxed text-muted">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {heroMode === "image" && !bannerUrl.trim() && (
                <p className="text-xs text-muted">
                  Nenhum banner enviado acima — enquanto estiver vazio, a home exibirá o modo texto como fallback.
                </p>
              )}
            </div>

            {/* Tags destacadas acima das categorias (até 2) */}
            <div className="space-y-3 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-accent-ink" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Tags destacadas acima das categorias
                  </p>
                </div>
                <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-bold text-ink tabular-nums">
                  {homeFeaturedTags.length}/{MAX_HOME_TAGS} selecionadas
                </span>
              </div>

              {homeFeaturedTags.length > 0 && (
                <div
                  data-testid="selected-home-tags"
                  className="flex flex-wrap gap-2"
                >
                  {homeFeaturedTags.map((tag, index) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span>{tag}</span>
                      {homeFeaturedTags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => moveHomeTag(index, index === 0 ? 1 : -1)}
                          aria-label={`Reordenar tag ${tag}`}
                          className="rounded-full p-0.5 hover:bg-white/60 cursor-pointer"
                        >
                          {index === 0 ? (
                            <ArrowRight className="h-3 w-3" />
                          ) : (
                            <ArrowLeft className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleHomeTag(tag)}
                        aria-label={`Remover tag ${tag}`}
                        className="rounded-full p-0.5 hover:bg-white/60 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Buscar tag ativa (ex.: Natal)..."
                  aria-label="Buscar tag destacada para a home"
                  className="h-9 pl-9 text-xs"
                />
              </div>

              {filteredTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map(({ tag, count }) => {
                    const selected = homeFeaturedTags.some(
                      (t) => t.toLowerCase() === tag.toLowerCase()
                    );
                    const disabled =
                      !selected && homeFeaturedTags.length >= MAX_HOME_TAGS;
                    return (
                      <button
                        key={tag}
                        type="button"
                        data-testid={`home-tag-option-${tag}`}
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => toggleHomeTag(tag)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          selected
                            ? "border-accent bg-accent text-accent-foreground shadow-xs cursor-pointer"
                            : disabled
                              ? "border-line/70 bg-bg/50 text-muted/50 cursor-not-allowed"
                              : "border-line bg-bg/70 text-ink hover:border-accent/40 hover:bg-accent-soft cursor-pointer"
                        )}
                      >
                        <span>{tag}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                            selected ? "bg-black/15" : "bg-surface text-muted"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Nenhuma tag ativa encontrada para &quot;{tagFilter}&quot;.
                </p>
              )}

              <p className="text-xs text-muted">
                Exibem blocos dedicados logo abaixo do hero e acima das categorias (até 8 produtos por tag). Deixe vazio para ocultar.
              </p>
            </div>

            {/* Categorias exibidas na home (até 3) */}
            <div className="space-y-3 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Categorias exibidas na home
                </p>
                <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-bold text-ink tabular-nums">
                  {homeCategoryIds.length}/{MAX_HOME_CATEGORIES} selecionadas
                </span>
              </div>

              {homeCategoryIds.length > 0 && (
                <div
                  data-testid="selected-home-categories"
                  className="flex flex-wrap gap-2"
                >
                  {homeCategoryIds.map((catId, index) => {
                    const cat = categoryById.get(catId);
                    if (!cat) return null;
                    return (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink"
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <span>{cat.name}</span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveHomeCategory(index, -1)}
                            aria-label={`Mover ${cat.name} para antes`}
                            className="rounded-full p-0.5 hover:bg-white/60 cursor-pointer"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                        )}
                        {index < homeCategoryIds.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveHomeCategory(index, 1)}
                            aria-label={`Mover ${cat.name} para depois`}
                            className="rounded-full p-0.5 hover:bg-white/60 cursor-pointer"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleHomeCategory(cat.id)}
                          aria-label={`Remover categoria ${cat.name}`}
                          className="rounded-full p-0.5 hover:bg-white/60 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeCategories.map((category) => {
                  const orderIndex = homeCategoryIds.indexOf(category.id);
                  const selected = orderIndex !== -1;
                  const disabled =
                    !selected && homeCategoryIds.length >= MAX_HOME_CATEGORIES;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      data-testid={`home-category-option-${category.slug}`}
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => toggleHomeCategory(category.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-[16px] border px-3.5 py-2.5 text-left text-xs font-semibold transition-all",
                        selected
                          ? "border-accent bg-accent/10 text-ink ring-1 ring-accent/30 cursor-pointer"
                          : disabled
                            ? "border-line/70 bg-bg/40 text-muted/50 cursor-not-allowed"
                            : "border-line bg-bg/60 text-ink hover:border-accent/40 hover:bg-bg cursor-pointer"
                      )}
                    >
                      <span className="truncate">{category.name}</span>
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "bg-surface text-muted border border-line"
                        )}
                      >
                        {selected ? orderIndex + 1 : category.product_count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted">
                Escolha até 3 categorias para exibir seções na home (até 8 produtos cada). Sem seleção, exibe &quot;Peças selecionadas&quot;.
              </p>
            </div>
          </section>

          {/* Cor de destaque */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">
                Cor de destaque (<code>--accent</code>)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <input
                type="color"
                aria-label="Selecionar cor principal"
                value={safeColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1F4FFF"
                className="w-36 font-mono uppercase"
              />

              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((hex) => {
                  const selected = safeColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setPrimaryColor(hex)}
                      aria-label={`Usar cor ${hex}`}
                      style={{ backgroundColor: hex }}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer",
                        selected
                          ? "ring-2 ring-ink ring-offset-2 border-white"
                          : "border-black/10 hover:scale-105"
                      )}
                    >
                      {selected && (
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: getContrastTextColor(hex) }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Contato & WhatsApp */}
          <section className="rounded-[24px] border border-line bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">
                WhatsApp e redes sociais
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  WhatsApp (DDI + DDD + número)
                </label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex.: 5511999998888 (vazio oculta botão)"
                />
                <p className="text-[11px] text-muted">
                  Se ficar vazio, o botão &quot;Pedir no WhatsApp&quot; fica
                  oculto na vitrine.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Instagram (usuário ou URL)
                </label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@suaempresa ou https://instagram.com/..."
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                    Modelo da mensagem do WhatsApp
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["{produto}", "{variante}", "{link}"].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() =>
                          setTemplate((prev) => `${prev} ${token}`.trim())
                        }
                        className="rounded-full border border-line bg-bg px-2.5 py-0.5 text-[11px] font-mono font-semibold text-accent-ink hover:bg-accent-soft cursor-pointer"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/80 shadow-xs transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Preview em tempo real */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="sticky top-24 space-y-5 rounded-[24px] border border-line bg-surface p-6 shadow-card">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-ink">
                Preview ao vivo
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">
                Aparência e contraste
              </h2>
            </div>

            <div className="rounded-[20px] border border-line bg-bg p-4 space-y-3">
              <div
                style={{
                  backgroundImage: `linear-gradient(135deg, ${sidebarPreview.bg} 0%, ${sidebarPreview.bgDeep} 100%)`,
                  color: "#FFFFFF",
                }}
                className="rounded-2xl p-4 shadow-sm text-white"
              >
                <p
                  style={{ color: "rgba(255, 255, 255, 0.72)" }}
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                >
                  Sidebar AA ({sidebarPreview.contrastRatio.toFixed(1)}:1)
                </p>
                <p className="mt-1 font-display text-lg font-bold truncate text-white">
                  {name.trim() || "Catálogo 3D"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span
                  style={{
                    backgroundColor: safeColor,
                    color: previewContrast,
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Pedir no WhatsApp
                </span>

                <span className="text-[11px] font-medium text-muted">
                  Texto: {previewContrast === "#FFFFFF" ? "Branco" : "Escuro"}
                </span>
              </div>
            </div>

            <div className="rounded-[18px] border border-line bg-bg/70 p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                Exemplo de mensagem gerada
              </p>
              <p className="text-xs leading-relaxed text-ink whitespace-pre-wrap break-words">
                {decodedPreviewMessage}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
