"use server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export const createRegistroMO = withAuth(async (data: {
  proyectoId: string
  inicio: string
  fin: string
  description: string
}, session: any) => {
  // session viene inyectado por withAuth (el segundo parámetro)
  const colaboradorId = session.colaborador_id
  const creadoPor = session.nombre

  // Validación básica
  if (!data.proyectoId || !data.inicio || !data.fin) {
    throw new Error("Faltan datos requeridos")
  }

  // La base de datos calcula automáticamente los minutos y el cruce de medianoche vía Trigger
  // Para Prisma 6.x con fechas, tenemos que pasar strings ISO o Date objects válidos.
  // Como `hora_inicio` en Postgres es TIME(6), y Prisma lo mapea a DateTime, 
  // necesitamos crear objetos Date ficticios con esas horas (ej. 1970-01-01T10:00:00.000Z).
  
  const now = new Date()
  const [h1, m1] = data.inicio.split(':').map(Number)
  const [h2, m2] = data.fin.split(':').map(Number)
  
  const horaInicioDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h1, m1, 0)
  const horaFinDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h2, m2, 0)

  try {
    const registro = await prisma.registros.create({
      data: {
        proyecto_id: data.proyectoId,
        tipo: 'MO',
        colaborador_id: colaboradorId,
        hora_inicio: horaInicioDate,
        hora_fin: horaFinDate,
        descripcion: data.description,
        creado_por: creadoPor,
      }
    })
    
    revalidatePath("/") // Refresca el dashboard
    return { success: true, registro }
  } catch (error) {
    console.error("Error creando registro MO:", error)
    return { error: "No se pudo crear el registro de mano de obra" }
  }
})

export const createRegistroInsumo = withAuth(async (data: {
  proyectoId: string
  insumoId: string
  cantidad: number
}, session: any) => {
  const creadoPor = session.nombre

  if (!data.proyectoId || !data.insumoId || data.cantidad <= 0) {
    throw new Error("Datos inválidos o cantidad no permitida")
  }

  // Verificar si el insumo existe
  const insumo = await prisma.insumos.findUnique({
    where: { id: data.insumoId }
  })

  if (!insumo) {
    return { error: "El insumo seleccionado no existe" }
  }

  try {
    const registro = await prisma.registros.create({
      data: {
        proyecto_id: data.proyectoId,
        tipo: 'INSUMO',
        insumo_id: data.insumoId,
        cantidad: data.cantidad,
        creado_por: creadoPor,
      }
    })

    revalidatePath("/")
    return { success: true, registro }
  } catch (error) {
    console.error("Error creando registro de insumo:", error)
    return { error: "No se pudo registrar el consumo del insumo" }
  }
})
