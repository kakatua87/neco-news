/**
 * Cálculos del panel "Uso de IA". Puros (sin acceso a la base) para poder probarlos.
 *
 * Google no informa por API cuánta cuota le queda a una key: el "usado" sale de las llamadas que registra el
 * scraper en `llm_uso` y el límite de la tabla `ia_limites` (cargada desde Google AI Studio, editable).
 * Las cuotas de Gemini son por PROYECTO de Google (no por key) y se reinician a la medianoche del Pacífico.
 */

export type FilaUso = {
  ts: string;
  proveedor: string;
  key_alias: string | null;
  modelo: string | null;
  proposito: string | null;
  noticia_id: string | null;
  tokens_in: number;
  tokens_out: number;
  ok: boolean;
  codigo: number | null;
  restante: Record<string, string | null> | null;
};

export type LimiteModelo = { rpm: number | null; rpd: number | null; tpm: number | null; tpd?: number | null };
export type IaLimites = {
  modelos: Record<string, LimiteModelo>;
  /** Últimos 4 caracteres de la key → id del proyecto de Google al que pertenece. */
  keys: Record<string, string>;
};

export const LIMITES_POR_DEFECTO: IaLimites = { modelos: {}, keys: {} };
export const SOLICITUDES_POR_NOTA_INICIAL = 5; // hasta tener datos propios

const MS_DIA = 24 * 3600 * 1000;

/** Instante (UTC) en que empezó el día actual en el huso del Pacífico (donde Google reinicia la cuota diaria). */
export function inicioDiaPacifico(ahora: Date): Date {
  const dia = ahora.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD
  const [y, m, d] = dia.split("-").map(Number);
  for (const offset of [7, 8]) {
    // Medianoche del Pacífico = 07:00 UTC con horario de verano (PDT) u 08:00 UTC sin él (PST).
    const candidato = new Date(Date.UTC(y, m - 1, d, offset));
    const hora = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", hourCycle: "h23" }).format(candidato)
    );
    if (hora === 0) return candidato;
  }
  return new Date(Date.UTC(y, m - 1, d, 8));
}

export function proximoReinicioGemini(ahora: Date): Date {
  return new Date(inicioDiaPacifico(ahora).getTime() + MS_DIA);
}

