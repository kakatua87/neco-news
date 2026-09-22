import Link from "next/link";
import { REDES } from "@/lib/social";

const NAV = ["Local", "Policiales", "Política", "Deportes", "Zona", "Sociedad", "Opinión", "Cultura", "Tendencias", "Obituarios", "Farmacias"];

export default function Footer() {
  const redesActivas = REDES.filter((r) => r.url);

  return (
    <footer className="bg-charcoal mt-auto font-sans">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <img src="/logo-oficial.png" alt="Neco Beat" className="h-10 w-auto object-contain" />
          </Link>

          <Link href="/quienes-somos" className="text-accent hover:text-accent-light text-[13px] font-bold uppercase tracking-wide transition-colors">
            Quiénes Somos
          </Link>

          {redesActivas.length > 0 && (
            <div className="flex items-center gap-2.5">
              {redesActivas.map((r) => (
                <a
                  key={r.key}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.key}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/70" fill="currentColor">
                    <path d={r.path} />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2 border-t border-white/10 mt-5 py-5">
          {NAV.map((s) => (
            <Link key={s} href={`/${s.toLowerCase()}`} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors">
              {s}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 py-4 pr-0 md:pr-24">
          <p className="text-white/30 text-xs max-w-xl">
            © {new Date().getFullYear()} Neco Beat · Necochea · Todos los derechos reservados ·{" "}
            <Link href="/privacidad" className="hover:text-white/60 transition-colors">
              Políticas de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
