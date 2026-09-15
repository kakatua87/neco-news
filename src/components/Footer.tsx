import Link from "next/link";

const NAV = ["Política", "Economía", "Policiales", "Local", "Deportes", "Sociedad", "Cultura", "Salud"];

export default function Footer() {
  return (
    <footer className="bg-charcoal mt-auto font-sans">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center">
          <img
            src="/logo-oficial.png"
            alt="Neco Beat"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <nav className="flex flex-wrap justify-center gap-5">
          {NAV.map((s) => (
            <Link key={s} href={`/${s.toLowerCase()}`} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors">
              {s}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center md:items-end gap-1">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Neco Beat · Necochea · Todos los derechos reservados</p>
          <Link href="/privacidad" className="text-white/30 hover:text-white/60 text-xs transition-colors">
            Políticas de Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
