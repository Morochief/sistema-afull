import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export type AuditAction =
  | 'CREATE_PROYECTO'
  | 'UPDATE_PROYECTO'
  | 'DELETE_PROYECTO'
  | 'CREATE_CLIENTE'
  | 'UPDATE_CLIENTE'
  | 'DELETE_CLIENTE'
  | 'CREATE_INSUMO'
  | 'UPDATE_INSUMO'
  | 'DELETE_INSUMO'
  | 'CREATE_COLABORADOR'
  | 'UPDATE_COLABORADOR'
  | 'DELETE_COLABORADOR'
  | 'CREATE_REGISTRO'
  | 'UPDATE_REGISTRO'
  | 'DELETE_REGISTRO'
  | 'LOGIN'
  | 'LOGOUT'

export async function logAuditAction(params: {
  colaborador_id: string
  accion: AuditAction
  tabla_afectada: string
  registro_id: string
  cambios?: Record<string, any>
}) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
               headersList.get('x-real-ip') ||
               'unknown'
    const userAgent = headersList.get('user-agent') || undefined

    return await prisma.logsAuditoria.create({
      data: {
        colaborador_id: params.colaborador_id,
        accion: params.accion,
        tabla_afectada: params.tabla_afectada,
        registro_id: params.registro_id,
        cambios: params.cambios,
        ip_address: ip,
        user_agent: userAgent
      }
    })
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR]', error)
    // No lanzar error si auditoría falla - continuar con la operación
  }
}

export async function getAuditLogs(params?: {
  tabla_afectada?: string
  colaborador_id?: string
  accion?: string
  limit?: number
  offset?: number
}) {
  const limit = params?.limit || 50
  const offset = params?.offset || 0

  return prisma.logsAuditoria.findMany({
    where: {
      tabla_afectada: params?.tabla_afectada,
      colaborador_id: params?.colaborador_id,
      accion: params?.accion
    },
    orderBy: { fecha_accion: 'desc' },
    take: limit,
    skip: offset,
    include: {
      colaborador: {
        select: { id: true, nombre: true }
      }
    }
  })
}
