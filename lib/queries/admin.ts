import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { normalizeHeroMode, type HeroMode } from "@/lib/queries/public";

export type AdminProductStatus = Database["public"]["Enums"]["product_status"];

export interface AdminSiteSettings {
  id: number;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  whatsapp: string;
  whatsapp_message_template: string;
  instagram: string | null;
  hero_mode: HeroMode;
  home_category_id: string | null;
  home_category_ids: string[];
  home_featured_tags: string[];
  updated_at: string;
}

export interface AdminTagStat {
  tag: string;
  count: number;
}

function normalizeAdminSiteSettings(
  data: Database["public"]["Tables"]["site_settings"]["Row"] | null
): AdminSiteSettings {
  if (!data) {
    return {
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
      hero_mode: "text",
      home_category_id: null,
      home_category_ids: [],
      home_featured_tags: [],
      updated_at: "",
    };
  }

  const rawCategoryIds =
    Array.isArray(data.home_category_ids) && data.home_category_ids.length > 0
      ? data.home_category_ids
      : data.home_category_id
        ? [data.home_category_id]
        : [];
  const homeCategoryIds = Array.from(
    new Set(rawCategoryIds.filter((id): id is string => Boolean(id)))
  ).slice(0, 3);

  const seenTags = new Set<string>();
  const homeFeaturedTags: string[] = [];
  for (const rawTag of data.home_featured_tags ?? []) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seenTags.has(key)) continue;
    seenTags.add(key);
    homeFeaturedTags.push(trimmed);
    if (homeFeaturedTags.length >= 2) break;
  }

  return {
    ...data,
    hero_mode: normalizeHeroMode(data.hero_mode),
    home_category_id: homeCategoryIds[0] ?? null,
    home_category_ids: homeCategoryIds,
    home_featured_tags: homeFeaturedTags,
  };
}

export interface AdminCategoryItem {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  position: number;
  active: boolean;
  show_on_home: boolean;
  created_at: string;
  product_count: number;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  status: AdminProductStatus;
  featured: boolean;
  position: number;
  price: number | null;
  material: string | null;
  updated_at: string;
  cover_image_url: string | null;
  variants_count: number;
  license: string | null;
}

export interface AdminProductImage {
  id?: string;
  url: string;
  position: number;
  is_cover: boolean;
}

export interface AdminProductVariant {
  id?: string;
  name: string;
  price: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  weight_g: number | null;
  attributes: Json;
  active: boolean;
  position: number;
}

export interface AdminProductPrivate {
  stl_url: string | null;
  source_url: string | null;
  license: string | null;
  cost: number | null;
  notes: string | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  status: AdminProductStatus;
  featured: boolean;
  position: number;
  price: number | null;
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
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  private_data: AdminProductPrivate;
}

export interface AdminShellCounts {
  productsTotal: number;
  categoriesTotal: number;
  importJobsTotal: number;
}

export interface AdminDashboardData {
  counts: {
    active: number;
    draft: number;
    hidden: number;
    total: number;
    categoriesActive: number;
    categoriesHome: number;
    categoriesTotal: number;
    importJobsTotal: number;
  };
  recentProducts: AdminProductListItem[];
}

export async function getAdminShellData(supabase: SupabaseClient<Database>): Promise<{
  settings: AdminSiteSettings;
  counts: AdminShellCounts;
}> {
  const [settingsRes, productsCountRes, categoriesCountRes, importsCountRes] =
    await Promise.all([
      supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase
        .from("import_jobs")
        .select("id", { count: "exact", head: true }),
    ]);

  const settings = normalizeAdminSiteSettings(settingsRes.data);

  return {
    settings,
    counts: {
      productsTotal: productsCountRes.count ?? 0,
      categoriesTotal: categoriesCountRes.count ?? 0,
      importJobsTotal: importsCountRes.count ?? 0,
    },
  };
}

export async function getAdminDashboardData(
  supabase: SupabaseClient<Database>
): Promise<AdminDashboardData> {
  const [productsRes, categoriesRes, importsCountRes, imagesRes] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, slug, name, category_id, status, featured, position, price, material, updated_at"
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, active, show_on_home"),
      supabase
        .from("import_jobs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("product_images")
        .select("product_id, url, is_cover, position")
        .order("is_cover", { ascending: false })
        .order("position", { ascending: true }),
    ]);

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const images = imagesRes.data ?? [];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const coverByProductId = new Map<string, string>();
  for (const img of images) {
    if (!coverByProductId.has(img.product_id)) {
      coverByProductId.set(img.product_id, img.url);
    }
  }

  let active = 0;
  let draft = 0;
  let hidden = 0;
  for (const p of products) {
    if (p.status === "active") active += 1;
    else if (p.status === "draft") draft += 1;
    else hidden += 1;
  }

  const recentProducts: AdminProductListItem[] = products.slice(0, 6).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category_id: p.category_id,
    category_name: p.category_id ? categoryMap.get(p.category_id) ?? null : null,
    status: p.status,
    featured: p.featured,
    position: p.position,
    price: p.price,
    material: p.material,
    updated_at: p.updated_at,
    cover_image_url: coverByProductId.get(p.id) ?? null,
    variants_count: 0,
    license: null,
  }));

  return {
    counts: {
      active,
      draft,
      hidden,
      total: products.length,
      categoriesActive: categories.filter((c) => c.active).length,
      categoriesHome: categories.filter((c) => c.show_on_home).length,
      categoriesTotal: categories.length,
      importJobsTotal: importsCountRes.count ?? 0,
    },
    recentProducts,
  };
}

