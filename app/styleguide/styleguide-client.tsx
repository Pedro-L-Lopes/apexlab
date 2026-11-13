"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Box,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NumberStepper,
  ProgressBar,
  SelectableChip,
  SwitchToggle,
} from "@/components/ui/controls";
import { DensitySelector, type GridDensity } from "@/components/ui/density-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, SearchInput } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StackedCard, type CardStatus } from "@/components/ui/stacked-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { EASE_DEFAULT, fadeInUp, staggerContainer } from "@/lib/motion";
import { cn, formatCurrencyBRL } from "@/lib/utils";

type TabFilter = "all" | CardStatus;

interface DemoProduct {
  id: string;
  title: string;
  subtitle: string;
  price: number | null;
  status: CardStatus;
  optionsCount: number;
  imageUrl: string;
}

function makePreviewSvg(bg1: string, bg2: string, accent: string, label: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='800' viewBox='0 0 640 800'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${bg1}'/>
        <stop offset='100%' stop-color='${bg2}'/>
      </linearGradient>
    </defs>
    <rect width='640' height='800' fill='url(#g)'/>
    <circle cx='490' cy='150' r='170' fill='${accent}' fill-opacity='0.10'/>
    <rect x='170' y='210' width='300' height='320' rx='44' fill='#FFFFFF' fill-opacity='0.78' stroke='${accent}' stroke-opacity='0.18' stroke-width='3'/>
    <path d='M320 280 L405 330 L405 430 L320 480 L235 430 L235 330 Z' fill='${accent}' fill-opacity='0.14' stroke='${accent}' stroke-width='5' stroke-linejoin='round'/>
    <path d='M320 280 L320 380 L405 330 M320 380 L235 330 M320 380 L320 480' fill='none' stroke='${accent}' stroke-width='4' stroke-linejoin='round'/>
    <text x='320' y='615' text-anchor='middle' font-family='sans-serif' font-size='22' font-weight='700' fill='#0E1630' opacity='0.72'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "p1",
    title: "Vaso Geométrico Facetado",
    subtitle: "Decoração · PLA Fosco · 180mm",
    price: 59.9,
    status: "active",
    optionsCount: 3,
    imageUrl: makePreviewSvg("#EDF2FF", "#DCE6FF", "#1F4FFF", "VASO 01"),
  },
  {
    id: "p2",
    title: "Suporte Articulado Headset",
    subtitle: "Setup · PETG · 220mm",
    price: 74.9,
    status: "active",
    optionsCount: 1,
    imageUrl: makePreviewSvg("#F4F7FC", "#E5ECF9", "#0E1630", "SUPORTE 02"),
  },
  {
    id: "p3",
    title: "Organizador Modular Desk",
    subtitle: "Organização · PLA+ · 140mm",
    price: 44.9,
    status: "draft",
    optionsCount: 2,
    imageUrl: makePreviewSvg("#EEF2FF", "#E0E7FF", "#4F46E5", "MÓDULO 03"),
  },
  {
    id: "p4",
    title: "Luminária Topográfica Lua",
    subtitle: "Iluminação · PLA Translúcido",
    price: null,
    status: "hidden",
    optionsCount: 1,
    imageUrl: makePreviewSvg("#F5F7FA", "#E9EEF6", "#6B7488", "LUMINÁRIA 04"),
  },
];

const TOKEN_SWATCHES = [
  { name: "--bg", hex: "#F3F6FC", light: true },
  { name: "--surface", hex: "#FFFFFF", light: true },
  { name: "--ink", hex: "#0E1630", light: false },
  { name: "--ink-deep", hex: "#0B1230", light: false },
  { name: "--muted", hex: "#6B7488", light: false },
  { name: "--line", hex: "#E3E8F2", light: true },
  { name: "--accent", hex: "#1F4FFF", light: false },
  { name: "--accent-soft", hex: "#E9EEFF", light: true },
];

const GRID_CLASS_BY_DENSITY: Record<GridDensity, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

