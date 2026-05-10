import { Metadata } from "next";
import * as cheerio from "cheerio";

export const metadata: Metadata = {
  title: "Farmacias de Turno | Neco Now",
  description: "Consultá las farmacias de turno del día en Necochea, Quequén y la zona.",
};

export const revalidate = 14400; // 4 horas

export default async function FarmaciasPage() {
  let tableHtml = "<p>No se pudo cargar la información de las farmacias.</p>";

  try {
    const res = await fetch(
      "https://portalnecochea.com.ar/servicios/servicios-esenciales/farmacias-de-turno-en-necochea/",
      { next: { revalidate: 14400 } }
    );
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      const table = $("table").first();
      if (table.length > 0) {
        // Limpiar atributos que rompen el diseño responsivo
        table.removeAttr("width");
        table.find("*").removeAttr("width").removeAttr("style");
        
        // Agregar clases de Tailwind para estilizar la tabla
        table.addClass("w-full text-sm text-left border-collapse");
        table.find("td, th").addClass("px-3 py-2 md:px-4 md:py-3 border-b border-border align-top");
        
        // Hacer que las filas principales tengan un fondo alterno
        table.find("tr:nth-child(4n-1), tr:nth-child(4n)").addClass("bg-accent/5");
        
        // Estilizar los títulos de las ciudades (están en h3 dentro de la segunda fila)
        table.find("h3, strong").addClass("text-accent-dark font-bold text-base md:text-lg m-0");

        tableHtml = table.prop("outerHTML") || tableHtml;
      }
    }
  } catch (error) {
    console.error("Error fetching farmacias:", error);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8 py-10 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-4 text-charcoal">
          Farmacias de Turno
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Consultá los turnos del mes en Necochea, Quequén, La Dulce y Juan N. Fernández. <br />
          Proporcionados por el Colegio de Farmacéuticos de Necochea.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
        <div className="bg-charcoal text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <h2 className="font-bold text-lg">Turnos del mes</h2>
          <span className="text-sm text-white/70">
            De 09:00 hs hasta las 09:00 hs del día siguiente
          </span>
        </div>
        
        <div className="p-4 md:p-6 overflow-x-auto no-scrollbar">
          <div 
            className="min-w-[800px]"
            dangerouslySetInnerHTML={{ __html: tableHtml }} 
          />
        </div>
      </div>

      <div className="bg-accent/10 rounded-xl p-5 border border-accent/20">
        <p className="text-sm text-accent-dark text-center font-medium">
          DURANTE EL SERVICIO DE GUARDIA SOLO SE DISPENSAN MEDICAMENTOS CON RECETA Y/O URGENCIAS
        </p>
      </div>
    </main>
  );
}
