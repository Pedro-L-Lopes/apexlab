import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogoLoading() {
  return (
    <div
      className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:px-8 sm:pt-12"
      aria-label="Carregando catálogo"
      aria-busy="true"
    >
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* Compact filter bar skeleton */}
      <div className="mt-7 space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-11 flex-1 rounded-[14px]" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
      </div>

      {/* Responsive product grid skeleton */}
      <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-[26px]" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
