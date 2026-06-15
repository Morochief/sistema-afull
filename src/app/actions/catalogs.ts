"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { withAuth } from "@/lib/auth"

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
export const createProyecto = withAuth(async (data: CreateProyectoData) => {
  try {
    if (!data.nombre.trim() || !data.clienteId) {
      return { error: "Nombre y cliente son requeridos" }
    }
    const proyecto = await prisma.proyectos.create({
      data: {
        nombre: data.nombre.trim(),
        cliente_id: data.clienteId,
        estado: data.estado || "in_progress"
      }
    })
    revalidatePath("/proyectos")
    revalidatePath("/")
    return { success: true, proyecto }
  } catch (error) {
    console.error(error)
    return { error: "Error al crear el proyecto" }
  }
})

// 2. Clientes Server Actions
export const createCliente = withAuth(async (data: CreateClienteData) => {
  try {
    if (!data.nombre.trim()) {
      return { error: "Nombre del cliente es requerido" }
    }
    const cliente = await prisma.clientes.create({
      data: {
        nombre: data.nombre.trim()
      }
    })
    revalidatePath("/clientes")
    return { success: true, cliente }
  } catch (error) {
    console.error(error)
    return { error: "Error al crear el cliente" }
  }
})

// 3. Insumos Server Actions
export const createInsumo = withAuth(async (data: CreateInsumoData) => {
  try {
    if (!data.nombre.trim() || data.precioUnitario <= 0) {
      return { error: "Nombre e importe positivo son requeridos" }
    }
    const insumo = await prisma.insumos.create({
      data: {
        nombre: data.nombre.trim(),
        precio_unitario: data.precioUnitario,
        activo: true
      }
    })
    revalidatePath("/insumos")
    return { success: true, insumo }
  } catch (error) {
    console.error(error)
    return { error: "Error al crear el insumo" }
  }
})

export const toggleInsumoActivo = withAuth(async (id: string) => {
  try {
    const current = await prisma.insumos.findUnique({ where: { id } })
    if (!current) return { error: "Insumo no encontrado" }

    const insumo = await prisma.insumos.update({
      where: { id },
      data: { activo: !current.activo }
    })
    revalidatePath("/insumos")
    return { success: true, insumo }
  } catch (error) {
    console.error(error)
    return { error: "Error al cambiar el estado del insumo" }
  }
})

// 4. Colaboradores Server Actions
export const createColaborador = withAuth(async (data: CreateColaboradorData) => {
  try {
    if (!data.nombre.trim() || data.tarifaMinuto < 0) {
      return { error: "Nombre y tarifa no negativa son requeridos" }
    }
    const colaborador = await prisma.colaboradores.create({
      data: {
        nombre: data.nombre.trim(),
        tarifa_minuto: data.tarifaMinuto,
        activo: true
      }
    })
    revalidatePath("/colaboradores")
    return { success: true, colaborador }
  } catch (error) {
    console.error(error)
    return { error: "Error al crear el colaborador" }
  }
})

export const toggleColaboradorActivo = withAuth(async (id: string) => {
  try {
    const current = await prisma.colaboradores.findUnique({ where: { id } })
    if (!current) return { error: "Colaborador no encontrado" }

    const colaborador = await prisma.colaboradores.update({
      where: { id },
      data: { activo: !current.activo }
    })
    revalidatePath("/colaboradores")
    return { success: true, colaborador }
  } catch (error) {
    console.error(error)
    return { error: "Error al cambiar el estado del colaborador" }
  }
})
