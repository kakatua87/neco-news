"use client";

import { useEffect, useState } from "react";

type Forecast = {
  current: { temp: number; code: number } | null;
  days: { label: string; temp: number; code: number }[];
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_FORECAST = 5;

function condicionDesdeCode(code: number): string {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcial";
  if (code === 3) return "Nublado";
  if (code >= 51 && code <= 67) return "Lluvia";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code >= 95) return "Tormenta";
  return "Variable";
}

/** Icono ilustrativo (varios tonos) según el weathercode de Open-Meteo. */
function WeatherIcon({ code, className = "w-6 h-6" }: { code: number; className?: string }) {
  // Despejado
  if (code === 0) {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="16" cy="16" r="7.5" fill="#F5A623" />
        <g stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round">
          <path d="M16 3v3.2M16 25.8V29M29 16h-3.2M6.2 16H3M25 7l-2.3 2.3M9.3 22.7 7 25M25 25l-2.3-2.3M9.3 9.3 7 7" />
        </g>
      </svg>
    );
  }
  // Parcialmente nublado
  if (code <= 2) {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="13" cy="13" r="6" fill="#F5A623" />
        <g stroke="#F5A623" strokeWidth="2" strokeLinecap="round">
          <path d="M13 3.5v2.3M4.5 13H6.8M21.2 13H19M6.9 6.9l1.6 1.6M19 6.9l-1.6 1.6" />
        </g>
        <path d="M11 28a6.2 6.2 0 0 1 .7-12.35A8.4 8.4 0 0 1 27 18.2 6 6 0 0 1 25.5 28H11Z" fill="#E4EBF0" stroke="#8FA3AE" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  // Lluvia / chubascos
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M8 22.5a6.2 6.2 0 0 1 .7-12.35A8.4 8.4 0 0 1 24 12.6 6 6 0 0 1 22.5 22.5H8Z" fill="#DCE6EC" stroke="#8FA3AE" strokeWidth="1.6" strokeLinejoin="round" />
        <g stroke="#3E8ED9" strokeWidth="2.1" strokeLinecap="round">
          <path d="M11 25.5 9.5 28.5M17 25.5 15.5 28.5M23 25.5 21.5 28.5" />
        </g>
      </svg>
    );
  }
  // Nieve
  if (code >= 71 && code <= 77) {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M8 22.5a6.2 6.2 0 0 1 .7-12.35A8.4 8.4 0 0 1 24 12.6 6 6 0 0 1 22.5 22.5H8Z" fill="#E4EBF0" stroke="#8FA3AE" strokeWidth="1.6" strokeLinejoin="round" />
        <g fill="#8FC1E0">
          <circle cx="11" cy="26.5" r="1.4" />
          <circle cx="17" cy="28.5" r="1.4" />
          <circle cx="23" cy="26.5" r="1.4" />
        </g>
      </svg>
    );
  }
  // Tormenta
  if (code >= 95) {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path d="M8 20.5a6.2 6.2 0 0 1 .7-12.35A8.4 8.4 0 0 1 24 10.6 6 6 0 0 1 22.5 20.5H8Z" fill="#C9D3DA" stroke="#7C8B94" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m18 21-4.5 7.5H17L14 33.5" transform="translate(0 -6)" fill="none" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Nublado (default)
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <path d="M7 24a6.6 6.6 0 0 1 .7-13.15A8.9 8.9 0 0 1 24.5 13 6.3 6.3 0 0 1 23 24H7Z" fill="#DCE6EC" stroke="#8FA3AE" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function formatFecha(d: Date): string {
  const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
  const dia = d.getDate();
  const mes = d.toLocaleDateString("es-AR", { month: "long" });
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dia} de ${mesCap}`;
}

export default function WeatherMini() {
  const [data, setData] = useState<Forecast | null>(null);
  const [now, setNow] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const n = new Date();
      setNow({
        date: formatFecha(n),
        time: n.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      });
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=-38.5545&longitude=-58.7368&current_weather=true&daily=weathercode,temperature_2m_max&forecast_days=${DIAS_FORECAST + 1}&timezone=America%2FArgentina%2FBuenos_Aires`
        );
        const json = await res.json();
        const current = json?.current_weather
          ? { temp: Math.round(json.current_weather.temperature), code: json.current_weather.weathercode }
          : null;

        const dailyTimes: string[] = json?.daily?.time ?? [];
        const dailyMax: number[] = json?.daily?.temperature_2m_max ?? [];
        const dailyCode: number[] = json?.daily?.weathercode ?? [];

        const days = dailyTimes.slice(1, DIAS_FORECAST + 1).map((iso, i) => {
          const idx = i + 1;
          const weekday = DIAS[new Date(iso).getDay()];
          return { label: weekday, temp: Math.round(dailyMax[idx]), code: dailyCode[idx] };
        });

        setData({ current, days });
      } catch (error) {
        console.error("Error fetching weather forecast", error);
      }
    }
    fetchWeather();
    // La temperatura y el ícono del día actual se refrescan periódicamente.
    const weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(weatherTimer);
    };
  }, []);

  if (!data?.current) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-light overflow-hidden font-sans">
      {now && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-accent/20">
          <span className="text-xs font-bold text-accent-dark">{now.date}</span>
          <span className="text-xs font-bold text-accent-dark tabular-nums">{now.time}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <WeatherIcon code={data.current.code} className="w-9 h-9 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-editorial text-2xl font-bold text-accent-dark leading-none">
              {data.current.temp}°
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wide text-accent-dark">
                {condicionDesdeCode(data.current.code)}
              </span>
              <span className="text-[10px] text-muted">Necochea / Quequén</span>
            </div>
          </div>
        </div>

        {data.days.length > 0 && (
          <div className="flex items-center gap-2.5 border-l border-accent/30 pl-3">
            {data.days.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold uppercase text-accent-dark">{d.label}</span>
                <WeatherIcon code={d.code} className="w-5 h-5" />
                <span className="text-xs font-bold text-ink">{d.temp}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
