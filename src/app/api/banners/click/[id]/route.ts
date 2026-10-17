import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esBot, esUuid } from "@/lib/banner-tracking";
import { urlHttpSegura } from "@/lib/html";

// Cuenta el clic y redirige al destino del anunciante. El destino se lee SIEMPRE de la base
// (nunca de un parámetro), así que no sirve como redirección abierta.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const inicio = new URL("/", request.url);
  if (!esUuid(id)) return NextResponse.redirect(inicio);

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from("banners").select("url_destino").eq("id", id).maybeSingle();
    const destino = urlHttpSegura(data?.url_destino);
    if (!destino) return NextResponse.redirect(inicio);

    if (!esBot(request)) {
      const { error } = await supabase.rpc("banner_registrar", { p_banner: id, p_tipo: "clic" });
      if (error) console.error("No se pudo registrar el clic:", error.message);
    }
    const res = NextResponse.redirect(destino, 302);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  } catch (err) {
    console.error("Error en click de banner:", err);
    return NextResponse.redirect(inicio);
  }
}
