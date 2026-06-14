"use client"

import { useState } from "react"
import { HardHatIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ManoDeObraPanel({
  colaboradores,
  onComplete,
}: {
  colaboradores: { id: number, nombre: string, tarifa: number }[]
  onComplete: (entry: { colaboradorId: number; inicio: string; fin: string; description: string }) => void
}) {
  const [colaboradorId, setColaboradorId] = useState<string>("")
  const [inicio, setInicio] = useState("")
  const [fin, setFin] = useState("")
  const [description, setDescription] = useState("")

  const canSubmit = colaboradorId !== "" && inicio !== "" && fin !== ""

  function handleToggle() {
    if (canSubmit) {
      onComplete({
        colaboradorId: Number(colaboradorId),
        inicio,
        fin,
        description: description.trim() || "Tarea sin descripción",
      })
      setInicio("")
      setFin("")
      setDescription("")
    }
  }

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Colaborador</FieldLabel>
        <Select value={colaboradorId} onValueChange={setColaboradorId}>
          <SelectTrigger className="h-12 rounded-xl text-base">
            <SelectValue placeholder="Selecciona el colaborador" />
          </SelectTrigger>
          <SelectContent>
            {colaboradores.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex gap-4">
        <Field className="flex-1">
          <FieldLabel htmlFor="inicio">Hora Inicio</FieldLabel>
          <Input
            id="inicio"
            type="time"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="fin">Hora Fin</FieldLabel>
          <Input
            id="fin"
            type="time"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="actividad">Descripción de la actividad</FieldLabel>
        <Textarea
          id="actividad"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe qué estás haciendo..."
          className="min-h-24 resize-none rounded-xl text-base"
        />
      </Field>

      <Button
        size="lg"
        onClick={handleToggle}
        disabled={!canSubmit}
        className="h-14 w-full rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
      >
        <HardHatIcon data-icon="inline-start" className="mr-2" />
        Registrar Horas
      </Button>
    </FieldGroup>
  )
}
