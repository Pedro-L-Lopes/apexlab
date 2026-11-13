"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
  next: z.string().optional(),
});

export interface LoginActionState {
  error: string | null;
  notAdmin?: boolean;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "E-mail ou senha inválidos.",
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    // Mensagem genérica sem revelar se o e-mail existe
    return {
      error: "E-mail ou senha inválidos.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Não foi possível validar sua sessão. Tente novamente.",
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) {
    return {
      error:
        "Sua conta foi autenticada, mas não possui permissão de administrador para acessar o painel.",
      notAdmin: true,
    };
  }

  const rawNext = parsed.data.next?.trim();
  const safeTarget =
    rawNext && rawNext.startsWith("/admin") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin";

  redirect(safeTarget);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
