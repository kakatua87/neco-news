import sharp from "sharp";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderInstagramCard, normalizarFormato, type NoticiaParaTarjeta } from "@/app/api/instagram-card/render";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * URL pública de la tarjeta de una noticia, lista para pasársela a Instagram o Facebook.
 *
 * Si ya viene una imagen editada/subida a Storage se usa esa URL; si no, se genera la tarjeta ahora mismo y se
 * sube a Storage: las APIs de las redes necesitan una URL pública y la ruta de preview requiere sesión de admin.
 * Instagram solo acepta JPEG en image_url (PNG hace fallar el contenedor con "Media ID is not available" al
 * publicar) y next/og solo genera PNG, así que se convierte antes de subir.
 */
export async function urlPublicaDeTarjeta(
  supabase: SupabaseAdmin,
  noticia: NoticiaParaTarjeta,
  noticiaId: string | number,
  formatoParam: string | null,
  imagenUrlEditada?: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (imagenUrlEditada) return { ok: true, url: imagenUrlEditada };

  const formato = normalizarFormato(formatoParam);
  const cardResponse = await renderInstagramCard(noticia, formato);
  const pngBytes = Buffer.from(await cardResponse.arrayBuffer());
  const jpegBytes = await sharp(pngBytes).jpeg({ quality: 92 }).toBuffer();
  const path = `instagram-cards/${noticiaId}-${formato}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("noticias-imagenes")
    .upload(path, jpegBytes, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    return { ok: false, error: `No se pudo preparar la imagen: ${uploadError.message}` };
  }
  const { data } = supabase.storage.from("noticias-imagenes").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
