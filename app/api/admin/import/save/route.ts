import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/admin";
import { invalidatePublicCatalogCache } from "@/lib/cache/revalidate";
import {
  copyExternalImageToStorage,
  isOwnStorageOrDemoUrl,
  normalizeSourceUrl,
} from "@/lib/import/extractor";
import {
  enrichImportJobs,
  generateUniqueProductSlug,
} from "@/lib/import/jobs";
import type { Json } from "@/types/database";

const saveBatchItemSchema = z.object({
  jobId: z.string().uuid(),
  title: z.string().trim().min(2, "Informe um título com ao menos 2 caracteres.").max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  price: z.number().min(0).max(999999).nullable().optional(),
  cover_image_url: z.string().trim().max(2000).nullable().optional(),
  images: z.array(z.string().trim().max(2000)).max(20).optional(),
  stl_url: z.string().trim().max(2000).nullable().optional(),
  source_url: z.string().trim().min(1).max(2000),
  license: z.string().trim().max(200).nullable().optional(),
  material: z.string().trim().max(120).nullable().optional(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
});

const saveBatchSchema = z.object({
  items: z.array(saveBatchItemSchema).min(1, "Selecione ao menos um item.").max(50),
});

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    return NextResponse.json(
      {
        error:
          session.reason === "forbidden"
            ? "Acesso negado: conta sem permissão de administrador."
            : "Não autenticado.",
      },
      { status: session.reason === "forbidden" ? 403 : 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = saveBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Itens inválidos." },
      { status: 400 }
    );
  }

  const created: Array<{
    jobId: string;
    productId: string;
    name: string;
    slug: string;
  }> = [];
  const failed: Array<{ jobId: string; error: string }> = [];

  for (const item of parsed.data.items) {
    try {
      const slug = await generateUniqueProductSlug(session.supabase, item.title);
      const normalizedSource = normalizeSourceUrl(item.source_url);
      const cleanStl = item.stl_url?.trim() || null;

      const { data: product, error: prodErr } = await session.supabase
        .from("products")
        .insert({
          name: item.title,
          slug,
          description: item.description?.trim() || null,
          category_id: item.category_id || null,
          status: "draft",
          featured: false,
          position: 0,
          price: item.price ?? null,
          material: item.material?.trim() || null,
          tags: item.tags ?? [],
          colors: [],
        })
        .select("id, name, slug")
        .single();

      if (prodErr || !product) {
        failed.push({
          jobId: item.jobId,
          error: "Erro ao criar produto em rascunho.",
        });
        continue;
      }

      // Garante que apenas URLs já armazenadas no Storage (ou /demo/) sejam gravadas
      const candidateUrls = Array.from(
        new Set(
          [
            ...(item.cover_image_url ? [item.cover_image_url] : []),
            ...(item.images ?? []),
          ]
            .map((u) => u.trim())
            .filter(Boolean)
        )
      ).slice(0, 5);

      const finalImageUrls: string[] = [];
      for (const candidateUrl of candidateUrls) {
        if (isOwnStorageOrDemoUrl(candidateUrl)) {
          finalImageUrls.push(candidateUrl);
        } else {
          const copied = await copyExternalImageToStorage(
            candidateUrl,
            session.supabase
          );
          if (copied.url) {
            finalImageUrls.push(copied.url);
          }
        }
      }

      if (finalImageUrls.length > 0) {
        await session.supabase.from("product_images").insert(
          finalImageUrls.map((url, idx) => ({
            product_id: product.id,
            url,
            position: idx,
            is_cover: idx === 0,
          }))
        );
      }

      const { error: privErr } = await session.supabase
        .from("product_private")
        .upsert(
          {
            product_id: product.id,
            source_url: normalizedSource,
            stl_url: cleanStl,
            license: item.license?.trim() || null,
            cost: null,
            notes: null,
          },
          { onConflict: "product_id" }
        );

      if (privErr) {
        failed.push({
          jobId: item.jobId,
          error: "Produto criado, mas falhou ao gravar dados privados.",
        });
        continue;
      }

      const updatedExtracted = {
        title: item.title,
        description: item.description?.trim() ?? "",
        images: finalImageUrls,
        cover_image_url: finalImageUrls[0] ?? null,
        license: item.license?.trim() || null,
        material: item.material?.trim() || null,
        tags: item.tags ?? [],
        category_id: item.category_id ?? null,
        price: item.price ?? null,
        stl_url: cleanStl,
        source_url: normalizedSource,
        extraction_warning: null,
      };

      await session.supabase
        .from("import_jobs")
        .update({
          product_id: product.id,
          stl_url: cleanStl,
          status: "done",
          error_message: null,
          extracted_data: updatedExtracted as unknown as Json,
        })
        .eq("id", item.jobId);

      created.push({
        jobId: item.jobId,
        productId: product.id,
        name: product.name,
        slug: product.slug,
      });
    } catch {
      failed.push({
        jobId: item.jobId,
        error: "Falha inesperada ao salvar rascunho.",
      });
    }
  }

  invalidatePublicCatalogCache({ products: true });

  const jobIds = parsed.data.items.map((i) => i.jobId);
  const { data: refreshedRows } = await session.supabase
    .from("import_jobs")
    .select("*")
    .in("id", jobIds);

  const jobs = await enrichImportJobs(session.supabase, refreshedRows ?? []);

  return NextResponse.json({
    created,
    failed,
    jobs,
  });
}
