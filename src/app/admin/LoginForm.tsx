"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4 font-sans">
      <form action={action} className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <img src="/logo-oficial.png" alt="Neco Beat" className="h-8 w-auto object-contain" />
        </div>
        <h1 className="text-xl font-bold text-center text-ink mb-6">Acceso a Redacción</h1>

        {state.error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

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
              placeholder="redactor@neconow.com"
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
          <button
            disabled={pending}
            className="w-full bg-accent hover:bg-accent-dark text-white font-medium rounded-lg px-4 py-2.5 transition-colors mt-2 disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </div>
      </form>
    </main>
  );
}
