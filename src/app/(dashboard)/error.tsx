"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error capturado en boundary:", error)
    toast.error("Ha ocurrido un error inesperado al cargar la página.")
  }, [error])

  return (
    <div className="flex min-h-[50dvh] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-destructive/15 bg-destructive/5 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-destructive">Ha ocurrido un problema</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          No pudimos conectar con la base de datos o recuperar la información solicitada.
        </p>
      </div>
      <Button variant="outline" onClick={() => reset()} className="mt-2 border-destructive/20 text-destructive hover:bg-destructive/10">
        Intentar nuevamente
      </Button>
    </div>
  )
}
