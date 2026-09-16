import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TIPOS: Record<string, { extension: string; maxBytes: number }> = {
  "image/jpeg": { extension: "jpg", maxBytes: 8 * 1024 * 1024 },
  "image/png": { extension: "png", maxBytes: 8 * 1024 * 1024 },
  "image/webp": { extension: "webp", maxBytes: 8 * 1024 * 1024 },
  "image/gif": { extension: "gif", maxBytes: 8 * 1024 * 1024 },
  "application/pdf": { extension: "pdf", maxBytes: 15 * 1024 * 1024 },
  "video/mp4": { extension: "mp4", maxBytes: 60 * 1024 * 1024 },
  "video/quicktime": { extension: "mov", maxBytes: 60 * 1024 * 1024 },
  "video/webm": { extension: "webm", maxBytes: 60 * 1024 * 1024 },
  "audio/mpeg": { extension: "mp3", maxBytes: 20 * 1024 * 1024 },
  "audio/mp4": { extension: "m4a", maxBytes: 20 * 1024 * 1024 },
  "audio/ogg": { extension: "ogg", maxBytes: 20 * 1024 * 1024 },
  "audio/webm": { extension: "weba", maxBytes: 20 * 1024 * 1024 },
  "audio/wav": { extension: "wav", maxBytes: 20 * 1024 * 1024 },
};

// Endpoint público (sin esAdmin): lo usa el formulario web de envíos ciudadanos
// para subir fotos/videos/PDF antes de mandar el envío con POST /api/tips.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Falta el archivo" }, { status: 400 });
    }

    const tipo = TIPOS[file.type];
    if (!tipo) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado. Usá imagen, video, audio o PDF." },
        { status: 400 }
      );
    }
    if (file.size > tipo.maxBytes) {
      return NextResponse.json(
        { ok: false, error: `El archivo pesa demasiado (máx ${Math.round(tipo.maxBytes / (1024 * 1024))}MB).` },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const supabase = createSupabaseAdminClient();
    const nombreAleatorio = Math.random().toString(36).slice(2, 10);
    const path = `envios/${Date.now()}-${nombreAleatorio}.${tipo.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("tips-ciudadanos")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("tips-ciudadanos").getPublicUrl(path);
    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
      tipo: file.type,
      nombre: file.name,
    });
  } catch (err: any) {
    console.error("Catch error in POST tips/subir-archivo:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
