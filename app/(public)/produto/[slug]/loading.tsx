import { Skeleton } from "@/components/ui/skeleton";

export default function ProdutoDetailLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Carregando detalhes do produto"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-56" />

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Coluna da galeria */}
        <div className="space-y-3 lg:col-span-7">
          <Skeleton className="aspect-square w-full rounded-[26px]" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-[14px]" />
            ))}
          </div>
        </div>

        {/* Coluna de detalhes */}
        <div className="space-y-5 rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8 lg:col-span-5">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-8 w-36" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2 pt-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
