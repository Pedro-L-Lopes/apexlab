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
    })
    .eq("id", 1);

  if (error) {
    return { ok: false, error: "Erro ao salvar configurações do site." };
  }

  invalidatePublicCatalogCache({ settings: true, products: true, categories: true });
  return { ok: true };
}
