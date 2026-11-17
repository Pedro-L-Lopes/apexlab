import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Sob consulta";
  }
  return brlFormatter.format(value);
}

interface RgbChannels {
  r: number;
  g: number;
  b: number;
}

function parseHexChannels(hexColor: string): RgbChannels | null {
  const cleaned = hexColor.replace("#", "").trim();
  const fullHex =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return null;
  }

  return {
    r: parseInt(fullHex.slice(0, 2), 16),
    g: parseInt(fullHex.slice(2, 4), 16),
    b: parseInt(fullHex.slice(4, 6), 16),
  };
}

function computeRelativeLuminance({ r, g, b }: RgbChannels): number {
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function formatHexChannels({ r, g, b }: RgbChannels): string {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl({ r, g, b }: RgbChannels): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }

  return { h: h * 60, s, l };
}

function hslToRgb({ h, s, l }: HslColor): RgbChannels {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const channel = Math.round(l * 255);
    return { r: channel, g: channel, b: channel };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToChannel = (t: number) => {
    let wrapped = t;
    if (wrapped < 0) wrapped += 1;
    if (wrapped > 1) wrapped -= 1;
    if (wrapped < 1 / 6) return p + (q - p) * 6 * wrapped;
    if (wrapped < 1 / 2) return q;
    if (wrapped < 2 / 3) return p + (q - p) * (2 / 3 - wrapped) * 6;
    return p;
  };

  const hNorm = hue / 360;
  return {
    r: Math.round(hueToChannel(hNorm + 1 / 3) * 255),
    g: Math.round(hueToChannel(hNorm) * 255),
    b: Math.round(hueToChannel(hNorm - 1 / 3) * 255),
  };
}

function getWhiteContrastRatio(rgb: RgbChannels): number {
  const luminance = computeRelativeLuminance(rgb);
  return 1.05 / (luminance + 0.05);
}

export function getContrastTextColor(hexColor: string): "#FFFFFF" | "#0E1630" {
  const rgb = parseHexChannels(hexColor);
  if (!rgb) {
    return "#FFFFFF";
  }

  // WCAG AA contrast ratio against #FFFFFF (luminance = 1): (1 + 0.05) / (L + 0.05) >= 4.5
  return getWhiteContrastRatio(rgb) >= 4.5 ? "#FFFFFF" : "#0E1630";
}

/**
 * Derives darkened gradient stops from the store accent color so white (#FFFFFF)
 * text always satisfies WCAG AA contrast (>= 4.5:1) on the admin sidebar and KPI card.
 */
export function getAccessibleSidebarColors(hexColor: string): {
  bg: string;
  bgDeep: string;
  contrastRatio: number;
} {
  const rgb = parseHexChannels(hexColor) ?? { r: 31, g: 79, b: 255 };
  const initialRatio = getWhiteContrastRatio(rgb);
  const hsl = rgbToHsl(rgb);

  if (initialRatio >= 4.75) {
    const deepRgb = hslToRgb({
      h: hsl.h,
      s: hsl.s,
      l: Math.max(0.08, hsl.l * 0.78),
    });
    return {
      bg: formatHexChannels(rgb),
      bgDeep: formatHexChannels(deepRgb),
      contrastRatio: initialRatio,
    };
  }

  const isWarmAmber = hsl.h >= 30 && hsl.h <= 65 && hsl.s > 0.1;
  const targetHue = isWarmAmber ? Math.max(24, hsl.h - 10) : hsl.h;
  const targetSat = isWarmAmber ? Math.max(hsl.s, 0.82) : hsl.s;

  let finalRgb = hslToRgb({ h: targetHue, s: targetSat, l: 0.12 });
  let finalL = 0.12;

  for (let l = Math.min(hsl.l, 0.75); l >= 0.06; l -= 0.01) {
    const candidate = hslToRgb({ h: targetHue, s: targetSat, l });
    if (getWhiteContrastRatio(candidate) >= 4.8) {
      finalRgb = candidate;
      finalL = l;
      break;
    }
  }

  const deepRgb = hslToRgb({
    h: targetHue,
    s: targetSat,
    l: Math.max(0.08, finalL * 0.76),
  });

  return {
    bg: formatHexChannels(finalRgb),
    bgDeep: formatHexChannels(deepRgb),
    contrastRatio: getWhiteContrastRatio(finalRgb),
  };
}

/**
 * Computes a darker variant of the store accent color that preserves the hue
 * while meeting WCAG AA (>= 4.6:1) for small text on `--bg` (#F3F6FC) and `--accent-soft`.
 */
export function getAccessibleAccentTextColor(hexColor: string): string {
  const rgb = parseHexChannels(hexColor);
  if (!rgb) {
    return "#163AC7";
  }

  const bgLuminance = computeRelativeLuminance({ r: 243, g: 246, b: 252 });
  const softLuminance = computeRelativeLuminance({
    r: rgb.r * 0.1 + 255 * 0.9,
    g: rgb.g * 0.1 + 255 * 0.9,
    b: rgb.b * 0.1 + 255 * 0.9,
  });
  const referenceLuminance = Math.min(bgLuminance, softLuminance);

  for (let factor = 0.82; factor >= 0.1; factor -= 0.02) {
    const candidate = {
      r: Math.round(rgb.r * factor),
      g: Math.round(rgb.g * factor),
      b: Math.round(rgb.b * factor),
    };
    const lum = computeRelativeLuminance(candidate);
    const ratio = (referenceLuminance + 0.05) / (lum + 0.05);
    if (ratio >= 4.6) {
      return formatHexChannels(candidate);
    }
  }

  return "#0E1630";
}

export function buildStoreThemeVars(primaryColor?: string | null): Record<string, string> {
  const accent = primaryColor?.trim() || "#1F4FFF";
  const sidebar = getAccessibleSidebarColors(accent);
  return {
    "--accent": accent,
    "--accent-foreground": getContrastTextColor(accent),
    "--accent-strong": `color-mix(in srgb, ${accent} 82%, black)`,
    "--accent-ink": getAccessibleAccentTextColor(accent),
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
    "--sidebar-bg": sidebar.bg,
    "--sidebar-bg-deep": sidebar.bgDeep,
    "--sidebar-fg": "#FFFFFF",
    "--bg-glow": `radial-gradient(circle at top right, color-mix(in srgb, ${accent} 12%, transparent), transparent 60%)`,
  };
}

export function slugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
