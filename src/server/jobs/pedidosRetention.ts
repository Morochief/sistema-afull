/**
 * Pedidos Retention Job
 *
 * Archiva automáticamente los pedidos en estado terminal (Completado / Entregado)
 * que superan la antigüedad configurada. Los pedidos archivados no se eliminan:
 * quedan en la base de datos pero dejan de aparecer en listados activos del
 * admin y del portal del cliente.
 *
 * Configuración (env):
 *   PEDIDOS_RETENTION_DAYS   → días de antigüedad para archivar (default: 90)
 *   PEDIDOS_RETENTION_INTERVAL_MS → intervalo de ejecución del job (default: 24 h)
 */

import { prisma } from '../../lib/prisma.ts';
import { logger } from '../config/logger.ts';

const RETENTION_DAYS = Number(process.env.PEDIDOS_RETENTION_DAYS) || 90;
const INTERVAL_MS = Number(process.env.PEDIDOS_RETENTION_INTERVAL_MS) || 24 * 60 * 60 * 1000; // 24h

const ESTADOS_TERMINALES = ['Completado', 'Entregado'];

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function archivarPedidosAntiguos(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const resultado = await prisma.pedido.updateMany({
      where: {
        archivado: false,
        estado: { in: ESTADOS_TERMINALES },
        updatedAt: { lt: cutoff },
      },
      data: {
        archivado: true,
        archivadoAt: new Date(),
      },
    });

    if (resultado.count > 0) {
      logger.info(
        `[RETENTION] ${resultado.count} pedido(s) archivado(s) (estados: ${ESTADOS_TERMINALES.join(', ')}, antigüedad > ${RETENTION_DAYS} días)`
      );
    }

    return resultado.count;
  } catch (error: any) {
    logger.error('[RETENTION] Error archivando pedidos antiguos:', error);
    return 0;
  }
}

export function startPedidosRetentionJob(): void {
  if (intervalHandle) {
    logger.warn('[RETENTION] Job de retención ya está corriendo');
    return;
  }

  // Ejecutar inmediatamente al arranque (en background, sin bloquear el boot)
  archivarPedidosAntiguos().catch((e) =>
    logger.error('[RETENTION] Error en ejecución inicial:', e)
  );

  // Programar ejecuciones periódicas
  intervalHandle = setInterval(() => {
    archivarPedidosAntiguos().catch((e) =>
      logger.error('[RETENTION] Error en ejecución periódica:', e)
    );
  }, INTERVAL_MS);

  logger.info(
    `[RETENTION] Job de retención de pedidos iniciado (cada ${Math.round(INTERVAL_MS / 3600000)}h, archivar > ${RETENTION_DAYS} días)`
  );
}

export function stopPedidosRetentionJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[RETENTION] Job de retención detenido');
  }
}
