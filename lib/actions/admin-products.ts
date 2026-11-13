"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { invalidatePublicCatalogCache } from "@/lib/cache/revalidate";
import { slugify } from "@/lib/utils";
import type { Json } from "@/types/database";

const imageSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  position: z.number().int().min(0).max(500),
  is_cover: z.boolean(),
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da variação.").max(120),
  price: z.number().min(0).max(999999).nullable(),
  width_mm: z.number().min(0).max(99999).nullable(),
  height_mm: z.number().min(0).max(99999).nullable(),
  depth_mm: z.number().min(0).max(99999).nullable(),
  weight_g: z.number().min(0).max(999999).nullable(),
  attributes: z.record(z.string(), z.string()),
  active: z.boolean(),
  position: z.number().int().min(0).max(500),
});

const saveProductSchema = z.object({
  id: z.string().uuid().optional(),
  import_job_id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe um nome com ao menos 2 caracteres.").max(160),
  slug: z.string().trim().min(1, "Informe um slug válido.").max(160),
  description: z.string().trim().max(5000).nullable(),
  category_id: z.string().uuid().nullable(),
  status: z.enum(["draft", "active", "hidden"]),
  featured: z.boolean(),
  position: z.number().int().min(0).max(99999),
  price: z.number().min(0).max(999999).nullable(),
  material: z.string().trim().max(120).nullable(),
  print_time_min: z.number().int().min(0).max(999999).nullable(),
  width_mm: z.number().min(0).max(99999).nullable(),
  height_mm: z.number().min(0).max(99999).nullable(),
  depth_mm: z.number().min(0).max(99999).nullable(),
  weight_g: z.number().min(0).max(999999).nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  colors: z.array(z.string().trim().min(1).max(60)).max(30),
  images: z.array(imageSchema).max(20),
  variants: z.array(variantSchema).max(50),
  private_data: z.object({
    stl_url: z.string().trim().max(2000).nullable(),
    source_url: z.string().trim().max(2000).nullable(),
    license: z.string().trim().max(200).nullable(),
    cost: z.number().min(0).max(999999).nullable(),
    notes: z.string().trim().max(4000).nullable(),
  }),
});

