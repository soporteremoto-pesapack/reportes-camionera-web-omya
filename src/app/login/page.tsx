import { LoginForm } from "@/components/login-form";

const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60.59 66.74"
    width="48"
    height="48"
    className="drop-shadow-[0_4px_12px_rgba(222,162,69,0.45)]"
  >
    <path
      style={{ fill: "#dea245" }}
      d="M59.14,43.58c-1.77-1.39-3.73-2.47-6.07-2.13l-22.87,6.67c-1.08-.01-2.51.55-3.59.84-6.37,1.73-12.59,4.04-19,5.63-4.92.45-8.43-3.84-7.44-8.64.16-.79.89-2.01,1.29-2.78C8.39,29.65,17.4,16.59,24.5,3.08c2.59-3.82,8.33-4.2,11.16-.48,7.35,13.71,16.59,27.1,23.48,40.99Z"
    />
    <path
      style={{ fill: "#747478" }}
      d="M60.33,61.05c.06.53.06.63-.4.91-.69.41-2.83,1.02-3.72,1.31-14.6,4.65-40.04,4.87-54.36-.78-.69-.27-2.23-.56-1.67-1.44,20.06-.16,40.07-.16,60.15,0Z"
    />
    <path
      style={{ fill: "#3992af" }}
      d="M59.14,43.58c.57,1.15,1.25,1.85,1.41,3.26.53,4.84-3.63,8.37-8.36,7.64-5.76-.89-13.17-4.28-19.12-5.75-.84-.21-2.05-.59-2.87-.6l22.87-6.67c2.35-.35,4.3.73,6.07,2.13Z"
    />
  </svg>
);

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[hsl(197,40%,12%)] px-4 py-10">
      {/* Fondo: degradado animado + manchas de color desenfocadas (glassmorphism) */}
      <div className="pointer-events-none absolute inset-0 animate-gradient bg-[linear-gradient(130deg,hsl(197,42%,10%),hsl(196,45%,18%),hsl(197,38%,14%),hsl(40,40%,16%))] bg-[length:300%_300%]" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-[hsl(196,60%,45%)]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] animate-blob rounded-full bg-[hsl(40,71%,57%)]/25 blur-3xl [animation-delay:3s]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 animate-blob rounded-full bg-[hsl(220,8%,46%)]/20 blur-3xl [animation-delay:6s]" />
      {/* Textura sutil de rejilla */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px]" />

      {/* Tarjeta de vidrio */}
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* halo degradado alrededor de la tarjeta */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[hsl(196,60%,55%)]/40 via-white/10 to-[hsl(40,71%,57%)]/40 opacity-70 blur-[2px]" />

        <div className="relative rounded-3xl border border-white/15 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-md">
              <Logo />
            </div>
            <h1 className="bg-gradient-to-r from-white via-white to-[hsl(40,71%,72%)] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Reportes Camionera
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Dosipack · Omya Río Claro
            </p>
            <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <p className="mb-6 text-sm text-white/65">
              Acceso restringido. Ingresa la contraseña para continuar.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-white/35">
            Plataforma de consulta de movimientos de pesaje
          </p>
        </div>
      </div>
    </main>
  );
}
