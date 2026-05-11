"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const now = new Date();

      // Hora: HH:MM:SS a.m./p.m.
      setTime(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      // Fecha: "Lunes, 11/05/2026"
      const weekday = now.toLocaleDateString("es-AR", { weekday: "long" });
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      setDate(`${capitalized}, ${dd}/${mm}/${yyyy}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <span className="opacity-0 flex items-center gap-2 text-sm tracking-wide">
        <span>Lunes, 01/01/2026</span>
        <span className="text-accent">•</span>
        <span>00:00:00 a.m.</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm tracking-wide">
      <span>{date}</span>
      <span className="text-accent font-bold">•</span>
      <span>{time}</span>
    </span>
  );
}
