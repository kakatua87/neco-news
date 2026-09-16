"use client";

import { useState } from "react";
import TipModal from "./TipModal";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const MENSAJE_PRECARGADO = encodeURIComponent(
  "Hola! Quiero compartir una info/noticia con la redaccion de Neco Beat."
);

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
                <span className="text-xl">💬</span>
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
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-xl flex items-center justify-center text-2xl transition-transform hover:scale-105"
        >
          {menuAbierto ? "✕" : "💬"}
        </button>
      </div>

      {modalAbierto && <TipModal onClose={() => setModalAbierto(false)} />}
    </>
  );
}
