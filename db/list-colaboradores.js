const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const colaboradores = await prisma.colaboradores.findMany({
    select: { id: true, nombre: true, rol: true, activo: true },
    orderBy: { nombre: 'asc' }
  })
  console.table(colaboradores)
}

main().catch(console.error).finally(() => prisma.$disconnect())
