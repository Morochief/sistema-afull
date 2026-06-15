// Tipos y utilidades de proyectos — limpio de datos dummy

export type ProjectStatus = "in_progress" | "completed" | "on_hold"

export type Project = {
  id: string
  cliente: string
  proyecto: string
  totalHoras: number
  costoMO: number
  costoInsumos: number
  estado: ProjectStatus
}

export function costoTotal(p: Project) {
  return p.costoMO + p.costoInsumos
}

export const statusConfig: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: "En progreso",
    className: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  },
  completed: {
    label: "Completado",
    className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  on_hold: {
    label: "En pausa",
    className: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  },
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value)
}
