import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiénes Somos | Neco Beat",
  description: "Quiénes somos: el pulso de Necochea y Quequén, contado por quienes lo viven.",
};

export default function QuienesSomosPage() {
  return (
    <main className="w-full mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-16">
      <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-8 text-charcoal">
        Quiénes Somos
      </h1>

      <div className="prose prose-neutral max-w-none space-y-6 text-charcoal/90 leading-relaxed">
        <p>
          Somos un portal de noticias de Necochea, Quequén y la región. Nacimos de acá,
          para acá: gente que camina estas calles, conoce esta zona y quiere contarla con
          seriedad y cercanía.
        </p>

        <p>
          El nombre no es casualidad. <strong>Neco</strong> es como le decimos a nuestra
          ciudad entre nosotros, con esa familiaridad de vecino. Y <strong>Beat</strong>,
          en el periodismo, es el territorio que un reportero cubre de cerca, a fondo, día
          tras día — y también el pulso, el latido constante de la actualidad. Neco Beat
          es eso: el pulso de Necochea, contado por quienes lo viven.
        </p>

        <p>
          Cubrimos política, sociedad, policiales, deportes, cultura y la agenda de los
          municipios de la zona, con el mismo criterio: información verificada, análisis
          serio y atención a los temas que también importan aunque no sean los más
          ruidosos — los debates del concejo deliberante, la realidad de trabajadores y
          empresarios, el día a día del distrito.
        </p>

        <p>
          Somos periodistas y vecinos a la vez. Si tenés una historia, un dato o algo
          para contarnos, este es tu espacio tanto como el nuestro.
        </p>
      </div>
    </main>
  );
}