export type SaveProductInput = z.infer<typeof saveProductSchema>;

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function saveProductAction(
  rawInput: SaveProductInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = saveProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados do produto inválidos.",
    };
  }

  const input = parsed.data;
  const normalizedSlug = slugify(input.slug || input.name);
  if (!normalizedSlug) {
    return { ok: false, error: "Informe um slug válido para o produto." };
  }

  let previousSlug: string | null = null;
  if (input.id) {
    const { data: existing } = await auth.supabase
      .from("products")
      .select("slug")
      .eq("id", input.id)
      .maybeSingle();
    previousSlug = existing?.slug ?? null;
  }

  const productPayload = {
    name: input.name,
    slug: normalizedSlug,
    description: input.description || null,
    category_id: input.category_id || null,
    status: input.status,
    featured: input.featured,
    position: input.position,
    price: input.price,
    material: input.material || null,
    print_time_min: input.print_time_min,
    width_mm: input.width_mm,
    height_mm: input.height_mm,
    depth_mm: input.depth_mm,
    weight_g: input.weight_g,
    tags: input.tags,
    colors: input.colors,
  };

  let productId = input.id;

  if (productId) {
    const { error } = await auth.supabase
      .from("products")
      .update(productPayload)
      .eq("id", productId);

    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "Já existe um produto com este slug. Escolha outro.",
        };
      }
      return { ok: false, error: "Erro ao atualizar produto." };
    }
  } else {
    const { data, error } = await auth.supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return {
          ok: false,
          error: "Já existe um produto com este slug. Escolha outro.",
        };
      }
      return { ok: false, error: "Erro ao criar produto." };
    }
    productId = data.id;
  }

  // Garante no máximo 1 capa (is_cover = true) e posições sequenciais
  const { error: delImgErr } = await auth.supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (delImgErr) {
    return { ok: false, error: "Erro ao atualizar imagens do produto." };
  }

  if (input.images.length > 0) {
    const firstCoverIdx = input.images.findIndex((img) => img.is_cover);
    const coverIndex = firstCoverIdx >= 0 ? firstCoverIdx : 0;
    const imageRows = input.images.map((img, idx) => ({
      product_id: productId!,
      url: img.url,
      position: idx,
      is_cover: idx === coverIndex,
    }));

    const { error: insImgErr } = await auth.supabase
      .from("product_images")
      .insert(imageRows);
    if (insImgErr) {
      return { ok: false, error: "Erro ao salvar imagens do produto." };
    }
  }

  // Sincroniza variantes
  const { error: delVarErr } = await auth.supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (delVarErr) {
    return { ok: false, error: "Erro ao atualizar variantes." };
  }

  if (input.variants.length > 0) {
    const variantRows = input.variants.map((variant, idx) => ({
      product_id: productId!,
      name: variant.name,
      price: variant.price,
      width_mm: variant.width_mm,
      height_mm: variant.height_mm,
      depth_mm: variant.depth_mm,
      weight_g: variant.weight_g,
      attributes: variant.attributes as Json,
      active: variant.active,
      position: idx,
    }));

    const { error: insVarErr } = await auth.supabase
      .from("product_variants")
      .insert(variantRows);
    if (insVarErr) {
      return { ok: false, error: "Erro ao salvar variantes." };
    }
  }

  // Upsert em product_private
  const { error: privErr } = await auth.supabase
    .from("product_private")
    .upsert(
      {
        product_id: productId,
        stl_url: input.private_data.stl_url || null,
        source_url: input.private_data.source_url || null,
        license: input.private_data.license || null,
        cost: input.private_data.cost,
        notes: input.private_data.notes || null,
      },
      { onConflict: "product_id" }
    );

  if (privErr) {
    return { ok: false, error: "Erro ao salvar dados internos do produto." };
  }

  if (input.import_job_id) {
    await auth.supabase
      .from("import_jobs")
      .update({
        product_id: productId,
        stl_url: input.private_data.stl_url || null,
        status: "done",
        error_message: null,
      })
      .eq("id", input.import_job_id);
    revalidatePath("/admin/importar");
  }

  const slugs = [normalizedSlug];
  if (previousSlug && previousSlug !== normalizedSlug) {
    slugs.push(previousSlug);
  }

  invalidatePublicCatalogCache({ products: true, productSlugs: slugs });
  revalidatePath(`/admin/produtos/${productId}`);

  return { ok: true, data: { id: productId, slug: normalizedSlug } };
}

export async function toggleProductStatusAction(
  id: string,
  status: "draft" | "active" | "hidden"
): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const valid = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["draft", "active", "hidden"]),
    })
    .safeParse({ id, status });
  if (!valid.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  const { data, error } = await auth.supabase
    .from("products")
    .update({ status: valid.data.status })
    .eq("id", valid.data.id)
    .select("slug")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Não foi possível alterar o status." };
  }

  invalidatePublicCatalogCache({
    products: true,
    productSlugs: data?.slug ? [data.slug] : [],
  });
  return { ok: true };
}

export async function toggleProductFeaturedAction(
  id: string,
  featured: boolean
): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const valid = z
    .object({ id: z.string().uuid(), featured: z.boolean() })
    .safeParse({ id, featured });
  if (!valid.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  const { data, error } = await auth.supabase
    .from("products")
    .update({ featured: valid.data.featured })
    .eq("id", valid.data.id)
    .select("slug")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Não foi possível atualizar destaque." };
  }

  invalidatePublicCatalogCache({
    products: true,
    productSlugs: data?.slug ? [data.slug] : [],
  });
  return { ok: true };
}

