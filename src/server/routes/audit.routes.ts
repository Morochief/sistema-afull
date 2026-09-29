/**
 * Audit Routes - Logs de auditoria
 * Extraido de server.ts: /api/audit/*
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { logger } from '../config/logger.ts';

export const auditRouter = Router();

// GET /logins - Get login/logout audit events
auditRouter.get('/logins', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { usuario, desde, hasta, limite } = req.query;
  try {
    const where: any = { accion: { in: ['login', 'logout'] } };
    if (usuario) where.usuario = usuario;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde as string);
      if (hasta) where.createdAt.lte = new Date(hasta as string);
    }
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limite ? parseInt(limite as string) : 100,
    });
    res.json({ success: true, data: events.map(e => ({
      id: e.id, usuario: e.usuario, accion: e.accion, recurso: e.recurso,
      resultado: e.resultado, ip: e.ip, detalle: e.detalle, createdAt: e.createdAt,
    })) });
  } catch (err) {
    logger.error('Error fetching audit log:', err);
    res.status(500).json({ success: false, error: { code: 'AUDIT_ERROR', message: 'Error al obtener logs' } });
  }
});
