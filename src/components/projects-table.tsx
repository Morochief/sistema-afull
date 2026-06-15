"use client"

import { useMemo, useState } from "react"
import { Search, ArrowUpDown } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type Project,
  costoTotal,
  formatCurrency,
} from "@/lib/projects-data"
import { ProjectStatusSelect } from "@/components/project-status-select"

export function ProjectsTable({ projects, canEditStatus = false }: { projects: Project[]; canEditStatus?: boolean }) {
  const [query, setQuery] = useState("")
  const [cliente, setCliente] = useState("all")
  const [estado, setEstado] = useState("all")

  // Estados de paginación y ordenamiento
  const [sortField, setSortField] = useState<"totalHoras" | "costoTotal" | "proyecto">("proyecto")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const clientes = useMemo(
    () => Array.from(new Set(projects.map((p) => p.cliente))).sort(),
    [projects],
  )

  const handleSort = (field: "totalHoras" | "costoTotal" | "proyecto") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
    setPage(1)
  }

  // Filtrado
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        query.trim() === "" ||
        p.proyecto.toLowerCase().includes(query.toLowerCase()) ||
        p.cliente.toLowerCase().includes(query.toLowerCase())
      const matchesCliente = cliente === "all" || p.cliente === cliente
      const matchesEstado = estado === "all" || p.estado === estado
      return matchesQuery && matchesCliente && matchesEstado
    })
  }, [projects, query, cliente, estado])

  // Ordenamiento real con índices seguros
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let valA: any
      let valB: any

      if (sortField === "costoTotal") {
        valA = costoTotal(a)
        valB = costoTotal(b)
      } else if (sortField === "proyecto") {
        valA = a.proyecto
        valB = b.proyecto
      } else {
        valA = a.totalHoras
        valB = b.totalHoras
      }

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA
      }
    })
    return list
  }, [filtered, sortField, sortOrder])

  // Paginación real
  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, page])

  const totalPages = Math.ceil(sorted.length / itemsPerPage)

  return (
    <Card className="border border-slate-200/60 bg-white/50 backdrop-blur-md shadow-sm dark:border-slate-800/40 dark:bg-slate-900/50 rounded-2xl overflow-hidden animate-fade-in">
      <CardHeader className="gap-4 border-b border-slate-200/60 dark:border-slate-800/40 p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-semibold text-2xl tracking-tight text-slate-900 dark:text-white">Proyectos Activos</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              Detalle de horas, mano de obra e insumos por proyecto.
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por proyecto o cliente..."
              className="relative pl-9 h-10 w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 z-10"
              aria-label="Buscar proyectos"
            />
          </div>
          <div className="flex gap-2">
            <Select value={cliente} onValueChange={(val) => {
              setCliente(val || "")
              setPage(1)
            }}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-950/50 dark:hover:bg-slate-900 transition-all duration-300" aria-label="Filtrar por cliente">
                <SelectValue placeholder="Cliente">
                  {cliente === "all" ? "Todos los clientes" : cliente}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estado} onValueChange={(val) => {
              setEstado(val || "")
              setPage(1)
            }}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-950/50 dark:hover:bg-slate-900 transition-all duration-300" aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado">
                  {estado === "all"
                    ? "Todos los estados"
                    : estado === "in_progress"
                      ? "En progreso"
                      : estado === "completed"
                        ? "Completado"
                        : "En pausa"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="on_hold">En pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table role="table">
            <TableHeader>
              <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableHead scope="col" className="min-w-44">Cliente</TableHead>
                <TableHead
                  scope="col"
                  className="min-w-56 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() => handleSort("proyecto")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSort("proyecto")
                    }
                  }}
                  aria-sort={sortField === "proyecto" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Proyecto {sortField === "proyecto" && <ArrowUpDown className="size-3.5 opacity-70" aria-hidden="true" />}
                  </span>
                </TableHead>
                <TableHead
                  scope="col"
                  className="text-right cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() => handleSort("totalHoras")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSort("totalHoras")
                    }
                  }}
                  aria-sort={sortField === "totalHoras" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Total Horas {sortField === "totalHoras" && <ArrowUpDown className="size-3.5 opacity-70" aria-hidden="true" />}
                  </span>
                </TableHead>
                <TableHead scope="col" className="text-right">Costo MO</TableHead>
                <TableHead scope="col" className="text-right">Costo Insumos</TableHead>
                <TableHead
                  scope="col"
                  className="text-right cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() => handleSort("costoTotal")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSort("costoTotal")
                    }
                  }}
                  aria-sort={sortField === "costoTotal" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Costo Total {sortField === "costoTotal" && <ArrowUpDown className="size-3.5 opacity-70" aria-hidden="true" />}
                  </span>
                </TableHead>
                <TableHead scope="col" className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No se encontraron proyectos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((p) => {
                  return (
                    <TableRow key={p.id} className="group hover:bg-slate-500/5 dark:hover:bg-slate-400/5 transition-colors">
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {p.cliente}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {p.proyecto}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.totalHoras} h
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.costoMO)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.costoInsumos)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(costoTotal(p))}
                      </TableCell>
                      <TableCell className="text-center">
                        <ProjectStatusSelect
                          projectId={p.id}
                          currentStatus={p.estado}
                          canEdit={canEditStatus}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div
          className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/40 px-5 py-4 text-sm text-muted-foreground flex-col gap-3 sm:flex-row"
          role="status"
          aria-live="polite"
          aria-label="Información de paginación"
        >
          <span>
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {sorted.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}
            </span>{" "}
            a{" "}
            <span className="font-medium text-foreground">
              {Math.min(page * itemsPerPage, sorted.length)}
            </span>{" "}
            de {sorted.length} proyectos
          </span>
          {totalPages > 1 && (
            <nav className="flex items-center gap-1.5" aria-label="Paginación">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 rounded-lg"
                aria-label="Página anterior"
              >
                Anterior
              </Button>
              <span className="px-2 text-xs" aria-current="page">Pág. {page} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="h-8 rounded-lg"
                aria-label="Página siguiente"
              >
                Siguiente
              </Button>
            </nav>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
