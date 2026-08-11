"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { FORMATOS, type FormatoKey } from "./instagramFormatos";

type Props = {
  isOpen: boolean;
  formato: FormatoKey;
  seccion: string;
  imagenUrl: string;
  tituloInicial: string;
  onApply: (newUrl: string) => void;
  onClose: () => void;
};

const ACCENT = "#1B8B7A";
const CHARCOAL = "#111827";
const FRAME_MAX_W = 380;
const FRAME_MAX_H = 460;

export default function InstagramCardEditor({ isOpen, formato, seccion, imagenUrl, tituloInicial, onApply, onClose }: Props) {
  const f = FORMATOS.find((x) => x.key === formato)!;
  const headerAlto = Math.round(f.alto * 0.09);
  const photoW = f.ancho;
  const photoH = f.alto - headerAlto;
  const photoAspect = photoW / photoH;

  const [titulo, setTitulo] = useState(tituloInicial);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);

  const imgElRef = useRef<HTMLImageElement>(null);
  const logoElRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const proxiedUrl = useMemo(() => `/api/proxy-imagen?url=${encodeURIComponent(imagenUrl)}`, [imagenUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setTitulo(tituloInicial);
    setNaturalSize(null);
    setLoadError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [isOpen, imagenUrl, tituloInicial]);

  const frame = useMemo(() => {
    let w = FRAME_MAX_W;
    let h = w / photoAspect;
    if (h > FRAME_MAX_H) {
      h = FRAME_MAX_H;
      w = h * photoAspect;
    }
    return { w, h };
  }, [photoAspect]);

  const headerPreviewH = frame.w * (headerAlto / photoW);

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    return Math.max(frame.w / naturalSize.w, frame.h / naturalSize.h);
  }, [naturalSize, frame]);

  const scale = baseScale * zoom;

  const clampPan = useCallback(
    (p: { x: number; y: number }, s: number) => {
      if (!naturalSize) return p;
      const w = naturalSize.w * s;
      const h = naturalSize.h * s;
      const maxX = Math.max(0, (w - frame.w) / 2);
      const maxY = Math.max(0, (h - frame.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
    },
    [naturalSize, frame]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setPan(clampPan({ x: draggingRef.current.panX + dx, y: draggingRef.current.panY + dy }, scale));
  };
  const onPointerUp = () => {
    draggingRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)));
  };

  useEffect(() => {
    setPan((p) => clampPan(p, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Envuelve el título en líneas que entren en el ancho disponible.
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const handleApply = async () => {
    const img = imgElRef.current;
    const logo = logoElRef.current;
    if (!img || !naturalSize || !logo) return;
    setApplying(true);
    try {
      const outW = f.ancho;
      const outH = f.alto;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el canvas");

      // Fondo
      ctx.fillStyle = CHARCOAL;
      ctx.fillRect(0, 0, outW, outH);

      // Franja de marca + logo
      ctx.fillStyle = ACCENT;
      ctx.fillRect(0, 0, outW, headerAlto);
      const logoH = Math.round(headerAlto * 0.6);
      const logoW = logoH * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, 40, (headerAlto - logoH) / 2, logoW, logoH);

      // Foto (recorte/zoom/pan del usuario), en el área debajo de la franja
      const exportRes = outW / frame.w;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, headerAlto, outW, outH - headerAlto);
      ctx.clip();
      ctx.translate(outW / 2, headerAlto + (outH - headerAlto) / 2);
      ctx.translate(pan.x * exportRes, pan.y * exportRes);
      ctx.scale(scale * exportRes, scale * exportRes);
      ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2, naturalSize.w, naturalSize.h);
      ctx.restore();

      // Badge de sección
      const badgeFontSize = formato === "historia" ? 26 : 22;
      ctx.font = `800 ${badgeFontSize}px Inter, sans-serif`;
      const badgeText = seccion.toUpperCase();
      const badgePadX = 24;
      const badgeTextW = ctx.measureText(badgeText).width;
      const badgeW = badgeTextW + badgePadX * 2;
      const badgeH = badgeFontSize + 20;
      const badgeX = 32;
      const badgeY = headerAlto + 32;
      ctx.fillStyle = ACCENT;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH / 2 + 1);

      // Bloque de título con degradado
      const tituloFontSize = formato === "historia" ? 56 : 48;
      const paddingInferior = formato === "historia" ? 220 : 60;
      const lineHeight = tituloFontSize * 1.25;
      ctx.font = `800 ${tituloFontSize}px Inter, sans-serif`;
      const maxTextWidth = outW - 80;
      const lines = wrapText(ctx, titulo, maxTextWidth);
      const blockH = lines.length * lineHeight + 60 + paddingInferior;
      const blockY = outH - blockH;
      const gradient = ctx.createLinearGradient(0, blockY, 0, outH);
      gradient.addColorStop(0, "rgba(17,24,39,0)");
      gradient.addColorStop(0.3, CHARCOAL);
      gradient.addColorStop(1, CHARCOAL);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, blockY, outW, blockH);

      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, 40, blockY + 60 + i * lineHeight);
      });

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
      if (!blob) throw new Error("No se pudo procesar la imagen.");

      const formData = new FormData();
      formData.append("file", new File([blob], `instagram-${formato}.jpg`, { type: "image/jpeg" }));
      const res = await fetch("/api/instagram-card/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imagen_url) {
        onApply(data.imagen_url);
      } else {
        alert(`No se pudo guardar la imagen: ${data.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error editando la tarjeta.");
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[calc(100vh-1.5rem)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-ink">🖼️ Editar tarjeta — {FORMATOS.find((x) => x.key === formato)?.label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="rounded-lg overflow-hidden border border-gray-300" style={{ width: frame.w }}>
              {/* Franja de marca (no interactiva) */}
              <div
                className="flex items-center px-3"
                style={{ height: headerPreviewH, backgroundColor: ACCENT }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={logoElRef} src="/logo-oficial.png" alt="" style={{ height: headerPreviewH * 0.6 }} className="object-contain" crossOrigin="anonymous" />
              </div>

              {/* Área de foto (recorte interactivo) */}
              <div
                className="relative overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f3f4f6_0%_50%)] bg-[length:16px_16px] touch-none select-none"
                style={{ width: frame.w, height: frame.h, cursor: draggingRef.current ? "grabbing" : "grab" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
              >
                {loadError && (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-red-500 p-4">
                    {loadError}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgElRef}
                  src={proxiedUrl}
                  alt=""
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  onError={() => setLoadError("No se pudo cargar la imagen.")}
                  className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                  style={{
                    width: naturalSize?.w,
                    height: naturalSize?.h,
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  }}
                />

                {/* Overlays no interactivos: badge y título, para previsualizar el resultado */}
                <div
                  className="absolute pointer-events-none text-white font-extrabold uppercase tracking-wider rounded"
                  style={{
                    top: frame.w * (32 / photoW),
                    left: frame.w * (32 / photoW),
                    backgroundColor: ACCENT,
                    padding: `${frame.w * (10 / photoW)}px ${frame.w * (24 / photoW)}px`,
                    fontSize: frame.w * ((formato === "historia" ? 26 : 22) / photoW),
                  }}
                >
                  {seccion}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 pointer-events-none text-white font-extrabold leading-tight"
                  style={{
                    padding: `${frame.w * (60 / photoW)}px ${frame.w * (40 / photoW)}px ${frame.w * ((formato === "historia" ? 220 : 60) / photoW)}px`,
                    fontSize: frame.w * ((formato === "historia" ? 56 : 48) / photoW),
                    backgroundImage: `linear-gradient(to top, ${CHARCOAL} 30%, transparent)`,
                  }}
                >
                  {titulo}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center">Arrastrá la foto para mover · rueda del mouse para zoom</p>
          </div>

          {/* Controles */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Título superpuesto
              </label>
              <textarea
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Zoom foto ({zoom.toFixed(2)}x)
              </label>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-ink hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !naturalSize}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {applying ? "Guardando..." : "✅ Usar esta tarjeta"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
