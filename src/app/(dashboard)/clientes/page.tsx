import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateClientSheet } from "@/components/create-client-sheet"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Listado de clientes registrados en el sistema.</p>
        </div>
        <CreateClientSheet />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Todos los Clientes</CardTitle>
          <CardDescription>Visualiza las empresas y la cantidad de proyectos activos.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nombre de la Empresa</TableHead>
                  <TableHead>Proyectos Relacionados</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      No hay clientes registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((c) => (
                    <TableRow key={c.id}>
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
