"use client";

import * as React from "react";
import { AlertTriangle, Lock, LogIn, LogOut, ShieldAlert } from "lucide-react";
import { loginAction, logoutAction, type LoginActionState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  nextPath?: string;
  initialUnauthorized?: boolean;
  signedInEmail?: string | null;
}

const INITIAL_STATE: LoginActionState = {
  error: null,
};

export function LoginForm({
  nextPath,
  initialUnauthorized = false,
  signedInEmail = null,
}: LoginFormProps) {
  const [state, formAction, isPending] = React.useActionState(
    loginAction,
    INITIAL_STATE
  );

  const showUnauthorizedBanner =
    Boolean(signedInEmail) && (initialUnauthorized || state.notAdmin);

  return (
    <div className="space-y-5">
      {showUnauthorizedBanner && (
        <div
          role="alert"
          className="rounded-[18px] border border-[#FECDD3] bg-[#FFF1F2] p-4 text-sm text-[#9F1239]"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-semibold">Acesso não autorizado</p>
              <p className="text-xs leading-relaxed">
                A conta <span className="font-semibold">{signedInEmail}</span>{" "}
                está autenticada, mas não tem permissão de administrador.
              </p>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="h-8 bg-white text-[#9F1239] border-[#FECDD3] hover:bg-[#FFE4E6]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair desta conta
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {state.error && !state.notAdmin && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[16px] border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state.error && state.notAdmin && !signedInEmail && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[16px] border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted"
          >
            E-mail
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@suaempresa.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted"
          >
            Senha
          </label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Lock className="h-4 w-4 animate-pulse" />
              Verificando acesso...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Entrar no painel
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
