import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface PublicSiteSettings {
  id: number;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  whatsapp: string;
  whatsapp_message_template: string;
  instagram: string | null;
}

export interface PublicCategory {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  position: number;
  active: boolean;
  show_on_home: boolean;
}

export interface PublicProductListing {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  featured: boolean;
  position: number;
  price: number | null;
  starting_price: number | null;
  cover_image_url: string | null;
  active_variants_count: number;
  material: string | null;
  print_time_min: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  weight_g: number | null;
  tags: string[];
  colors: string[];
  created_at: string;
  updated_at: string;
}

export interface PublicProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
  is_cover: boolean;
}

export interface PublicProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  weight_g: number | null;
  attributes: Json;
  position: number;
}

export interface PublicProductDetail {
  product: PublicProductListing;
  category: PublicCategory | null;
  images: PublicProductImage[];
  variants: PublicProductVariant[];
  related: PublicProductListing[];
}

const DEFAULT_SETTINGS: PublicSiteSettings = {
  id: 1,
  name: "Catálogo 3D",
  description: "",
  logo_url: null,
  banner_url: null,
  primary_color: "#1F4FFF",
  whatsapp: "",
  whatsapp_message_template:
    "Olá! Tenho interesse no produto *{produto}* ({variante}). Link: {link}",
  instagram: null,
};

const LISTING_COLUMNS =
  "id, slug, name, description, category_id, featured, position, price, starting_price, cover_image_url, active_variants_count, material, print_time_min, width_mm, height_mm, depth_mm, weight_g, tags, colors, created_at, updated_at";

const slugSchema = z.string().trim().min(1).max(200);

function normalizeListingRow(row: {
  id: string | null;
  slug: string | null;
  name: string | null;
  description: string | null;
  category_id: string | null;
  featured: boolean | null;
  position: number | null;
  price: number | null;
  starting_price: number | null;
  cover_image_url: string | null;
  active_variants_count: number | null;
  material: string | null;
  print_time_min: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  weight_g: number | null;
  tags: string[] | null;
  colors: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}): PublicProductListing | null {
  if (!row.id || !row.slug || !row.name) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    featured: Boolean(row.featured),
    position: row.position ?? 0,
    price: row.price,
    starting_price: row.starting_price,
    cover_image_url: row.cover_image_url,
    active_variants_count: row.active_variants_count ?? 0,
    material: row.material,
    print_time_min: row.print_time_min,
    width_mm: row.width_mm,
    height_mm: row.height_mm,
    depth_mm: row.depth_mm,
    weight_g: row.weight_g,
    tags: row.tags ?? [],
    colors: row.colors ?? [],
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site-settings");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "id, name, description, logo_url, banner_url, primary_color, whatsapp, whatsapp_message_template, instagram"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  return data;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  "use cache";
  cacheLife("seconds");
  cacheTag("public-categories");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name, position, active, show_on_home")
    .eq("active", true)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getPublicProductsListing(): Promise<PublicProductListing[]> {
  "use cache";
  cacheLife("seconds");
  cacheTag("public-products");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products_listing")
    .select(LISTING_COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map(normalizeListingRow)
    .filter((item): item is PublicProductListing => item !== null);
}

export async function getPublicProductBySlug(
  rawSlug: string
): Promise<PublicProductDetail | null> {
  "use cache";
  cacheLife("seconds");
  const parsed = slugSchema.safeParse(rawSlug);
  if (!parsed.success) return null;

  cacheTag("public-products", `public-product:${parsed.data}`);

  const supabase = createPublicClient();
  const { data: rawProduct, error: productError } = await supabase
    .from("products_listing")
    .select(LISTING_COLUMNS)
    .eq("slug", parsed.data)
    .maybeSingle();

  if (productError || !rawProduct) {
    return null;
  }

  const product = normalizeListingRow(rawProduct);
  if (!product) return null;

  const [imagesRes, variantsRes, categoryRes, relatedRes] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, product_id, url, position, is_cover")
      .eq("product_id", product.id)
      .order("is_cover", { ascending: false })
      .order("position", { ascending: true }),
    supabase
      .from("product_variants")
      .select(
        "id, product_id, name, price, width_mm, height_mm, depth_mm, weight_g, attributes, position"
      )
      .eq("product_id", product.id)
      .eq("active", true)
      .order("position", { ascending: true }),
    product.category_id
      ? supabase
          .from("categories")
          .select("id, parent_id, slug, name, position, active, show_on_home")
          .eq("id", product.category_id)
          .eq("active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    product.category_id
      ? supabase
          .from("products_listing")
          .select(LISTING_COLUMNS)
          .eq("category_id", product.category_id)
          .neq("id", product.id)
          .order("featured", { ascending: false })
          .order("position", { ascending: true })
          .limit(4)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const images = imagesRes.data ?? [];
  const variants = variantsRes.data ?? [];
  const category = categoryRes.data ?? null;
  const related = (relatedRes.data ?? [])
    .map(normalizeListingRow)
    .filter((item): item is PublicProductListing => item !== null);

  return {
    product,
    category,
    images,
    variants,
    related,
  };
}
