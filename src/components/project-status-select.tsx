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
  { value: "in_progress", label: "En Progreso", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "completed", label: "Completado", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "on_hold", label: "En Pausa", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
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
      <Badge variant="outline" className={cn("font-medium", current.className)}>
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
            "h-7 w-[130px] rounded-full border-0 px-2.5 text-xs font-medium transition-all duration-200",
            current.className,
            isPending && "opacity-50"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <Badge variant="outline" className={cn("font-medium border-0", opt.className)}>
                {opt.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
