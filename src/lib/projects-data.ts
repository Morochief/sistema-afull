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

export const projects: Project[] = [
  {
    id: "PRJ-1042",
    cliente: "Supermercados Andina",
    proyecto: "Ploteo de 2 Freezers Marca XXX",
    totalHoras: 24,
    costoMO: 312000,
    costoInsumos: 184500,
    estado: "in_progress",
  },
  {
    id: "PRJ-1043",
    cliente: "Bodega del Valle",
    proyecto: "Mant. Barra Degustadora",
    totalHoras: 16,
    costoMO: 208000,
    costoInsumos: 96200,
    estado: "completed",
  },
  {
    id: "PRJ-1044",
    cliente: "Café Central",
    proyecto: "Branding Vitrina Refrigerada",
    totalHoras: 32,
    costoMO: 416000,
    costoInsumos: 271800,
    estado: "in_progress",
  },
  {
    id: "PRJ-1045",
    cliente: "Farmacias Cruz Verde",
    proyecto: "Señalética Interior Local 12",
    totalHoras: 12,
    costoMO: 156000,
    costoInsumos: 64300,
    estado: "completed",
  },
  {
    id: "PRJ-1046",
    cliente: "Supermercados Andina",
    proyecto: "Wrapping Flota 3 Camiones",
    totalHoras: 48,
    costoMO: 624000,
    costoInsumos: 512400,
    estado: "in_progress",
  },
  {
    id: "PRJ-1047",
    cliente: "Hotel Bellavista",
    proyecto: "Letrero Luminoso Fachada",
    totalHoras: 40,
    costoMO: 520000,
    costoInsumos: 389700,
    estado: "on_hold",
  },
  {
    id: "PRJ-1048",
    cliente: "Bodega del Valle",
    proyecto: "Etiquetas Línea Premium",
    totalHoras: 20,
    costoMO: 260000,
    costoInsumos: 142000,
    estado: "completed",
  },
  {
    id: "PRJ-1049",
    cliente: "Café Central",
    proyecto: "Decoración Mural Sucursal Norte",
    totalHoras: 28,
    costoMO: 364000,
    costoInsumos: 198600,
    estado: "in_progress",
  },
  {
    id: "PRJ-1050",
    cliente: "Farmacias Cruz Verde",
    proyecto: "Ploteo de Ventanales Promo",
    totalHoras: 18,
    costoMO: 234000,
    costoInsumos: 87900,
    estado: "in_progress",
  },
  {
    id: "PRJ-1051",
    cliente: "Hotel Bellavista",
    proyecto: "Mant. Señalética Ascensores",
    totalHoras: 10,
    costoMO: 130000,
    costoInsumos: 41200,
    estado: "completed",
  },
]

// Estimated profitability assumes revenue is billed at a 45% markup over total cost.
export const REVENUE_MARKUP = 0.45

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
