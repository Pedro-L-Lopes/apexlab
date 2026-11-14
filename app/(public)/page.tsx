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
    <div className="mx-auto max-w-[1320px] space-y-12 px-4 pt-4 pb-6 sm:space-y-16 sm:px-8 sm:pt-6">
      <Skeleton className="h-44 w-full rounded-[24px] sm:h-52 sm:rounded-[28px]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[20px]" />
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
