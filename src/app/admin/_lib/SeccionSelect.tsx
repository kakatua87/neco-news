"use client";

type Props = {
  value: string;
  secciones: string[];
  onChange: (seccion: string) => void;
  /** Se llama cuando el usuario escribe una sección nueva (Enter) antes de `onChange`. */
  onCrear?: (seccion: string) => void;
  /** Tamaño reducido (tarjetas de publicadas). */
  compacto?: boolean;
  placeholderNueva?: string;
  /** Texto extra a la derecha (ej. sugerencia). */
  children?: React.ReactNode;
};

/** Selector de sección con alta rápida de una nueva (única versión; antes estaba copiado 3 veces). */
export default function SeccionSelect({
  value,
  secciones,
  onChange,
  onCrear,
  compacto = false,
  placeholderNueva,
  children,
}: Props) {
  const selectCls = compacto
    ? "text-[10px] border border-border rounded px-1.5 py-1 outline-none focus:border-accent bg-gray-50"
    : "text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-gray-50";
  const inputCls = compacto
    ? "text-[10px] border border-border rounded px-1.5 py-1 w-20 outline-none focus:border-accent"
    : "text-xs border border-border rounded px-2 py-1.5 w-32 outline-none focus:border-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {secciones.map((sec) => (
          <option key={sec} value={sec}>
            {sec}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder={placeholderNueva ?? (compacto ? "Nueva..." : "Nueva sección...")}
        className={inputCls}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !e.currentTarget.value.trim()) return;
          const val = e.currentTarget.value.trim();
          if (!secciones.includes(val)) onCrear?.(val);
          onChange(val);
          e.currentTarget.value = "";
        }}
      />
      {children}
    </div>
  );
}
