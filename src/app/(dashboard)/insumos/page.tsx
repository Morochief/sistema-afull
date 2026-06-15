import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/projects-data"
import { CreateInsumoSheet } from "@/components/create-insumo-sheet"
import { ToggleInsumoButton } from "@/components/toggle-insumo-button"

export const dynamic = "force-dynamic"

export default async function InsumosPage() {
  const insumos = await prisma.insumos.findMany({
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de Insumos</h1>
          <p className="text-muted-foreground">Materiales y consumibles disponibles con sus costos.</p>
        </div>
        <CreateInsumoSheet />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Insumos Registrados</CardTitle>
          <CardDescription>Lista de materiales y precios de costo vigentes. Haz click en el estado para alternar.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      No hay insumos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  insumos.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-semibold text-foreground">{i.nombre}</TableCell>
                      <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(i.precio_unitario))}
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleInsumoButton id={i.id} initialActivo={!!i.activo} />
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
