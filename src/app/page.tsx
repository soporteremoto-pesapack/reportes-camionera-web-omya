
import { LogOut } from "lucide-react";
import { MovimientosDashboard } from "@/components/movimientos-dashboard";
import { logoutAction } from "@/app/login/actions";

const Logo = () => (
  <svg
    id="Capa_1"
    data-name="Capa 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60.59 66.74"
    width="40"
    height="40"
  >
    <path
      style={{ fill: '#dea245' }}
      d="M59.14,43.58c-1.77-1.39-3.73-2.47-6.07-2.13l-22.87,6.67c-1.08-.01-2.51.55-3.59.84-6.37,1.73-12.59,4.04-19,5.63-4.92.45-8.43-3.84-7.44-8.64.16-.79.89-2.01,1.29-2.78C8.39,29.65,17.4,16.59,24.5,3.08c2.59-3.82,8.33-4.2,11.16-.48,7.35,13.71,16.59,27.1,23.48,40.99Z"
    />
    <path
      style={{ fill: '#747478' }}
      d="M60.33,61.05c.06.53.06.63-.4.91-.69.41-2.83,1.02-3.72,1.31-14.6,4.65-40.04,4.87-54.36-.78-.69-.27-2.23-.56-1.67-1.44,20.06-.16,40.07-.16,60.15,0Z"
    />
    <path
      style={{ fill: '#3992af' }}
      d="M59.14,43.58c.57,1.15,1.25,1.85,1.41,3.26.53,4.84-3.63,8.37-8.36,7.64-5.76-.89-13.17-4.28-19.12-5.75-.84-.21-2.05-.59-2.87-.6l22.87-6.67c2.35-.35,4.3.73,6.07,2.13Z"
    />
  </svg>
);


export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-auto items-center justify-between gap-4 border-b bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-6">
         <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full">
              <Logo />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Reportes Camionera Dosipack - Omya Río Claro
              </h1>
              <p className="text-xs text-muted-foreground">
                Consulta de movimientos de pesaje
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 md:gap-8">
        <MovimientosDashboard />
      </main>
    </div>
  );
}
