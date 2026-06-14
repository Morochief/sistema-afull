import type React from "react"
import { AppProvider } from "@/context/AppContext"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AppHeader } from "@/components/app-header"
import { Home, PlusCircle } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import "./globals.css"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch catalogs for AppProvider
  let insumos = [];
  let colaboradores = [];
  let proyectos = [];
  
  try {
    insumos = await prisma.insumos.findMany({ where: { activo: true } });
    colaboradores = await prisma.colaboradores.findMany({ where: { activo: true } });
    proyectos = await prisma.proyectos.findMany({ where: { estado: 'in_progress' } });
  } catch (e) {
    console.error("No database connection yet");
  }

  return (
    <html lang="es">
      <body>
        <AppProvider 
          insumosCatalogo={insumos} 
          colaboradoresCatalogo={colaboradores} 
          proyectosCatalogo={proyectos}
        >
          <div className="flex min-h-dvh w-full flex-col bg-muted/40 md:flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <DashboardSidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14 md:pl-0">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                <AppHeader />
              </header>
              <main className="flex-1 items-start p-4 sm:px-6 sm:py-0 md:gap-8 overflow-y-auto pb-20 md:pb-4">
                {children}
              </main>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background px-4 md:hidden">
              <Link href="/" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Dashboard</span>
              </Link>
              <Link href="/registro" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                <PlusCircle className="h-5 w-5" />
                <span className="text-xs font-medium">Registrar</span>
              </Link>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
