"use client"

import { useState } from "react"
import { Menu, Bell, Search } from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MetricsCards } from "@/components/metrics-cards"
import { ProjectsTable } from "@/components/projects-table"
import { Button } from "@/components/ui/button"
import {
  projects,
  costoTotal,
  REVENUE_MARKUP,
} from "@/lib/projects-data"

export function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activos = projects.filter((p) => p.estado !== "completed").length
  const costoMO = projects.reduce((sum, p) => sum + p.costoMO, 0)
  const costoInsumos = projects.reduce((sum, p) => sum + p.costoInsumos, 0)
  const costoTotalGlobal = projects.reduce((sum, p) => sum + costoTotal(p), 0)
  const rentabilidad = costoTotalGlobal * REVENUE_MARKUP

  return (
    <div className="flex min-h-svh overflow-x-hidden bg-background">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Panel de Costos
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Resumen general de proyectos y rentabilidad
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Buscar"
              className="hidden sm:inline-flex"
            >
              <Search className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notificaciones">
              <Bell className="size-5" />
            </Button>
            <div className="ml-1 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              MR
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <MetricsCards
            activos={activos}
            costoMO={costoMO}
            costoInsumos={costoInsumos}
            rentabilidad={rentabilidad}
          />
          <ProjectsTable projects={projects} />
        </main>
      </div>
    </div>
  )
}