/** Inicio del día UTC (Groq reinicia su cupo diario con ventana móvil; se informa también lo que devuelve su API). */
export function inicioDiaUtc(ahora: Date): Date {
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

export function ultimos4(alias: string | null): string {
  if (!alias) return "";
  const i = alias.lastIndexOf("…");
  return i >= 0 ? alias.slice(i + 1) : alias.slice(-4);
}

export type BarraModelo = {
  modelo: string;
  solicitudes: number;
  errores429: number;
  otrosErrores: number;
  tokens: number;
  limiteRpd: number | null;
  limiteRpm: number | null;
  limiteTpd: number | null;
  /** Restante informado por el proveedor (Groq), si lo hay. */
  restanteReal: { solicitudes: number | null; reinicio: string | null } | null;
  agotadaAhora: boolean;
};

export type BarraProyecto = {
  proyecto: string;
  proveedor: string;
  keys: string[]; // alias visibles ("gemini#2 …JcNg")
  modelos: BarraModelo[];
  reinicioISO: string | null;
};

/**
 * Consumo del día por proyecto y modelo. Gemini: día del Pacífico; otros proveedores: día UTC.
 * Solo cuentan como solicitud las respuestas que el modelo atendió (ok); los 429 se muestran aparte.
 */
export function barrasDelDia(filas: FilaUso[], limites: IaLimites, ahora: Date): BarraProyecto[] {
  const hoyGemini = inicioDiaPacifico(ahora).getTime();
  const hoyOtros = inicioDiaUtc(ahora).getTime();
  const hace1h = ahora.getTime() - 3600 * 1000;
  const grupos = new Map<string, BarraProyecto & { mapa: Map<string, BarraModelo> }>();

  const nuevoModelo = (nombre: string): BarraModelo => {
    const lim = limites.modelos[nombre];
    return {
      modelo: nombre,
      solicitudes: 0,
      errores429: 0,
      otrosErrores: 0,
      tokens: 0,
      limiteRpd: lim?.rpd ?? null,
      limiteRpm: lim?.rpm ?? null,
      limiteTpd: lim?.tpd ?? null,
      restanteReal: null,
      agotadaAhora: false,
    };
  };

  // Todos los proyectos de Gemini conocidos con todos sus modelos con límite, aunque hoy no hayan tenido uso.
  const modelosGemini = Object.keys(limites.modelos).filter((m) => m.startsWith("gemini"));
  for (const [sufijo, proyecto] of Object.entries(limites.keys)) {
    let g = grupos.get(proyecto);
    if (!g) {
      g = {
        proyecto,
        proveedor: "gemini",
        keys: [],
        modelos: [],
        mapa: new Map(),
        reinicioISO: proximoReinicioGemini(ahora).toISOString(),
      };
      for (const nombre of modelosGemini) {
        const b = nuevoModelo(nombre);
        g.mapa.set(nombre, b);
        g.modelos.push(b);
      }
      grupos.set(proyecto, g);
    }
    g.keys.push(`…${sufijo}`);
  }

  for (const f of filas) {
    const t = new Date(f.ts).getTime();
    const gemini = f.proveedor === "gemini";
    if (t < (gemini ? hoyGemini : hoyOtros)) continue;
    const proyecto = gemini
      ? limites.keys[ultimos4(f.key_alias)] || `Sin asignar (${f.key_alias ?? "?"})`
      : f.proveedor === "groq"
        ? "Groq"
        : "Claude";
    let g = grupos.get(proyecto);
    if (!g) {
      g = {
        proyecto,
        proveedor: f.proveedor,
        keys: [],
        modelos: [],
        mapa: new Map(),
        reinicioISO: gemini ? proximoReinicioGemini(ahora).toISOString() : null,
      };
      grupos.set(proyecto, g);
    }
    const visible = f.key_alias && f.proveedor === "gemini" ? `…${ultimos4(f.key_alias)}` : f.key_alias;
    if (visible && !g.keys.includes(visible)) g.keys.push(visible);
    const nombreModelo = f.modelo || "?";
    let b = g.mapa.get(nombreModelo);
    if (!b) {
      b = nuevoModelo(nombreModelo);
      g.mapa.set(nombreModelo, b);
      g.modelos.push(b);
    }
    if (f.ok) {
      b.solicitudes += 1;
      b.tokens += (f.tokens_in || 0) + (f.tokens_out || 0);
    } else if (f.codigo === 429) {
      b.errores429 += 1;
      if (t >= hace1h) b.agotadaAhora = true;
    } else {
      b.otrosErrores += 1;
    }
    if (f.restante && f.restante.solicitudes_dia != null) {
      b.restanteReal = {
        solicitudes: Number(f.restante.solicitudes_dia),
        reinicio: f.restante.reinicio_solicitudes ?? null,
      };
    }
  }
  return Array.from(grupos.values())
    .map((g): BarraProyecto => ({
      proyecto: g.proyecto,
      proveedor: g.proveedor,
      keys: g.keys,
      reinicioISO: g.reinicioISO,
      modelos: g.modelos.sort((a, b) => b.solicitudes - a.solicitudes),
    }))
    .sort((a, b) => a.proyecto.localeCompare(b.proyecto));
}

export type ConsumoNotas = {
  notas: number;
  solicitudesPromedio: number;
  tokensPromedio: number;
  tokensMin: number;
  tokensMax: number;
  porProposito: { proposito: string; solicitudes: number; tokens: number }[];
};

/** Consumo promedio por nota publicada (solo llamadas atribuidas a una nota publicada). */
export function consumoPorNota(filas: FilaUso[], publicadas: Set<string>): ConsumoNotas {
  const porNota = new Map<string, { sol: number; tok: number; props: Map<string, { sol: number; tok: number }> }>();
  for (const f of filas) {
    if (!f.noticia_id || !publicadas.has(f.noticia_id)) continue;
    let n = porNota.get(f.noticia_id);
    if (!n) {
      n = { sol: 0, tok: 0, props: new Map() };
      porNota.set(f.noticia_id, n);
    }
    const tok = (f.tokens_in || 0) + (f.tokens_out || 0);
    const sol = f.ok ? 1 : 0;
    n.sol += sol;
    n.tok += tok;
    const p = f.proposito || "otro";
    const acc = n.props.get(p) ?? { sol: 0, tok: 0 };
    acc.sol += sol;
    acc.tok += tok;
    n.props.set(p, acc);
  }
  const cantidad = porNota.size;
  if (cantidad === 0) {
    return { notas: 0, solicitudesPromedio: 0, tokensPromedio: 0, tokensMin: 0, tokensMax: 0, porProposito: [] };
  }
  const tokens = Array.from(porNota.values()).map((n) => n.tok);
  const props = new Map<string, { sol: number; tok: number }>();
  for (const n of porNota.values()) {
    for (const [p, v] of n.props) {
      const acc = props.get(p) ?? { sol: 0, tok: 0 };
      acc.sol += v.sol;
      acc.tok += v.tok;
      props.set(p, acc);
    }
  }
  const sumaSol = Array.from(porNota.values()).reduce((s, n) => s + n.sol, 0);
  return {
    notas: cantidad,
    solicitudesPromedio: sumaSol / cantidad,
    tokensPromedio: tokens.reduce((s, t) => s + t, 0) / cantidad,
    tokensMin: Math.min(...tokens),
    tokensMax: Math.max(...tokens),
    porProposito: Array.from(props, ([proposito, v]) => ({
      proposito,
      solicitudes: v.sol / cantidad,
      tokens: v.tok / cantidad,
    })).sort((a, b) => b.tokens - a.tokens),
  };
}

export type Capacidad = {
  /** Notas más que se pueden publicar hoy con lo que queda (aprox.). */
  notasRestantes: number | null;
  solicitudesRestantes: number;
  porNota: number;
  estimadoInicial: boolean;
  limitante: string | null;
};

/**
 * Notas que se pueden publicar todavía hoy: solicitudes (RPD) que quedan en todos los pares proyecto/modelo de
 * Gemini con límite conocido, divididas por las solicitudes que consume una nota (promedio real; 5 al principio).
 */
export function capacidadRestante(barras: BarraProyecto[], consumo: ConsumoNotas): Capacidad {
  let restantes = 0;
  let conLimite = 0;
  let limitante: { nombre: string; restante: number } | null = null;
  for (const p of barras) {
    if (p.proveedor !== "gemini") continue;
    for (const m of p.modelos) {
      if (m.limiteRpd == null) continue;
      conLimite += 1;
      const r = Math.max(0, m.limiteRpd - m.solicitudes);
      restantes += r;
      if (!limitante || r < limitante.restante) limitante = { nombre: `${m.modelo} (${p.proyecto})`, restante: r };
    }
  }
  const estimadoInicial = consumo.notas < 3 || consumo.solicitudesPromedio <= 0;
  const porNota = estimadoInicial ? SOLICITUDES_POR_NOTA_INICIAL : consumo.solicitudesPromedio;
  return {
    notasRestantes: conLimite === 0 ? null : Math.floor(restantes / porNota),
    solicitudesRestantes: restantes,
    porNota,
    estimadoInicial,
    limitante: limitante?.nombre ?? null,
  };
}
