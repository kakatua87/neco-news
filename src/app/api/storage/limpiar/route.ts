import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import {
  REGLAS,
  encontrarHuerfanos,
  enTandas,
  resumirPorCarpeta,
  type ArchivoStorage,
} from "@/lib/storage-huerfanos";

export const maxDuration = 60;

/** Tope por pasada: si hay más, se vuelve a correr (así una pasada nunca borra "de golpe" miles de archivos). */
const MAX_BORRADOS_POR_PASADA = 500;
const POR_PAGINA = 1000;

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

async function listar(supabase: SupabaseAdmin, bucket: string, prefijo: string): Promise<ArchivoStorage[]> {
  const carpeta = prefijo.replace(/\/$/, "");
  const archivos: ArchivoStorage[] = [];
  for (let offset = 0; ; offset += POR_PAGINA) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(carpeta, { limit: POR_PAGINA, offset, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw new Error(`No se pudo listar ${bucket}/${carpeta}: ${error.message}`);
    for (const o of data ?? []) {
      if (!o.id) continue; // es una subcarpeta
      archivos.push({
        bucket,
        nombre: `${carpeta}/${o.name}`,
        creadoEn: o.created_at ?? null,
        bytes: Number(o.metadata?.size ?? 0),
      });
    }
    if (!data || data.length < POR_PAGINA) break;
  }
  return archivos;
}

/**
 * Todo el texto donde puede aparecer la URL de un archivo: imagen de portada y cuerpo de las notas,
 * borradores de redacción, banners y adjuntos de envíos ciudadanos. Si CUALQUIER lectura falla se lanza
 * un error y no se borra nada: borrar con referencias incompletas es lo peor que puede pasar acá.
 */
async function textoDeReferencias(supabase: SupabaseAdmin): Promise<string> {
  const partes: string[] = [];
  const leer = async (tabla: string, columnas: string) => {
    for (let desde = 0; ; desde += POR_PAGINA) {
      const { data, error } = await supabase
        .from(tabla)
        .select(columnas)
        .order("id")
        .range(desde, desde + POR_PAGINA - 1);
      if (error) throw new Error(`No se pudieron leer las referencias de ${tabla}: ${error.message}`);
      partes.push(JSON.stringify(data));
      if (!data || data.length < POR_PAGINA) break;
    }
  };
  await leer("noticias", "imagen_url, cuerpo");
  await leer("borradores_redaccion", "imagen_portada_url, contenido_html");
  await leer("banners", "imagen_url, codigo_html");
  await leer("envios_ciudadanos", "archivos");
  return partes.join("\n");
}

async function ejecutar(aplicar: boolean) {
  const supabase = createSupabaseAdminClient();
  try {
    const referencias = await textoDeReferencias(supabase);
    const archivos = (await Promise.all(REGLAS.map((r) => listar(supabase, r.bucket, r.prefijo)))).flat();
    const huerfanos = encontrarHuerfanos(archivos, referencias);
    const resumen = resumirPorCarpeta(archivos, huerfanos);

    let eliminados = 0;
    if (aplicar) {
      const aBorrar = huerfanos.slice(0, MAX_BORRADOS_POR_PASADA);
      const porBucket = new Map<string, string[]>();
      for (const h of aBorrar) porBucket.set(h.bucket, [...(porBucket.get(h.bucket) ?? []), h.nombre]);
      for (const [bucket, rutas] of porBucket) {
        for (const tanda of enTandas(rutas, 100)) {
          const { data, error } = await supabase.storage.from(bucket).remove(tanda);
          if (error) throw new Error(`No se pudo borrar en ${bucket}: ${error.message}`);
          eliminados += data?.length ?? 0;
        }
      }
      console.log(`storage/limpiar: ${eliminados} archivo(s) eliminados`);
    }

    return NextResponse.json({
      ok: true,
      aplicado: aplicar,
      resumen,
      total_huerfanos: huerfanos.length,
      bytes_huerfanos: huerfanos.reduce((s, h) => s + h.bytes, 0),
      eliminados,
      quedan: huerfanos.length - eliminados,
      muestra: huerfanos.slice(0, 30).map((h) => ({ bucket: h.bucket, nombre: h.nombre, bytes: h.bytes, creado_en: h.creadoEn })),
    });
  } catch (err) {
    console.error("storage/limpiar:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo revisar el almacenamiento. No se borró nada." },
      { status: 500 }
    );
  }
}

// Simulación: admin o cron (Bearer CRON_SECRET). Nunca borra.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const esCron = !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!esCron && !(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return ejecutar(false);
}

// Borrado: solo un admin, y solo con { "aplicar": true } explícito.
export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  return ejecutar(body?.aplicar === true);
}
