import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "@/types/database";
import { SafeFetchError, UnsafeUrlError, safeFetch } from "./ssrf";

export interface ExtractedModelData {
  title: string;
  description: string;
  images: string[];
  cover_image_url: string | null;
  license: string | null;
  material: string | null;
  tags: string[];
  category_id?: string | null;
  price?: number | null;
  stl_url?: string | null;
  source_url: string;
  extraction_warning?: string | null;
}

export interface ExtractModelResult {
  ok: boolean;
  data: ExtractedModelData;
  errorMessage: string | null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_IMAGES = 5;

const TERM_TRANSLATIONS: Array<[RegExp, string]> = [
  [/\bfree\s+3d\s+print\s+model\b/gi, ""],
  [/\bfree\s+3d\s+model\b/gi, ""],
  [/\b3d\s+print\s+model\b/gi, "Modelo 3D"],
  [/\b3d\s+printable\b/gi, "Imprimível em 3D"],
  [/\bno\s+supports?\s+needed\b/gi, "Sem necessidade de suportes"],
  [/\bno\s+supports?\b/gi, "Sem suportes"],
  [/\bprint[\s-]+in[\s-]+place\b/gi, "Articulado (Print-in-Place)"],
  [/\bheadphone\s+stand\b/gi, "Suporte para Headset"],
  [/\bheadset\s+stand\b/gi, "Suporte para Headset"],
  [/\bphone\s+stand\b/gi, "Suporte para Celular"],
  [/\blaptop\s+stand\b/gi, "Stand para Notebook"],
  [/\bdesk\s+organizer\b/gi, "Organizador de Mesa"],
  [/\bstorage\s+box\b/gi, "Caixa Organizadora"],
  [/\bcable\s+(?:organizer|management)\b/gi, "Organizador de Cabos"],
  [/\bwall\s+mount\b/gi, "Suporte de Parede"],
  [/\bpen\s+holder\b/gi, "Porta-canetas"],
  [/\bcoaster\s+set\b/gi, "Conjunto de Porta-copos"],
  [/\bcoasters?\b/gi, "Porta-copos"],
  [/\bplanter\b/gi, "Cachepô"],
  [/\bvase\b/gi, "Vaso"],
  [/\blamp\s+shade\b/gi, "Cúpula de Luminária"],
  [/\blamp\b/gi, "Luminária"],
  [/\bkeychain\b/gi, "Chaveiro"],
  [/\bfigurine\b/gi, "Miniatura"],
  [/\bsculpture\b/gi, "Escultura"],
  [/\bholder\b/gi, "Suporte"],
  [/\bstand\b/gi, "Suporte"],
  [/\borganizer\b/gi, "Organizador"],
  [/\bdrawer\b/gi, "Gaveta"],
  [/\btray\b/gi, "Bandeja"],
];

const SITE_TITLE_SUFFIXES: RegExp[] = [
  /\s*[-|–—]\s*MakerWorld.*$/i,
  /\s*[-|–—]\s*Printables(?:\.com)?.*$/i,
  /\s*[-|–—]\s*Thingiverse.*$/i,
  /\s*[-|–—]\s*Cults\s*3D.*$/i,
  /\s*[-|–—]\s*Cults.*$/i,
  /\s*[-|–—]\s*Thangs.*$/i,
  /\s*[-|–—]\s*MyMiniFactory.*$/i,
];

const STOP_TAGS = new Set([
  "3d",
  "3dprint",
  "3dprinting",
  "3d-printing",
  "makerworld",
  "printables",
  "thingiverse",
  "stl",
  "3mf",
  "model",
  "modelo",
  "free",
]);

export function normalizeSourceUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    const normalized = parsed.toString();
    return normalized.endsWith("/") && parsed.pathname !== "/"
      ? normalized.slice(0, -1)
      : normalized;
  } catch {
    return trimmed;
  }
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

