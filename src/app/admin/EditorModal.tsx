"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Props = {
  isOpen: boolean;
  noticiaId: string | number;
  titulo: string;
  cuerpo: string;
  seccion: string;
  imagenUrl: string | null;
  onSave: (titulo: string, cuerpo: string, imagenUrl: string | null) => void;
  onClose: () => void;
};

export default function EditorModal({ isOpen, noticiaId, titulo, cuerpo, seccion, imagenUrl, onSave, onClose }: Props) {
  const [editTitulo, setEditTitulo] = useState(titulo);
  const [editImagen, setEditImagen] = useState(imagenUrl);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageInputUrl, setImageInputUrl] = useState("");
  const [generandoImagen, setGenerandoImagen] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subirImagenDesdeArchivo = async (file: File) => {
    setSubiendoImagen(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noticia_id", String(noticiaId));
      const res = await fetch("/api/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imagen_url) {
        setEditImagen(data.imagen_url);
      } else {
        alert(`No se pudo subir la imagen: ${data.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión subiendo la imagen.");
    } finally {
      setSubiendoImagen(false);
    }
  };

  const generarImagenIA = async () => {
    setGenerandoImagen(true);
    try {
      const res = await fetch("/api/generar-imagen-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticia_id: noticiaId, titulo: editTitulo, seccion }),
      });
      const data = await res.json();
      if (res.ok && data.imagen_url) {
        setEditImagen(data.imagen_url);
      } else {
        alert(`No se pudo generar la imagen: ${data.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión generando la imagen.");
    } finally {
      setGenerandoImagen(false);
    }
  };

  useEffect(() => {
    setEditTitulo(titulo);
    setEditImagen(imagenUrl);
    // Set cuerpo as HTML in the contentEditable div
    if (editorRef.current) {
      // Convert plain text line breaks to HTML paragraphs
      const htmlContent = cuerpo
        .split("\n")
        .filter(Boolean)
        .map(p => `<p>${p}</p>`)
        .join("");
      editorRef.current.innerHTML = htmlContent || `<p>${cuerpo}</p>`;
    }
  }, [titulo, cuerpo, imagenUrl, isOpen]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!editorRef.current) return;
    // Extract text content from HTML, preserving paragraphs as newlines
    const html = editorRef.current.innerHTML;
    // Convert <p> and <br> back to newlines for storage
    const text = html
      .replace(/<\/p><p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    onSave(editTitulo, text, editImagen);
  };

  const insertImage = () => {
    if (imageInputUrl.trim()) {
      exec("insertImage", imageInputUrl.trim());
      setImageInputUrl("");
      setShowImageInput(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-ink">✏️ Editor de Noticia</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none transition-colors">&times;</button>
        </div>

        {/* ── Contenido ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Imagen */}
          <div className="flex items-center gap-4">
            {editImagen ? (
              <div className="relative group">
                <img src={editImagen} alt="" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                <button
                  onClick={() => setEditImagen(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs border border-dashed border-gray-300">
                Sin imagen
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  🔗 {editImagen ? "Cambiar por link" : "Agregar desde link"}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoImagen}
                  className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
                >
                  {subiendoImagen ? "Subiendo..." : "📁 Subir desde la PC"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) subirImagenDesdeArchivo(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={generarImagenIA}
                  disabled={generandoImagen}
                  className="text-sm text-accent hover:underline font-medium disabled:opacity-50"
                >
                  {generandoImagen ? "Generando..." : "✨ Generar con IA"}
                </button>
              </div>
              {showImageInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="url"
                    placeholder="https://... URL de la imagen"
                    value={imageInputUrl}
                    onChange={e => setImageInputUrl(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-80 outline-none focus:border-blue-500"
                    onKeyDown={e => e.key === "Enter" && setEditImagen(imageInputUrl.trim())}
                  />
                  <button
                    onClick={() => { setEditImagen(imageInputUrl.trim()); setShowImageInput(false); setImageInputUrl(""); }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Título</label>
            <input
              value={editTitulo}
              onChange={e => setEditTitulo(e.target.value)}
              className="w-full text-2xl font-bold text-ink border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="Título de la noticia"
            />
          </div>

          {/* Toolbar */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Cuerpo de la noticia</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap gap-1">
                {/* Formato */}
                <ToolbarGroup>
                  <ToolbarBtn title="Negrita (Ctrl+B)" onClick={() => exec("bold")}>
                    <b>B</b>
                  </ToolbarBtn>
                  <ToolbarBtn title="Cursiva (Ctrl+I)" onClick={() => exec("italic")}>
                    <i>I</i>
                  </ToolbarBtn>
                  <ToolbarBtn title="Subrayado (Ctrl+U)" onClick={() => exec("underline")}>
                    <u>U</u>
                  </ToolbarBtn>
                  <ToolbarBtn title="Tachado" onClick={() => exec("strikeThrough")}>
                    <s>S</s>
                  </ToolbarBtn>
                </ToolbarGroup>

                <ToolbarDivider />

                {/* Tamaño */}
                <ToolbarGroup>
                  <ToolbarBtn title="Título H2" onClick={() => exec("formatBlock", "h2")}>
                    H2
                  </ToolbarBtn>
                  <ToolbarBtn title="Subtítulo H3" onClick={() => exec("formatBlock", "h3")}>
                    H3
                  </ToolbarBtn>
                  <ToolbarBtn title="Párrafo" onClick={() => exec("formatBlock", "p")}>
                    ¶
                  </ToolbarBtn>
                </ToolbarGroup>

                <ToolbarDivider />

                {/* Alineación */}
                <ToolbarGroup>
                  <ToolbarBtn title="Alinear izquierda" onClick={() => exec("justifyLeft")}>
                    ≡←
                  </ToolbarBtn>
                  <ToolbarBtn title="Centrar" onClick={() => exec("justifyCenter")}>
                    ≡↔
                  </ToolbarBtn>
                  <ToolbarBtn title="Alinear derecha" onClick={() => exec("justifyRight")}>
                    →≡
                  </ToolbarBtn>
                  <ToolbarBtn title="Justificar" onClick={() => exec("justifyFull")}>
                    ≡≡
                  </ToolbarBtn>
                </ToolbarGroup>

                <ToolbarDivider />

                {/* Listas */}
                <ToolbarGroup>
                  <ToolbarBtn title="Lista con viñetas" onClick={() => exec("insertUnorderedList")}>
                    • ≡
                  </ToolbarBtn>
                  <ToolbarBtn title="Lista numerada" onClick={() => exec("insertOrderedList")}>
                    1. ≡
                  </ToolbarBtn>
                </ToolbarGroup>

                <ToolbarDivider />

                {/* Extras */}
                <ToolbarGroup>
                  <ToolbarBtn title="Insertar imagen en texto" onClick={() => {
                    const url = prompt("URL de la imagen:");
                    if (url) exec("insertImage", url);
                  }}>
                    🖼
                  </ToolbarBtn>
                  <ToolbarBtn title="Insertar enlace" onClick={() => {
                    const url = prompt("URL del enlace:");
                    if (url) exec("createLink", url);
                  }}>
                    🔗
                  </ToolbarBtn>
                  <ToolbarBtn title="Cita / Blockquote" onClick={() => exec("formatBlock", "blockquote")}>
                    ❝
                  </ToolbarBtn>
                  <ToolbarBtn title="Línea horizontal" onClick={() => exec("insertHorizontalRule")}>
                    ―
                  </ToolbarBtn>
                </ToolbarGroup>

                <ToolbarDivider />

                {/* Deshacer */}
                <ToolbarGroup>
                  <ToolbarBtn title="Deshacer (Ctrl+Z)" onClick={() => exec("undo")}>
                    ↩
                  </ToolbarBtn>
                  <ToolbarBtn title="Rehacer (Ctrl+Y)" onClick={() => exec("redo")}>
                    ↪
                  </ToolbarBtn>
                  <ToolbarBtn title="Limpiar formato" onClick={() => exec("removeFormat")}>
                    ⊘
                  </ToolbarBtn>
                </ToolbarGroup>
              </div>

              {/* Editor contentEditable */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[420px] max-h-[calc(92vh-420px)] overflow-y-auto p-5 text-sm text-ink leading-relaxed focus:outline-none prose prose-sm max-w-none
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
                  [&_p]:mb-2
                  [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                  [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
                  [&_a]:text-blue-600 [&_a]:underline
                  [&_hr]:my-4 [&_hr]:border-gray-200
                "
                style={{ lineHeight: "1.8" }}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-400">Usá Ctrl+B, Ctrl+I, Ctrl+U para formato rápido</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-ink hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
            >
              💾 Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components de Toolbar ── */
function ToolbarBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-white hover:text-ink hover:shadow-sm rounded transition-all"
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1.5" />;
}
