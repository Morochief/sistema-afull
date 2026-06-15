"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCliente } from "@/app/actions/catalogs"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function CreateClientSheet() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: ""
    }
  })

  const onSubmit = (data: { nombre: string }) => {
    startTransition(async () => {
      const res = await createCliente({ nombre: data.nombre })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success("Cliente creado con éxito")
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
          <span>Nuevo Cliente</span>
        </Button>
      } />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Nuevo Cliente</SheetTitle>
          <SheetDescription>Agrega una nueva empresa para asignarle proyectos.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Empresa</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Pinturas del Sur S.A."
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("nombre", { required: "El nombre es obligatorio" })}
            />
            {errors.nombre && <p className="text-sm font-medium text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="h-12 rounded-xl font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-12 rounded-xl font-semibold px-6">
              {isPending ? "Creando..." : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
