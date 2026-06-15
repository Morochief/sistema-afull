"use client"

import { useTransition } from "react"
import { updateProyectoEstado } from "@/app/actions/catalogs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { statusConfig } from "@/lib/projects-data"
import { toast } from "sonner"

export function ProjectStatusToggle({
  id,
  currentStatus,
}: {
  id: string
  currentStatus: "in_progress" | "completed" | "on_hold"
}) {
  const [isPending, startTransition] = useTransition()
  const current = statusConfig[currentStatus] || { label: currentStatus, className: "" }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return
    startTransition(async () => {
      const res = await updateProyectoEstado({ id, estado: newStatus })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(`Estado actualizado a: ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button
          disabled={isPending}
          className="focus:outline-none transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <Badge variant="outline" className={cn("font-medium cursor-pointer", current.className)}>
            {isPending ? "Actualizando..." : current.label}
          </Badge>
        </button>
      } />
      <DropdownMenuContent align="center" className="w-40">
        <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={currentStatus === "in_progress"}
          onClick={() => handleStatusChange("in_progress")}
          className="text-emerald-600 dark:text-emerald-400 font-medium"
        >
          En progreso
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={currentStatus === "on_hold"}
          onClick={() => handleStatusChange("on_hold")}
          className="text-amber-600 dark:text-amber-400 font-medium"
        >
          En pausa
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={currentStatus === "completed"}
          onClick={() => handleStatusChange("completed")}
          className="text-blue-600 dark:text-blue-400 font-medium"
        >
          Completado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
