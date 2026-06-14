import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clientes = await prisma.clientes.findMany({
    include: {
      _count: {
        select: { proyectos: true }
      }
    },
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Listado de clientes corporativos y particulares.</p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Clientes Registrados</CardTitle>
          <CardDescription>Clientes del sistema y número de proyectos asignados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>ID del Cliente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Proyectos Asignados</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No hay clientes registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.id}</TableCell>
                      <TableCell className="font-semibold text-foreground">{c.nombre}</TableCell>
                      <TableCell>{c._count.proyectos} proyectos</TableCell>
                      <TableCell>{c.creado_en ? new Date(c.creado_en).toLocaleDateString("es-ES") : '-'}</TableCell>
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
