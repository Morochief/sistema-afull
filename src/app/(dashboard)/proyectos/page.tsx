import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateProjectSheet } from "@/components/create-project-sheet"
import { ProjectStatusSelect } from "@/components/project-status-select"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function ProyectosPage() {
  const session = await getSession()
  const canEditStatus = session?.rol === 'admin' || session?.rol === 'jefe_proyecto'

  const proyectos = await prisma.proyectos.findMany({
    include: {
      cliente: true,
      _count: {
        select: { registros: true }
      }
    },
    orderBy: { creado_en: 'desc' }
  })

  // Obtener la lista de clientes para pasársela al formulario de creación
  const clientes = await prisma.clientes.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">Listado completo de proyectos registrados en el sistema.</p>
        </div>
        <CreateProjectSheet clientes={clientes} />
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
                  proyectos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-foreground">{p.nombre}</TableCell>
                      <TableCell>{p.cliente.nombre}</TableCell>
                      <TableCell>{p._count.registros} consumos</TableCell>
                      <TableCell>{p.creado_en ? new Date(p.creado_en).toLocaleDateString("es-ES") : '-'}</TableCell>
                      <TableCell className="text-center">
                        <ProjectStatusSelect
                          projectId={p.id}
                          currentStatus={p.estado || "in_progress"}
                          canEdit={canEditStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
