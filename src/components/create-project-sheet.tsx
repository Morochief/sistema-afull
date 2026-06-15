"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createProyecto } from "@/app/actions/catalogs"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface ClientSelectorOption {
  id: string
  nombre: string
}

export function CreateProjectSheet({ clientes }: { clientes: ClientSelectorOption[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedClientId, setSelectedClientId] = useState("")

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: ""
    }
  })

  const onSubmit = (data: { nombre: string }) => {
    if (!selectedClientId) {
      toast.warning("Por favor, selecciona un cliente")
      return
    }

    startTransition(async () => {
      const res = await createProyecto({
        nombre: data.nombre,
        clienteId: selectedClientId,
        estado: "in_progress"
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Proyecto creado con éxito")
        setOpen(false)
        reset()
        setSelectedClientId("")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button className="h-10 rounded-xl font-medium flex items-center gap-1.5 shadow-sm">
          <Plus className="size-4 shrink-0" />
          <span>Nuevo Proyecto</span>
        </Button>
      } />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Nuevo Proyecto</SheetTitle>
          <SheetDescription>Completa la información básica para registrar el proyecto.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Proyecto</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Ploteo de Heladeras"
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              {...register("nombre", { required: "El nombre es obligatorio" })}
            />
            {errors.nombre && <p className="text-sm font-medium text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val || "")} disabled={isPending}>
              <SelectTrigger id="cliente" className="h-12 rounded-xl text-base">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="h-12 rounded-xl font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-12 rounded-xl font-semibold px-6">
              {isPending ? "Creando..." : "Crear Proyecto"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
