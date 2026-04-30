"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return <span className="text-sm tracking-wide opacity-0">00:00:00 p.m.</span>;
  }

  return <span className="text-sm tracking-wide">{time}</span>;
}
