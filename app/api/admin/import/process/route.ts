import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  copyExternalImageToStorage,
  extractModelFromUrl,
} from "@/lib/import/extractor";
import { enrichImportJobs, parseExtractedData } from "@/lib/import/jobs";
import type { Json } from "@/types/database";

const processSchema = z.object({
  jobId: z.string().uuid("ID de item inválido."),
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

  const parsed = processSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { data: jobRow, error: fetchErr } = await session.supabase
    .from("import_jobs")
    .select("*")
    .eq("id", parsed.data.jobId)
    .maybeSingle();

  if (fetchErr || !jobRow) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  await session.supabase
    .from("import_jobs")
    .update({ status: "processing", error_message: null })
    .eq("id", jobRow.id);

  const existing = parseExtractedData(
    jobRow.extracted_data,
    jobRow.source_url,
    jobRow.stl_url
  );

  const extraction = await extractModelFromUrl(jobRow.source_url, jobRow.stl_url);

  let nextStatus: "done" | "error" = extraction.ok ? "done" : "error";
  let nextErrorMessage = extraction.errorMessage;
  let finalExtracted = {
    ...extraction.data,
    category_id: existing.category_id ?? null,
    price: existing.price ?? null,
    stl_url: existing.stl_url ?? jobRow.stl_url ?? null,
  };

  if (extraction.ok && extraction.data.images.length > 0) {
    const candidates = extraction.data.images.slice(0, 3);
    const copied = await Promise.all(
      candidates.map((imgUrl) => copyExternalImageToStorage(imgUrl, session.supabase))
    );
    const storedUrls = copied
      .map((c) => c.url)
      .filter((u): u is string => Boolean(u));

    if (storedUrls.length > 0) {
      finalExtracted = {
        ...finalExtracted,
        images: storedUrls,
        cover_image_url: storedUrls[0],
      };
    } else {
      finalExtracted = {
        ...finalExtracted,
        images: existing.images,
        cover_image_url: existing.cover_image_url,
        extraction_warning:
          "Metadados extraídos, mas as imagens externas foram bloqueadas. Envie uma imagem manualmente.",
      };
    }
  } else if (!extraction.ok && existing.cover_image_url) {
    finalExtracted = {
      ...finalExtracted,
      images: existing.images,
      cover_image_url: existing.cover_image_url,
    };
  }

  if (!extraction.ok && !nextErrorMessage) {
    nextStatus = "error";
    nextErrorMessage = "Não foi possível ler o link informado.";
  }

  const { data: updated, error: updateErr } = await session.supabase
    .from("import_jobs")
    .update({
      status: nextStatus,
      error_message: nextErrorMessage,
      extracted_data: finalExtracted as unknown as Json,
    })
    .eq("id", jobRow.id)
    .select("*")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: "Erro ao atualizar status da importação." },
      { status: 500 }
    );
  }

  const enriched = await enrichImportJobs(session.supabase, [updated]);
  return NextResponse.json({ job: enriched[0] });
}
