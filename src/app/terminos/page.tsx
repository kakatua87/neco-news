import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Neco Beat",
  description: "Términos y condiciones de uso del sitio web de Neco Beat.",
};

export default function TerminosPage() {
  return (
    <main className="w-full mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-16">
      <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-8 text-charcoal">
        Términos y Condiciones
      </h1>

      <div className="prose prose-neutral max-w-none space-y-6 text-charcoal/90 leading-relaxed">
        <p>
          Estos términos regulan el uso del sitio web de Neco Beat (necobeat.com.ar) y de
          los contenidos que publicamos en él y en nuestras redes sociales. Al acceder al
          sitio, aceptás estas condiciones.
        </p>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">1. Quiénes somos</h2>
          <p>
            Neco Beat es un portal de noticias de Necochea y Quequén. Publicamos
            información local, notas periodísticas y servicios de utilidad para la
            comunidad.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">2. Uso del sitio</h2>
          <p>
            El sitio es de acceso libre y gratuito. Te comprometés a usarlo de manera
            lícita, sin intentar vulnerar su seguridad, interferir con su funcionamiento
            ni acceder a áreas restringidas, como el panel de administración, sin
            autorización.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">3. Propiedad intelectual</h2>
          <p>
            Los textos, imágenes, logotipos y demás contenidos del sitio pertenecen a Neco
            Beat o a sus respectivos autores, y están protegidos por la normativa de
            propiedad intelectual vigente. Podés compartir enlaces a nuestras notas y
            citar fragmentos mencionando la fuente. Para cualquier otra reproducción
            necesitamos tu solicitud previa por escrito.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">4. Contenido informativo</h2>
          <p>
            Hacemos nuestro mejor esfuerzo para publicar información veraz y actualizada,
            pero no garantizamos que esté libre de errores u omisiones. Si detectás un
            error, escribinos y lo revisamos. La información de servicios (clima,
            farmacias de turno, obituarios y similares) se brinda con carácter
            orientativo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">5. Enlaces y servicios de terceros</h2>
          <p>
            El sitio puede contener enlaces a sitios y plataformas de terceros, como
            Instagram o Facebook. No controlamos su contenido ni sus políticas, y
            nuestra responsabilidad se limita a lo publicado en necobeat.com.ar.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">6. Datos personales</h2>
          <p>
            El tratamiento de tus datos personales se rige por nuestras{" "}
            <a href="/privacidad" className="text-accent hover:underline">
              Políticas de Privacidad
            </a>
            . Podés pedir la eliminación de tus datos siguiendo las instrucciones de la
            página de{" "}
            <a href="/eliminacion-de-datos" className="text-accent hover:underline">
              eliminación de datos
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">7. Modificaciones</h2>
          <p>
            Podemos actualizar estos términos en cualquier momento. La versión vigente es
            la publicada en esta página, con su fecha de actualización.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">8. Contacto</h2>
          <p>
            Para consultas sobre estos términos, escribinos a{" "}
            <a href="mailto:neconow.ar@gmail.com" className="text-accent hover:underline">
              neconow.ar@gmail.com
            </a>.
          </p>
        </section>

        <p className="text-sm text-charcoal/50 mt-10">
          Última actualización: octubre de 2026.
        </p>
      </div>
    </main>
  );
}
