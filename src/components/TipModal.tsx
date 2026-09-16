"use client";

import { useState } from "react";

type Archivo = { url: string; tipo: string; nombre: string };

const CATEGORIAS = [
  { key: "Denuncia", emoji: "🚨", placeholder: "Contanos qué pasó, dónde y cuándo lo viste..." },
  { key: "Dato/Info", emoji: "📰", placeholder: "Qué información querés compartir?" },
  { key: "Evento", emoji: "📅", placeholder: "Qué evento es, dónde y cuándo es?" },
  { key: "Foto/Video", emoji: "📷", placeholder: "Contanos qué muestra la foto o el video que vas a adjuntar..." },
  { key: "Obituario", emoji: "🕯", placeholder: "Nombre completo, edad, y datos del velorio/despedida..." },
  { key: "Otro", emoji: "✍️", placeholder: "Contanos qué querés compartir..." },
];

export default function TipModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const categoriaInfo = CATEGORIAS.find((c) => c.key === categoria);

  const handleArchivos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/tips/subir-archivo", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "No se pudo subir el archivo");
          continue;
        }
        setArchivos((prev) => [...prev, { url: data.url, tipo: data.tipo, nombre: data.nombre }]);
      }
    } finally {
      setSubiendo(false);
    }
  };

  const quitarArchivo = (url: string) => {
    setArchivos((prev) => prev.filter((a) => a.url !== url));
  };

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, categoria, mensaje, archivos }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo enviar. Probá de nuevo.");
        return;
      }
      setEnviado(true);
    } catch {
      setError("No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-[#25D366] text-white">
          <h2 className="font-bold">Contanos tu info</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-white/90 hover:text-white text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {enviado ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-bold text-ink mb-1">¡Gracias por tu aporte!</p>
              <p className="text-sm text-muted">
                Tu info llegó a la redacción. Si hace falta, te contactamos.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full bg-accent hover:bg-accent-dark text-white font-medium rounded-lg px-4 py-2.5"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted mb-2">¿Qué tipo de info querés mandar?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => {
                          setCategoria(c.key);
                          setStep(2);
                        }}
                        className="flex flex-col items-center gap-1 border border-border rounded-xl p-4 hover:border-accent hover:bg-accent/5 transition-colors"
                      >
                        <span className="text-2xl">{c.emoji}</span>
                        <span className="text-sm font-medium text-ink">{c.key}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    {categoriaInfo?.emoji} {categoria}
                  </p>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder={categoriaInfo?.placeholder}
                    rows={6}
                    className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <div className="flex justify-between gap-2">
                    <button onClick={() => setStep(1)} className="text-sm text-muted hover:text-ink px-3 py-2">
                      ← Volver
                    </button>
                    <button
                      disabled={mensaje.trim().length < 10}
                      onClick={() => setStep(3)}
                      className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-white font-medium rounded-lg px-5 py-2 text-sm"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">¿Tenés fotos, videos o un PDF para adjuntar? (opcional)</p>
                  <label className="flex items-center justify-center border-2 border-dashed border-border-strong rounded-xl p-6 cursor-pointer hover:border-accent transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleArchivos(e.target.files)}
                    />
                    <span className="text-sm text-muted">
                      {subiendo ? "Subiendo..." : "📎 Elegir archivos"}
                    </span>
                  </label>
                  {archivos.length > 0 && (
                    <ul className="space-y-1">
                      {archivos.map((a) => (
                        <li key={a.url} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="truncate">{a.nombre}</span>
                          <button onClick={() => quitarArchivo(a.url)} className="text-red-500 hover:text-red-700 ml-2">
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex justify-between gap-2">
                    <button onClick={() => setStep(2)} className="text-sm text-muted hover:text-ink px-3 py-2">
                      ← Volver
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="bg-accent hover:bg-accent-dark text-white font-medium rounded-lg px-5 py-2 text-sm"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Datos de contacto (opcional, por si necesitamos confirmar algo)</p>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Tu teléfono"
                    className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex justify-between gap-2">
                    <button onClick={() => setStep(3)} className="text-sm text-muted hover:text-ink px-3 py-2">
                      ← Volver
                    </button>
                    <button
                      disabled={enviando}
                      onClick={enviar}
                      className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-white font-medium rounded-lg px-5 py-2 text-sm"
                    >
                      {enviando ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
