"use client";

type Props = {
  value: string;
  secciones: string[];
  onChange: (seccion: string) => void;
  /** Ya no se usa: las secciones son las oficiales del portal y no se crean desde acá. */
  onCrear?: (seccion: string) => void;
  /** Tamaño reducido (tarjetas de publicadas). */
  compacto?: boolean;
  placeholderNueva?: string;
  /** Texto extra a la derecha (ej. sugerencia). */
  children?: React.ReactNode;
};

/** Selector de sección. Solo ofrece las oficiales del portal: no se pueden crear secciones nuevas desde acá. */
export default function SeccionSelect({
  value,
  secciones,
  onChange,
  compacto = false,
  children,
}: Props) {
  // Una nota vieja puede tener una sección que ya no existe: se muestra marcada para poder corregirla.
  const opciones = value && !secciones.includes(value) ? [...secciones, value] : secciones;
  const selectCls = compacto
    ? "text-[10px] border border-border rounded px-1.5 py-1 outline-none focus:border-accent bg-gray-50"
    : "text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-gray-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {opciones.map((sec) => (
          <option key={sec} value={sec}>
            {secciones.includes(sec) ? sec : `${sec} (ya no existe)`}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}
