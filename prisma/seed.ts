import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const excelFilePath = path.join(process.cwd(), 'Kevin.xlsx')

  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ El archivo no se encuentra en la ruta: ${excelFilePath}`)
    console.error(`Asegúrate de colocar 'Kevin.xlsx' en la raíz de 'app-unificada'.`)
    process.exit(1)
  }

  console.log(`Leyendo archivo Excel desde: ${excelFilePath}...`)
  const workbook = xlsx.readFile(excelFilePath)

  // Asumimos que la primera hoja tiene colaboradores o los buscamos por nombre
  const sheetNames = workbook.SheetNames
  
  // Extraer datos de la hoja de Colaboradores (ajusta el índice o el nombre si es diferente)
  // Por defecto, buscaré una hoja llamada "Colaboradores" o tomaré la primera
  const colabSheetName = sheetNames.find(n => n.toLowerCase().includes('colaborador')) || sheetNames[0]
  const colabData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[colabSheetName])

  // Extraer datos de la hoja de Insumos
  const insumosSheetName = sheetNames.find(n => n.toLowerCase().includes('insumo')) || sheetNames[1]
  let insumosData: any[] = []
  if (insumosSheetName && workbook.Sheets[insumosSheetName]) {
    insumosData = xlsx.utils.sheet_to_json(workbook.Sheets[insumosSheetName])
  }

  console.log(`Se encontraron ${colabData.length} posibles colaboradores y ${insumosData.length} insumos en el Excel.`)

  try {
    await prisma.$transaction(async (tx) => {
      console.log('--- Iniciando inyección de Colaboradores ---')
      let colabsCreados = 0
      for (const row of colabData) {
        // Asumiendo columnas 'Nombre' y 'Tarifa' en el excel
        const nombre = row['Nombre'] || row['nombre'] || row['NOMBRE']
        const tarifa = row['Tarifa'] || row['tarifa'] || row['TARIFA'] || 350

        if (nombre) {
          await tx.colaboradores.create({
            data: {
              nombre: String(nombre),
              tarifa_minuto: Number(tarifa),
              activo: true
            }
          })
          colabsCreados++
        }
      }
      console.log(`✅ ${colabsCreados} Colaboradores inyectados con éxito.`)

      console.log('--- Iniciando inyección de Insumos ---')
      let insumosCreados = 0
      for (const row of insumosData) {
        // Asumiendo columnas 'Nombre' y 'Precio' en el excel
        const nombre = row['Nombre'] || row['nombre'] || row['NOMBRE'] || row['Insumo']
        const precio = row['Precio'] || row['precio'] || row['PRECIO'] || row['Costo'] || 0

        if (nombre && Number(precio) > 0) {
          await tx.insumos.create({
            data: {
              nombre: String(nombre),
              precio_unitario: Number(precio),
              activo: true
            }
          })
          insumosCreados++
        }
      }
      console.log(`✅ ${insumosCreados} Insumos inyectados con éxito.`)
    })
    
    console.log('🎉 ¡Todas las inyecciones se realizaron correctamente en Supabase!')
  } catch (error) {
    console.error('❌ Error durante la inyección. La transacción se ha revertido.', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
