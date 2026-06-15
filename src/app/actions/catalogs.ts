"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { withAuth } from "@/lib/auth"
import { logAuditAction } from "@/lib/audit"
import { ValidationError, NotFoundError, formatError } from "@/lib/errors"

interface CreateProyectoData {
  nombre: string
  clienteId: string
  estado?: string
}

interface CreateClienteData {
  nombre: string
}

interface CreateInsumoData {
  nombre: string
  precioUnitario: number
}

interface CreateColaboradorData {
  nombre: string
  tarifaMinuto: number
}

// 1. Proyectos Server Actions
export const createProyecto = withAuth(async (data: CreateProyectoData, session) => {
  try {
    if (!data.nombre?.trim()) {
      throw new ValidationError("Nombre del proyecto es requerido", "INVALID_NAME")
    }

    if (!data.clienteId) {
      throw new ValidationError("Cliente es requerido", "INVALID_CLIENT")
    }

    if (data.nombre.length > 200) {
      throw new ValidationError("Nombre máximo 200 caracteres", "NAME_TOO_LONG")
    }

    // Verificar que cliente existe
    const cliente = await prisma.clientes.findUnique({
      where: { id: data.clienteId }
    })

    if (!cliente) {
      throw new NotFoundError("Cliente", "CLIENT_NOT_FOUND")
    }

    const proyecto = await prisma.proyectos.create({
      data: {
        nombre: data.nombre.trim(),
        cliente_id: data.clienteId,
        estado: data.estado || "in_progress"
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_PROYECTO',
      tabla_afectada: 'proyectos',
      registro_id: proyecto.id,
      cambios: {
        nombre: proyecto.nombre,
        cliente_id: proyecto.cliente_id,
        estado: proyecto.estado
      }
    })

    revalidatePath("/proyectos")
    revalidatePath("/")
    revalidatePath("/registro")

    return { success: true, proyecto }
  } catch (error) {
    return formatError(error)
  }
})

export const updateProyectoEstado = withAuth(async ({ id, estado }: { id: string; estado: string }, session) => {
  try {
    const validStates = ["in_progress", "completed", "on_hold"]
    if (!validStates.includes(estado)) {
      throw new ValidationError(`Estado debe ser: ${validStates.join(", ")}`, "INVALID_STATE")
    }

    const proyecto = await prisma.proyectos.findUnique({ where: { id } })
    if (!proyecto) {
      throw new NotFoundError("Proyecto", "PROJECT_NOT_FOUND")
    }

    const updated = await prisma.proyectos.update({
      where: { id },
      data: { estado }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'UPDATE_PROYECTO',
      tabla_afectada: 'proyectos',
      registro_id: id,
      cambios: {
        estado_anterior: proyecto.estado,
        estado_nuevo: updated.estado
      }
    })

    revalidatePath("/proyectos")
    revalidatePath("/")
    revalidatePath("/registro")

    return { success: true, proyecto: updated }
  } catch (error) {
    return formatError(error)
  }
})

// 2. Clientes Server Actions
export const createCliente = withAuth(async (data: CreateClienteData, session) => {
  try {
    if (!data.nombre?.trim()) {
      throw new ValidationError("Nombre del cliente es requerido", "INVALID_NAME")
    }

    if (data.nombre.length > 150) {
      throw new ValidationError("Nombre máximo 150 caracteres", "NAME_TOO_LONG")
    }

    const cliente = await prisma.clientes.create({
      data: {
        nombre: data.nombre.trim()
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_CLIENTE',
      tabla_afectada: 'clientes',
      registro_id: cliente.id,
      cambios: { nombre: cliente.nombre }
    })

    revalidatePath("/clientes")

    return { success: true, cliente }
  } catch (error) {
    return formatError(error)
  }
})

// 3. Insumos Server Actions
export const createInsumo = withAuth(async (data: CreateInsumoData, session) => {
  try {
    if (!data.nombre?.trim()) {
      throw new ValidationError("Nombre del insumo es requerido", "INVALID_NAME")
    }

    if (data.nombre.length > 150) {
      throw new ValidationError("Nombre máximo 150 caracteres", "NAME_TOO_LONG")
    }

    if (typeof data.precioUnitario !== 'number' || data.precioUnitario <= 0) {
      throw new ValidationError("Precio debe ser un número positivo", "INVALID_PRICE")
    }

    if (data.precioUnitario > 999999.99) {
      throw new ValidationError("Precio máximo: 999999.99", "PRICE_TOO_HIGH")
    }

    const insumo = await prisma.insumos.create({
      data: {
        nombre: data.nombre.trim(),
        precio_unitario: data.precioUnitario,
        activo: true
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_INSUMO',
      tabla_afectada: 'insumos',
      registro_id: insumo.id,
      cambios: {
        nombre: insumo.nombre,
        precio_unitario: insumo.precio_unitario
      }
    })

    revalidatePath("/insumos")

    return { success: true, insumo }
  } catch (error) {
    return formatError(error)
  }
})

export const toggleInsumoActivo = withAuth(async (id: string, session) => {
  try {
    const current = await prisma.insumos.findUnique({ where: { id } })
    if (!current) {
      throw new NotFoundError("Insumo", "INSUMO_NOT_FOUND")
    }

    const insumo = await prisma.insumos.update({
      where: { id },
      data: { activo: !current.activo }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: current.activo ? 'UPDATE_INSUMO' : 'UPDATE_INSUMO',
      tabla_afectada: 'insumos',
      registro_id: id,
      cambios: {
        activo_anterior: current.activo,
        activo_nuevo: insumo.activo
      }
    })

    revalidatePath("/insumos")

    return { success: true, insumo }
  } catch (error) {
    return formatError(error)
  }
})

// 4. Colaboradores Server Actions
export const createColaborador = withAuth(async (data: CreateColaboradorData, session) => {
  try {
    if (!data.nombre?.trim()) {
      throw new ValidationError("Nombre del colaborador es requerido", "INVALID_NAME")
    }

    if (data.nombre.length > 100) {
      throw new ValidationError("Nombre máximo 100 caracteres", "NAME_TOO_LONG")
    }

    if (typeof data.tarifaMinuto !== 'number' || data.tarifaMinuto < 0) {
      throw new ValidationError("Tarifa debe ser un número no negativo", "INVALID_TARIFF")
    }

    if (data.tarifaMinuto > 999999.99) {
      throw new ValidationError("Tarifa máxima: 999999.99", "TARIFF_TOO_HIGH")
    }

    const colaborador = await prisma.colaboradores.create({
      data: {
        nombre: data.nombre.trim(),
        tarifa_minuto: data.tarifaMinuto,
        activo: true
      }
    })

    // Auditoría
    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'CREATE_COLABORADOR',
      tabla_afectada: 'colaboradores',
      registro_id: colaborador.id,
      cambios: {
        nombre: colaborador.nombre,
        tarifa_minuto: colaborador.tarifa_minuto
      }
    })

    revalidatePath("/colaboradores")

    return { success: true, colaborador }
  } catch (error) {
    return formatError(error)
  }
})

export const deleteCliente = withAuth(async (id: string, session) => {
  try {
    const cliente = await prisma.clientes.findUnique({ where: { id } })
    if (!cliente) {
      throw new NotFoundError("Cliente", "CLIENT_NOT_FOUND")
    }

    const deleted = await prisma.clientes.update({
      where: { id },
      data: { deleted_at: new Date() }
    })

    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'DELETE_CLIENTE',
      tabla_afectada: 'clientes',
      registro_id: id,
      cambios: { deleted_at: new Date().toISOString() }
    })

    revalidatePath("/clientes")

    return { success: true }
  } catch (error) {
    return formatError(error)
  }
})