export async function duplicateProductAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Produto inválido." };
  }

  const [prodRes, imgRes, varRes, privRes] = await Promise.all([
    auth.supabase.from("products").select("*").eq("id", id).maybeSingle(),
    auth.supabase
      .from("product_images")
      .select("url, position, is_cover")
      .eq("product_id", id)
      .order("position", { ascending: true }),
    auth.supabase
      .from("product_variants")
      .select(
        "name, price, width_mm, height_mm, depth_mm, weight_g, attributes, active, position"
      )
      .eq("product_id", id)
      .order("position", { ascending: true }),
    auth.supabase
      .from("product_private")
      .select("stl_url, source_url, license, cost, notes")
      .eq("product_id", id)
      .maybeSingle(),
  ]);

  if (prodRes.error || !prodRes.data) {
    return { ok: false, error: "Produto não encontrado." };
  }

  const orig = prodRes.data;
  const suffix = Math.random().toString(36).slice(2, 6);
  const newSlug = `${orig.slug.slice(0, 100)}-copia-${suffix}`;

  const { data: created, error: createErr } = await auth.supabase
    .from("products")
    .insert({
      slug: newSlug,
      name: `${orig.name} (Cópia)`,
      description: orig.description,
      category_id: orig.category_id,
      status: "draft",
      featured: false,
      position: orig.position,
      price: orig.price,
      material: orig.material,
      print_time_min: orig.print_time_min,
      width_mm: orig.width_mm,
      height_mm: orig.height_mm,
      depth_mm: orig.depth_mm,
      weight_g: orig.weight_g,
      tags: orig.tags,
      colors: orig.colors,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    return { ok: false, error: "Não foi possível duplicar o produto." };
  }

  if (imgRes.data && imgRes.data.length > 0) {
    await auth.supabase.from("product_images").insert(
      imgRes.data.map((img) => ({
        product_id: created.id,
        url: img.url,
        position: img.position,
        is_cover: img.is_cover,
      }))
    );
  }

  if (varRes.data && varRes.data.length > 0) {
    await auth.supabase.from("product_variants").insert(
      varRes.data.map((variant) => ({
        product_id: created.id,
        name: variant.name,
        price: variant.price,
        width_mm: variant.width_mm,
        height_mm: variant.height_mm,
        depth_mm: variant.depth_mm,
        weight_g: variant.weight_g,
        attributes: variant.attributes,
        active: variant.active,
        position: variant.position,
      }))
    );
  }

  if (privRes.data) {
    await auth.supabase.from("product_private").insert({
      product_id: created.id,
      stl_url: privRes.data.stl_url,
      source_url: privRes.data.source_url,
      license: privRes.data.license,
      cost: privRes.data.cost,
      notes: privRes.data.notes,
    });
  }

  invalidatePublicCatalogCache({ products: true });
  return { ok: true, data: { id: created.id } };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Produto inválido." };
  }

  const { data: existing } = await auth.supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await auth.supabase.from("products").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Não foi possível excluir o produto." };
  }

  invalidatePublicCatalogCache({
    products: true,
    productSlugs: existing?.slug ? [existing.slug] : [],
  });
  return { ok: true };
}

export async function batchProductsAction(rawInput: {
  ids: string[];
  action: "publish" | "hide" | "draft" | "category";
  categoryId?: string | null;
}): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = z
    .object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      action: z.enum(["publish", "hide", "draft", "category"]),
      categoryId: z.string().uuid().nullable().optional(),
    })
    .safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, error: "Seleção inválida para ação em lote." };
  }

  const { ids, action, categoryId } = parsed.data;
  const { data: existingRows } = await auth.supabase
    .from("products")
    .select("slug")
    .in("id", ids);

  const updateData =
    action === "publish"
      ? { status: "active" as const }
      : action === "hide"
        ? { status: "hidden" as const }
        : action === "draft"
          ? { status: "draft" as const }
          : { category_id: categoryId ?? null };

  const { error } = await auth.supabase
    .from("products")
    .update(updateData)
    .in("id", ids);

  if (error) {
    return { ok: false, error: "Erro ao aplicar ação em lote." };
  }

  invalidatePublicCatalogCache({
    products: true,
    productSlugs: (existingRows ?? []).map((r) => r.slug),
  });
  return { ok: true };
}
