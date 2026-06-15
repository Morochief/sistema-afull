import { prisma } from '@/lib/prisma'
import { logAuditAction, type AuditAction } from '@/lib/audit'

type ModelName = 'clientes' | 'proyectos' | 'insumos' | 'colaboradores'

async function softDelete(
  model: ModelName,
  id: string,
  colaborador_id: string,
  accion: AuditAction
) {
  const updated = await prisma[model].update({
    where: { id },
    data: { deleted_at: new Date() }
  })

  await logAuditAction({
    colaborador_id,
    accion,
    tabla_afectada: model,
    registro_id: id,
    cambios: { deleted_at: new Date().toISOString() }
  })

  return updated
}

export const softDeleteCliente = async (id: string, colaborador_id: string) =>
  softDelete('clientes', id, colaborador_id, 'DELETE_CLIENTE')

export const softDeleteProyecto = async (id: string, colaborador_id: string) =>
  softDelete('proyectos', id, colaborador_id, 'DELETE_PROYECTO')

export const softDeleteInsumo = async (id: string, colaborador_id: string) =>
  softDelete('insumos', id, colaborador_id, 'DELETE_INSUMO')

export const softDeleteColaborador = async (id: string, colaborador_id: string) =>
  softDelete('colaboradores', id, colaborador_id, 'DELETE_COLABORADOR')

// Helper para excluir deleted en queries
export const withoutDeleted = (model: ModelName) => ({
  where: { deleted_at: null }
})

// Usar en queries
export async function getActiveClientes() {
  return prisma.clientes.findMany({
    where: { deleted_at: null },
    orderBy: { nombre: 'asc' }
  })
}

export async function getActiveProyectos() {
  return prisma.proyectos.findMany({
    where: { deleted_at: null },
    orderBy: { creado_en: 'desc' }
  })
}

export async function getActiveInsumos() {
  return prisma.insumos.findMany({
    where: { deleted_at: null, activo: true },
    orderBy: { nombre: 'asc' }
  })
}

export async function getActiveColaboradores() {
  return prisma.colaboradores.findMany({
    where: { deleted_at: null, activo: true },
    orderBy: { nombre: 'asc' }
  })
}
