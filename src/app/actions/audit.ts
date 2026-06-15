"use server"

import { prisma } from "@/lib/prisma"
import { getAuditLogs } from "@/lib/audit"
import { requireAuth } from "@/lib/auth"
import { formatError } from "@/lib/errors"

export async function getAuditTrail(params?: {
  tabla?: string
  accion?: string
  limit?: number
  offset?: number
}) {
  try {
    const session = await requireAuth()

    const logs = await getAuditLogs({
      tabla_afectada: params?.tabla,
      accion: params?.accion,
      limit: params?.limit || 50,
      offset: params?.offset || 0
    })

    return { success: true, logs }
  } catch (error) {
    return formatError(error)
  }
}

export async function getAuditStatistics() {
  try {
    const session = await requireAuth()

    const stats = await Promise.all([
      // Acciones por tipo
      prisma.logsAuditoria.groupBy({
        by: ['accion'],
        _count: true,
        orderBy: { _count: { accion: 'desc' } },
        take: 10
      }),
      // Usuarios más activos
      prisma.logsAuditoria.groupBy({
        by: ['colaborador_id'],
        _count: true,
        orderBy: { _count: { colaborador_id: 'desc' } },
        take: 10
      })
    ])

    return { success: true, stats: { porAccion: stats[0], porUsuario: stats[1] } }
  } catch (error) {
    return formatError(error)
  }
}
