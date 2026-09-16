import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

// Admin: pide al scraper que redacte una nota a partir del envío ciudadano
// (mismo patrón que /api/noticias/raw/procesar, que proxea a /procesar-grupo).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const provider: string | undefined = body.provider;

  const supabase = createSupabaseAdminClient();
  const { data: envio, error: fetchError } = await supabase
    .from("envios_ciudadanos")
    .select("mensaje, categoria, nombre, archivos")
    .eq("id", id)
    .single();

  if (fetchError || !envio) {
    return NextResponse.json({ ok: false, error: "Envío no encontrado" }, { status: 404 });
  }

  const imagenesUrls = (envio.archivos || [])
    .filter((a: { tipo?: string }) => a.tipo?.startsWith("image/"))
    .map((a: { url: string }) => a.url);

  try {
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const res = await fetch(`${SCRAPER_URL}/procesar-tip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        mensaje: envio.mensaje,
        categoria: envio.categoria,
        contacto_nombre: envio.nombre,
        imagenes_urls: imagenesUrls,
        provider,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(data, { status: res.ok ? 400 : res.status });
    }

    const { error: updateError } = await supabase
      .from("envios_ciudadanos")
      .update({ borrador: data, estado: "en_revision", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("Error guardando borrador:", updateError);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error proxying tip to scraper:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
