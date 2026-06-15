import type React from "react"
import { AppProvider } from "@/context/AppContext"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AppHeader } from "@/components/app-header"
import { Home, PlusCircle, FolderKanban, Boxes, Users } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { Toaster } from "sonner"
import "../globals.css"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch catalogs for AppProvider
  let insumos: any[] = [];
  let colaboradores: any[] = [];
  let proyectos: any[] = [];

  try {
    insumos = await prisma.insumos.findMany({ where: { activo: true } });
    colaboradores = await prisma.colaboradores.findMany({ where: { activo: true } });
    proyectos = await prisma.proyectos.findMany({ where: { estado: 'in_progress' } });
  } catch (e) {
    console.error("No database connection yet");
  }

  // Get session user
  const session = await getSession();
  const userName = session?.nombre || "Colaborador";

  return (
    <AppProvider
      insumosCatalogo={insumos}
      colaboradoresCatalogo={colaboradores}
      proyectosCatalogo={proyectos}
    >
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground"
      >
        Saltar al contenido principal
      </a>

      <div className="flex min-h-dvh w-full flex-col bg-muted/40 md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block" aria-label="Navegación principal">
          <DashboardSidebar userName={userName} />
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14 md:pl-0">
          <header
            className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden"
            role="banner"
          >
            <AppHeader name={userName} />
          </header>

          <main
            id="main-content"
            className="flex-1 items-start p-4 sm:px-6 sm:py-0 md:gap-8 overflow-y-auto pb-20 md:pb-4"
            role="main"
          >
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav
          className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background px-4 md:hidden"
          aria-label="Navegación principal móvil"
        >
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Panel de control"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">Panel</span>
          </Link>
          <Link
            href="/proyectos"
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Ver proyectos"
          >
            <FolderKanban className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">Proyectos</span>
          </Link>
          <Link
            href="/registro"
            className="flex flex-col items-center justify-center gap-1 text-primary transition-colors"
            aria-label="Nuevo registro"
          >
            <PlusCircle className="h-5 w-5 scale-110" aria-hidden="true" />
            <span className="text-xs font-semibold">Registrar</span>
          </Link>
          <Link
            href="/insumos"
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Ver insumos"
          >
            <Boxes className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">Insumos</span>
          </Link>
          <Link
            href="/colaboradores"
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Ver equipo"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">Equipo</span>
          </Link>
        </nav>
      </div>
      <Toaster position="top-right" closeButton richColors />
    </AppProvider>
  )
}
