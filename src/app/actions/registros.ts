"use server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logAuditAction } from "@/lib/audit"
import { ValidationError, NotFoundError, formatError } from "@/lib/errors"

export const createRegistroMO = withAuth(async (data: {
  proyectoId: string
  inicio: string
  fin: string
  description: string
}, session) => {
  try {
    // Validación mejorada
    if (!data.proyectoId?.trim()) {
      throw new ValidationError("Proyecto es requerido", "INVALID_PROJECT")
    }

    if (!data.inicio?.trim() || !data.fin?.trim()) {
      throw new ValidationError("Horas de inicio y fin son requeridas", "INVALID_TIME")
    }

    if (data.description && data.description.length > 500) {
      throw new ValidationError("Descripción máximo 500 caracteres", "DESCRIPTION_TOO_LONG")
    }

    // Validar formato de hora (HH:mm)
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(data.inicio) || !timeRegex.test(data.fin)) {
      throw new ValidationError("Formato de hora inválido (debe ser HH:mm)", "INVALID_TIME_FORMAT")
    }

    // Verificar proyecto existe
    const proyecto = await prisma.proyectos.findUnique({
      where: { id: data.proyectoId }
    })

    if (!proyecto) {
      throw new NotFoundError("Proyecto", "PROJECT_NOT_FOUND")
    }

    const now = new Date()
    const [h1, m1] = data.inicio.split(':').map(Number)
    const [h2, m2] = data.fin.split(':').map(Number)

    const horaInicioDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h1, m1, 0)
    const horaFinDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h2, m2, 0)

    // Validar que fin > inicio
    if (horaFinDate <= horaInicioDate) {
      throw new ValidationError("La hora de fin debe ser después que la de inicio", "INVALID_TIME_RANGE")
    }

    const registro = await prisma.registros.create({
      data: {
        proyecto_id: data.proyectoId,
        tipo: 'MO',
        colaborador_id: session.colaborador_id,
        hora_inicio: horaInicioDate,
        hora_fin: horaFinDate,
        descripcion: data.description || null,
        creado_por: session.nombre,
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_REGISTRO',
      tabla_afectada: 'registros',
      registro_id: registro.id,
      cambios: {
        tipo: 'MO',
        proyecto_id: data.proyectoId,
        hora_inicio: data.inicio,
        hora_fin: data.fin
      }
    })

    revalidatePath("/")
    revalidatePath("/registro")

    return { success: true, registro }
  } catch (error) {
    return formatError(error)
  }
})

export const createRegistroInsumo = withAuth(async (data: {
  proyectoId: string
  insumoId: string
  cantidad: number
}, session) => {
  try {
    // Validación mejorada
    if (!data.proyectoId?.trim()) {
      throw new ValidationError("Proyecto es requerido", "INVALID_PROJECT")
    }

    if (!data.insumoId?.trim()) {
      throw new ValidationError("Insumo es requerido", "INVALID_INSUMO")
    }

    if (typeof data.cantidad !== 'number' || data.cantidad <= 0) {
      throw new ValidationError("Cantidad debe ser un número positivo", "INVALID_QUANTITY")
    }

    if (data.cantidad > 999999.99) {
      throw new ValidationError("Cantidad máxima: 999999.99", "QUANTITY_TOO_HIGH")
    }

    // Verificar proyecto y insumo existen
    const [proyecto, insumo] = await Promise.all([
      prisma.proyectos.findUnique({ where: { id: data.proyectoId } }),
      prisma.insumos.findUnique({ where: { id: data.insumoId } })
    ])

    if (!proyecto) {
      throw new NotFoundError("Proyecto", "PROJECT_NOT_FOUND")
    }

    if (!insumo) {
      throw new NotFoundError("Insumo", "INSUMO_NOT_FOUND")
    }

    if (!insumo.activo) {
      throw new ValidationError("El insumo está inactivo", "INSUMO_INACTIVE")
    }

    const registro = await prisma.registros.create({
      data: {
        proyecto_id: data.proyectoId,
        tipo: 'INSUMO',
        insumo_id: data.insumoId,
        cantidad: data.cantidad,
        creado_por: session.nombre,
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_REGISTRO',
      tabla_afectada: 'registros',
      registro_id: registro.id,
      cambios: {
        tipo: 'INSUMO',
        proyecto_id: data.proyectoId,
        insumo_id: data.insumoId,
        cantidad: data.cantidad
      }
    })

    revalidatePath("/")
    revalidatePath("/registro")

    return { success: true, registro }
  } catch (error) {
    return formatError(error)
  }
})
