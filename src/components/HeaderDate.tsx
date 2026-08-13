"use client";

import { useEffect, useState } from "react";

function formatFecha(d: Date): string {
  const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
  const dia = d.getDate();
  const mes = d.toLocaleDateString("es-AR", { month: "long" });
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dia} de ${mesCap}`;
}

export default function HeaderDate() {
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    const update = () => setFecha(formatFecha(new Date()));
    update();
    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!fecha) return null;

  return <span className="whitespace-nowrap">{fecha}</span>;
}
