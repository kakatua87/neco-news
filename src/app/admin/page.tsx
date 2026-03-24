import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminPanel from "@/app/admin/AdminPanel";
import { getPendientes } from "@/lib/noticias";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD no configurada.");
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin?error=1");
  }
  const cookieStore = await cookies();
  cookieStore.set("admin_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get("admin_auth")?.value === "ok";

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-[#f8f6f1] flex items-center justify-center px-4">
        <form action={login} className="w-full max-w-sm border border-[#0f0f0f] p-6 bg-white">
          <h1 className="font-serif text-3xl mb-4">Admin Neco News</h1>
          <label className="block text-sm mb-2" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            name="password"
            className="w-full border border-[#0f0f0f]/25 p-2"
            required
          />
          <button className="mt-4 w-full bg-[#0f0f0f] text-[#f8f6f1] py-2">Ingresar</button>
        </form>
      </main>
    );
  }

  const pendientes = await getPendientes(80);
  const initialItems = pendientes.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    seccion: n.seccion,
  }));

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#0f0f0f] p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <AdminPanel initialItems={initialItems} />
      </div>
    </main>
  );
}
