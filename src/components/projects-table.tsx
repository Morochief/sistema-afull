"use client"

import { useMemo, useState } from "react"
import { Search, FileSpreadsheet, FileText, Download, ArrowUpDown } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  const clientes = useMemo(
    () => Array.from(new Set(projects.map((p) => p.cliente))).sort(),
    [projects],
  )

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

  function exportData(format: "pdf" | "excel") {
    // Placeholder export — wire to a real generator or API route.
    console.log(`[v0] Exporting ${filtered.length} rows to ${format}`)
    alert(
      `Se exportarán ${filtered.length} proyectos a ${
        format === "pdf" ? "PDF" : "Excel"
      }.`,
    )
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="gap-2 self-start sm:self-auto" />}>
              <Download className="size-4" />
              Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Exportar reporte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportData("pdf")} className="gap-2">
                <FileText className="size-4" />
                Exportar a PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportData("excel")}
                className="gap-2"
              >
                <FileSpreadsheet className="size-4" />
                Exportar a Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por proyecto, cliente o código..."
              className="pl-9"
              aria-label="Buscar proyectos"
            />
          </div>
          <div className="flex gap-3">
            <Select value={cliente} onValueChange={(val) => setCliente(val || "")}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por cliente">
                <SelectValue placeholder="Cliente">
                  {(value: string) =>
                    value === "all" ? "Todos los clientes" : value
                  }
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
            <Select value={estado} onValueChange={(val) => setEstado(val || "")}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado">
                  {(value: string) =>
                    value === "all"
                      ? "Todos los estados"
                      : value === "in_progress"
                        ? "En progreso"
                        : value === "completed"
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
                <TableHead className="min-w-56">Proyecto</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Total Horas <ArrowUpDown className="size-3.5 opacity-50" />
                  </span>
                </TableHead>
                <TableHead className="text-right">Costo MO</TableHead>
                <TableHead className="text-right">Costo Insumos</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No se encontraron proyectos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
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

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
          <span>
            Mostrando{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            de {projects.length} proyectos
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
