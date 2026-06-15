"use client"

import { useTransition } from "react"
import { toggleInsumoActivo } from "@/app/actions/catalogs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function ToggleInsumoButton({ id, initialActivo }: { id: string; initialActivo: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleInsumoActivo(id)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success("Estado del insumo actualizado")
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
