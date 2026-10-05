import { redirect } from "next/navigation";

// Los envíos ciudadanos ahora viven dentro de la Bandeja de Entrada (filtro "Ciudadanos").
export default function EnviosPage() {
  redirect("/admin/bandeja?origen=ciudadano");
}
