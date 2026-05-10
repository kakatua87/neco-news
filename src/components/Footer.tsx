import Link from "next/link";

const NAV = ["Política", "Economía", "Policiales", "Local", "Deportes", "Sociedad", "Cultura", "Salud"];

export default function Footer() {
  return (
    <footer className="bg-charcoal mt-auto font-sans">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center">
          <img
            src="/logo-final.svg"
            alt="Neco Now"
            className="h-8 w-auto"
          />
        </Link>
        <nav className="flex flex-wrap justify-center gap-5">
          {NAV.map((s) => (
            <Link key={s} href={`/${s.toLowerCase()}`} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors">
              {s}
            </Link>
          ))}
        </nav>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} Neco Now · Necochea · Todos los derechos reservados</p>
      </div>
    </footer>
  );
}
