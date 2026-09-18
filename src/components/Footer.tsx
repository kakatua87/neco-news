import Link from "next/link";

const NAV = ["Local", "Policiales", "Política", "Deportes", "Zona", "Sociedad", "Opinión", "Cultura", "Tendencias", "Obituarios", "Farmacias"];

const REDES = [
  {
    key: "instagram",
    url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  },
  {
    key: "facebook",
    url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    path: "M15 3h-2a5 5 0 0 0-5 5v3H6v4h2v8h4v-8h3l1-4h-4V8a1 1 0 0 1 1-1h3z",
  },
  {
    key: "x",
    url: process.env.NEXT_PUBLIC_SOCIAL_X,
    path: "M4 4l7.5 8.5L4.5 20h2.3l6-6.8 5 6.8H21l-7.7-8.9L20 4h-2.3l-5.6 6.4L7.7 4Z",
  },
  {
    key: "youtube",
    url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
    path: "M21.5 7.2a2.7 2.7 0 0 0-1.9-1.9C17.9 5 12 5 12 5s-5.9 0-7.6.3A2.7 2.7 0 0 0 2.5 7.2 27 27 0 0 0 2.2 12a27 27 0 0 0 .3 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.3 7.6.3 7.6.3s5.9 0 7.6-.3a2.7 2.7 0 0 0 1.9-1.9c.2-1.6.3-3.2.3-4.8a27 27 0 0 0-.3-4.8ZM10 15V9l5.2 3Z",
  },
];

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

        <div className="border-t border-white/10 py-4">
          <p className="text-white/30 text-xs">
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
