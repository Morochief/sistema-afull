import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { statusConfig } from "@/lib/projects-data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProyectosPage() {
  const proyectos = await prisma.proyectos.findMany({
    include: {
      cliente: true,
      _count: {
        select: { registros: true }
      }
    },
    orderBy: { creado_en: 'desc' }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">Listado completo de proyectos registrados en el sistema.</p>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Todos los Proyectos</CardTitle>
          <CardDescription>Visualiza el estado y cliente asociado de cada proyecto.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Registros de Consumo</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No hay proyectos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  proyectos.map((p) => {
                    const estadoKey = (p.estado as "in_progress" | "completed" | "on_hold") || "in_progress"
                    const status = statusConfig[estadoKey] || { label: estadoKey, className: "" }
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-foreground">{p.nombre}</TableCell>
                        <TableCell>{p.cliente.nombre}</TableCell>
                        <TableCell>{p._count.registros} consumos</TableCell>
                        <TableCell>{p.creado_en ? new Date(p.creado_en).toLocaleDateString("es-ES") : '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("font-medium", status.className)}>
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
        </CardContent>
      </Card>
    </div>
  )
}
