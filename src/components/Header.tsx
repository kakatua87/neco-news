import Link from "next/link";
import LiveClock from "./LiveClock";
import WeatherWidget from "./WeatherWidget";

const MAIN_NAV = ["Política", "Economía", "Policiales", "Local", "Deportes", "Sociedad"];
const EXTRA_NAV = ["Cultura", "Salud", "Farmacias", "Obituarios", "Clima"];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 shadow-lg font-sans">
      <div className="flex">
        {/* LEFT: Charcoal + Logo */}
        <div className="bg-charcoal flex items-center px-5 md:px-8 py-3">
          <Link href="/" className="flex items-center">
            {/* Logotipo SVG completo */}
            <img
              src="/logo-oficial.png"
              alt="Neco Now"
              className="h-14 md:h-18 lg:h-20 w-auto object-contain"
            />
          </Link>
        </div>

        {/* RIGHT: White + Subtitle + Nav */}
        <div className="bg-white flex-1 flex flex-col border-b border-border">
          {/* Subtítulo — marquesina loop infinito */}
          <div className="overflow-hidden pt-2 pb-1.5 border-b-2 border-accent">
            <div className="marquee-track flex whitespace-nowrap">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="marquee-item text-[10px] font-semibold uppercase tracking-[0.25em] text-muted pr-12"
                >
                  Diario Digital &nbsp;<span className="text-accent">|</span>&nbsp; Necochea, Argentina &nbsp;&nbsp;&nbsp;<span className="text-accent">•</span>&nbsp;&nbsp;&nbsp;
                </span>
              ))}
            </div>
          </div>

          {/* Nav + Botón */}
          <div className="flex-1 flex items-center justify-between px-4 md:px-8">
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 relative">
              {MAIN_NAV.map((s) => (
                <Link
                  key={s}
                  href={`/${encodeURIComponent(s.toLowerCase())}`}
                  className="text-[13px] font-bold uppercase tracking-wider text-ink/70 hover:text-accent transition-colors"
                >
                  {s}
                </Link>
              ))}

              {/* DROPDOWN MÁS */}
              <div className="group relative py-4 cursor-pointer">
                <span className="text-[13px] font-bold uppercase tracking-wider text-ink/70 group-hover:text-accent transition-colors flex items-center gap-1">
                  Más
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:rotate-180 transition-transform">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>

                {/* Menú oculto */}
                <div className="absolute top-full left-0 mt-0 w-48 bg-white border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden z-50">
                  {EXTRA_NAV.map((s) => (
                    <Link
                      key={s}
                      href={`/${encodeURIComponent(s.toLowerCase())}`}
                      className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-ink/70 hover:text-accent hover:bg-gray-50 border-b border-border transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                  <a
                    href="https://www.instagram.com/d.cnecochea/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-ink/70 hover:text-accent hover:bg-gray-50 border-b border-border transition-colors flex justify-between items-center"
                  >
                    Defensa Civil ↗
                  </a>
                  <Link
                    href="/archivo"
                    className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-accent bg-accent/5 hover:bg-accent/10 transition-colors"
                  >
                    Archivo Histórico
                  </Link>
                </div>
              </div>
            </nav>

            <button className="md:hidden text-ink" aria-label="Menú">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="hidden lg:flex items-center gap-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted flex items-center gap-3">
                <WeatherWidget />
                <span className="text-border">|</span>
                <LiveClock />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
