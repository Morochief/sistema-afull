"use client"

import { useContext, useState } from "react"
import { FolderIcon, HardHatIcon, PackageIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { AppHeader } from "@/components/app-header"
import { ManoDeObraPanel } from "@/components/mano-de-obra-panel"
import { InsumosPanel } from "@/components/insumos-panel"
import { RecentLogs } from "@/components/recent-logs"
import { AppContext } from "@/context/AppContext"

export function TaskLoggerScreen() {
  const { 
    handleAgregarMO, 
    handleAgregarInsumo, 
    INSUMOS_CATALOGO, 
    COLABORADORES,
    PROYECTOS,
    isPending
  } = useContext(AppContext);
  
  const [proyectoId, setProyectoId] = useState<string>("")

  function onAddManoDeObra(entry: { colaboradorId: string; inicio: string; fin: string; description: string }) {
    if (!proyectoId) return alert("Selecciona un proyecto primero")
    handleAgregarMO({
      proyectoId,
      ...entry
    });
  }

  function onAddInsumo(entry: { insumoId: string; cantidad: number }) {
    if (!proyectoId) return alert("Selecciona un proyecto primero")
    handleAgregarInsumo({
      proyectoId,
      ...entry
    });
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background sm:rounded-3xl sm:border sm:border-border">
      <main className="flex flex-1 flex-col gap-5 py-5 px-4 sm:px-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="proyecto" className="text-sm font-medium">
            Proyecto
          </Label>
          <Select value={proyectoId} onValueChange={(val) => setProyectoId(val || "")} disabled={isPending}>
            <SelectTrigger
              id="proyecto"
              className="h-14 w-full rounded-xl px-4 text-base [&>span]:flex [&>span]:items-center [&>span]:gap-2"
            >
              <FolderIcon className="size-5 shrink-0 text-primary" />
              <SelectValue placeholder="Selecciona un proyecto">
                {proyectoId ? PROYECTOS?.find((p: any) => p.id === proyectoId)?.nombre : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PROYECTOS?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="py-2.5 text-base">
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="mano-de-obra" className="gap-5">
          <TabsList className="h-12 w-full rounded-xl p-1">
            <TabsTrigger
              value="mano-de-obra"
              className="h-full rounded-lg text-sm font-medium"
              disabled={isPending}
            >
              <HardHatIcon className="mr-2 h-4 w-4" />
              Mano de Obra
            </TabsTrigger>
            <TabsTrigger
              value="insumos"
              className="h-full rounded-lg text-sm font-medium"
              disabled={isPending}
            >
              <PackageIcon className="mr-2 h-4 w-4" />
              Insumos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mano-de-obra">
            <ManoDeObraPanel colaboradores={COLABORADORES} onComplete={onAddManoDeObra} />
          </TabsContent>

          <TabsContent value="insumos">
            <InsumosPanel insumosCatalogo={INSUMOS_CATALOGO} onAdd={onAddInsumo} />
          </TabsContent>
        </Tabs>

        {isPending && <p className="text-center text-sm text-muted-foreground animate-pulse">Guardando registro...</p>}
      </main>
    </div>
  )
}