export function sanitizePlainText(raw: string): string {
  const withoutScripts = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function localizeTextToPortuguese(raw: string, isTitle = false): string {
  let text = sanitizePlainText(raw);
  if (!text) return "";

  if (isTitle) {
    for (const suffix of SITE_TITLE_SUFFIXES) {
      text = text.replace(suffix, "");
    }
  }

  for (const [pattern, replacement] of TERM_TRANSLATIONS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\s+[-–—|:]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 0 && /^[a-zà-ú]/.test(text)) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

export function fallbackTitleFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    const lastSegment = segments[segments.length - 1] ?? parsed.hostname;
    const withoutLeadingId = lastSegment
      .replace(/^\d+[-_]?/, "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    if (!withoutLeadingId) {
      return `Modelo 3D (${parsed.hostname})`;
    }

    const titled = withoutLeadingId
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return localizeTextToPortuguese(titled, true) || `Modelo 3D (${parsed.hostname})`;
  } catch {
    return "Modelo 3D importado";
  }
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex =
    /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[key] = decodeHtmlEntities(val);
  }
  return attrs;
}

function resolveMaybeRelativeUrl(candidate: string, baseUrl: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractImagesFromUnknown(value: unknown, baseUrl: string): string[] {
  const results: string[] = [];
  if (typeof value === "string") {
    const resolved = resolveMaybeRelativeUrl(value, baseUrl);
    if (resolved) results.push(resolved);
    return results;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      results.push(...extractImagesFromUnknown(item, baseUrl));
    }
    return results;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate = obj.url ?? obj.contentUrl ?? obj.thumbnailUrl ?? obj.src;
    if (candidate) {
      results.push(...extractImagesFromUnknown(candidate, baseUrl));
    }
  }
  return results;
}

function normalizeTags(rawTags: unknown): string[] {
  const rawList: string[] = [];
  if (typeof rawTags === "string") {
    rawList.push(...rawTags.split(/[,;#]/));
  } else if (Array.isArray(rawTags)) {
    for (const entry of rawTags) {
      if (typeof entry === "string") rawList.push(entry);
      else if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as { name?: unknown }).name;
        if (typeof name === "string") rawList.push(name);
      }
    }
  }

  const seen = new Set<string>();
  const finalTags: string[] = [];
  for (const raw of rawList) {
    const clean = localizeTextToPortuguese(raw, false);
    if (!clean || clean.length < 2 || clean.length > 40) continue;
    const lower = clean.toLowerCase();
    if (STOP_TAGS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    finalTags.push(clean);
    if (finalTags.length >= 8) break;
  }
  return finalTags;
}

function parseJsonLdBlocks(html: string, baseUrl: string) {
  let title = "";
  let description = "";
  let license: string | null = null;
  let material: string | null = null;
  const images: string[] = [];
  const tags: string[] = [];

  const scriptRegex =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  const inspectObject = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(inspectObject);
      return;
    }

    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) {
      inspectObject(obj["@graph"]);
    }

    const rawType = obj["@type"];
    const typeList = Array.isArray(rawType)
      ? rawType.map(String)
      : rawType
        ? [String(rawType)]
        : [];
    const isRelevantType =
      typeList.length === 0 ||
      typeList.some((t) =>
        /Product|3DModel|CreativeWork|Article|WebPage|SoftwareApplication/i.test(t)
      );

    if (!isRelevantType) return;

    if (!title && typeof obj.name === "string") title = obj.name;
    if (!title && typeof obj.headline === "string") title = obj.headline;
    if (!description && typeof obj.description === "string") {
      description = obj.description;
    }
    if (!license && typeof obj.license === "string") {
      license = sanitizePlainText(obj.license);
    }
    if (!material && typeof obj.material === "string") {
      material = sanitizePlainText(obj.material);
    }
    if (obj.image) {
      images.push(...extractImagesFromUnknown(obj.image, baseUrl));
    }
    if (obj.thumbnailUrl) {
      images.push(...extractImagesFromUnknown(obj.thumbnailUrl, baseUrl));
    }
    if (obj.keywords) {
      tags.push(...normalizeTags(obj.keywords));
    }
  };

  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1].trim();
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText);
      inspectObject(parsed);
    } catch {
      // Ignora blocos JSON-LD malformados de terceiros
    }
  }

  return { title, description, license, material, images, tags };
}

