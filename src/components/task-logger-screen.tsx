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
import { ManoDeObraPanel } from "@/components/mano-de-obra-panel"
import { InsumosPanel } from "@/components/insumos-panel"
import { AppContext } from "@/context/AppContext"
import { toast } from "sonner"

export function TaskLoggerScreen() {
  const context = useContext(AppContext);
  if (!context) {
    return <p className="p-4 text-center text-sm text-destructive">Error de contexto</p>;
  }

  const { 
    handleAgregarMO, 
    handleAgregarInsumo, 
    INSUMOS_CATALOGO, 
    COLABORADORES,
    PROYECTOS,
    isPending
  } = context;
  
  const [proyectoId, setProyectoId] = useState<string>("")
  const [selectedTab, setSelectedTab] = useState<string>("mano-de-obra")

  function onAddManoDeObra(entry: { colaboradorId: string; inicio: string; fin: string; description: string }, clearForm?: () => void) {
    if (!proyectoId) {
      toast.warning("Selecciona un proyecto primero");
      return;
    }
    handleAgregarMO({
      proyectoId,
      ...entry
    }, () => {
      if (clearForm) clearForm();
    });
  }

  function onAddInsumo(entry: { insumoId: string; cantidad: number }, clearForm?: () => void) {
    if (!proyectoId) {
      toast.warning("Selecciona un proyecto primero");
      return;
    }
    handleAgregarInsumo({
      proyectoId,
      ...entry
    }, () => {
      if (clearForm) clearForm();
    });
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-xl flex-col z-10 pt-4 px-4 space-y-6 animate-fade-in-up pb-24">
      {/* Ambient Glow Orbs */}
      <div className="fixed top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-20%] w-[70%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none z-0" />
      
      {/* Welcome Header */}
      <section className="space-y-1 relative z-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Registro de Actividad</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Actualiza el progreso del proyecto en tiempo real.</p>
      </section>

      <main className="flex flex-1 flex-col gap-6 relative z-10">
        {/* Selector de Proyecto */}
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider block">Proyecto</label>
          <Select value={proyectoId} onValueChange={(val) => setProyectoId(val || "")} disabled={isPending}>
            <SelectTrigger
              id="proyecto"
              className="h-12 w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 dark:border-slate-800/50 rounded-xl px-4 text-base shadow-sm transition-all hover:bg-white/60 dark:hover:bg-slate-900/60 [&>span]:flex [&>span]:items-center [&>span]:gap-2"
            >
              <FolderIcon className="size-5 shrink-0 text-primary" />
              <SelectValue placeholder="Seleccionar proyecto...">
                {proyectoId ? PROYECTOS?.find((p) => p.id === proyectoId)?.nombre : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50">
              <SelectGroup>
                {PROYECTOS?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="py-2.5 text-base cursor-pointer">
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Tab Switcher */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="gap-5 flex flex-col">
          <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/40 p-1.5 rounded-2xl flex gap-1 h-auto shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
            <TabsTrigger
              value="mano-de-obra"
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-white/50 dark:hover:bg-slate-800/50"
              disabled={isPending}
            >
              <HardHatIcon className="mr-2 h-5 w-5" />
              Mano de Obra
            </TabsTrigger>
            <TabsTrigger
              value="insumos"
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-white/50 dark:hover:bg-slate-800/50"
              disabled={isPending}
            >
              <PackageIcon className="mr-2 h-5 w-5" />
              Insumos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mano-de-obra" className="mt-2 outline-none">
            <ManoDeObraPanel colaboradores={COLABORADORES} onComplete={onAddManoDeObra} isPending={isPending} />
          </TabsContent>

          <TabsContent value="insumos" className="mt-2 outline-none">
            <InsumosPanel insumosCatalogo={INSUMOS_CATALOGO} onAdd={onAddInsumo} isPending={isPending} />
          </TabsContent>
        </Tabs>

        {isPending && <p className="text-center text-sm text-primary font-medium animate-pulse mt-4">Guardando registro...</p>}
      </main>
    </div>
  )
}
