import type { ReactNode } from "react";
import AdminShell from "./AdminShell";
import LoginForm from "./LoginForm";
import { logoutAction } from "./actions";
import { getEsAdmin, getUsuario } from "./_lib/guard";
import { getInboxCount, getStats } from "./_lib/data";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getUsuario();
  if (!user) return <LoginForm />;

  if (!(await getEsAdmin())) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-ink mb-2">Sin permiso</h1>
          <p className="text-sm text-muted mb-6">
            La cuenta {user.email} no tiene acceso a la redacción. Si creés que es un error, pedile acceso a un administrador.
          </p>
          <form action={logoutAction}>
            <button className="w-full bg-accent hover:bg-accent-dark text-white font-medium rounded-lg px-4 py-2.5 transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </main>
    );
  }

  const [stats, inboxCount] = await Promise.all([getStats(), getInboxCount()]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-ink font-sans">
      <AdminShell inboxCount={inboxCount} pendientesCount={stats.pendientes}>
        {children}
      </AdminShell>
    </div>
  );
}
