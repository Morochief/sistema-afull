"use client"

import { useTransition } from "react"
import { updateProyectoEstado } from "@/app/actions/catalogs"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

const statusOptions = [
  { value: "in_progress", label: "En Progreso", className: "bg-blue-500/10 text-blue-600 border border-blue-200/50 hover:bg-blue-500/15 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30 shadow-[0_2px_8px_-3px_rgba(59,130,246,0.15)]" },
  { value: "completed", label: "Completado", className: "bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 hover:bg-emerald-500/15 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30 shadow-[0_2px_8px_-3px_rgba(16,185,129,0.15)]" },
  { value: "on_hold", label: "En Pausa", className: "bg-amber-500/10 text-amber-600 border border-amber-200/50 hover:bg-amber-500/15 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30 shadow-[0_2px_8px_-3px_rgba(245,158,11,0.15)]" },
]

interface ProjectStatusSelectProps {
  projectId: string
  currentStatus: string
  /** If false, renders a read-only Badge instead of a Select */
  canEdit?: boolean
}

export function ProjectStatusSelect({ projectId, currentStatus, canEdit = false }: ProjectStatusSelectProps) {
  const [isPending, startTransition] = useTransition()

  const current = statusOptions.find(s => s.value === currentStatus) || statusOptions[0]

  function handleChange(newStatus: string) {
    if (newStatus === currentStatus) return
    startTransition(async () => {
      const result = await updateProyectoEstado({ id: projectId, estado: newStatus })
      if (result && 'error' in result) {
        toast.error(result.error as string)
      } else {
        const label = statusOptions.find(s => s.value === newStatus)?.label || newStatus
        toast.success(`Estado cambiado a "${label}"`)
      }
    })
  }

  // Read-only mode for non-admin users
  if (!canEdit) {
    return (
      <Badge variant="outline" className={cn("font-semibold rounded-full px-2.5 py-0.5 text-xs shadow-sm", current.className)}>
        {current.label}
      </Badge>
    )
  }

  // Editable Select for admin / jefe_proyecto
  return (
    <div className="relative inline-flex items-center">
      {isPending && (
        <Loader2Icon className="absolute -left-5 size-3.5 animate-spin text-muted-foreground" />
      )}
      <Select
        value={currentStatus}
        onValueChange={(value: string | null) => {
          if (value) handleChange(value)
        }}
        disabled={isPending}
      >
        <SelectTrigger
          className={cn(
            "h-7 w-[130px] rounded-full border px-2.5 text-xs font-semibold shadow-sm transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer",
            current.className,
            isPending && "opacity-50 pointer-events-none"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-lg">
          {statusOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg cursor-pointer my-0.5">
              <Badge variant="outline" className={cn("font-semibold border-0 shadow-none bg-transparent py-0 px-1", opt.className.split(" ")[1])}>
                {opt.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
