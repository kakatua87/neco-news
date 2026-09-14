import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Políticas de Privacidad | Neco Now",
  description: "Políticas de privacidad y tratamiento de datos personales de Neco Now.",
};

export default function PrivacidadPage() {
  return (
    <main className="w-full mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-16">
      <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-8 text-charcoal">
        Políticas de Privacidad
      </h1>

      <div className="prose prose-neutral max-w-none space-y-6 text-charcoal/90 leading-relaxed">
        <p>
          En Neco Now valoramos la privacidad de quienes visitan nuestro sitio web. Esta
          política describe qué información recopilamos, cómo la usamos y qué derechos
          tenés sobre tus datos personales.
        </p>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">1. Información que recopilamos</h2>
          <p>
            Podemos recopilar información que nos proporcionás voluntariamente, como tu
            correo electrónico al suscribirte a nuestro newsletter, o datos de navegación
            recopilados automáticamente (dirección IP, tipo de navegador, páginas
            visitadas) con fines estadísticos y de mejora del sitio.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">2. Uso de la información</h2>
          <p>
            Utilizamos tus datos exclusivamente para operar y mejorar el sitio, enviarte
            el newsletter si te suscribiste, y — cuando corresponda — para gestionar la
            publicación de contenido en nuestras redes sociales asociadas (Instagram,
            Facebook). No vendemos ni compartimos tu información personal con terceros
            con fines comerciales.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">3. Cookies</h2>
          <p>
            Nuestro sitio puede utilizar cookies propias y de terceros para mejorar la
            experiencia de navegación y realizar análisis de tráfico. Podés configurar tu
            navegador para rechazar cookies, aunque esto podría afectar algunas
            funcionalidades del sitio.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">4. Redes sociales e integraciones</h2>
          <p>
            Neco Now utiliza integraciones con plataformas de terceros (como Instagram)
            para publicar contenido periodístico. Estas integraciones operan bajo las
            políticas de privacidad propias de cada plataforma, y el acceso se limita a
            las funciones estrictamente necesarias para publicar contenido en cuentas
            propias de Neco Now.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">5. Derechos del usuario</h2>
          <p>
            Podés solicitar en cualquier momento el acceso, la rectificación o la
            eliminación de tus datos personales escribiéndonos a{" "}
            <a href="mailto:neconow.ar@gmail.com" className="text-accent hover:underline">
              neconow.ar@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">6. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política de privacidad ocasionalmente. Cualquier
            cambio será publicado en esta misma página con su fecha de actualización.
          </p>
        </section>

        <p className="text-sm text-charcoal/50 mt-10">
          Última actualización: septiembre de 2026.
        </p>
      </div>
    </main>
  );
}
