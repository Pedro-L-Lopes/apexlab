import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";
import type { Database, Json } from "@/types/database";
import {
  fallbackTitleFromUrl,
  normalizeSourceUrl,
  type ExtractedModelData,
} from "./extractor";

export type ImportJobStatus = Database["public"]["Enums"]["import_job_status"];

export interface DuplicateProductRef {
  id: string;
  name: string;
  slug: string;
  status: Database["public"]["Enums"]["product_status"];
}

export interface AdminImportJobItem {
  id: string;
  source_url: string;
  stl_url: string | null;
  status: ImportJobStatus;
  error_message: string | null;
  product_id: string | null;
  linked_product: DuplicateProductRef | null;
  duplicate_product: DuplicateProductRef | null;
  extracted_data: ExtractedModelData;
  created_at: string;
}

export function parseExtractedData(
  raw: Json | null,
  sourceUrl: string,
  stlUrl: string | null
): ExtractedModelData {
  const fallback: ExtractedModelData = {
    title: fallbackTitleFromUrl(sourceUrl),
    description: "",
    images: [],
    cover_image_url: null,
    license: null,
    material: null,
    tags: [],
    category_id: null,
    price: null,
    stl_url: stlUrl,
    source_url: normalizeSourceUrl(sourceUrl),
    extraction_warning: null,
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const obj = raw as Record<string, unknown>;
  const images = Array.isArray(obj.images)
    ? obj.images.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const cover =
    typeof obj.cover_image_url === "string" && obj.cover_image_url.trim()
      ? obj.cover_image_url.trim()
      : images[0] ?? null;

  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  const rawPrice = obj.price;
  const price =
    typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice >= 0
      ? rawPrice
      : null;

  return {
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : fallback.title,
    description: typeof obj.description === "string" ? obj.description : "",
    images: cover && !images.includes(cover) ? [cover, ...images] : images,
    cover_image_url: cover,
    license: typeof obj.license === "string" && obj.license.trim() ? obj.license.trim() : null,
    material: typeof obj.material === "string" && obj.material.trim() ? obj.material.trim() : null,
    tags,
    category_id:
      typeof obj.category_id === "string" && obj.category_id.trim()
        ? obj.category_id.trim()
        : null,
    price,
    stl_url:
      typeof obj.stl_url === "string" && obj.stl_url.trim()
        ? obj.stl_url.trim()
        : stlUrl,
    source_url:
      typeof obj.source_url === "string" && obj.source_url.trim()
        ? normalizeSourceUrl(obj.source_url)
        : fallback.source_url,
    extraction_warning:
      typeof obj.extraction_warning === "string" && obj.extraction_warning.trim()
        ? obj.extraction_warning.trim()
        : null,
  };
}

export async function findDuplicateSourceMap(
  supabase: SupabaseClient<Database>
): Promise<Map<string, DuplicateProductRef>> {
  const { data } = await supabase
    .from("product_private")
    .select("product_id, source_url, products!inner(id, name, slug, status)")
    .not("source_url", "is", null);

  const map = new Map<string, DuplicateProductRef>();
  for (const row of data ?? []) {
    if (!row.source_url) continue;
    const prodRaw = row.products;
    const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
    if (!prod) continue;
    const ref: DuplicateProductRef = {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      status: prod.status,
    };
    const rawKey = row.source_url.trim();
    const normalizedKey = normalizeSourceUrl(rawKey);
    if (!map.has(rawKey)) map.set(rawKey, ref);
    if (!map.has(normalizedKey)) map.set(normalizedKey, ref);
  }
  return map;
}

export function matchDuplicateFromMap(
  map: Map<string, DuplicateProductRef>,
  sourceUrl: string
): DuplicateProductRef | null {
  return (
    map.get(sourceUrl.trim()) ??
    map.get(normalizeSourceUrl(sourceUrl)) ??
    null
  );
}

export async function enrichImportJobs(
  supabase: SupabaseClient<Database>,
  rows: Array<Database["public"]["Tables"]["import_jobs"]["Row"]>
): Promise<AdminImportJobItem[]> {
  if (rows.length === 0) return [];

  const productIds = Array.from(
    new Set(
      rows
        .map((r) => r.product_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [dupMap, linkedRes] = await Promise.all([
    findDuplicateSourceMap(supabase),
    productIds.length > 0
      ? supabase
          .from("products")
          .select("id, name, slug, status")
          .in("id", productIds)
      : Promise.resolve({ data: [] as DuplicateProductRef[] }),
  ]);

  const linkedMap = new Map<string, DuplicateProductRef>();
  for (const prod of linkedRes.data ?? []) {
    linkedMap.set(prod.id, prod);
  }

  return rows.map((row) => {
    const linkedProduct = row.product_id
      ? linkedMap.get(row.product_id) ?? null
      : null;
    const dupCandidate = matchDuplicateFromMap(dupMap, row.source_url);
    const duplicateProduct =
      dupCandidate && (!row.product_id || dupCandidate.id !== row.product_id)
        ? dupCandidate
        : null;

    return {
      id: row.id,
      source_url: row.source_url,
      stl_url: row.stl_url,
      status: row.status,
      error_message: row.error_message,
      product_id: row.product_id,
      linked_product: linkedProduct,
      duplicate_product: duplicateProduct,
      extracted_data: parseExtractedData(row.extracted_data, row.source_url, row.stl_url),
      created_at: row.created_at,
    };
  });
}

export async function getAdminImportJobs(
  supabase: SupabaseClient<Database>,
  limit = 100
): Promise<AdminImportJobItem[]> {
  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return enrichImportJobs(supabase, data ?? []);
}

export async function getAdminImportJobById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<AdminImportJobItem | null> {
  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const enriched = await enrichImportJobs(supabase, [data]);
  return enriched[0] ?? null;
}

export async function generateUniqueProductSlug(
  supabase: SupabaseClient<Database>,
  desiredTitleOrSlug: string
): Promise<string> {
  const baseSlug = slugify(desiredTitleOrSlug) || `modelo-3d-${Date.now()}`;
  const { data: existingRows } = await supabase
    .from("products")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  const existing = new Set((existingRows ?? []).map((r) => r.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  for (let suffix = 2; suffix < 500; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}
