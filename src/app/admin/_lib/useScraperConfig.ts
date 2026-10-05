"use client";

import { useState } from "react";
import { adminFetch } from "./adminFetch";
import { useToast } from "./toast";
import { FUENTES_SCRAPER, type ScraperConfig } from "./scraperConfig";

/** Estado y acciones de la configuración del scraper (lo usan la Bandeja y Configuración). */
export function useScraperConfig(inicial: ScraperConfig) {
  const toast = useToast();
  const [config, setConfig] = useState(inicial);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (patch: Partial<ScraperConfig>) => {
    const anterior = config;
    setConfig({ ...config, ...patch });
    setGuardando(true);
    const r = await adminFetch("/api/scraper/config", { method: "POST", json: patch });
    setGuardando(false);
    if (!r.ok) {
      setConfig(anterior);
      toast(`No se pudo guardar la configuración del scraper: ${r.error}`);
    }
  };

  const toggleFuente = (key: string) => {
    const activas = config.fuentes_activas.includes(key)
      ? config.fuentes_activas.filter((f) => f !== key)
      : [...config.fuentes_activas, key];
    if (activas.length === 0) return; // no dejar sin fuentes
    guardar({ fuentes_activas: activas });
  };

  /** Agrega una fuente pegada a mano. Devuelve un error legible si algo no cierra. */
  const agregarFuenteCustom = (label: string, url: string): { ok: boolean; error?: string } => {
    const labelTrim = label.trim();
    if (!labelTrim) return { ok: false, error: "Ponele un nombre a la fuente." };

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return { ok: false, error: "Esa dirección no es una URL válida. Tiene que empezar con https:// (ejemplo: https://www.midiario.com.ar)" };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Solo se aceptan direcciones que empiecen con http:// o https://" };
    }

    const keysExistentes = new Set([
      ...FUENTES_SCRAPER.map((f) => f.key),
      ...config.fuentes_custom.map((f) => f.key),
    ]);
    const base =
      labelTrim.toLowerCase().normalize("NFD").replace(/\p{Mark}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
      "fuente";
    let key = base;
    let n = 2;
    while (keysExistentes.has(key)) {
      key = `${base}-${n}`;
      n++;
    }

    guardar({
      fuentes_custom: [...config.fuentes_custom, { key, label: labelTrim, url: parsed.toString() }],
      fuentes_activas: [...config.fuentes_activas, key],
    });
    return { ok: true };
  };

  const eliminarFuenteCustom = (key: string) => {
    if (!confirm("¿Eliminar esta fuente? El scraper deja de revisarla.")) return;
    guardar({
      fuentes_custom: config.fuentes_custom.filter((f) => f.key !== key),
      fuentes_activas: config.fuentes_activas.filter((f) => f !== key),
    });
  };

  return { config, guardando, guardar, toggleFuente, agregarFuenteCustom, eliminarFuenteCustom };
}
