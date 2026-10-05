import { redirect } from "next/navigation";

// Mantiene la entrada de siempre: /admin abre la bandeja. El acceso lo filtra layout.tsx.
export default function AdminIndexPage() {
  redirect("/admin/bandeja");
}
