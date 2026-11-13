import { NextResponse } from "next/server";
import sharp from "sharp";
import { verifyAdminSession } from "@/lib/auth/admin";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = formData.get("folder");
    const folder =
      typeof folderRaw === "string" && /^[a-z0-9-]+$/i.test(folderRaw)
        ? folderRaw
        : "uploads";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem enviado." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Envie WebP, JPEG ou PNG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 5 MB." },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();

    const fileName = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;

    const { error: uploadError } = await session.supabase.storage
      .from("products")
      .upload(fileName, processedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Erro ao enviar imagem para o Storage." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = session.supabase.storage.from("products").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Falha ao processar a imagem enviada." },
      { status: 500 }
    );
  }
}
