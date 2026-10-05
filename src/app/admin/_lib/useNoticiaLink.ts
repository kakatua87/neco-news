"use client";

import { useCallback, useSyncExternalStore } from "react";
import { seccionSlug } from "@/lib/secciones";

const ORIGEN_POR_DEFECTO = "https://neco-news.vercel.app";
const sinSuscripcion = () => () => {};

/** Devuelve una función que arma el link público de una noticia (usa el origen real del navegador). */
export function useNoticiaLink() {
  const origen = useSyncExternalStore(
    sinSuscripcion,
    () => window.location.origin,
    () => ORIGEN_POR_DEFECTO
  );
  return useCallback(
    (item: { seccion: string; slug?: string }) => `${origen}/${seccionSlug(item.seccion)}/${item.slug}`,
    [origen]
  );
}
