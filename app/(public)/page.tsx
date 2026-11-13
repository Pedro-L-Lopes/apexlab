export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full rounded-[28px] bg-surface p-10 shadow-card border border-line text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          — Catálogo 3D
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">
          Em preparação<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-base text-muted">
          Ambiente base configurado e pronto para as próximas fases.
        </p>
      </div>
    </main>
  );
}
