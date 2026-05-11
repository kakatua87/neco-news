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
      setTime(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("es-AR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <span className="opacity-0 flex items-center gap-2 text-sm tracking-wide">
        <span>lun. 1 ene.</span>
        <span className="text-border">·</span>
        <span>00:00:00 p.m.</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm tracking-wide">
      <span className="capitalize">{date}</span>
      <span className="text-border/60">·</span>
      <span>{time}</span>
    </span>
  );
}