export function StyleguideClient() {
  const { toast } = useToast();

  // Moldura listagem
  const [activeTab, setActiveTab] = React.useState<TabFilter>("all");
  const [search, setSearch] = React.useState("");
  const [density, setDensity] = React.useState<GridDensity>(4);

  // Controles Bento
  const [materialTab, setMaterialTab] = React.useState<"pla" | "petg" | "resina">("pla");
  const [toggleHome, setToggleHome] = React.useState(true);
  const [toggleFeatured, setToggleFeatured] = React.useState(true);
  const [toggleCustom, setToggleCustom] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([
    "PLA Fosco",
    "PETG",
  ]);
  const [printQuality, setPrintQuality] = React.useState("standard");
  const [quantity, setQuantity] = React.useState(2);
  const [selectedCategory, setSelectedCategory] = React.useState("decoracao");

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_PRODUCTS.filter((item) => {
      const matchesTab = activeTab === "all" || item.status === activeTab;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [activeTab, search]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1400px] space-y-12">
        {/* ================================================================
            SEÇÃO 1: MOLDURA LISTAGEM + SIDEBAR SATURADA (ref-1-listagem)
        ================================================================ */}
        <section aria-label="Listagem e Sidebar">
          <div className="overflow-hidden rounded-[28px] border border-line/80 bg-bg shadow-card">
            <div className="grid lg:grid-cols-[248px_1fr]">
              {/* Sidebar Admin saturada */}
              <aside className="flex flex-col justify-between bg-gradient-to-b from-accent to-accent-strong p-5 text-white">
                <div>
                  <div className="flex items-center gap-3 px-2 py-1.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/18 backdrop-blur-xs border border-white/25">
                      <Box className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold leading-tight">
                        Catálogo 3D
                      </p>
                      <p className="text-[11px] text-white/75">
                        Painel Gerencial
                      </p>
                    </div>
                  </div>

                  <nav className="mt-7 space-y-6" aria-label="Menu exemplo">
                    <div>
                      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                        Catálogo
                      </p>
                      <ul className="mt-2 space-y-1">
                        <li className="flex items-center justify-between rounded-full px-3.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10">
                          <span className="flex items-center gap-2.5">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </span>
                        </li>
                        <li className="flex items-center justify-between rounded-full bg-white/18 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white shadow-xs">
                          <span className="flex items-center gap-2.5">
                            <Box className="h-4 w-4" />
                            Produtos
                          </span>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                            12
                          </span>
                        </li>
                        <li className="flex items-center justify-between rounded-full px-3.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10">
                          <span className="flex items-center gap-2.5">
                            <FolderKanban className="h-4 w-4" />
                            Categorias
                          </span>
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                            5
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                        Operação
                      </p>
                      <ul className="mt-2 space-y-1">
                        <li className="flex items-center justify-between rounded-full px-3.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10">
                          <span className="flex items-center gap-2.5">
                            <Link2 className="h-4 w-4" />
                            Importar
                          </span>
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                            3
                          </span>
                        </li>
                        <li className="flex items-center justify-between rounded-full px-3.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10">
                          <span className="flex items-center gap-2.5">
                            <Settings className="h-4 w-4" />
                            Configurações
                          </span>
                        </li>
                      </ul>
                    </div>
                  </nav>
                </div>

                <div className="mt-8 rounded-2xl bg-white/12 p-3 text-[11px] text-white/85 border border-white/15">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#4ADE80] mr-2" />
                  Ambiente de desenvolvimento
                </div>
              </aside>

              {/* Área principal da listagem */}
              <div className="relative bg-bg p-6 sm:p-9">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
                />

                <div className="relative z-10 space-y-7">
                  <PageHeader
                    eyebrow="Design System · Fase 2"
                    title={
                      <>
                        Styleguide<span className="text-accent">.</span>
                      </>
                    }
                    subtitle={`${filteredProducts.length} peças em exibição · linguagem visual luminosa e arejada`}
                    actions={
                      <Button variant="primary" size="md">
                        <Plus className="h-4 w-4" />
                        Novo produto
                      </Button>
                    }
                  />

                  {/* Barra de filtros + busca + densidade (ref-1) */}
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <PillTabs<TabFilter>
                      layoutId="sg-status-tabs"
                      value={activeTab}
                      onChange={setActiveTab}
                      items={[
                        { value: "all", label: "Todos", count: 4 },
                        { value: "active", label: "Ativos", count: 2 },
                        { value: "draft", label: "Rascunhos", count: 1 },
                        { value: "hidden", label: "Ocultos", count: 1 },
                      ]}
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar produto..."
                        resultLabel={`${filteredProducts.length} itens`}
                        className="w-full sm:w-72"
                      />
                      <DensitySelector
                        value={density}
                        onChange={setDensity}
                        layoutId="sg-density"
                      />
                    </div>
                  </div>

                  {/* Grade animada de Cards Empilhados */}
                  <motion.div
                    layout
                    transition={{ duration: 0.3, ease: EASE_DEFAULT }}
                    className={cn("grid gap-6", GRID_CLASS_BY_DENSITY[density])}
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product) => (
                        <StackedCard
                          key={product.id}
                          title={product.title}
                          subtitle={product.subtitle}
                          price={product.price}
                          status={product.status}
                          optionsCount={product.optionsCount}
                          hasPriceFromPrefix={product.optionsCount > 1}
                          imageUrl={product.imageUrl}
                          onClick={() =>
                            toast({
                              title: product.title,
                              description: `${formatCurrencyBRL(product.price)} · clique simulado no card`,
                            })
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 2: BENTO GRID DE DASHBOARD (ref-2-dashboard & ref-3)
        ================================================================ */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          aria-label="Bento Grid Dashboard"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
              Bento Grid <span className="text-accent">&</span> Métricas
            </h2>
            <Badge variant="accent">Animado com Motion</Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Cartão sólido em --accent */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col justify-between rounded-[28px] bg-gradient-to-br from-accent to-accent-strong p-6 text-white shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">
                  Produtos ativos
                </span>
                <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white">
                  ● Na vitrine
                </span>
              </div>

              <div className="my-5 flex items-baseline gap-3">
                <AnimatedCounter
                  value={24}
                  className="font-display text-5xl font-extrabold tracking-[-0.03em]"
                />
                <span className="text-lg font-bold text-white/80">+4</span>
              </div>

              <div>
                <div className="flex h-14 items-end gap-2">
                  {[35, 55, 80, 48, 65, 92, 74].map((h, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-t-lg bg-white/25 transition-all hover:bg-white/45"
                    />
                  ))}
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">
                  Publicações nos últimos 7 dias
                </p>
              </div>
            </motion.div>

            {/* Cartão branco com sparkline */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col justify-between rounded-[24px] border border-line bg-surface p-6 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Categorias ativas
                  </p>
                  <p className="text-xs text-muted">Vitrine pública</p>
                </div>
                <Badge variant="active">+2 novas</Badge>
              </div>

              <div className="my-4">
                <AnimatedCounter
                  value={8}
                  className="font-display text-5xl font-extrabold tracking-[-0.03em] text-ink"
                />
              </div>

              <svg
                viewBox="0 0 240 56"
                className="h-14 w-full overflow-visible"
                aria-hidden="true"
              >
                <path
                  d="M4 44 L44 36 L88 40 L132 18 L176 28 L236 10"
                  fill="none"
                  stroke="#1F4FFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            {/* Cartão escuro --ink-deep (#0B1230) */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col justify-between rounded-[28px] bg-ink-deep p-6 text-white shadow-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Importação em lote
                  </p>
                  <p className="text-xs text-white/60">Fila controlada</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                  3 / min
                </span>
              </div>

              <div className="my-4">
                <p className="font-display text-4xl font-extrabold tracking-[-0.03em]">
                  <AnimatedCounter value={148} />{" "}
                  <span className="text-base font-medium text-white/65">
                    modelos
                  </span>
                </p>
              </div>

              <svg
                viewBox="0 0 240 60"
                className="h-14 w-full overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="darkCurve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F4FFF" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#1F4FFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 44 C40 42, 60 18, 105 26 C145 34, 175 12, 240 20 L240 60 L0 60 Z"
                  fill="url(#darkCurve)"
                />
                <path
                  d="M0 44 C40 42, 60 18, 105 26 C145 34, 175 12, 240 20"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx="105"
                  cy="26"
                  r="5"
                  fill="#FFFFFF"
                  stroke="#1F4FFF"
                  strokeWidth="3"
                />
              </svg>
            </motion.div>
          </div>
        </motion.section>

        {/* ================================================================
            SEÇÃO 3: CONTROLES E COMPONENTES BASE (ref-3-componentes)
        ================================================================ */}
        <section aria-label="Controles e Componentes Base" className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
            Controles <span className="text-accent">&</span> Componentes Base
          </h2>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* Toggles & Chips */}
            <div className="space-y-6 rounded-[24px] border border-line bg-surface p-6 shadow-card">
              <div className="space-y-4">
                <SwitchToggle
                  checked={toggleHome}
                  onCheckedChange={setToggleHome}
                  label="Exibir na Home"
                  description="Categoria visível nos destaques"
                />
                <SwitchToggle
                  checked={toggleFeatured}
                  onCheckedChange={setToggleFeatured}
                  label="Produto em destaque"
                  description="Prioridade na grade inicial"
                />
                <SwitchToggle
                  checked={toggleCustom}
                  onCheckedChange={setToggleCustom}
                  label="Sob encomenda"
                  description="Ocultar preço fixo"
                />
              </div>

              <div className="border-t border-line pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Chips selecionáveis
                </p>
                <div className="flex flex-wrap gap-2">
                  {["PLA Fosco", "PETG", "Resina 8K", "ABS+", "TPU"].map(
                    (tag) => (
                      <SelectableChip
                        key={tag}
                        selected={selectedTags.includes(tag)}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </SelectableChip>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Radio Options + Stepper + Progresso (estilo ref-3) */}
            <div className="space-y-5 rounded-[24px] border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Acabamento</p>
                  <p className="text-xs text-muted">
                    Quantidade e altura de camada
                  </p>
                </div>
                <NumberStepper value={quantity} onChange={setQuantity} />
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: "standard",
                    title: "Padrão",
                    desc: "Camada 0.20 mm · mais rápido",
                    price: 49.9,
                  },
                  {
                    id: "fine",
                    title: "Fino",
                    desc: "Camada 0.12 mm · linhas discretas",
                    price: 64.9,
                  },
                  {
                    id: "ultra",
                    title: "Extra Fino",
                    desc: "Camada 0.08 mm · acabamento premium",
                    price: 79.9,
                  },
                ].map((opt) => {
                  const selected = printQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPrintQuality(opt.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left transition-all cursor-pointer",
                        selected
                          ? "border-accent bg-accent-soft/45"
                          : "border-line bg-surface hover:border-accent/35"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border",
                            selected
                              ? "border-accent bg-accent"
                              : "border-muted/40"
                          )}
                        >
                          {selected ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-ink">
                            {opt.title}
                          </span>
                          <span className="ml-2 text-xs text-muted">
                            {opt.desc}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {formatCurrencyBRL(opt.price * quantity)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[16px] border border-line bg-[#F8FAFE] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <Upload className="h-3.5 w-3.5 text-accent" />
                    modelo-capa.webp
                  </span>
                  <span className="font-bold text-accent tabular-nums">64%</span>
                </div>
                <ProgressBar value={64} />
              </div>
            </div>

            {/* Inputs, Select, Botões, Badges, Dialog e Toast */}
            <div className="space-y-5 rounded-[24px] border border-line bg-surface p-6 shadow-card">
              <div className="space-y-3">
                <PillTabs
                  layoutId="sg-material-tabs"
                  variant="accent"
                  value={materialTab}
                  onChange={setMaterialTab}
                  items={[
                    { value: "pla", label: "PLA" },
                    { value: "petg", label: "PETG" },
                    { value: "resina", label: "Resina" },
                  ]}
                />

                <Input placeholder="Nome do produto (ex.: Vaso Minimalista)" />

                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger aria-label="Categoria">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decoracao">Decoração</SelectItem>
                    <SelectItem value="organizacao">Organização</SelectItem>
                    <SelectItem value="setup">Acessórios de Setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="active">Ativo</Badge>
                <Badge variant="draft">Rascunho</Badge>
                <Badge variant="hidden">Oculto</Badge>
                <Badge variant="options">3 opções</Badge>
                <Badge variant="accent">Destaque</Badge>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Alterações salvas",
                      description: "Produto atualizado na vitrine.",
                      variant: "success",
                    })
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Toast sucesso
                </Button>

                <Button variant="dark" size="sm">
                  Botão escuro
                </Button>

                <Button variant="secondary" size="sm">
                  Secundário
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="soft" size="sm">
                      Abrir Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Importar por link</DialogTitle>
                      <DialogDescription>
                        Exemplo de modal com fundo fosco e cantos arredondados de
                        24px.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <Input placeholder="https://makerworld.com/..." />
                    </div>
                    <DialogFooter>
                      <Button variant="secondary" size="md">
                        Cancelar
                      </Button>
                      <Button variant="primary" size="md">
                        Extrair dados
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Table + Skeleton */}
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_PRODUCTS.slice(0, 3).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.title}</TableCell>
                    <TableCell className="text-muted">
                      {item.subtitle.split("·")[1]?.trim() ?? "PLA"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status}>
                        {item.status === "active"
                          ? "Ativo"
                          : item.status === "draft"
                            ? "Rascunho"
                            : "Oculto"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrencyBRL(item.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-4 rounded-[24px] border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">
                  Skeletons (Shimmer Sutil)
                </p>
                <Badge variant="options">Sem spinners</Badge>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 4: TOKENS & TIPOGRAFIA
        ================================================================ */}
        <section aria-label="Tokens e Tipografia" className="space-y-4 pb-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
              Tokens & Tipografia
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-line bg-surface p-6 shadow-card sm:grid-cols-4">
              {TOKEN_SWATCHES.map((token) => (
                <div key={token.name} className="space-y-2">
                  <div
                    style={{ backgroundColor: token.hex }}
                    className={cn(
                      "h-14 w-full rounded-2xl",
                      token.light && "border border-line"
                    )}
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">{token.name}</p>
                    <p className="text-[11px] text-muted">{token.hex}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-[24px] border border-line bg-surface p-6 shadow-card">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
                — Eyebrow 12px · tracking 0.12em
              </p>
              <p className="font-display text-4xl font-extrabold leading-[1.03] tracking-[-0.03em] text-ink">
                Plus Jakarta Sans 800<span className="text-accent">.</span>
              </p>
              <p className="font-display text-xl font-bold tracking-[-0.02em] text-ink">
                H3 · Títulos de cards e seções (20px)
              </p>
              <p className="text-base text-ink">
                Inter Regular/Medium 16px — texto corrido legível para descrições
                e fichas técnicas.
              </p>
              <p className="text-[13px] text-muted">
                Legenda 13px · contagens, dimensões e metadados discretos.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
