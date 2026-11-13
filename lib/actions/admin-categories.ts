"use server";

import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { invalidatePublicCatalogCache } from "@/lib/cache/revalidate";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/admin-products";

const saveCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(100),
  slug: z.string().trim().min(1).max(120),
  parent_id: z.string().uuid().nullable(),
  active: z.boolean(),
  show_on_home: z.boolean(),
});

export type SaveCategoryInput = z.infer<typeof saveCategorySchema>;

export async function saveCategoryAction(
  rawInput: SaveCategoryInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = saveCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da categoria inválidos.",
    };
  }

  const input = parsed.data;
  const normalizedSlug = slugify(input.slug || input.name);
  if (!normalizedSlug) {
    return { ok: false, error: "Informe um slug válido." };
  }

  if (input.id && input.parent_id === input.id) {
    return {
      ok: false,
      error: "Uma categoria não pode ser subcategoria de si mesma.",
    };
  }

  if (input.id) {
    const { error } = await auth.supabase
      .from("categories")
      .update({
        name: input.name,
        slug: normalizedSlug,
        parent_id: input.parent_id || null,
        active: input.active,
        show_on_home: input.show_on_home,
      })
      .eq("id", input.id);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Já existe uma categoria com este slug." };
      }
      return { ok: false, error: "Erro ao atualizar categoria." };
    }

    invalidatePublicCatalogCache({ categories: true, products: true });
    return { ok: true, data: { id: input.id } };
  }

  const { data: lastRow } = await auth.supabase
    .from("categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (lastRow?.position ?? -1) + 1;

  const { data, error } = await auth.supabase
    .from("categories")
    .insert({
      name: input.name,
      slug: normalizedSlug,
      parent_id: input.parent_id || null,
      active: input.active,
      show_on_home: input.show_on_home,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "Já existe uma categoria com este slug." };
    }
    return { ok: false, error: "Erro ao criar categoria." };
  }

  invalidatePublicCatalogCache({ categories: true, products: true });
  return { ok: true, data: { id: data.id } };
}

export async function toggleCategoryFlagAction(
  id: string,
  field: "active" | "show_on_home",
  value: boolean
): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = z
    .object({
      id: z.string().uuid(),
      field: z.enum(["active", "show_on_home"]),
      value: z.boolean(),
    })
    .safeParse({ id, field, value });

  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  const update =
    parsed.data.field === "active"
      ? { active: parsed.data.value }
      : { show_on_home: parsed.data.value };

  const { error } = await auth.supabase
    .from("categories")
    .update(update)
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar a categoria." };
  }

  invalidatePublicCatalogCache({ categories: true, products: true });
  return { ok: true };
}

export async function reorderCategoriesAction(
  orderedIds: string[]
): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = z.array(z.string().uuid()).min(1).max(200).safeParse(orderedIds);
  if (!parsed.success) {
    return { ok: false, error: "Ordem de categorias inválida." };
  }

  const results = await Promise.all(
    parsed.data.map((id, position) =>
      auth.supabase.from("categories").update({ position }).eq("id", id)
    )
  );

  if (results.some((r) => r.error)) {
    return { ok: false, error: "Erro ao reordenar categorias." };
  }

  invalidatePublicCatalogCache({ categories: true });
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Categoria inválida." };
  }

  const { error } = await auth.supabase.from("categories").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Erro ao excluir categoria." };
  }

  invalidatePublicCatalogCache({ categories: true, products: true });
  return { ok: true };
}
