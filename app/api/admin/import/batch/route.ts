import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  fallbackTitleFromUrl,
  normalizeSourceUrl,
} from "@/lib/import/extractor";
import {
  enrichImportJobs,
  getAdminImportJobs,
  parseExtractedData,
} from "@/lib/import/jobs";
import type { Json } from "@/types/database";

const createBatchSchema = z.object({
  items: z
    .array(
      z.object({
        source_url: z.string().trim().min(1).max(2000),
        stl_url: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .min(1, "Informe ao menos uma linha válida.")
    .max(100, "Máximo de 100 links por lote."),
});

const patchJobSchema = z.object({
  id: z.string().uuid("ID de importação inválido."),
  stl_url: z.string().trim().max(2000).nullable().optional(),
  extracted_data: z
    .object({
      title: z.string().trim().max(160).optional(),
      description: z.string().trim().max(5000).optional(),
      category_id: z.string().uuid().nullable().optional(),
      price: z.number().min(0).max(999999).nullable().optional(),
      cover_image_url: z.string().trim().max(2000).nullable().optional(),
      images: z.array(z.string().trim().max(2000)).max(20).optional(),
      license: z.string().trim().max(200).nullable().optional(),
      material: z.string().trim().max(120).nullable().optional(),
      tags: z.array(z.string().trim().max(60)).max(30).optional(),
    })
    .optional(),
});

const deleteBatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

function unauthorizedResponse(reason: "unauthenticated" | "forbidden") {
  return NextResponse.json(
    {
      error:
        reason === "forbidden"
          ? "Acesso negado: conta sem permissão de administrador."
          : "Não autenticado.",
    },
    { status: reason === "forbidden" ? 403 : 401 }
  );
}

export async function GET() {
  const session = await verifyAdminSession();
  if (!session.authorized) return unauthorizedResponse(session.reason);

  const jobs = await getAdminImportJobs(session.supabase, 100);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (!session.authorized) return unauthorizedResponse(session.reason);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Lista inválida." },
      { status: 400 }
    );
  }

  const payload = parsed.data.items.map((item) => {
    const normalizedSource = normalizeSourceUrl(item.source_url);
    const cleanStl = item.stl_url?.trim() || null;
    return {
      source_url: normalizedSource,
      stl_url: cleanStl,
      status: "pending" as const,
      error_message: null,
      extracted_data: {
        title: fallbackTitleFromUrl(normalizedSource),
        description: "",
        images: [],
        cover_image_url: null,
        license: null,
        material: null,
        tags: [],
        category_id: null,
        price: null,
        stl_url: cleanStl,
        source_url: normalizedSource,
        extraction_warning: null,
      } as unknown as Json,
    };
  });

  const { data: inserted, error } = await session.supabase
    .from("import_jobs")
    .insert(payload)
    .select("*");

  if (error || !inserted) {
    return NextResponse.json(
      { error: "Erro ao criar fila de importação no banco." },
      { status: 500 }
    );
  }

  const jobs = await enrichImportJobs(session.supabase, inserted);
  return NextResponse.json({ jobs });
}

export async function PATCH(request: Request) {
  const session = await verifyAdminSession();
  if (!session.authorized) return unauthorizedResponse(session.reason);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = patchJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { data: current, error: fetchErr } = await session.supabase
    .from("import_jobs")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  const nextStl =
    parsed.data.stl_url !== undefined ? parsed.data.stl_url : current.stl_url;
  const baseExtracted = parseExtractedData(
    current.extracted_data,
    current.source_url,
    nextStl
  );

  const patch = parsed.data.extracted_data ?? {};
  const nextCover =
    patch.cover_image_url !== undefined
      ? patch.cover_image_url
      : baseExtracted.cover_image_url;
  const nextImages =
    patch.images !== undefined
      ? patch.images
      : nextCover
        ? [
            nextCover,
            ...baseExtracted.images.filter((url) => url !== nextCover),
          ]
        : baseExtracted.images;

  const mergedExtracted = {
    ...baseExtracted,
    ...patch,
    cover_image_url: nextCover,
    images: nextImages,
    stl_url: nextStl,
  };

  const { data: updated, error: updateErr } = await session.supabase
    .from("import_jobs")
    .update({
      stl_url: nextStl,
      extracted_data: mergedExtracted as unknown as Json,
    })
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: "Erro ao salvar edição da linha." },
      { status: 500 }
    );
  }

  const jobs = await enrichImportJobs(session.supabase, [updated]);
  return NextResponse.json({ job: jobs[0] });
}

export async function DELETE(request: Request) {
  const session = await verifyAdminSession();
  if (!session.authorized) return unauthorizedResponse(session.reason);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = deleteBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Lista de IDs inválida." },
      { status: 400 }
    );
  }

  const { error } = await session.supabase
    .from("import_jobs")
    .delete()
    .in("id", parsed.data.ids);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao remover itens da lista." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
