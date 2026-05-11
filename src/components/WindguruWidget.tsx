"use client";

import { useEffect } from "react";

export default function WindguruWidget() {
  useEffect(() => {
    // Si el widget ya fue cargado antes, no duplicar
    if (document.getElementById("windguru-script-loaded")) return;

    const arg = [
      "s=8170", "m=100",
      "uid=wg_fwdg_8170_100_1778505370023",
      "wj=knots", "tj=c", "waj=m", "tij=cm",
      "odh=0", "doh=24", "fhours=240", "hrsm=2",
      "vt=forecasts", "lng=es", "idbs=1",
      "p=WINDSPD,GUST,SMER,TMPE,CDC,APCP1s",
    ];

    const script = document.createElement("script");
    script.id = "windguru-script-loaded";
    script.src = "https://www.windguru.cz/js/widget.php?" + arg.join("&");
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // No eliminamos el script al desmontar para evitar re-cargas al navegar
    };
  }, []);

  return (
    <>
      <div
        id="wg_fwdg_8170_100_1778505370023"
        className="w-full"
        style={{ minHeight: "260px" }}
      />
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
        #wg_fwdg_8170_100_1778505370023 .wgfwdf_hd a,
        #wg_fwdg_8170_100_1778505370023 .wgfwdf_hd a:visited {
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
    </>
  );
}
