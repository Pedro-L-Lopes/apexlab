"use server";

import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { invalidatePublicCatalogCache } from "@/lib/cache/revalidate";
import { sanitizePhoneDigits } from "@/lib/whatsapp";
import type { ActionResult } from "@/lib/actions/admin-products";

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja.").max(120),
  description: z.string().trim().max(500),
  logo_url: z.string().trim().max(2000).nullable(),
  banner_url: z.string().trim().max(2000).nullable(),
  primary_color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Cor hexadecimal inválida."),
  whatsapp: z.string().trim().max(30),
  instagram: z.string().trim().max(200).nullable(),
  whatsapp_message_template: z
    .string()
    .trim()
    .min(5, "Informe um modelo de mensagem válido.")
    .max(500),
  hero_mode: z.enum(["text", "image", "none"]).default("text"),
  home_category_ids: z
    .array(z.string().uuid("Categoria inválida."))
    .max(3, "Escolha no máximo 3 categorias para a home.")
    .default([]),
  home_featured_tags: z
    .array(z.string().trim().min(1, "Informe uma tag válida.").max(60))
    .max(2, "Destaque no máximo 2 tags na home.")
    .default([]),
});

export type UpdateSiteSettingsInput = z.infer<typeof settingsSchema>;

export async function updateSiteSettingsAction(
  rawInput: UpdateSiteSettingsInput
): Promise<ActionResult> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = settingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Configurações inválidas.",
    };
  }

  const input = parsed.data;
  const whatsappDigits = sanitizePhoneDigits(input.whatsapp);
  const homeCategoryIds = Array.from(new Set(input.home_category_ids)).slice(
    0,
    3
  );

  const seenTags = new Set<string>();
  const homeFeaturedTags: string[] = [];
  for (const rawTag of input.home_featured_tags) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seenTags.has(key)) continue;
    seenTags.add(key);
    homeFeaturedTags.push(trimmed);
    if (homeFeaturedTags.length >= 2) break;
  }

  const { error } = await auth.supabase
    .from("site_settings")
    .update({
      name: input.name,
      description: input.description,
      logo_url: input.logo_url || null,
      banner_url: input.banner_url || null,
      primary_color: input.primary_color,
      whatsapp: whatsappDigits,
      instagram: input.instagram || null,
      whatsapp_message_template: input.whatsapp_message_template,
      hero_mode: input.hero_mode,
      home_category_id: homeCategoryIds[0] ?? null,
      home_category_ids: homeCategoryIds,
      home_featured_tags: homeFeaturedTags,
    })
    .eq("id", 1);

  if (error) {
    return { ok: false, error: "Erro ao salvar configurações do site." };
  }

  invalidatePublicCatalogCache({ settings: true, products: true, categories: true });
  return { ok: true };
}
