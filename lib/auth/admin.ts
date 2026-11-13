import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type AdminSessionResult =
  | {
      authorized: true;
      supabase: SupabaseClient<Database>;
      user: User;
    }
  | {
      authorized: false;
      reason: "unauthenticated" | "forbidden";
      supabase: SupabaseClient<Database>;
      user: User | null;
    };

export async function verifyAdminSession(): Promise<AdminSessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      reason: "unauthenticated",
      supabase,
      user: null,
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) {
    return {
      authorized: false,
      reason: "forbidden",
      supabase,
      user,
    };
  }

  return {
    authorized: true,
    supabase,
    user,
  };
}

export async function requireAdminPage(): Promise<{
  supabase: SupabaseClient<Database>;
  user: User;
}> {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    if (session.reason === "forbidden") {
      redirect("/login?error=nao-autorizado");
    }
    redirect("/login");
  }

  return {
    supabase: session.supabase,
    user: session.user,
  };
}

export async function requireAdminAction(): Promise<
  | { ok: true; supabase: SupabaseClient<Database>; user: User }
  | { ok: false; error: string }
> {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    return {
      ok: false,
      error:
        session.reason === "forbidden"
          ? "Acesso negado: esta conta não possui permissão de administrador."
          : "Sessão expirada. Faça login novamente.",
    };
  }

  return {
    ok: true,
    supabase: session.supabase,
    user: session.user,
  };
}