export const deleteProyecto = withAuth(async (id: string, session) => {
  try {
    const proyecto = await prisma.proyectos.findUnique({ where: { id } })
    if (!proyecto) {
      throw new NotFoundError("Proyecto", "PROJECT_NOT_FOUND")
    }

    const deleted = await prisma.proyectos.update({
      where: { id },
      data: { deleted_at: new Date() }
    })

    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'DELETE_PROYECTO',
      tabla_afectada: 'proyectos',
      registro_id: id,
      cambios: { deleted_at: new Date().toISOString() }
    })

    revalidatePath("/proyectos")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return formatError(error)
  }
})

export const deleteInsumo = withAuth(async (id: string, session) => {
  try {
    const insumo = await prisma.insumos.findUnique({ where: { id } })
    if (!insumo) {
      throw new NotFoundError("Insumo", "INSUMO_NOT_FOUND")
    }

    const deleted = await prisma.insumos.update({
      where: { id },
      data: { deleted_at: new Date() }
    })

    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'DELETE_INSUMO',
      tabla_afectada: 'insumos',
      registro_id: id,
      cambios: { deleted_at: new Date().toISOString() }
    })

    revalidatePath("/insumos")

    return { success: true }
  } catch (error) {
    return formatError(error)
  }
})

export const deleteColaborador = withAuth(async (id: string, session) => {
  try {
    const colaborador = await prisma.colaboradores.findUnique({ where: { id } })
    if (!colaborador) {
      throw new NotFoundError("Colaborador", "COLABORADOR_NOT_FOUND")
    }

    const deleted = await prisma.colaboradores.update({
      where: { id },
      data: { deleted_at: new Date() }
    })

    await logAuditAction({
      colaborador_id: session.colaborador_id,
      accion: 'DELETE_COLABORADOR',
      tabla_afectada: 'colaboradores',
      registro_id: id,
      cambios: { deleted_at: new Date().toISOString() }
    })

    revalidatePath("/colaboradores")

    return { success: true }
  } catch (error) {
    return formatError(error)
  }
})
