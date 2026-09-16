"use client";

import { useState } from "react";
import TipModal from "./TipModal";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const MENSAJE_PRECARGADO = encodeURIComponent(
  "Hola! Quiero compartir una info/noticia con la redaccion de Neco Beat."
);

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.004 3C9.376 3 4 8.373 4 15c0 2.42.71 4.68 1.94 6.58L4 29l7.62-1.9A11.9 11.9 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm6.99 16.6c-.29.82-1.7 1.57-2.34 1.66-.6.09-1.36.13-2.19-.14-.5-.16-1.15-.38-1.98-.74-3.48-1.5-5.75-5-5.93-5.24-.17-.24-1.42-1.89-1.42-3.6s.9-2.56 1.22-2.9c.32-.35.7-.44.94-.44.24 0 .47 0 .68.01.22.01.51-.08.8.62.29.7 1 2.41 1.08 2.58.09.17.15.37.03.6-.12.23-.18.37-.35.57-.17.2-.36.44-.51.6-.17.17-.35.36-.15.71.2.35.9 1.49 1.94 2.42 1.34 1.19 2.47 1.56 2.84 1.73.28.13.46.11.63-.07.21-.24.83-.97 1.05-1.3.22-.33.44-.28.73-.17.29.11 1.84.87 2.16 1.03.31.16.52.24.6.37.08.13.08.75-.21 1.57Z" />
    </svg>
  );
}

export default function WhatsAppFloatingButton() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {menuAbierto && (
          <div className="bg-white rounded-xl shadow-2xl border border-border p-2 w-64 fade-in">
            {WHATSAPP_NUMBER && (
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${MENSAJE_PRECARGADO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMenuAbierto(false)}
              >
                <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
                <span className="text-sm font-medium text-ink">Escribir por WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => {
                setMenuAbierto(false);
                setModalAbierto(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-xl">📝</span>
              <span className="text-sm font-medium text-ink">Contanos tu info desde la web</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label="Abrir opciones de contacto"
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        >
          {menuAbierto ? <span className="text-2xl">✕</span> : <WhatsAppIcon className="w-8 h-8" />}
        </button>
      </div>

      {modalAbierto && <TipModal onClose={() => setModalAbierto(false)} />}
    </>
  );
}
