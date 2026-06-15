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
  glowColor: string
  textColor: string
  iconClass: string
  bgGradient: string
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
      glowColor: "bg-indigo-500/10 dark:bg-indigo-500/5",
      textColor: "text-indigo-600 dark:text-indigo-400",
      iconClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      bgGradient: "group-hover:border-indigo-500/30 dark:group-hover:border-indigo-500/20",
    },
    {
      label: "Costo Total MO Acumulado",
      value: formatCurrency(costoMO),
      icon: HardHat,
      hint: "Mano de obra real imputada",
      glowColor: "bg-amber-500/10 dark:bg-amber-500/5",
      textColor: "text-amber-600 dark:text-amber-400",
      iconClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      bgGradient: "group-hover:border-amber-500/30 dark:group-hover:border-amber-500/20",
    },
    {
      label: "Costo Total Insumos",
      value: formatCurrency(costoInsumos),
      icon: Boxes,
      hint: "Materiales y consumos",
      glowColor: "bg-fuchsia-500/10 dark:bg-fuchsia-500/5",
      textColor: "text-fuchsia-600 dark:text-fuchsia-400",
      iconClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400",
      bgGradient: "group-hover:border-fuchsia-500/30 dark:group-hover:border-fuchsia-500/20",
    },
    {
      label: "Rentabilidad Estimada",
      value: formatCurrency(rentabilidad),
      icon: TrendingUp,
      hint: "Margen de ganancia proyectado",
      glowColor: "bg-emerald-500/10 dark:bg-emerald-500/5",
      textColor: "text-emerald-600 dark:text-emerald-400",
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      bgGradient: "group-hover:border-emerald-500/30 dark:group-hover:border-emerald-500/20",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <Card
          key={m.label}
          className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800/40 dark:bg-slate-900/50 dark:hover:shadow-none ${m.bgGradient}`}
        >
          {/* Glowing Ambient Orb in the card background */}
          <div className={`absolute -right-8 -bottom-8 -z-10 h-32 w-32 rounded-full ${m.glowColor} blur-2xl transition-transform duration-500 group-hover:scale-150`} />

          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <span className={`flex size-11 items-center justify-center rounded-xl ${m.iconClass} transition-transform duration-300 group-hover:scale-110`}>
                <m.icon className="size-5.5" />
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold tracking-wide uppercase text-muted-foreground/80">
                {m.label}
              </p>
              <p className={`text-2xl font-bold tracking-tight ${m.textColor}`}>
                {m.value}
              </p>
              <p className="text-xs text-muted-foreground/70">{m.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
