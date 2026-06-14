import { ClockIcon, PackageIcon, WrenchIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
export type WorkLog = {
  id: string
  type: "mano-de-obra" | "insumo"
  project: string
  time: string
  description?: string
  duration?: string
  material?: string
  quantity?: number
}

export function RecentLogs({ logs }: { logs: WorkLog[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Registros de hoy</span>
          <Badge variant="secondary">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClockIcon />
              </EmptyMedia>
              <EmptyTitle>Sin registros aún</EmptyTitle>
              <EmptyDescription>
                Inicia una tarea o agrega un insumo para verlo aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div
                  className={
                    log.type === "mano-de-obra"
                      ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                      : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  }
                >
                  {log.type === "mano-de-obra" ? (
                    <WrenchIcon className="size-5" />
                  ) : (
                    <PackageIcon className="size-5" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {log.type === "mano-de-obra"
                      ? log.description
                      : `${log.material} · ${log.quantity} u.`}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {log.project}
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {log.time}
                  </span>
                  {log.type === "mano-de-obra" && log.duration ? (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.duration}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Insumo
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
