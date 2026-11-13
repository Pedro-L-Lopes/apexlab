"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Box,
  Check,
  Image as ImageIcon,
  MessageCircle,
  Palette,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type { AdminSiteSettings } from "@/lib/queries/admin";
import { updateSiteSettingsAction } from "@/lib/actions/admin-settings";
import { buildWhatsAppProductUrl } from "@/lib/whatsapp";
import { cn, getContrastTextColor } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";

interface SettingsFormClientProps {
  initialSettings: AdminSiteSettings;
}

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
}: SettingsFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState(initialSettings.name);
  const [description, setDescription] = React.useState(
    initialSettings.description
  );
  const [logoUrl, setLogoUrl] = React.useState(initialSettings.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = React.useState(
    initialSettings.banner_url ?? ""
  );
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
                        className="rounded-full border border-line bg-bg px-2.5 py-0.5 text-[11px] font-mono font-semibold text-accent hover:bg-accent-soft cursor-pointer"
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
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Preview ao vivo
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">
                Aparência e contraste
              </h2>
            </div>

            <div className="rounded-[20px] border border-line bg-bg p-4 space-y-3">
              <div
                style={{
                  backgroundColor: safeColor,
                  color: previewContrast,
                }}
                className="rounded-2xl p-4 shadow-sm"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">
                  Destaque AA automático
                </p>
                <p className="mt-1 font-display text-lg font-bold truncate">
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