export async function getAdminProductsList(
  supabase: SupabaseClient<Database>
): Promise<{
  products: AdminProductListItem[];
  categories: AdminCategoryItem[];
}> {
  const [productsRes, categoriesRes, imagesRes, variantsRes, privateRes] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, slug, name, category_id, status, featured, position, price, material, updated_at"
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, parent_id, slug, name, position, active, show_on_home, created_at")
        .order("position", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("product_images")
        .select("product_id, url, is_cover, position")
        .order("is_cover", { ascending: false })
        .order("position", { ascending: true }),
      supabase.from("product_variants").select("product_id"),
      supabase.from("product_private").select("product_id, license"),
    ]);

  const rawCategories = categoriesRes.data ?? [];
  const rawProducts = productsRes.data ?? [];

  const categoryNameMap = new Map(rawCategories.map((c) => [c.id, c.name]));
  const productCountByCat = new Map<string, number>();
  for (const p of rawProducts) {
    if (p.category_id) {
      productCountByCat.set(
        p.category_id,
        (productCountByCat.get(p.category_id) ?? 0) + 1
      );
    }
  }

  const coverMap = new Map<string, string>();
  for (const img of imagesRes.data ?? []) {
    if (!coverMap.has(img.product_id)) {
      coverMap.set(img.product_id, img.url);
    }
  }

  const variantsCountMap = new Map<string, number>();
  for (const v of variantsRes.data ?? []) {
    variantsCountMap.set(
      v.product_id,
      (variantsCountMap.get(v.product_id) ?? 0) + 1
    );
  }

  const licenseMap = new Map<string, string | null>();
  for (const priv of privateRes.data ?? []) {
    licenseMap.set(priv.product_id, priv.license);
  }

  const categories: AdminCategoryItem[] = rawCategories.map((cat) => ({
    ...cat,
    product_count: productCountByCat.get(cat.id) ?? 0,
  }));

  const products: AdminProductListItem[] = rawProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category_id: p.category_id,
    category_name: p.category_id ? categoryNameMap.get(p.category_id) ?? null : null,
    status: p.status,
    featured: p.featured,
    position: p.position,
    price: p.price,
    material: p.material,
    updated_at: p.updated_at,
    cover_image_url: coverMap.get(p.id) ?? null,
    variants_count: variantsCountMap.get(p.id) ?? 0,
    license: licenseMap.get(p.id) ?? null,
  }));

  return { products, categories };
}

export async function getAdminProductById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<AdminProductDetail | null> {
  const [productRes, imagesRes, variantsRes, privateRes] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("product_images")
      .select("id, url, position, is_cover")
      .eq("product_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("product_variants")
      .select(
        "id, name, price, width_mm, height_mm, depth_mm, weight_g, attributes, active, position"
      )
      .eq("product_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("product_private")
      .select("stl_url, source_url, license, cost, notes")
      .eq("product_id", id)
      .maybeSingle(),
  ]);

  if (productRes.error || !productRes.data) {
    return null;
  }

  const product = productRes.data;
  return {
    ...product,
    images: imagesRes.data ?? [],
    variants: variantsRes.data ?? [],
    private_data: privateRes.data ?? {
      stl_url: null,
      source_url: null,
      license: null,
      cost: null,
      notes: null,
    },
  };
}

export async function getAdminCategories(
  supabase: SupabaseClient<Database>
): Promise<AdminCategoryItem[]> {
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, parent_id, slug, name, position, active, show_on_home, created_at")
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("products").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of productsRes.data ?? []) {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return (categoriesRes.data ?? []).map((cat) => ({
    ...cat,
    product_count: counts.get(cat.id) ?? 0,
  }));
}

export async function getAdminSiteSettings(
  supabase: SupabaseClient<Database>
): Promise<AdminSiteSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return normalizeAdminSiteSettings(data);
}

export async function getAdminActiveTagStats(
  supabase: SupabaseClient<Database>
): Promise<AdminTagStat[]> {
  const { data } = await supabase
    .from("products")
    .select("tags")
    .eq("status", "active");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const seenInProduct = new Set<string>();
    for (const rawTag of row.tags ?? []) {
      const tag = rawTag.trim();
      if (!tag || seenInProduct.has(tag)) continue;
      seenInProduct.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag, "pt-BR");
    });
}
