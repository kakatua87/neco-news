import React from 'react';
import Script from 'next/script';

export const metadata = {
  title: 'El Clima en Necochea | Neco Now',
  description: 'Pronóstico extendido del tiempo para Necochea y Quequén. Datos actualizados en tiempo real.',
};

export default function ClimaPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] pt-8 pb-16 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-4xl font-editorial font-bold text-ink mb-2">
            El Clima en Necochea
          </h1>
          <p className="text-muted text-lg">
            Pronóstico extendido y condiciones actuales para la ciudad y la zona.
          </p>
        </header>

        {/* Widget Windguru principal */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 md:p-6 mb-8 overflow-x-auto">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span>🌬️</span> Pronóstico Extendido · Necochea
          </h2>
          <div
            id="wg_fwdg_8170_100_1778505370023"
            className="w-full"
            style={{ minHeight: '240px' }}
          />
          <Script
            id="windguru-widget"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function (window, document) {
                  var loader = function () {
                    var arg = [
                      "s=8170","m=100",
                      "uid=wg_fwdg_8170_100_1778505370023",
                      "wj=knots","tj=c","waj=m","tij=cm",
                      "odh=0","doh=24","fhours=240","hrsm=2",
                      "vt=forecasts","lng=es","idbs=1",
                      "p=WINDSPD,GUST,SMER,TMPE,CDC,APCP1s"
                    ];
                    var script = document.createElement("script");
                    var tag = document.getElementsByTagName("script")[0];
                    script.src = "https://www.windguru.cz/js/widget.php?" + (arg.join("&"));
                    tag.parentNode.insertBefore(script, tag);
                  };
                  window.addEventListener
                    ? window.addEventListener("load", loader, false)
                    : window.attachEvent("onload", loader);
                })(window, document);
              `,
            }}
          />
          {/* Estilos para adaptar el widget a nuestra paleta y tipografía */}
          <style>{`
            #wg_fwdg_8170_100_1778505370023 table,
            #wg_fwdg_8170_100_1778505370023 td,
            #wg_fwdg_8170_100_1778505370023 th {
              font-family: 'Inter', system-ui, sans-serif !important;
              font-size: 12px !important;
            }
            #wg_fwdg_8170_100_1778505370023 .wgfwdf_hd {
              background: #111827 !important;
              color: #ffffff !important;
              font-weight: 700 !important;
              letter-spacing: 0.05em !important;
            }
            #wg_fwdg_8170_100_1778505370023 .wgfwdf_hd a {
              color: #1B8B7A !important;
            }
            #wg_fwdg_8170_100_1778505370023 tr:nth-child(even) td {
              background: #f8f9fa !important;
            }
            #wg_fwdg_8170_100_1778505370023 td {
              color: #111827 !important;
              border-color: rgba(0,0,0,0.06) !important;
            }
            #wg_fwdg_8170_100_1778505370023 .wg_fwdg_sup a {
              color: #6B7280 !important;
              font-size: 10px !important;
            }
          `}</style>
        </section>

        {/* Widget clima general (ya existente) */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 md:p-6 mb-8 overflow-hidden">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span>☁️</span> Condiciones Actuales
          </h2>
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
            <Script
              id="weatherwidget-io-js"
              src="https://weatherwidget.io/js/widget.min.js"
              strategy="lazyOnload"
            />
          </div>
        </section>

        {/* Info extra */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center gap-2">
              <span>🌊</span> Estado del Mar
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Para información detallada sobre tablas de mareas, altura del oleaje y temperatura del agua, consultá Prefectura Naval Argentina o sitios especializados en surf.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center gap-2">
              <span>☀️</span> Índice UV
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Durante la temporada de verano (diciembre a marzo), el índice UV en Necochea suele ser extremo entre las 11:00 y las 16:00 horas. Protegé tu piel.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
