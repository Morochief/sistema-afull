import {
  FolderKanban,
  HardHat,
  Boxes,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/projects-data"

type Metric = {
  label: string
  value: string
  icon: typeof FolderKanban
  hint: string
}

export function MetricsCards({
  activos,
  costoMO,
  costoInsumos,
  rentabilidad,
}: {
  activos: number
  costoMO: number
  costoInsumos: number
  rentabilidad: number
}) {
  const metrics: Metric[] = [
    {
      label: "Total Proyectos Activos",
      value: String(activos),
      icon: FolderKanban,
      hint: "Proyectos en desarrollo",
    },
    {
      label: "Costo Total MO acumulado",
      value: formatCurrency(costoMO),
      icon: HardHat,
      hint: "Mano de obra real imputada",
    },
    {
      label: "Costo Total Insumos",
      value: formatCurrency(costoInsumos),
      icon: Boxes,
      hint: "Materiales y consumos",
    },
    {
      label: "Rentabilidad Estimada",
      value: formatCurrency(rentabilidad),
      icon: TrendingUp,
      hint: "Margen de ganancia proyectado",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label} className="border-border/70 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <m.icon className="size-5" />
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {m.label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-balance">
                {m.value}
              </p>
              <p className="text-xs text-muted-foreground/75">{m.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
