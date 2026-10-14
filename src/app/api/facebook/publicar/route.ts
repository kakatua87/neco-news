import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { normalizarFormato } from "../../instagram-card/render";
import { urlPublicaDeTarjeta } from "@/lib/tarjeta-publica";
import { armarTextoFacebook } from "@/lib/texto-facebook";
import { seccionSlug } from "@/lib/secciones";

// Subir la imagen y esperar a Make puede tardar más que el timeout por defecto.
export const maxDuration = 30;

type RespuestaMake = { ok?: boolean; postId?: string | number; error?: string };

/**
 * Facebook se publica a través de Make (escenario "Neco Beat - publicar nota en Facebook"),
 * que usa su propia app de Meta ya aprobada: los posts hechos con la app Necopublish en modo
 * desarrollo solo los ven las cuentas con rol. Make responde con el id de la publicación.
 */
export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Falta configurar MAKE_FACEBOOK_WEBHOOK_URL en el servidor." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const noticiaId = body.noticiaId;
    const modo: "foto" | "enlace" = body.modo === "enlace" ? "enlace" : "foto";
    // La tarjeta de historia es vertical 9:16 y en el muro de Facebook queda mal: se usa el cuadrado.
    const formatoPedido = normalizarFormato(body.formato);
    const formato = formatoPedido === "historia" ? "cuadrado" : formatoPedido;
    const imagenUrlEditada: string | undefined = body.imagenUrlEditada;
    const forzar = body.forzar === true;

    if (!noticiaId) {
      return NextResponse.json({ ok: false, error: "Falta noticiaId" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error } = await supabase
      .from("noticias")
      .select("titulo, instagram_titulo, instagram_text, imagen_url, seccion, slug, estado, facebook_publicado_at")
      .eq("id", noticiaId)
      .single();

    if (error || !noticia || noticia.estado !== "publicada") {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }
    if (noticia.facebook_publicado_at && !forzar) {
      return NextResponse.json(
        { ok: false, yaPublicada: true, error: "Esta noticia ya se publicó en Facebook." },
        { status: 409 }
      );
    }

    const origen = process.env.NEXT_PUBLIC_SITE_URL || "https://necobeat.com.ar";
    const link = `${origen}/${seccionSlug(noticia.seccion)}/${noticia.slug}`;
    const mensaje = armarTextoFacebook(noticia, link);

    let imagenUrl = "";
    if (modo === "foto") {
      const imagen = await urlPublicaDeTarjeta(supabase, noticia, noticiaId, formato, imagenUrlEditada);
      if (!imagen.ok) {
        return NextResponse.json({ ok: false, error: imagen.error }, { status: 500 });
      }
      imagenUrl = imagen.url;
    }

    const respuesta = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, mensaje, link, imagenUrl }),
      signal: AbortSignal.timeout(25_000),
    });
    const texto = await respuesta.text();
    let datos: RespuestaMake = {};
    try {
      datos = JSON.parse(texto) as RespuestaMake;
    } catch {
      // Make respondió algo que no es JSON (p. ej. "Accepted"): no hay id de publicación.
    }

    const postId = datos.postId ? String(datos.postId) : "";
    if (!respuesta.ok || datos.ok === false || !postId) {
      console.error("facebook/publicar: Make no confirmó la publicación", { status: respuesta.status, texto });
      return NextResponse.json(
        { ok: false, error: datos.error || "Make no confirmó la publicación en Facebook. Revisá el escenario en Make." },
        { status: 502 }
      );
    }

    const permalink = `https://www.facebook.com/${postId}`;
    const publicadoAt = new Date().toISOString();
    const { error: marcaError } = await supabase
      .from("noticias")
      .update({ facebook_publicado_at: publicadoAt, facebook_post_id: postId, facebook_permalink: permalink })
      .eq("id", noticiaId);
    if (marcaError) console.error("facebook/publicar: no se pudo guardar la marca de publicada:", marcaError.message);

    return NextResponse.json({
      ok: true,
      publicacionId: postId,
      permalink,
      publicadoAt: marcaError ? null : publicadoAt,
      avisoMarca: marcaError ? "Se publicó, pero no se pudo guardar la marca de publicada." : undefined,
    });
  } catch (err) {
    console.error("Catch error in POST facebook/publicar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
