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

export function getContrastTextColor(hexColor: string): "#FFFFFF" | "#0E1630" {
  const rgb = parseHexChannels(hexColor);
  if (!rgb) {
    return "#FFFFFF";
  }

  const luminance = computeRelativeLuminance(rgb);

  // WCAG AA contrast ratio against #FFFFFF (luminance = 1): (1 + 0.05) / (L + 0.05) >= 4.5
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite >= 4.5 ? "#FFFFFF" : "#0E1630";
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
  return {
    "--accent": accent,
    "--accent-foreground": getContrastTextColor(accent),
    "--accent-strong": `color-mix(in srgb, ${accent} 82%, black)`,
    "--accent-ink": getAccessibleAccentTextColor(accent),
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
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
