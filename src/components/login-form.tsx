"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(196,55%,42%)] via-[hsl(196,50%,48%)] to-[hsl(40,71%,55%)] font-semibold text-white shadow-lg shadow-[hsl(196,50%,45%)]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(40,71%,57%)]/30 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* brillo que cruza el botón al pasar el cursor */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Verificando…
        </>
      ) : (
        <>
          Ingresar
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-white/70"
        >
          Contraseña de acceso
        </label>
        <div className="group relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-[hsl(40,71%,62%)]" />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            placeholder="••••••••••"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-12 pr-12 text-white placeholder:text-white/30 shadow-inner backdrop-blur-md transition-all duration-300 focus:border-[hsl(40,71%,57%)]/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(196,50%,55%)]/40"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition-colors hover:text-white/80"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {state.error && (
        <div
          role="alert"
          className="flex animate-shake items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 backdrop-blur-sm"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
