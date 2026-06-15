"use client"

import { useState } from "react"
import { SendIcon, ShoppingCartIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/projects-data"

export function InsumosPanel({
  insumosCatalogo,
  onAdd,
  isPending,
}: {
  insumosCatalogo: { id: string, nombre: string, precio_unitario: any }[]
  onAdd: (
    entry: { insumoId: string; cantidad: number },
    clearForm?: () => void
  ) => void
  isPending?: boolean
}) {
  const [insumoId, setInsumoId] = useState("")
  const [quantity, setQuantity] = useState("1")

  const qty = Number.parseFloat(quantity)
  const canSubmit = insumoId !== "" && Number.isFinite(qty) && qty > 0 && !isPending

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Insumo Select */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Insumo</label>
        <Select value={insumoId} onValueChange={(val) => setInsumoId(val || "")} disabled={isPending}>
          <SelectTrigger className="h-12 w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all hover:bg-white/60 dark:hover:bg-slate-900/60">
            <SelectValue placeholder="Seleccionar material...">
              {insumoId ? insumosCatalogo.find(i => i.id === insumoId)?.nombre : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50">
            {insumosCatalogo.map(i => (
              <SelectItem key={i.id} value={i.id} className="cursor-pointer">
                {i.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cantidad Input */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Cantidad</label>
        <input
          type="number"
          inputMode="numeric"
          min={0.1}
          step={0.1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={isPending}
          placeholder="0.00"
          className="w-full h-12 bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
        />
      </div>

      {/* Dynamic Subtotal Display */}
      <div className="bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 p-6 rounded-3xl flex justify-between items-center transition-all duration-300">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Subtotal Insumo</p>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(subtotal)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <ShoppingCartIcon className="text-blue-600 dark:text-blue-400 size-6" />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleAdd}
        disabled={!canSubmit}
        className="w-full h-14 mt-2 bg-primary text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
      >
        <SendIcon className="size-5 fill-current" />
        Registrar Actividad
      </button>
    </div>
  )
}
