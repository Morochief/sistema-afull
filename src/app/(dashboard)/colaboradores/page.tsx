import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/projects-data"
import { CreateColaboradorSheet } from "@/components/create-colaborador-sheet"
import { ToggleColaboradorButton } from "@/components/toggle-colaborador-button"

export const dynamic = "force-dynamic"

export default async function ColaboradoresPage() {
  const colaboradores = await prisma.colaboradores.findMany({
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground">Equipo de trabajo registrado y sus tarifas asignadas.</p>
        </div>
        <CreateColaboradorSheet />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Equipo de Trabajo</CardTitle>
          <CardDescription>Tarifas por minuto y hora de cada integrante. Haz click en el estado para alternar.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tarifa / Minuto</TableHead>
                  <TableHead>Tarifa / Hora</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No hay colaboradores registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradores.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-foreground">{c.nombre}</TableCell>
                      <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(Number(c.tarifa_minuto))}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {formatCurrency(Number(c.tarifa_minuto) * 60)}/h
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleColaboradorButton id={c.id} initialActivo={!!c.activo} />
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
