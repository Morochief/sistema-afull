import { PrismaClient } from '@prisma/client'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

// Convertir fecha de Excel (número de serie) a Date de JS
function excelDateToJSDate(serial: number) {
  const utc_days  = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate() + 1)
}

// Convertir hora de Excel (fracción de 24 hs) a Date de JS
function excelTimeToDate(serial: number, baseDate: Date) {
  if (!serial) return null
  const totalSeconds = Math.round(serial * 24 * 60 * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  const d = new Date(baseDate.getTime())
  d.setHours(hours, minutes, seconds, 0)
  return d
}

async function main() {
  const excelFilePath = path.join(process.cwd(), 'Kevin.xlsx')
  
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ El archivo no se encuentra en: ${excelFilePath}`)
    process.exit(1)
  }

  console.log(`Leyendo Excel desde: ${excelFilePath}`)
  const workbook = xlsx.readFile(excelFilePath)
  const sheetName = workbook.SheetNames[0]
  
  // Leer desde la fila 2 (índice 1) asumiendo que es el header
  const rawData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { range: 1 })
  console.log(`Filas encontradas en Excel: ${rawData.length}`)

  // 1. Limpiar registros viejos para evitar duplicados
  console.log("Limpiando registros transaccionales existentes...")
  await prisma.registros.deleteMany()
  await prisma.proyectos.deleteMany()

  // 2. Coleccionar entidades únicas para poblar catálogos
  const clientesSet = new Set<string>()
  const colaboradoresSet = new Set<string>()
  const insumosSet = new Set<string>()
  
  // Guardamos las relaciones
  const proyectosSet = new Set<string>() // "Nombre Proyecto|Nombre Cliente"
  
  for (const row of rawData) {
    const cliente = row['Cliente']
    const proyecto = row['Proyecto']
    const concepto = row['Concepto']
    const descripcion = row['Descripción '] || row['Descripción']
    
    if (cliente && cliente !== 'Cliente') clientesSet.add(cliente)
    if (proyecto && cliente && proyecto !== 'Proyecto') {
      proyectosSet.add(`${proyecto}|${cliente}`)
    }

    if (concepto === 'MO' && descripcion) {
      const colabName = String(descripcion).split(' ')[0]
      if (colabName && colabName.length > 2) {
        colaboradoresSet.add(colabName)
      }
    } else if (concepto === 'Insumo' && descripcion) {
      insumosSet.add(String(descripcion))
    }
  }

  console.log(`Detectados: ${clientesSet.size} Clientes, ${proyectosSet.size} Proyectos, ${colaboradoresSet.size} Colaboradores, ${insumosSet.size} Insumos.`)

  // 3. Crear Clientes
  const clienteNameToId = new Map<string, string>()
  for (const c of clientesSet) {
    let dbCliente = await prisma.clientes.findFirst({ where: { nombre: c } })
    if (!dbCliente) {
      dbCliente = await prisma.clientes.create({ data: { nombre: c } })
    }
    clienteNameToId.set(c, dbCliente.id)
  }
  console.log("✅ Clientes sincronizados.")

  // 4. Crear Colaboradores
  const colabNameToId = new Map<string, string>()
  for (const colab of colaboradoresSet) {
    let dbColab = await prisma.colaboradores.findFirst({ where: { nombre: colab } })
    if (!dbColab) {
      dbColab = await prisma.colaboradores.create({
        data: { nombre: colab, tarifa_minuto: 350, activo: true }
      })
    }
    colabNameToId.set(colab, dbColab.id)
  }
  console.log("✅ Colaboradores sincronizados.")

  // 5. Crear Insumos
  const insumoNameToId = new Map<string, string>()
  for (const ins of insumosSet) {
    let dbInsumo = await prisma.insumos.findFirst({ where: { nombre: ins } })
    if (!dbInsumo) {
      dbInsumo = await prisma.insumos.create({
        data: { nombre: ins, precio_unitario: 1000, activo: true }
      })
    }
    insumoNameToId.set(ins, dbInsumo.id)
  }
  console.log("✅ Insumos sincronizados.")

  // 6. Crear Proyectos
  const proyectoNameToId = new Map<string, string>()
  for (const pStr of proyectosSet) {
    const [pNombre, cNombre] = pStr.split('|')
    const clienteId = clienteNameToId.get(cNombre)
    if (!clienteId) continue

    let dbProyecto = await prisma.proyectos.findFirst({
      where: { nombre: pNombre, cliente_id: clienteId }
    })
    
    if (!dbProyecto) {
      dbProyecto = await prisma.proyectos.create({
        data: {
          nombre: pNombre,
          cliente_id: clienteId,
          estado: pNombre.includes("Mant") || pNombre.includes("Pizarra") ? "completed" : "in_progress"
        }
      })
    }
    proyectoNameToId.set(pNombre, dbProyecto.id)
  }
  console.log("✅ Proyectos creados.")

  // 7. Inyectar Registros
  console.log("Inyectando registros históricos...")
  let registrosCreados = 0
  
  for (const row of rawData) {
    const cliente = row['Cliente']
    const proyecto = row['Proyecto']
    const concepto = row['Concepto']
    const descripcion = row['Descripción '] || row['Descripción']
    const fechaSerial = row['Fecha']
    const cantidadVal = row['Cantidad']
    
    if (!cliente || !proyecto || !concepto || cliente === 'Cliente' || proyecto === 'Proyecto') {
      continue
    }

    const proyectoId = proyectoNameToId.get(proyecto)
    if (!proyectoId) continue

    const fecha = excelDateToJSDate(fechaSerial)

    if (concepto === 'MO') {
      const colabName = String(descripcion).split(' ')[0]
      const colaboradorId = colabNameToId.get(colabName)
      if (!colaboradorId) continue

      const hsInicioSerial = row['Hs Inicio']
      const hsFinSerial = row['Hs Fin']
      
      const horaInicio = excelTimeToDate(hsInicioSerial, fecha)
      const horaFin = excelTimeToDate(hsFinSerial, fecha)

      await prisma.registros.create({
        data: {
          proyecto_id: proyectoId,
          tipo: 'MO',
          fecha: fecha,
          colaborador_id: colaboradorId,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          descripcion: descripcion,
          creado_por: colabName,
        }
      })
      registrosCreados++
    } else if (concepto === 'Insumo') {
      const insumoId = insumoNameToId.get(String(descripcion))
      if (!insumoId) continue

      await prisma.registros.create({
        data: {
          proyecto_id: proyectoId,
          tipo: 'INSUMO',
          fecha: fecha,
          insumo_id: insumoId,
          cantidad: Number(cantidadVal),
          descripcion: descripcion,
          creado_por: 'Sistema (Excel)',
        }
      })
      registrosCreados++
    }
  }

  console.log(`🎉 ¡Migración finalizada con éxito! Se crearon ${registrosCreados} registros de consumos/mano de obra en Supabase.`)
}

main()
  .catch(e => {
    console.error("❌ Error durante la migración:", e)
  })
  .finally(() => {
    prisma.$disconnect()
  })
