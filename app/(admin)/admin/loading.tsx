import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      className="space-y-8"
      aria-label="Carregando painel administrativo"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-[22px] border border-line bg-surface p-5 shadow-card"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Tabela administrativa */}
      <div className="space-y-3 rounded-[22px] border border-line bg-surface p-5 shadow-card">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-2.5 pt-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
