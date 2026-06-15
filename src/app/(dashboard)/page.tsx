import { MetricsCards } from "@/components/metrics-cards"
import { ProjectsTable } from "@/components/projects-table"
import { prisma } from "@/lib/prisma"
import { MARKUP_RATE } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const proyectosDb = await prisma.proyectos.findMany({
    include: { cliente: true }
  })

  // Obtener métricas directas calculadas por los triggers/vistas de la DB
  const metricsDb = await prisma.reporteCostosProyectos.findMany()
  const metricsMap = new Map(metricsDb.map(m => [m.proyecto_id, m]))

  // Obtener registros de mano de obra para calcular horas reales de forma precisa
  const registrosMO = await prisma.registros.findMany({
    where: { tipo: "MO" },
    select: { proyecto_id: true, minutos_calculados: true }
  })

  // Agrupar los minutos reales por ID de proyecto
  const minutosPorProyecto = new Map<string, number>()
  for (const r of registrosMO) {
    if (r.minutos_calculados) {
      const prev = minutosPorProyecto.get(r.proyecto_id) || 0
      minutosPorProyecto.set(r.proyecto_id, prev + r.minutos_calculados)
    }
  }

  const projectsData = proyectosDb.map(p => {
    const pMetrics = metricsMap.get(p.id)
    const mo = pMetrics?.total_mo?.toNumber() || 0
    const insumos = pMetrics?.total_insumos?.toNumber() || 0
    
    // Obtener las horas reales dividiendo los minutos totales de la DB entre 60
    const minutosTotales = minutosPorProyecto.get(p.id) || 0
    const horasReales = Number((minutosTotales / 60).toFixed(1))
    
    return {
      id: p.id,
      cliente: p.cliente.nombre,
      proyecto: p.nombre,
      totalHoras: horasReales,
      costoMO: mo,
      costoInsumos: insumos,
      estado: (p.estado as "in_progress" | "completed" | "on_hold") || "in_progress",
    }
  })

  const activos = projectsData.filter((p) => p.estado !== "completed").length
  const costoMO = projectsData.reduce((sum, p) => sum + p.costoMO, 0)
  const costoInsumos = projectsData.reduce((sum, p) => sum + p.costoInsumos, 0)
  const rentabilidad = (costoMO + costoInsumos) * MARKUP_RATE

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Costos</h1>
        <p className="text-muted-foreground">Resumen general de proyectos y costos reales en tiempo real.</p>
      </div>
      <MetricsCards activos={activos} costoMO={costoMO} costoInsumos={costoInsumos} rentabilidad={rentabilidad} />
      <ProjectsTable projects={projectsData} />
    </div>
  )
}
