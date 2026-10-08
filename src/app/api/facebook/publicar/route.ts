import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import {
  FACEBOOK_GRAPH_HOST,
  FACEBOOK_GRAPH_VERSION,
  obtenerCredencialesFacebook,
} from "@/lib/facebook-credenciales";
import { normalizarFormato } from "../../instagram-card/render";
import { urlPublicaDeTarjeta } from "@/lib/tarjeta-publica";
import { armarTextoFacebook } from "@/lib/texto-facebook";
import { seccionSlug } from "@/lib/secciones";

// Subir la imagen y publicar puede tardar más que el timeout por defecto.
export const maxDuration = 30;

type RespuestaGraph = { id?: string; post_id?: string; permalink_url?: string; error?: { message?: string; code?: number } };

async function graphPost(path: string, params: URLSearchParams): Promise<{ ok: boolean; data: RespuestaGraph }> {
  const res = await fetch(`${FACEBOOK_GRAPH_HOST}/${FACEBOOK_GRAPH_VERSION}/${path}`, { method: "POST", body: params });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as RespuestaGraph };
}

function mensajeDeError(data: RespuestaGraph, porDefecto: string): string {
  // 190 = token inválido o vencido: lo único que lo arregla es volver a conectar.
  if (data.error?.code === 190) return "Facebook rechazó el token. Reconectá la Página desde Configuración → Facebook.";
  return data.error?.message || porDefecto;
}

export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const credenciales = await obtenerCredencialesFacebook();
  if (!credenciales) {
    return NextResponse.json(
      { ok: false, error: "Falta conectar Facebook: conectalo desde Configuración → Facebook." },
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

    const origen = process.env.NEXT_PUBLIC_SITE_URL || "https://neco-news-seven.vercel.app";
    const link = `${origen}/${seccionSlug(noticia.seccion)}/${noticia.slug}`;
    const message = armarTextoFacebook(noticia, link);

    const params = new URLSearchParams({ message, access_token: credenciales.token });
    let publicado: { ok: boolean; data: RespuestaGraph };
    if (modo === "enlace") {
      // Facebook arma la vista previa (imagen y título) desde la propia nota.
      params.set("link", link);
      publicado = await graphPost(`${credenciales.pageId}/feed`, params);
    } else {
      const imagen = await urlPublicaDeTarjeta(supabase, noticia, noticiaId, formato, imagenUrlEditada);
      if (!imagen.ok) {
        return NextResponse.json({ ok: false, error: imagen.error }, { status: 500 });
      }
      params.set("url", imagen.url);
      params.set("published", "true");
      publicado = await graphPost(`${credenciales.pageId}/photos`, params);
    }

    // En /photos, `post_id` es la publicación del muro y `id` la foto; en /feed solo viene `id` (la publicación).
    const postId = publicado.data.post_id || publicado.data.id;
    if (!publicado.ok || !postId) {
      console.error("facebook/publicar: Facebook rechazó la publicación", { modo, respuesta: publicado.data });
      return NextResponse.json(
        { ok: false, error: mensajeDeError(publicado.data, "Error publicando en Facebook") },
        { status: 502 }
      );
    }

    let permalink: string | null = null;
    try {
      const permaUrl = new URL(`${FACEBOOK_GRAPH_HOST}/${FACEBOOK_GRAPH_VERSION}/${postId}`);
      permaUrl.searchParams.set("fields", "permalink_url");
      permaUrl.searchParams.set("access_token", credenciales.token);
      const permaData = (await (await fetch(permaUrl.toString())).json()) as RespuestaGraph;
      permalink = permaData.permalink_url || null;
    } catch {
      // el permalink es un extra
    }
    // permalink_url viene relativo ("/pagina/posts/123") en algunas versiones del Graph.
    if (permalink && permalink.startsWith("/")) permalink = `https://www.facebook.com${permalink}`;
    if (!permalink) permalink = `https://www.facebook.com/${postId}`;

    const publicadoAt = new Date().toISOString();
    const { error: marcaError } = await supabase
      .from("noticias")
      .update({ facebook_publicado_at: publicadoAt, facebook_post_id: String(postId), facebook_permalink: permalink })
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
