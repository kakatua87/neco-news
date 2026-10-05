"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "./actions";
import { ToastProvider } from "./_lib/toast";

type Props = {
  children: ReactNode;
  inboxCount: number;
  pendientesCount: number;
};

const ITEMS: Array<{ href: string; label: string; badge?: "inbox" | "pendientes" }> = [
  { href: "/admin/resumen", label: "📊 Dashboard" },
  { href: "/admin/bandeja", label: "📥 Bandeja de Entrada", badge: "inbox" },
  { href: "/admin/pendientes", label: "📝 Pendientes", badge: "pendientes" },
  { href: "/admin/publicadas", label: "📰 Publicadas" },
  { href: "/admin/obituarios", label: "🕯 Obituarios" },
  { href: "/admin/descartadas", label: "🗂 Descartadas" },
  { href: "/admin/instagram", label: "📸 Instagram" },
  { href: "/admin/redaccion", label: "✨ Redacción" },
  { href: "/admin/banners", label: "🖼️ Banners" },
  { href: "/admin/configuracion", label: "⚙️ Configuración" },
];

export default function AdminShell({ children, inboxCount, pendientesCount }: Props) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex flex-col md:flex-row min-h-screen">
        <aside className="w-full md:w-64 bg-ink text-cream flex-shrink-0">
          <div className="p-6">
            <Link href="/">
              <img src="/logo-oficial.png" alt="Neco Beat" className="h-8 w-auto object-contain" />
            </Link>
            <div className="mt-2 text-xs text-cream/50 uppercase tracking-widest">Panel Editorial</div>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            {ITEMS.map(({ href, label, badge }) => {
              const activo = pathname === href || pathname.startsWith(`${href}/`);
              const cantidad = badge === "inbox" ? inboxCount : badge === "pendientes" ? pendientesCount : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center transition-colors ${
                    activo ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
                  }`}
                >
                  <span>{label}</span>
                  {cantidad > 0 && (
                    <span
                      className={
                        badge === "inbox"
                          ? "bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          : "bg-cream text-ink text-xs font-bold px-2 py-0.5 rounded-full"
                      }
                    >
                      {cantidad}
                    </span>
                  )}
                </Link>
              );
            })}
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full text-left px-4 py-2.5 mt-8 border-t border-cream/10 rounded-lg text-sm font-medium transition-colors text-cream/70 hover:text-red-400 hover:bg-red-400/10"
              >
                🚪 Cerrar sesión
              </button>
            </form>
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-10 max-w-6xl">{children}</main>
      </div>
    </ToastProvider>
  );
}
