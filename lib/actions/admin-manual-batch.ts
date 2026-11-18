"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { invalidatePublicCatalogCache } from "@/lib/cache/revalidate";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/admin-products";

const MAX_MANUAL_BATCH_ROWS = 50;

const optionalHttpUrlSchema = z
  .string()
  .trim()
  .max(2000, "URL muito longa.")
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Informe uma URL válida iniciada por http:// ou https://." }
  )
  .nullable();

const manualBatchRowSchema = z.object({
  rowId: z.string().trim().min(1).max(80),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome com ao menos 2 caracteres.")
    .max(160, "Nome muito longo."),
  category_id: z.string().uuid("Categoria inválida.").nullable(),
  price: z
    .number()
    .min(0, "O preço não pode ser negativo.")
    .max(999999, "Preço acima do limite.")
    .nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  colors: z.array(z.string().trim().min(1).max(60)).max(30),
  cover_image_url: optionalHttpUrlSchema,
  stl_url: optionalHttpUrlSchema,
});

const saveManualBatchSchema = z.object({
  status: z.enum(["draft", "active"]).default("draft"),
  rows: z
    .array(z.unknown())
    .min(1, "Adicione ao menos uma linha para salvar.")
    .max(
      MAX_MANUAL_BATCH_ROWS,
      `Limite de ${MAX_MANUAL_BATCH_ROWS} linhas por envio.`
    ),
});

export type ManualBatchRowInput = z.infer<typeof manualBatchRowSchema>;

export interface ManualBatchCreatedItem {
  rowId: string;
  productId: string;
  slug: string;
  name: string;
}

export interface ManualBatchFailedItem {
  rowId: string;
  name: string;
  error: string;
}

export interface SaveManualBatchResult {
  created: ManualBatchCreatedItem[];
  failed: ManualBatchFailedItem[];
}

export async function saveManualBatchProductsAction(rawInput: {
  status: "draft" | "active";
  rows: ManualBatchRowInput[];
}): Promise<ActionResult<SaveManualBatchResult>> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const topParsed = saveManualBatchSchema.safeParse(rawInput);
  if (!topParsed.success) {
    return {
      ok: false,
      error:
        topParsed.error.issues[0]?.message ?? "Dados da planilha inválidos.",
    };
  }

  const targetStatus = topParsed.data.status;
  const { data: activeCategories } = await auth.supabase
    .from("categories")
    .select("id");
  const validCategoryIds = new Set(
    (activeCategories ?? []).map((category) => category.id)
  );

  const created: ManualBatchCreatedItem[] = [];
  const failed: ManualBatchFailedItem[] = [];
  const reservedSlugs = new Set<string>();

  for (const rawRow of topParsed.data.rows) {
    const rowObj =
      rawRow && typeof rawRow === "object"
        ? (rawRow as Record<string, unknown>)
        : {};
    const fallbackRowId =
      typeof rowObj.rowId === "string" && rowObj.rowId
        ? rowObj.rowId
        : "unknown";
    const fallbackName = typeof rowObj.name === "string" ? rowObj.name : "";

    const rowParsed = manualBatchRowSchema.safeParse(rawRow);
    if (!rowParsed.success) {
      failed.push({
        rowId: fallbackRowId,
        name: fallbackName,
        error:
          rowParsed.error.issues[0]?.message ?? "Dados inválidos na linha.",
      });
      continue;
    }

    const row = rowParsed.data;
    if (row.category_id && !validCategoryIds.has(row.category_id)) {
      failed.push({
        rowId: row.rowId,
        name: row.name,
        error: "A categoria selecionada não foi encontrada.",
      });
      continue;
    }

    const baseSlug = slugify(row.name) || `produto-${Date.now()}`;
    const { data: similarRows } = await auth.supabase
      .from("products")
      .select("slug")
      .ilike("slug", `${baseSlug}%`);

    for (const existing of similarRows ?? []) {
      reservedSlugs.add(existing.slug);
    }

    let finalSlug = baseSlug;
    let suffix = 2;
    while (reservedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${suffix}`.slice(0, 120);
      suffix += 1;
    }
    reservedSlugs.add(finalSlug);

    const { data: insertedProduct, error: insertError } = await auth.supabase
      .from("products")
      .insert({
        name: row.name,
        slug: finalSlug,
        category_id: row.category_id,
        price: row.price,
        tags: row.tags,
        colors: row.colors,
        status: targetStatus,
        featured: false,
        position: 0,
      })
      .select("id, slug")
      .single();

    if (insertError || !insertedProduct) {
      failed.push({
        rowId: row.rowId,
        name: row.name,
        error:
          insertError?.code === "23505"
            ? "Conflito de slug ao criar o produto. Tente novamente."
            : "Erro ao criar produto no banco.",
      });
      continue;
    }

    if (row.cover_image_url) {
      const { error: imageError } = await auth.supabase
        .from("product_images")
        .insert({
          product_id: insertedProduct.id,
          url: row.cover_image_url,
          position: 0,
          is_cover: true,
        });

      if (imageError) {
        await auth.supabase
          .from("products")
          .delete()
          .eq("id", insertedProduct.id);
        failed.push({
          rowId: row.rowId,
          name: row.name,
          error: "Produto revertido: erro ao vincular imagem de capa.",
        });
        continue;
      }
    }

    if (row.stl_url) {
      const { error: privateError } = await auth.supabase
        .from("product_private")
        .insert({
          product_id: insertedProduct.id,
          stl_url: row.stl_url,
        });

      if (privateError) {
        await auth.supabase
          .from("products")
          .delete()
          .eq("id", insertedProduct.id);
        failed.push({
          rowId: row.rowId,
          name: row.name,
          error: "Produto revertido: erro ao gravar link do STL privado.",
        });
        continue;
      }
    }

    created.push({
      rowId: row.rowId,
      productId: insertedProduct.id,
      slug: insertedProduct.slug,
      name: row.name,
    });
  }

  if (created.length > 0) {
    invalidatePublicCatalogCache({ products: true, categories: true });
    revalidatePath("/admin");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin/importar");
  }

  return {
    ok: true,
    data: { created, failed },
  };
}
