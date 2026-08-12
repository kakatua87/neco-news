import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { renderInstagramCard, normalizarFormato } from "../../instagram-card/render";

const GRAPH_VERSION = "v21.0";

function seccionSlug(seccion: string): string {
  return (seccion || "local")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/\s+/g, "-");
}

export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const graphToken = process.env.INSTAGRAM_GRAPH_TOKEN;
  if (!igUserId || !graphToken) {
    return NextResponse.json(
      { ok: false, error: "Falta conectar Instagram: configurá INSTAGRAM_BUSINESS_ACCOUNT_ID e INSTAGRAM_GRAPH_TOKEN en las variables de entorno." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const noticiaId = body.noticiaId;
    const destino: "feed" | "historia" = body.destino === "historia" ? "historia" : "feed";
    const formato = normalizarFormato(body.formato);
    const imagenUrlEditada: string | undefined = body.imagenUrlEditada;

    if (!noticiaId) {
      return NextResponse.json({ ok: false, error: "Falta noticiaId" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error } = await supabase
      .from("noticias")
      .select("titulo, instagram_titulo, instagram_text, imagen_url, seccion, slug, estado")
      .eq("id", noticiaId)
      .single();

    if (error || !noticia || noticia.estado !== "publicada") {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }

    // Imagen: si ya viene editada/subida a Storage se usa esa URL; si no,
    // se genera la tarjeta ahora mismo y se sube a Storage — la API de
    // Instagram necesita una URL pública, y nuestra ruta de preview
    // requiere sesión de admin, así que no sirve pasársela directo.
    let imagenPublicaUrl = imagenUrlEditada;
    if (!imagenPublicaUrl) {
      const cardResponse = await renderInstagramCard(noticia, formato);
      const bytes = Buffer.from(await cardResponse.arrayBuffer());
      const path = `instagram-cards/${noticiaId}-${formato}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("noticias-imagenes")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (uploadError) {
        return NextResponse.json({ ok: false, error: `No se pudo preparar la imagen: ${uploadError.message}` }, { status: 500 });
      }
      const { data: publicUrlData } = supabase.storage.from("noticias-imagenes").getPublicUrl(path);
      imagenPublicaUrl = publicUrlData.publicUrl;
    }

    const origin = new URL(request.url).origin;
    const link = `${origin}/${seccionSlug(noticia.seccion)}/${noticia.slug}`;
    const caption = `${noticia.instagram_titulo || noticia.titulo}\n\n${noticia.instagram_text || ""}\n\n${link}`;

    // Paso 1: crear el contenedor de medio.
    const mediaParams = new URLSearchParams({
      image_url: imagenPublicaUrl,
      caption,
      access_token: graphToken,
    });
    if (destino === "historia") {
      mediaParams.set("media_type", "STORIES");
    }
    const crearRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`, {
      method: "POST",
      body: mediaParams,
    });
    const crearData = await crearRes.json();
    if (!crearRes.ok || !crearData.id) {
      return NextResponse.json(
        { ok: false, error: crearData?.error?.message || "Error creando el contenedor de Instagram" },
        { status: 502 }
      );
    }

    // Paso 2: publicar el contenedor.
    const publicarParams = new URLSearchParams({
      creation_id: crearData.id,
      access_token: graphToken,
    });
    const publicarRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`, {
      method: "POST",
      body: publicarParams,
    });
    const publicarData = await publicarRes.json();
    if (!publicarRes.ok || !publicarData.id) {
      return NextResponse.json(
        { ok: false, error: publicarData?.error?.message || "Error publicando en Instagram" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, publicacionId: publicarData.id });
  } catch (err) {
    console.error("Catch error in POST instagram/publicar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
