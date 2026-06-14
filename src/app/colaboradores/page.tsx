import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function ColaboradoresPage() {
  const colaboradores = await prisma.colaboradores.findMany({
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
        <p className="text-muted-foreground">Listado del equipo y sus tarifas de mano de obra.</p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Equipo de Trabajo</CardTitle>
          <CardDescription>Visualiza las tarifas asociadas y el estado activo de cada colaborador.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Tarifa por Minuto</TableHead>
                  <TableHead className="text-right">Tarifa por Hora</TableHead>
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
                      <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400 font-medium">
                        {formatCurrency(Number(c.tarifa_minuto))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground font-medium">
                        {formatCurrency(Number(c.tarifa_minuto) * 60)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={c.activo ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </Badge>
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
