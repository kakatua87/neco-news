import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de datos | Neco Beat",
  description:
    "Cómo solicitar la eliminación de tus datos personales en Neco Beat y en las integraciones con Facebook e Instagram.",
};

export default function EliminacionDeDatosPage() {
  return (
    <main className="w-full mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-16">
      <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-8 text-charcoal">
        Eliminación de datos
      </h1>

      <div className="prose prose-neutral max-w-none space-y-6 text-charcoal/90 leading-relaxed">
        <p>
          Podés pedirnos en cualquier momento que eliminemos los datos personales que
          tenemos sobre vos. Esta página explica cómo hacerlo y qué pasa después.
        </p>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">1. Cómo solicitarla</h2>
          <p>
            Enviá un correo a{" "}
            <a href="mailto:contacto@necobeat.com.ar" className="text-accent hover:underline">
              contacto@necobeat.com.ar
            </a>{" "}
            con el asunto «Eliminación de datos» e indicá:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>El correo electrónico con el que te suscribiste al newsletter, si corresponde.</li>
            <li>
              Si usaste Facebook o Instagram para iniciar sesión o conectar una cuenta, el
              nombre de tu perfil o página.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">2. Qué datos eliminamos</h2>
          <p>
            Eliminamos tu suscripción al newsletter, los registros asociados a tu correo
            y, si conectaste una cuenta de Facebook o Instagram, los tokens de acceso e
            identificadores que guardamos de ella.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">3. Plazos</h2>
          <p>
            Respondemos tu solicitud y completamos la eliminación en un plazo máximo de
            30 días corridos. Te avisaremos por correo cuando esté terminada.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">4. Facebook e Instagram</h2>
          <p>
            Para retirar el acceso de Neco Beat a tu cuenta, también podés quitar la
            aplicación «Necopublish» desde la configuración de tu cuenta de Facebook
            (Configuración → Apps y sitios web) o de Instagram (Configuración → Apps y
            sitios web). Eso revoca el acceso de inmediato. Para borrar además los datos
            que guardamos, enviá la solicitud descrita arriba.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-xl mt-8 mb-3 text-charcoal">5. Más información</h2>
          <p>
            Podés leer cómo tratamos tus datos en nuestras{" "}
            <a href="/privacidad" className="text-accent hover:underline">
              Políticas de Privacidad
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-charcoal/50 mt-10">
          Última actualización: octubre de 2026.
        </p>
      </div>
    </main>
  );
}
