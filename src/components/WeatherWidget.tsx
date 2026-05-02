"use client";

import { useEffect, useState } from "react";

export default function WeatherWidget() {
  const [temp, setTemp] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Coordenadas aproximadas de Necochea
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-38.5545&longitude=-58.7368&current_weather=true");
        const data = await res.json();
        if (data?.current_weather?.temperature) {
          setTemp(`${Math.round(data.current_weather.temperature)}°C`);
        }
      } catch (error) {
        console.error("Error fetching weather", error);
      }
    }
    fetchWeather();
    // Update every 30 mins
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!temp) return null;

  return (
    <span className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 17.66l1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="M6.34 17.66l-1.41 1.41" />
        <path d="M19.07 4.93l-1.41 1.41" />
      </svg>
      {temp}
    </span>
  );
}