function parseMetaTags(html: string, baseUrl: string) {
  const metaMap = new Map<string, string[]>();
  const metaRegex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content?.trim();
    if (!key || !content) continue;
    const existing = metaMap.get(key) ?? [];
    existing.push(content);
    metaMap.set(key, existing);
  }

  const first = (...keys: string[]) => {
    for (const k of keys) {
      const list = metaMap.get(k);
      if (list && list[0]) return list[0];
    }
    return "";
  };

  const titleTagMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const htmlTitle = titleTagMatch ? titleTagMatch[1] : "";

  const imageCandidates: string[] = [];
  for (const key of [
    "og:image:secure_url",
    "og:image",
    "og:image:url",
    "twitter:image:src",
    "twitter:image",
  ]) {
    for (const val of metaMap.get(key) ?? []) {
      const resolved = resolveMaybeRelativeUrl(val, baseUrl);
      if (resolved) imageCandidates.push(resolved);
    }
  }

  return {
    title: first("og:title", "twitter:title", "title") || htmlTitle,
    description: first("og:description", "twitter:description", "description"),
    images: imageCandidates,
    tags: normalizeTags(first("keywords", "article:tag")),
  };
}

function parseNextDataFallback(html: string, baseUrl: string) {
  const match =
    /<script[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(
      html
    );
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    let title = "";
    let description = "";
    let license: string | null = null;
    const images: string[] = [];
    const tags: string[] = [];

    const visit = (node: unknown, depth: number) => {
      if (!node || typeof node !== "object" || depth > 7) return;
      if (Array.isArray(node)) {
        for (const item of node.slice(0, 20)) visit(item, depth + 1);
        return;
      }
      const obj = node as Record<string, unknown>;
      if (!title) {
        if (typeof obj.title === "string" && obj.title.length > 3) title = obj.title;
        else if (typeof obj.designTitle === "string") title = obj.designTitle;
      }
      if (!description) {
        if (typeof obj.summary === "string" && obj.summary.length > 12) {
          description = obj.summary;
        } else if (typeof obj.description === "string" && obj.description.length > 12) {
          description = obj.description;
        }
      }
      if (!license && typeof obj.license === "string" && obj.license.length < 120) {
        license = obj.license;
      }
      if (typeof obj.coverUrl === "string") {
        const resolved = resolveMaybeRelativeUrl(obj.coverUrl, baseUrl);
        if (resolved) images.push(resolved);
      }
      if (Array.isArray(obj.designPictures)) {
        images.push(...extractImagesFromUnknown(obj.designPictures, baseUrl));
      }
      if (Array.isArray(obj.tags)) {
        tags.push(...normalizeTags(obj.tags));
      }
      for (const val of Object.values(obj)) {
        if (val && typeof val === "object") visit(val, depth + 1);
      }
    };

    visit(parsed, 0);
    return { title, description, license, images, tags };
  } catch {
    return null;
  }
}

export function extractMetadataFromHtml(
  html: string,
  finalUrl: string,
  stlUrl?: string | null
): ExtractedModelData {
  const jsonLd = parseJsonLdBlocks(html, finalUrl);
  const meta = parseMetaTags(html, finalUrl);
  const nextData =
    !meta.title || meta.images.length === 0
      ? parseNextDataFallback(html, finalUrl)
      : null;

  const rawTitle =
    jsonLd.title || meta.title || nextData?.title || fallbackTitleFromUrl(finalUrl);
  const rawDescription =
    jsonLd.description || meta.description || nextData?.description || "";

  const seenImages = new Set<string>();
  const combinedImages: string[] = [];
  for (const imgUrl of [
    ...jsonLd.images,
    ...meta.images,
    ...(nextData?.images ?? []),
  ]) {
    if (!seenImages.has(imgUrl)) {
      seenImages.add(imgUrl);
      combinedImages.push(imgUrl);
      if (combinedImages.length >= MAX_EXTRACTED_IMAGES) break;
    }
  }

  const combinedTags = Array.from(
    new Set([...jsonLd.tags, ...meta.tags, ...(nextData?.tags ?? [])])
  ).slice(0, 10);

  const title =
    localizeTextToPortuguese(rawTitle, true).slice(0, 150) ||
    fallbackTitleFromUrl(finalUrl);
  const description = localizeTextToPortuguese(rawDescription, false).slice(0, 2000);
  const license = (jsonLd.license || nextData?.license || "").trim() || null;
  const material = (jsonLd.material || "").trim() || null;

  return {
    title,
    description,
    images: combinedImages,
    cover_image_url: combinedImages[0] ?? null,
    license,
    material,
    tags: combinedTags,
    stl_url: stlUrl?.trim() || null,
    source_url: normalizeSourceUrl(finalUrl),
    extraction_warning: null,
  };
}

