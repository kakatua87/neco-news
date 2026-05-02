import React from 'react';

export const metadata = {
  title: 'El Clima en Necochea | Neco News',
  description: 'Pronóstico extendido del tiempo para Necochea y Quequén. Datos actualizados en tiempo real.',
};

export default function ClimaPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] pt-8 pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-4xl font-editorial font-bold text-ink mb-2">
            El Clima en Necochea
          </h1>
          <p className="text-muted text-lg">
            Pronóstico extendido y condiciones actuales para la ciudad y la zona.
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-border p-2 md:p-6 mb-8 overflow-hidden">
          <div className="w-full relative rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            <a
              className="weatherwidget-io"
              href="https://forecast7.com/es/n38d55n58d74/necochea/"
              data-label_1="NECOCHEA"
              data-label_2="Pronóstico del tiempo"
              data-font="Roboto"
              data-icons="Climacons Animated"
              data-theme="original"
              data-basecolor="#1a1a1a"
              data-accent="#008060"
            >
              NECOCHEA Pronóstico del tiempo
            </a>
            {/* El script de WeatherWidget */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src='https://weatherwidget.io/js/widget.min.js';fjs.parentNode.insertBefore(js,fjs);}}(document,'script','weatherwidget-io-js');
                `,
              }}
            />
          </div>
        </section>
        
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center gap-2">
              <span>🌊</span> Estado del Mar
            </h3>
            <p className="text-muted text-sm leading-relaxed mb-4">
              Para información detallada sobre las tablas de mareas, altura del oleaje y temperatura del agua, recomendamos consultar a Prefectura Naval Argentina o sitios especializados en surf.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center gap-2">
              <span>☀️</span> Índice UV
            </h3>
            <p className="text-muted text-sm leading-relaxed mb-4">
              Durante la temporada de verano (diciembre a marzo), el índice UV en Necochea suele ser extremo entre las 11:00 y las 16:00 horas. Protegé tu piel.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
