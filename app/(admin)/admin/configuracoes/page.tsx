import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getAdminActiveTagStats,
  getAdminCategories,
  getAdminSiteSettings,
} from "@/lib/queries/admin";
import { SettingsFormClient } from "@/components/admin/settings-form-client";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdminPage();
  const [settings, categories, availableTags] = await Promise.all([
    getAdminSiteSettings(supabase),
    getAdminCategories(supabase),
    getAdminActiveTagStats(supabase),
  ]);
  const activeCategories = categories.filter((category) => category.active);

  return (
    <SettingsFormClient
      initialSettings={settings}
      activeCategories={activeCategories}
      availableTags={availableTags}
    />
  );
}
