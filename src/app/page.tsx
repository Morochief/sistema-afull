import { MetricsCards } from "@/components/metrics-cards"
import { ProjectsTable } from "@/components/projects-table"
import { prisma } from "@/lib/prisma"

// Forzamos a que sea dinámico si queremos que siempre traiga datos frescos
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // Obtenemos los proyectos activos de la DB
  const proyectosDb = await prisma.proyectos.findMany({
    include: {
      cliente: true,
    }
  })

  // Obtenemos las métricas desde la vista materializada o virtual
  const metricsDb = await prisma.reporteCostosProyectos.findMany()

  const metricsMap = new Map(metricsDb.map(m => [m.proyecto_id, m]))

  // Mapeamos para el formato de la tabla
  const projectsData = proyectosDb.map(p => {
    const pMetrics = metricsMap.get(p.id)
    
    // Si la DB devuelve nulls los pasamos a 0
    const mo = pMetrics?.total_mo?.toNumber() || 0
    const insumos = pMetrics?.total_insumos?.toNumber() || 0
    
    // Asumimos 350 como costo promedio hora
    const horasEstimadas = Math.round(mo / 350)
    
    return {
      id: p.id,
      cliente: p.cliente.nombre,
      proyecto: p.nombre,
      totalHoras: horasEstimadas,
      costoMO: mo,
      costoInsumos: insumos,
      estado: p.estado || "in_progress",
    }
  })

  const activos = projectsData.filter((p) => p.estado !== "completed").length
  const costoMO = projectsData.reduce((sum, p) => sum + p.costoMO, 0)
  const costoInsumos = projectsData.reduce((sum, p) => sum + p.costoInsumos, 0)
  const rentabilidad = (costoMO + costoInsumos) * 0.35 // 35% markup ejemplo

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Costos</h1>
        <p className="text-muted-foreground">Resumen general de proyectos y costos reales (PostgreSQL).</p>
      </div>
      
      <MetricsCards
        activos={activos}
        costoMO={costoMO}
        costoInsumos={costoInsumos}
        rentabilidad={rentabilidad}
      />
      <ProjectsTable projects={projectsData} />
    </div>
  )
}
