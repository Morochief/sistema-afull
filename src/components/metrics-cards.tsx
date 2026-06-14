import {
  FolderKanban,
  HardHat,
  Boxes,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/projects-data"

type Metric = {
  label: string
  value: string
  icon: typeof FolderKanban
  delta: string
  trend: "up" | "down"
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
      delta: "+3",
      trend: "up",
      hint: "vs. mes anterior",
    },
    {
      label: "Costo Total MO acumulado",
      value: formatCurrency(costoMO),
      icon: HardHat,
      delta: "+8.2%",
      trend: "up",
      hint: "mano de obra",
    },
    {
      label: "Costo Total Insumos",
      value: formatCurrency(costoInsumos),
      icon: Boxes,
      delta: "-2.1%",
      trend: "down",
      hint: "materiales",
    },
    {
      label: "Rentabilidad Estimada",
      value: formatCurrency(rentabilidad),
      icon: TrendingUp,
      delta: "+12.5%",
      trend: "up",
      hint: "margen proyectado",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label} className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <m.icon className="size-5" />
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                  m.trend === "up"
                    ? "bg-chart-3/10 text-chart-3"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {m.trend === "up" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {m.delta}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {m.label}
              </p>
              <p className="text-2xl font-semibold tracking-tight text-balance">
                {m.value}
              </p>
              <p className="text-xs text-muted-foreground">{m.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
