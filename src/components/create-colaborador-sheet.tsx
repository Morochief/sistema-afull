"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createColaborador } from "@/app/actions/catalogs"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function CreateColaboradorSheet() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: "",
      tarifaMinuto: ""
    }
  })

  const onSubmit = (data: { nombre: string; tarifaMinuto: string }) => {
    const rate = Number(data.tarifaMinuto)
    if (rate < 0) {
      toast.warning("La tarifa no puede ser negativa")
      return
    }

    startTransition(async () => {
      const res = await createColaborador({
        nombre: data.nombre,
        tarifaMinuto: rate
      })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success("Colaborador registrado con éxito")
        setOpen(false)
        reset()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button className="h-10 rounded-xl font-medium flex items-center gap-1.5 shadow-sm">
          <Plus className="size-4 shrink-0" />
          <span>Nuevo Colaborador</span>
        </Button>
      } />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Nuevo Colaborador</SheetTitle>
          <SheetDescription>Registra un nuevo integrante en el equipo y su tarifa de costo.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Marcos Maidana"
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("nombre", { required: "El nombre es obligatorio" })}
            />
            {errors.nombre && <p className="text-sm font-medium text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarifaMinuto">Tarifa por Minuto (Gs)</Label>
            <Input
              id="tarifaMinuto"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 350"
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("tarifaMinuto", { required: "La tarifa es obligatoria" })}
            />
            {errors.tarifaMinuto && <p className="text-sm font-medium text-destructive">{errors.tarifaMinuto.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="h-12 rounded-xl font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-12 rounded-xl font-semibold px-6">
              {isPending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
