"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatus("success");
        setEmail("");
      } else if (data.duplicate) {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="w-full">
      {status === "success" ? (
        <div className="flex items-center gap-2 text-[#1da64f] font-medium text-sm">
          <span>✅</span>
          <span>¡Suscripto! Recibirás el resumen semanal cada viernes.</span>
        </div>
      ) : status === "duplicate" ? (
        <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
          <span>📬</span>
          <span>Ese email ya está suscripto. ¡Gracias!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            disabled={status === "loading"}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors whitespace-nowrap disabled:opacity-60 flex items-center gap-2"
          >
            {status === "loading" ? (
              <>
                <span className="animate-spin inline-block">⏳</span>
                <span>Suscribiendo...</span>
              </>
            ) : (
              <>
                <span>✉️</span>
                <span>Suscribirme</span>
              </>
            )}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-red-500 text-xs mt-1">Hubo un error. Intentá de nuevo.</p>
      )}
    </div>
  );
}
