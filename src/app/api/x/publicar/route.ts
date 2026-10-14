import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { normalizarFormato } from "../../instagram-card/render";
import { urlPublicaDeTarjeta } from "@/lib/tarjeta-publica";
import { armarTextoX } from "@/lib/texto-x";
import { seccionSlug } from "@/lib/secciones";
import { X_API, tokenVigenteX } from "@/lib/x-credenciales";

export const maxDuration = 45;

type RespuestaX = { data?: { id?: string }; title?: string; detail?: string; errors?: { message?: string }[] };

function mensajeError(r: RespuestaX, defecto: string): string {
  return r.detail || r.errors?.[0]?.message || r.title || defecto;
}

export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const noticiaId = body.noticiaId;
    // La tarjeta de historia es vertical 9:16: en el timeline de X se recorta, se usa el cuadrado.
    const formatoPedido = normalizarFormato(body.formato);
    const formato = formatoPedido === "historia" ? "cuadrado" : formatoPedido;
    const imagenUrlEditada: string | undefined = body.imagenUrlEditada;
    const forzar = body.forzar === true;

    if (!noticiaId) {
      return NextResponse.json({ ok: false, error: "Falta noticiaId" }, { status: 400 });
    }

    const cred = await tokenVigenteX();
    if (!cred) {
      return NextResponse.json(
        { ok: false, error: "X no está conectado (o el token venció). Reconectalo desde Configuración." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error } = await supabase
      .from("noticias")
      .select("titulo, twitter_text, instagram_titulo, instagram_text, imagen_url, seccion, slug, estado, x_publicado_at")
      .eq("id", noticiaId)
      .single();

    if (error || !noticia || noticia.estado !== "publicada") {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }
    if (noticia.x_publicado_at && !forzar) {
      return NextResponse.json({ ok: false, yaPublicada: true, error: "Esta noticia ya se publicó en X." }, { status: 409 });
    }

    const origen = process.env.NEXT_PUBLIC_SITE_URL || "https://necobeat.com.ar";
    const link = `${origen}/${seccionSlug(noticia.seccion)}/${noticia.slug}`;
    const texto = armarTextoX(noticia, link);

    // 1) Subir la tarjeta como imagen del tuit.
    const imagen = await urlPublicaDeTarjeta(supabase, noticia, noticiaId, formato, imagenUrlEditada);
    if (!imagen.ok) {
      return NextResponse.json({ ok: false, error: imagen.error }, { status: 500 });
    }
    const archivo = await fetch(imagen.url, { signal: AbortSignal.timeout(15_000) });
    if (!archivo.ok) {
      return NextResponse.json({ ok: false, error: "No se pudo descargar la tarjeta para subirla a X." }, { status: 502 });
    }
    const bytes = await archivo.arrayBuffer();

    const form = new FormData();
    form.set("media", new Blob([bytes], { type: "image/jpeg" }), "tarjeta.jpg");
    form.set("media_category", "tweet_image");
    form.set("media_type", "image/jpeg");
    const subida = await fetch(`${X_API}/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.token}` },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
    const subidaJson = (await subida.json().catch(() => ({}))) as RespuestaX;
    const mediaId = subidaJson.data?.id;
    if (!subida.ok || !mediaId) {
      console.error("x/publicar: falló la subida de imagen", { status: subida.status, subidaJson });
      return NextResponse.json({ ok: false, error: mensajeError(subidaJson, "X rechazó la imagen.") }, { status: 502 });
    }

    // 2) Publicar el tuit.
    const tuit = await fetch(`${X_API}/tweets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto, media: { media_ids: [mediaId] } }),
      signal: AbortSignal.timeout(20_000),
    });
    const tuitJson = (await tuit.json().catch(() => ({}))) as RespuestaX;
    const postId = tuitJson.data?.id;
    if (!tuit.ok || !postId) {
      console.error("x/publicar: falló el tuit", { status: tuit.status, tuitJson });
      return NextResponse.json({ ok: false, error: mensajeError(tuitJson, "X no confirmó la publicación.") }, { status: 502 });
    }

    const permalink = `https://x.com/${cred.username || "i"}/status/${postId}`;
    const publicadoAt = new Date().toISOString();
    const { error: marcaError } = await supabase
      .from("noticias")
      .update({ x_publicado_at: publicadoAt, x_post_id: postId, x_permalink: permalink })
      .eq("id", noticiaId);
    if (marcaError) console.error("x/publicar: no se pudo guardar la marca de publicada:", marcaError.message);

    return NextResponse.json({
      ok: true,
      publicacionId: postId,
      permalink,
      publicadoAt: marcaError ? null : publicadoAt,
      avisoMarca: marcaError ? "Se publicó, pero no se pudo guardar la marca de publicada." : undefined,
    });
  } catch (err) {
    console.error("Catch error in POST x/publicar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
