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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  type Project,
  costoTotal,
  formatCurrency,
  statusConfig,
} from "@/lib/projects-data"

export function ProjectsTable({ projects }: { projects: Project[] }) {
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
        p.cliente.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase())
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
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Proyectos Activos</CardTitle>
            <CardDescription>
              Detalle de horas, mano de obra e insumos por proyecto.
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por proyecto, cliente o código..."
              className="pl-9"
              aria-label="Buscar proyectos"
            />
          </div>
          <div className="flex gap-3">
            <Select value={cliente} onValueChange={(val) => {
              setCliente(val || "")
              setPage(1)
            }}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por cliente">
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
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por estado">
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-44">Cliente</TableHead>
                <TableHead className="min-w-56 cursor-pointer select-none hover:bg-muted/30 transition-colors" onClick={() => handleSort("proyecto")}>
                  <span className="inline-flex items-center gap-1">
                    Proyecto {sortField === "proyecto" && <ArrowUpDown className="size-3.5 opacity-70" />}
                  </span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none hover:bg-muted/30 transition-colors" onClick={() => handleSort("totalHoras")}>
                  <span className="inline-flex items-center gap-1">
                    Total Horas {sortField === "totalHoras" && <ArrowUpDown className="size-3.5 opacity-70" />}
                  </span>
                </TableHead>
                <TableHead className="text-right">Costo MO</TableHead>
                <TableHead className="text-right">Costo Insumos</TableHead>
                <TableHead className="text-right cursor-pointer select-none hover:bg-muted/30 transition-colors" onClick={() => handleSort("costoTotal")}>
                  <span className="inline-flex items-center gap-1">
                    Costo Total {sortField === "costoTotal" && <ArrowUpDown className="size-3.5 opacity-70" />}
                  </span>
                </TableHead>
                <TableHead className="text-center">Estado</TableHead>
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
                  const status = statusConfig[p.estado]
                  return (
                    <TableRow key={p.id} className="group">
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {p.cliente}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.id}
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
                        <Badge
                          variant="outline"
                          className={cn("font-medium", status.className)}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-4 text-sm text-muted-foreground flex-col gap-3 sm:flex-row">
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
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 rounded-lg"
              >
                Anterior
              </Button>
              <span className="px-2 text-xs">Pág. {page} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="h-8 rounded-lg"
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
