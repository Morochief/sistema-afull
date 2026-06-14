"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function InsumosPanel({
  insumosCatalogo,
  onAdd,
}: {
  insumosCatalogo: { id: number, nombre: string, precio: number }[]
  onAdd: (entry: { insumoId: number; cantidad: number }) => void
}) {
  const [insumoId, setInsumoId] = useState("")
  const [quantity, setQuantity] = useState("1")

  const qty = Number.parseFloat(quantity)
  const canSubmit = insumoId !== "" && Number.isFinite(qty) && qty > 0

  function handleAdd() {
    if (!canSubmit) return
    onAdd({ insumoId: Number(insumoId), cantidad: qty })
    setInsumoId("")
    setQuantity("1")
  }

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Insumo</FieldLabel>
        <Select value={insumoId} onValueChange={setInsumoId}>
          <SelectTrigger className="h-12 rounded-xl text-base">
            <SelectValue placeholder="Selecciona el insumo" />
          </SelectTrigger>
          <SelectContent>
            {insumosCatalogo.map(i => (
              <SelectItem key={i.id} value={i.id.toString()}>{i.nombre}</SelectItem>
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

      <Button
        size="lg"
        onClick={handleAdd}
        disabled={!canSubmit}
        className="h-14 w-full rounded-2xl text-base font-semibold"
      >
        <PlusIcon data-icon="inline-start" className="mr-2" />
        Agregar Insumo
      </Button>
    </FieldGroup>
  )
}
