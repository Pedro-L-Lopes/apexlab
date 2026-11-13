import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-4 py-20 text-ink">
      <div className="w-full max-w-lg rounded-[26px] border border-line bg-surface-glass p-8 text-center shadow-card sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Erro 404
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          O link pode estar desatualizado ou a peça que você procura não está
          mais disponível no catálogo.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/catalogo" className={buttonVariants({ variant: "primary" })}>
            Ver catálogo
          </Link>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar à home
          </Link>
        </div>
      </div>
    </main>
  );
}
