import React from 'react';
import WindguruWidget from '@/components/WindguruWidget';

export const metadata = {
  title: 'El Clima en Necochea | Neco Now',
  description: 'Pronóstico extendido del tiempo para Necochea y Quequén. Datos actualizados en tiempo real.',
};

export default function ClimaPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] pt-8 pb-16 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        <header className="mb-8 border-b border-border pb-6 text-center">
          <h1 className="text-4xl font-editorial font-bold text-ink mb-2">
            El Clima en Necochea
          </h1>
          <p className="text-muted text-lg">
            Pronóstico extendido y condiciones actuales para la ciudad y la zona.
          </p>
        </header>

        {/* Widget Windguru */}
        <section className="bg-white rounded-xl shadow-sm border border-border p-4 md:p-6 mb-8 overflow-x-auto">
          <h2 className="text-lg font-bold text-ink mb-4 text-center">
            🌬️ Pronóstico Extendido · Necochea
          </h2>
          <WindguruWidget />
        </section>

        {/* Info extra */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-border shadow-sm text-center">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center justify-center gap-2">
              <span>🌊</span> Estado del Mar
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Para información detallada sobre tablas de mareas, altura del oleaje y temperatura del agua, consultá Prefectura Naval Argentina o sitios especializados en surf.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border shadow-sm text-center">
            <h3 className="font-bold text-ink mb-3 text-lg flex items-center justify-center gap-2">
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
