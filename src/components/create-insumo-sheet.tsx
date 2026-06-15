"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInsumo } from "@/app/actions/catalogs"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function CreateInsumoSheet() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: "",
      precioUnitario: ""
    }
  })

  const onSubmit = (data: { nombre: string; precioUnitario: string }) => {
    const price = Number(data.precioUnitario)
    if (price <= 0) {
      toast.warning("El precio debe ser un número positivo")
      return
    }

    startTransition(async () => {
      const res = await createInsumo({
        nombre: data.nombre,
        precioUnitario: price
      })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success("Insumo creado con éxito")
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
          <span>Nuevo Insumo</span>
        </Button>
      } />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Nuevo Insumo</SheetTitle>
          <SheetDescription>Agrega materiales y sus precios de costo al catálogo.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Material</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Pintura Latex Blanca 20L"
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("nombre", { required: "El nombre es obligatorio" })}
            />
            {errors.nombre && <p className="text-sm font-medium text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="precioUnitario">Precio Unitario (Gs)</Label>
            <Input
              id="precioUnitario"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 15500"
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("precioUnitario", { required: "El precio es obligatorio" })}
            />
            {errors.precioUnitario && <p className="text-sm font-medium text-destructive">{errors.precioUnitario.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="h-12 rounded-xl font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-12 rounded-xl font-semibold px-6">
              {isPending ? "Creando..." : "Crear Insumo"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
