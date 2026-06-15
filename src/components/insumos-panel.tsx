"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/projects-data"

export function InsumosPanel({
  insumosCatalogo,
  onAdd,
}: {
  insumosCatalogo: { id: string, nombre: string, precio_unitario: any }[]
  onAdd: (
    entry: { insumoId: string; cantidad: number },
    clearForm?: () => void
  ) => void
}) {
  const [insumoId, setInsumoId] = useState("")
  const [quantity, setQuantity] = useState("1")

  const qty = Number.parseFloat(quantity)
  const canSubmit = insumoId !== "" && Number.isFinite(qty) && qty > 0

  const insumo = insumosCatalogo.find(i => i.id === insumoId)
  const precioUnit = insumo ? Number(insumo.precio_unitario) : 0
  const subtotal = canSubmit ? qty * precioUnit : 0

  function handleAdd() {
    if (!canSubmit) return
    onAdd({ insumoId, cantidad: qty }, () => {
      setInsumoId("")
      setQuantity("1")
    })
  }

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Insumo</FieldLabel>
        <Select value={insumoId} onValueChange={(val) => setInsumoId(val || "")}>
          <SelectTrigger className="h-12 rounded-xl text-base">
            <SelectValue placeholder="Selecciona el insumo">
              {insumoId ? insumosCatalogo.find(i => i.id === insumoId)?.nombre : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {insumosCatalogo.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="cantidad">Cantidad</FieldLabel>
        <Input
          id="cantidad"
          type="number"
          inputMode="numeric"
          min={0.1}
          step={0.1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-12 rounded-xl text-base"
        />
      </Field>

      {subtotal > 0 && insumoId && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-sm flex justify-between items-center text-primary-foreground/90">
          <span className="text-muted-foreground font-medium">Subtotal estimado:</span>
          <span className="font-bold text-primary">{formatCurrency(subtotal)}</span>
        </div>
      )}

      <Button
        size="lg"
        onClick={handleAdd}
        disabled={!canSubmit}
        className="h-14 w-full rounded-2xl text-base font-semibold"
      >
        <PlusIcon className="mr-2" />
        Agregar Insumo
      </Button>
    </FieldGroup>
  )
}
