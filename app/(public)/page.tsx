import { Suspense } from "react";
import {
  getPublicCategories,
  getPublicProductsListing,
  getPublicSiteSettings,
} from "@/lib/queries/public";
import { HomeContent } from "@/components/public/home-sections";
import { Skeleton } from "@/components/ui/skeleton";

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-14 px-4 pt-8 pb-6 sm:px-8 sm:pt-12">
      <Skeleton className="h-72 w-full rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[24px]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

async function HomeDataLoader() {
  const [settings, categories, products] = await Promise.all([
    getPublicSiteSettings(),
    getPublicCategories(),
    getPublicProductsListing(),
  ]);

  return (
    <HomeContent
      settings={settings}
      categories={categories}
      products={products}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeDataLoader />
    </Suspense>
  );
}
