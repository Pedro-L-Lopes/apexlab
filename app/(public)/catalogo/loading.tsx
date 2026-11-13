import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogoLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Carregando catálogo"
      aria-busy="true"
    >
      <div className="space-y-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {/* Barra de filtros skeleton */}
      <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface-glass p-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      {/* Grade de 6 cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-[22px] border border-line bg-surface p-3.5 shadow-card"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-[16px]" />
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
