"use client"

import { useState } from "react"
import { HardHatIcon, SendIcon, WalletIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/projects-data"

export function ManoDeObraPanel({
  colaboradores,
  onComplete,
  isPending,
}: {
  colaboradores: { id: string, nombre: string, tarifa_minuto: any }[]
  onComplete: (
    entry: { colaboradorId: string; inicio: string; fin: string; description: string },
    clearForm?: () => void
  ) => void
  isPending?: boolean
}) {
  const [colaboradorId, setColaboradorId] = useState<string>("")
  const [inicio, setInicio] = useState("")
  const [fin, setFin] = useState("")
  const [description, setDescription] = useState("")

  const canSubmit = colaboradorId !== "" && inicio !== "" && fin !== "" && !isPending
  
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Colaborador Select */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Colaborador</label>
        <Select value={colaboradorId} onValueChange={(val) => setColaboradorId(val || "")} disabled={isPending}>
          <SelectTrigger className="h-12 w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all hover:bg-white/60 dark:hover:bg-slate-900/60">
            <SelectValue placeholder="Seleccionar personal...">
              {colaboradorId ? colaboradores.find(c => c.id === colaboradorId)?.nombre : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50">
            {colaboradores.map(c => (
              <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Inicio</label>
          <input
            type="time"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            disabled={isPending}
            className="w-full h-12 bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
          />
        </div>
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Fin</label>
          <input
            type="time"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            disabled={isPending}
            className="w-full h-12 bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
          />
        </div>
      </div>

      {/* Description */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Detalle de las tareas realizadas..."
          rows={3}
          className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl p-4 text-base shadow-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
        />
      </div>

      {/* Dynamic Cost Display */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-6 rounded-3xl flex justify-between items-center transition-all duration-300">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary uppercase">Costo Estimado ({minutos} min)</p>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(costoEstimado)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <WalletIcon className="text-primary size-6" />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleToggle}
        disabled={!canSubmit}
        className="w-full h-14 mt-2 bg-primary text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
      >
        <SendIcon className="size-5 fill-current" />
        Registrar Actividad
      </button>
    </div>
  )
}
