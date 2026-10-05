"use client";

import { useCallback, useState } from "react";

/** Set de claves con `toggle` inmutable. */
export function useToggleSet<T>(inicial: Iterable<T> = []) {
  const [set, setSet] = useState<Set<T>>(() => new Set(inicial));
  const toggle = useCallback((key: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  return [set, toggle, setSet] as const;
}
