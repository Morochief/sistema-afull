"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HardHatIcon, LogInIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/app/actions/auth"

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
      } else {
        router.push("/")
      }
    })
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-background p-6 shadow-xl sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HardHatIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu nombre para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">Nombre del Colaborador</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Rodrigo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isPending}
              className="h-12 rounded-xl text-base"
              autoComplete="off"
            />
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isPending}
            className="h-14 w-full rounded-2xl text-base font-semibold"
          >
            {isPending ? (
              "Ingresando..."
            ) : (
              <>
                <LogInIcon className="mr-2 size-5" />
                Ingresar al Sistema
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
