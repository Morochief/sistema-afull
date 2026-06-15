"use client"

import { useTransition } from "react"
import { toggleColaboradorActivo } from "@/app/actions/catalogs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function ToggleColaboradorButton({ id, initialActivo }: { id: string; initialActivo: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleColaboradorActivo(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Estado del colaborador actualizado")
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="focus:outline-none transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      <Badge variant={initialActivo ? "default" : "secondary"} className="font-medium cursor-pointer">
        {isPending ? "Procesando..." : initialActivo ? "Activo" : "Inactivo"}
      </Badge>
    </button>
  )
}