/**
 * Busca URL de modelo 3D (MakerWorld, Printables, Thingiverse ou outro) com proteção SSRF
 * e extrai título, descrição, imagens e metadados via JSON-LD / Open Graph em português.
 * Nunca lança exceção em falhas de rede/anti-bot: retorna ok=false com fallback editável.
 */
export async function extractModelFromUrl(
  rawUrl: string,
  stlUrl?: string | null
): Promise<ExtractModelResult> {
  const normalizedUrl = normalizeSourceUrl(rawUrl);

  try {
    const response = await safeFetch(normalizedUrl, {
      timeoutMs: 10_000,
      maxBytes: 2 * 1024 * 1024,
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    if (
      response.contentType &&
      !/text\/html|application\/xhtml\+xml|text\/plain/i.test(response.contentType)
    ) {
      const msg = "O link informado não retornou uma página HTML de modelo.";
      return {
        ok: false,
        errorMessage: msg,
        data: {
          title: fallbackTitleFromUrl(normalizedUrl),
          description: "",
          images: [],
          cover_image_url: null,
          license: null,
          material: null,
          tags: [],
          stl_url: stlUrl?.trim() || null,
          source_url: normalizedUrl,
          extraction_warning: msg,
        },
      };
    }

    const html = response.buffer.toString("utf-8");
    const extracted = extractMetadataFromHtml(html, response.finalUrl, stlUrl);

    if (!extracted.title) {
      extracted.title = fallbackTitleFromUrl(response.finalUrl);
    }

    return {
      ok: true,
      data: extracted,
      errorMessage: null,
    };
  } catch (err) {
    const message =
      err instanceof UnsafeUrlError || err instanceof SafeFetchError
        ? err.message
        : "Não foi possível extrair os dados automaticamente. Preencha manualmente.";

    return {
      ok: false,
      errorMessage: message,
      data: {
        title: fallbackTitleFromUrl(normalizedUrl),
        description: "",
        images: [],
        cover_image_url: null,
        license: null,
        material: null,
        tags: [],
        stl_url: stlUrl?.trim() || null,
        source_url: normalizedUrl,
        extraction_warning: message,
      },
    };
  }
}

export function isOwnStorageOrDemoUrl(url: string): boolean {
  if (url.startsWith("/demo/")) return true;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const target = new URL(url);
    const supa = new URL(supabaseUrl);
    return (
      target.hostname === supa.hostname &&
      target.pathname.includes("/storage/v1/object/public/products/")
    );
  } catch {
    return false;
  }
}

/**
 * Baixa uma imagem externa com validação SSRF (máx. 5 MB), converte via sharp para
 * WebP até 1600px de largura e salva no bucket `products` do Supabase Storage.
 */
export async function copyExternalImageToStorage(
  imageUrl: string,
  supabase: SupabaseClient<Database>
): Promise<{ url: string | null; error?: string }> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return { url: null };
  if (isOwnStorageOrDemoUrl(trimmed)) {
    return { url: trimmed };
  }

  try {
    const response = await safeFetch(trimmed, {
      timeoutMs: 10_000,
      maxBytes: MAX_IMAGE_BYTES,
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    });

    const processedBuffer = await sharp(response.buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();

    const fileName = `imports/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(fileName, processedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: "Falha ao gravar imagem no Storage." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(fileName);

    return { url: publicUrl };
  } catch (err) {
    return {
      url: null,
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível copiar a imagem externa.",
    };
  }
}
