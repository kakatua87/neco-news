"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tipo = "error" | "ok";
type Toast = { id: number; tipo: Tipo; mensaje: string };

const ToastContext = createContext<(mensaje: string, tipo?: Tipo) => void>(() => {});

/** Aviso no bloqueante (reemplaza a alert()). */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrar = useCallback((mensaje: string, tipo: Tipo = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg border ${
              t.tipo === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            {t.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
