import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

// ─── Auth guard ─────────────────────────────────────────────────
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  return token === process.env.NEWSLETTER_SECRET;
}

// ─── HTML template ──────────────────────────────────────────────
function buildEmailHtml(
  notas: Array<{ titulo: string; resumen_seo: string; slug: string; seccion: string; imagen_url: string | null }>,
  resumenIA: string,
  baseUrl: string
): string {
  const notasHtml = notas
    .map((n) => {
      const seccionSlug = (n.seccion ?? "local")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
      const url = `${baseUrl}/${seccionSlug}/${n.slug}`;
      const img = n.imagen_url
        ? `<img src="${n.imagen_url}" alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px;" />`
        : "";

      return `
        <div style="margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid #e5e7eb;">
          ${img}
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#d72b3f;">${n.seccion}</span>
          <h2 style="margin:8px 0 10px;font-size:20px;line-height:1.3;color:#111827;">${n.titulo}</h2>
          <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.6;">${n.resumen_seo ?? ""}</p>
          <a href="${url}" style="display:inline-block;padding:8px 20px;background:#d72b3f;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">Leer nota →</a>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    
    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">Neco News</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.5);font-size:13px;">Resumen semanal de noticias de Necochea</p>
    </div>

    <!-- AI summary -->
    <div style="padding:24px 32px;background:#fef2f2;border-bottom:1px solid #fecdd3;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#d72b3f;">✍ Análisis editorial de la semana</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">${resumenIA}</p>
    </div>

    <!-- Notes -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 24px;font-size:16px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.05em;">Las 5 noticias de la semana</h2>
      ${notasHtml}
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Recibís este email porque te suscribiste a Neco News.<br/>
        <a href="${baseUrl}" style="color:#d72b3f;">Ver portal completo</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler ────────────────────────────────────────────────────
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neco-news.vercel.app";

  // 1. Fetch 5 notas más recientes de la semana
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: notas, error: notasError } = await supabase
    .from("noticias")
    .select("titulo, resumen_seo, slug, seccion, imagen_url, cuerpo")
    .eq("estado", "publicada")
    .gte("fecha_publicacion", weekAgo.toISOString())
    .order("fecha_publicacion", { ascending: false })
    .limit(5);

  if (notasError || !notas || notas.length === 0) {
    return NextResponse.json({ ok: false, error: "Sin notas para enviar" }, { status: 404 });
  }

  // 2. Generar resumen editorial con IA
  let resumenIA = "Esta semana, Neco News cubrió los hechos más relevantes de Necochea y la región.";
  try {
    const groq = new OpenAI({
      apiKey: process.env.AI_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });

    const notasTexto = notas
      .map((n, i) => `${i + 1}. ${n.titulo}: ${(n.resumen_seo || n.cuerpo || "").slice(0, 150)}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Generá un resumen editorial de estas 5 noticias de Necochea de esta semana. Tono periodístico, claro, conciso. Incluí un párrafo de cierre con perspectiva local. Formato: texto plano, sin HTML. Máximo 200 palabras.\n\n${notasTexto}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    resumenIA = completion.choices[0]?.message?.content?.trim() ?? resumenIA;
  } catch (aiErr) {
    console.error("Error generando resumen IA:", aiErr);
  }

  // 3. Fetch suscriptores activos
  const { data: suscriptores, error: subsError } = await supabase
    .from("suscriptores")
    .select("email")
    .eq("activo", true);

  if (subsError || !suscriptores || suscriptores.length === 0) {
    return NextResponse.json({ ok: false, error: "Sin suscriptores activos" }, { status: 404 });
  }

  // 4. Construir HTML y enviar con Resend
  const htmlContent = buildEmailHtml(notas as any, resumenIA, baseUrl);
  const recipients = suscriptores.map((s) => s.email);

  const semana = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.NEWSLETTER_FROM ?? "Neco News <noticias@necocheanews.com.ar>",
      to: recipients,
      subject: `📰 Neco News — Resumen semanal ${semana}`,
      html: htmlContent,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.json();
    console.error("Resend error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Error Resend" }, { status: 500 });
  }

  console.log(`Newsletter enviado a ${recipients.length} suscriptores.`);
  return NextResponse.json({ ok: true, enviados: recipients.length });
}
