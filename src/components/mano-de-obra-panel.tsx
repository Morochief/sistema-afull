"use client"

import { useState } from "react"
import { HardHatIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/projects-data"

export function ManoDeObraPanel({
  colaboradores,
  onComplete,
}: {
  colaboradores: { id: string, nombre: string, tarifa_minuto: any }[]
  onComplete: (
    entry: { colaboradorId: string; inicio: string; fin: string; description: string },
    clearForm?: () => void
  ) => void
}) {
  const [colaboradorId, setColaboradorId] = useState<string>("")
  const [inicio, setInicio] = useState("")
  const [fin, setFin] = useState("")
  const [description, setDescription] = useState("")

  const canSubmit = colaboradorId !== "" && inicio !== "" && fin !== ""
  
  // Calcular costo estimado en tiempo real
  const colaborador = colaboradores.find(c => c.id === colaboradorId)
  const tarifaMin = colaborador ? Number(colaborador.tarifa_minuto) : 0
  let minutos = 0
  if (inicio && fin) {
    const [hIni, mIni] = inicio.split(":").map(Number)
    const [hFin, mFin] = fin.split(":").map(Number)
    let diff = (hFin * 60 + mFin) - (hIni * 60 + mIni)
    if (diff < 0) diff += 1440 // cruce de medianoche
    minutos = diff
  }
  const costoEstimado = minutos * tarifaMin

  function handleToggle() {
    if (canSubmit) {
      onComplete({
        colaboradorId,
        inicio,
        fin,
        description: description.trim() || "Tarea sin descripción",
      }, () => {
        setInicio("")
        setFin("")
        setDescription("")
      })
    }
  }

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel>Colaborador</FieldLabel>
        <Select value={colaboradorId} onValueChange={(val) => setColaboradorId(val || "")}>
          <SelectTrigger className="h-12 rounded-xl text-base">
            <SelectValue placeholder="Selecciona el colaborador">
              {colaboradorId ? colaboradores.find(c => c.id === colaboradorId)?.nombre : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {colaboradores.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex gap-4">
        <Field className="flex-1">
          <FieldLabel htmlFor="inicio">Hora Inicio</FieldLabel>
          <div className="flex flex-col gap-1.5">
            <Input
              id="inicio"
              type="time"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const hours = String(now.getHours()).padStart(2, '0')
                const minutes = String(now.getMinutes()).padStart(2, '0')
                setInicio(`${hours}:${minutes}`)
              }}
              className="h-8 rounded-lg text-xs"
            >
              Iniciar labor
            </Button>
          </div>
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="fin">Hora Fin</FieldLabel>
          <div className="flex flex-col gap-1.5">
            <Input
              id="fin"
              type="time"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const hours = String(now.getHours()).padStart(2, '0')
                const minutes = String(now.getMinutes()).padStart(2, '0')
                setFin(`${hours}:${minutes}`)
              }}
              className="h-8 rounded-lg text-xs"
            >
              Finalizar labor
            </Button>
          </div>
        </Field>
      </div>

      {minutos > 0 && colaboradorId && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-sm flex justify-between items-center text-primary-foreground/90">
          <span className="text-muted-foreground font-medium">Cálculo estimado ({minutos} min):</span>
          <span className="font-bold text-primary">{formatCurrency(costoEstimado)}</span>
        </div>
      )}

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
        <HardHatIcon className="mr-2" />
        Registrar Horas
      </Button>
    </FieldGroup>
  )
}
