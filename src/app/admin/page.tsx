import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import AdminPanel from "@/app/admin/AdminPanel";
import { getPendientes } from "@/lib/noticias";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/admin?error=Credenciales+inválidas");
  }
  redirect("/admin");
}


async function getStats() {
  const supabase = await createSupabaseServerClient();
  
  const [pub, pen, des] = await Promise.all([
    supabase.from("noticias").select("id", { count: "exact", head: true }).eq("estado", "publicada"),
    supabase.from("noticias").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("noticias").select("id", { count: "exact", head: true }).eq("estado", "descartada"),
  ]);

  return {
    publicadas: pub.count ?? 0,
    pendientes: pen.count ?? 0,
    descartadas: des.count ?? 0,
  };
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthed = !!session;

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-4 font-sans">
        <form action={login} className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Neco News" width={150} height={40} className="h-8 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-center text-ink mb-6">Acceso a Redacción</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="w-full border border-border-strong rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="redactor@neconews.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1" htmlFor="password">
                Clave de acceso
              </label>
              <input
                id="password"
                type="password"
                name="password"
                className="w-full border border-border-strong rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
                required
              />
            </div>
            <button className="w-full bg-accent hover:bg-accent-dark text-white font-medium rounded-lg px-4 py-2.5 transition-colors mt-2">
              Ingresar al sistema
            </button>
          </div>
        </form>
      </main>
    );
  }

  const [pendientes, stats] = await Promise.all([
    getPendientes(80),
    getStats(),
  ]);

  const initialItems = pendientes.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    seccion: n.seccion,
    imagen_url: n.imagen_url,
    created_at: n.created_at,
  }));

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-ink font-sans">
      <AdminPanel initialItems={initialItems} stats={stats} />
    </main>
  );
}
