import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  copyExternalImageToStorage,
  extractModelFromUrl,
  fallbackTitleFromUrl,
  normalizeSourceUrl,
} from "@/lib/import/extractor";
import {
  findDuplicateSourceMap,
  matchDuplicateFromMap,
} from "@/lib/import/jobs";
import type { Json } from "@/types/database";

const extractRequestSchema = z.object({
  sourceUrl: z
    .string()
    .trim()
    .min(1, "Informe a URL do modelo.")
    .max(2000),
  stlUrl: z.string().trim().max(2000).nullable().optional(),
  skipExtract: z.boolean().optional(),
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
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Link inválido." },
      { status: 400 }
    );
  }

  const normalizedSource = normalizeSourceUrl(parsed.data.sourceUrl);
  const cleanStl = parsed.data.stlUrl?.trim() || null;

  const dupMap = await findDuplicateSourceMap(session.supabase);
  const duplicateProduct = matchDuplicateFromMap(dupMap, normalizedSource);

  let status: "done" | "error" = "done";
  let errorMessage: string | null = null;
  let extractedData;

  if (parsed.data.skipExtract) {
    extractedData = {
      title: fallbackTitleFromUrl(normalizedSource),
      description: "",
      images: [] as string[],
      cover_image_url: null,
      license: null,
      material: null,
      tags: [] as string[],
      stl_url: cleanStl,
      source_url: normalizedSource,
      extraction_warning: "Preenchimento manual iniciado com o link de origem.",
    };
  } else {
    const extraction = await extractModelFromUrl(normalizedSource, cleanStl);
    extractedData = extraction.data;

    if (!extraction.ok) {
      status = "error";
      errorMessage = extraction.errorMessage;
    } else if (extractedData.images.length > 0) {
      const candidates = extractedData.images.slice(0, 3);
      const copied = await Promise.all(
        candidates.map((imgUrl) =>
          copyExternalImageToStorage(imgUrl, session.supabase)
        )
      );
      const storedUrls = copied
        .map((c) => c.url)
        .filter((u): u is string => Boolean(u));

      if (storedUrls.length === 0) {
        extractedData = {
          ...extractedData,
          images: [],
          cover_image_url: null,
          extraction_warning:
            "Metadados extraídos, mas as fotos externas não puderam ser baixadas. Envie a imagem manualmente.",
        };
      } else {
        extractedData = {
          ...extractedData,
          images: storedUrls,
          cover_image_url: storedUrls[0],
        };
      }
    }
  }

  const { data: jobRow, error: insertError } = await session.supabase
    .from("import_jobs")
    .insert({
      source_url: normalizedSource,
      stl_url: cleanStl,
      status,
      error_message: errorMessage,
      extracted_data: extractedData as unknown as Json,
    })
    .select("id")
    .single();

  if (insertError || !jobRow) {
    return NextResponse.json(
      { error: "Erro ao registrar histórico da importação." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    jobId: jobRow.id,
    status,
    errorMessage,
    extracted: extractedData,
    duplicateProduct,
  });
}
