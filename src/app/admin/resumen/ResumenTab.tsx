"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Actividad, Stats } from "../_lib/data";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";

function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-muted mb-1">{titulo}</p>
      <p className="font-bold">{children}</p>
    </div>
  );
}

export default function ResumenTab({
  stats,
  inboxCount,
  actividad,
}: {
  stats: Stats;
  inboxCount: number;
  actividad: Actividad;
}) {
  const router = useRouter();
  const toast = useToast();
  const [descartadasCount, setDescartadasCount] = useState(stats.descartadas);
  const [vaciandoDescartadas, setVaciandoDescartadas] = useState(false);

  const vaciarDescartadas = async () => {
    if (!confirm(`¿Eliminar definitivamente las ${descartadasCount} noticias descartadas? Esta acción no se puede deshacer.`)) return;
    setVaciandoDescartadas(true);
    const r = await adminFetch("/api/noticias/vaciar-descartadas", { method: "POST" });
    setVaciandoDescartadas(false);
    if (!r.ok) {
      toast(`No se pudieron vaciar las descartadas: ${r.error}`);
      return;
    }
    setDescartadasCount(0);
    router.refresh();
  };

  const tarjeta = "text-left bg-white p-6 rounded-xl border border-border shadow-sm hover:border-accent hover:shadow-md transition-all";

  return (
    <div className="space-y-8 fade-in">
      <h2 className="text-2xl font-bold text-ink">Resumen del Sistema</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/admin/bandeja" className={tarjeta}>
          <p className="text-sm text-muted font-medium uppercase tracking-wide">Bandeja</p>
          <p className="text-4xl font-bold text-blue-500 mt-2">{inboxCount}</p>
          <p className="text-xs text-muted mt-2 font-medium">Grupos sin procesar</p>
        </Link>
        <Link href="/admin/publicadas" className={tarjeta}>
          <p className="text-sm text-muted font-medium uppercase tracking-wide">Publicadas</p>
          <p className="text-4xl font-bold text-ink mt-2">{stats.publicadas}</p>
          <p className="text-xs text-[#25D366] mt-2 font-medium">↑ Visibles en portal</p>
        </Link>
        <Link href="/admin/pendientes" className={tarjeta}>
          <p className="text-sm text-muted font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-4xl font-bold text-accent mt-2">{stats.pendientes}</p>
          <p className="text-xs text-muted mt-2 font-medium">Esperando revisión</p>
        </Link>
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted font-medium uppercase tracking-wide">Descartadas</p>
          <p className="text-4xl font-bold text-ink mt-2">{descartadasCount}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted font-medium">Archivadas</p>
            {descartadasCount > 0 && (
              <button
                onClick={vaciarDescartadas}
                disabled={vaciandoDescartadas}
                className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {vaciandoDescartadas ? "Vaciando..." : "Vaciar"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-ink mb-4">Actividad</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Dato titulo="Scraper">
            <span className={actividad.scraperActivo ? "text-[#1da64f]" : "text-red-600"}>
              {actividad.scraperActivo ? "● Activo" : "● Pausado"}
            </span>
          </Dato>
          <Dato titulo="Último ingreso">{formatearFecha(actividad.ultimoIngreso)}</Dato>
          <Dato titulo="Última publicación">{formatearFecha(actividad.ultimaPublicacion)}</Dato>
          <Dato titulo="Envíos ciudadanos nuevos">
            <Link href="/admin/envios" className="hover:underline">{actividad.enviosNuevos}</Link>
          </Dato>
        </div>
      </div>
    </div>
  );
}
