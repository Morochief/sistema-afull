"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogInIcon, Loader2Icon, HardHatIcon } from "lucide-react"
import { login } from "@/app/actions/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!nombre.trim()) {
      setError("Por favor, ingresa tu nombre")
      return
    }
    startTransition(async () => {
      const result = await login(nombre.trim())
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success(`¡Bienvenido al sistema, ${nombre}!`)
        router.push("/")
      }
    })
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Card — Glassmorphism suave sobre fondo Swiss Minimalist */}
      <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/60">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10">
            <HardHatIcon className="size-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Bienvenido
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Ingresa tu nombre para acceder al sistema
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="nombre"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Nombre del Colaborador
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej: Rodrigo"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (error) setError("")
              }}
              disabled={isPending}
              autoComplete="off"
              autoFocus
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-indigo-400"
            />
            {/* Error inline con animación */}
            <div
              className={`overflow-hidden transition-all duration-200 ${error ? "max-h-8 opacity-100" : "max-h-0 opacity-0"}`}
            >
              <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                {error}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-slate-900"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Ingresando…
              </>
            ) : (
              <>
                <LogInIcon className="size-4" />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>
      </div>

      {/* Branding Footer */}
      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Sistema aFull · Gestión de Proyectos
      </p>
    </div>
  )
}
