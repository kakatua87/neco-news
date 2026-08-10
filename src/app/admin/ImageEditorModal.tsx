"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  imageUrl: string;
  noticiaId: string | number;
  onApply: (newUrl: string) => void;
  onClose: () => void;
};

type AspectKey = "original" | "1:1" | "4:3" | "3:4" | "16:9";

const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "original", label: "Original", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "3:4", label: "3:4", ratio: 3 / 4 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
];

const FRAME_MAX_W = 480;
const FRAME_MAX_H = 420;
const OUTPUT_RES = 2; // multiplicador de resolución para exportar

export default function ImageEditorModal({ isOpen, imageUrl, noticiaId, onApply, onClose }: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aspectKey, setAspectKey] = useState<AspectKey>("original");
  const [rotation, setRotation] = useState(0); // 0 / 90 / 180 / 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [applying, setApplying] = useState(false);

  const imgElRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const proxiedUrl = useMemo(() => `/api/proxy-imagen?url=${encodeURIComponent(imageUrl)}`, [imageUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setNaturalSize(null);
    setLoadError(null);
    setAspectKey("original");
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
  }, [isOpen, imageUrl]);

  const aspectRatio = useMemo(() => {
    const found = ASPECTS.find(a => a.key === aspectKey);
    if (found?.ratio) return found.ratio;
    if (!naturalSize) return 1;
    const rotated = rotation % 180 !== 0;
    const w = rotated ? naturalSize.h : naturalSize.w;
    const h = rotated ? naturalSize.w : naturalSize.h;
    return w / h;
  }, [aspectKey, naturalSize, rotation]);

  const frame = useMemo(() => {
    let w = FRAME_MAX_W;
    let h = w / aspectRatio;
    if (h > FRAME_MAX_H) {
      h = FRAME_MAX_H;
      w = h * aspectRatio;
    }
    return { w, h };
  }, [aspectRatio]);

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    const rotated = rotation % 180 !== 0;
    const effW = rotated ? naturalSize.h : naturalSize.w;
    const effH = rotated ? naturalSize.w : naturalSize.h;
    return Math.max(frame.w / effW, frame.h / effH);
  }, [naturalSize, rotation, frame]);

  const scale = baseScale * zoom;

  // Recentrar el pan cuando cambia el marco (aspecto/rotación) para que la imagen no quede desencuadrada
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [aspectKey, rotation]);

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
    setZoom(z => {
      const next = Math.min(4, Math.max(1, z - e.deltaY * 0.0015));
      return next;
    });
  };

  useEffect(() => {
    setPan(p => clampPan(p, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const reset = () => {
    setAspectKey("original");
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
  };

  const filterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;

  const handleApply = async () => {
    const img = imgElRef.current;
    if (!img || !naturalSize) return;
    setApplying(true);
    try {
      const outW = Math.round(frame.w * OUTPUT_RES);
      const outH = Math.round(frame.h * OUTPUT_RES);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el canvas");

      ctx.translate(outW / 2, outH / 2);
      ctx.translate(pan.x * OUTPUT_RES, pan.y * OUTPUT_RES);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * OUTPUT_RES * (flipH ? -1 : 1), scale * OUTPUT_RES * (flipV ? -1 : 1));
      ctx.filter = filterCss;
      ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2, naturalSize.w, naturalSize.h);

      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), "image/jpeg", 0.92));
      if (!blob) throw new Error("No se pudo procesar la imagen (posible restricción de origen).");

      const formData = new FormData();
      formData.append("file", new File([blob], "editada.jpg", { type: "image/jpeg" }));
      formData.append("noticia_id", String(noticiaId));
      const res = await fetch("/api/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imagen_url) {
        onApply(data.imagen_url);
      } else {
        alert(`No se pudo guardar la imagen editada: ${data.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error editando la imagen.");
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[860px] max-h-[calc(100vh-1.5rem)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-ink">🖼️ Editar imagen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Área de recorte */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div
              className="relative overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f3f4f6_0%_50%)] bg-[length:16px_16px] rounded-lg border border-gray-300 touch-none select-none"
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
                onLoad={e => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setLoadError("No se pudo cargar la imagen para editarla.")}
                className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                style={{
                  width: naturalSize?.w,
                  height: naturalSize?.h,
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale * (flipH ? -1 : 1)}, ${scale * (flipV ? -1 : 1)})`,
                  filter: filterCss,
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">Arrastrá para mover · rueda del mouse para zoom</p>

            {/* Aspecto */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {ASPECTS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setAspectKey(a.key)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                    aspectKey === a.key
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controles */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Transformar</label>
              <div className="flex flex-wrap gap-2">
                <CtrlBtn label="↺ Rotar izq." onClick={() => setRotation(r => (r + 270) % 360)} />
                <CtrlBtn label="↻ Rotar der." onClick={() => setRotation(r => (r + 90) % 360)} />
                <CtrlBtn label="⇋ Espejar H" active={flipH} onClick={() => setFlipH(f => !f)} />
                <CtrlBtn label="⇵ Espejar V" active={flipV} onClick={() => setFlipV(f => !f)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Zoom ({zoom.toFixed(2)}x)
              </label>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ajustes</label>
              <SliderRow label="Brillo" value={brightness} onChange={setBrightness} min={50} max={150} />
              <SliderRow label="Contraste" value={contrast} onChange={setContrast} min={50} max={150} />
              <SliderRow label="Saturación" value={saturate} onChange={setSaturate} min={0} max={200} />
            </div>

            <button onClick={reset} className="text-xs text-gray-500 hover:text-ink underline self-start">
              Restablecer todo
            </button>
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
            {applying ? "Guardando..." : "✅ Aplicar cambios"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CtrlBtn({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors ${
        active ? "bg-accent text-white border-accent" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
