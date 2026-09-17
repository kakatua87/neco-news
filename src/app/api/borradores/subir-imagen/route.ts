import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Admin: sube tanto la imagen de portada como las imágenes insertadas
// dentro del cuerpo desde el editor de la pestaña "Redacción".
export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Falta el archivo" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado. Usá JPG, PNG, WEBP o GIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "La imagen pesa demasiado (máx 8MB)." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const supabase = createSupabaseAdminClient();
    const nombreAleatorio = Math.random().toString(36).slice(2, 10);
    const path = `redaccion/${Date.now()}-${nombreAleatorio}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("noticias-imagenes")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("noticias-imagenes").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error("Catch error in POST borradores/subir-imagen:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
