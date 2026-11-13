import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminSiteSettings } from "@/lib/queries/admin";
import { SettingsFormClient } from "@/components/admin/settings-form-client";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdminPage();
  const settings = await getAdminSiteSettings(supabase);

  return <SettingsFormClient initialSettings={settings} />;
}
