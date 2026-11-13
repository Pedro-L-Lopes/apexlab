import { revalidatePath, revalidateTag } from "next/cache";

interface InvalidateOptions {
  products?: boolean;
  categories?: boolean;
  settings?: boolean;
  productSlugs?: string[];
}

export function invalidatePublicCatalogCache(options: InvalidateOptions = {}) {
  const {
    products = false,
    categories = false,
    settings = false,
    productSlugs = [],
  } = options;

  if (products) {
    revalidateTag("public-products", { expire: 0 });
    revalidatePath("/", "page");
    revalidatePath("/catalogo", "page");
    revalidatePath("/produto/[slug]", "page");
    revalidatePath("/sitemap.xml");
    revalidatePath("/admin", "page");
    revalidatePath("/admin/produtos", "page");
  }

  for (const slug of productSlugs) {
    if (slug.trim()) {
      revalidateTag(`public-product:${slug.trim()}`, { expire: 0 });
      revalidatePath(`/produto/${slug.trim()}`, "page");
    }
  }

  if (categories) {
    revalidateTag("public-categories", { expire: 0 });
    revalidateTag("public-products", { expire: 0 });
    revalidatePath("/", "page");
    revalidatePath("/catalogo", "page");
    revalidatePath("/admin", "page");
    revalidatePath("/admin/categorias", "page");
  }

  if (settings) {
    revalidateTag("site-settings", { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/configuracoes", "page");
  }
}
