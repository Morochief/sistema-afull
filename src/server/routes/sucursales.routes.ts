/**
 * Sucursales Routes — CRUD de sucursales (locales de clientes) — Admin
 * Extraído de server.ts como parte del refactor a Express Routers.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { generateId } from '../shared.ts';

export const sucursalesRouter = Router();

sucursalesRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.query as { clienteId?: string };
    const where: any = {};
    if (clienteId) where.clienteId = String(clienteId);
    const sucursales = await prisma.sucursal.findMany({ where, orderBy: { nombre: 'asc' }, include: { cliente: { select: { nombre: true } } } });
    res.json({ success: true, data: sucursales.map((s) => ({ id: s.id, clienteId: s.clienteId, clienteNombre: s.cliente.nombre, nombre: s.nombre, ciudad: s.ciudad, activo: s.activo })) } as ApiResponse);
  } catch (error: any) {
    logger.error('[SUCURSALES] Error listing:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: 'Error al listar sucursales' } } as ApiResponse);
  }
});

sucursalesRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { clienteId, nombre, ciudad } = req.body || {};
  const nombreLimpio = String(nombre || '').trim().slice(0, 100);
  if (!clienteId || !nombreLimpio) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cliente y nombre son requeridos' } } as ApiResponse);
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' } } as ApiResponse);
    const sucursal = await prisma.sucursal.create({ data: { id: generateId('suc'), clienteId, nombre: nombreLimpio, ciudad: ciudad ? String(ciudad).trim().slice(0, 100) : null } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_sucursal', recurso: `/api/admin/sucursales/${sucursal.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { id: sucursal.id, clienteId, nombre: sucursal.nombre, ciudad: sucursal.ciudad, activo: true }, message: 'Sucursal creada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[SUCURSALES] Error creating:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear sucursal' } } as ApiResponse);
  }
});

sucursalesRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, ciudad, activo } = req.body || {};
  try {
    const existing = await prisma.sucursal.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } } as ApiResponse);
    const data: any = {};
    if (nombre !== undefined) data.nombre = String(nombre).trim().slice(0, 100);
    if (ciudad !== undefined) data.ciudad = ciudad ? String(ciudad).trim().slice(0, 100) : null;
    if (activo !== undefined) data.activo = Boolean(activo);
    const updated = await prisma.sucursal.update({ where: { id }, data });
    auditLog({ usuario: req.user!.usuario, accion: 'update_sucursal', recurso: `/api/admin/sucursales/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { id: updated.id, clienteId: updated.clienteId, nombre: updated.nombre, ciudad: updated.ciudad, activo: updated.activo }, message: 'Sucursal actualizada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[SUCURSALES] Error updating:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar sucursal' } } as ApiResponse);
  }
});

sucursalesRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.sucursal.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } } as ApiResponse);
    await prisma.sucursal.update({ where: { id }, data: { activo: false } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_sucursal', recurso: `/api/admin/sucursales/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Sucursal desactivada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[SUCURSALES] Error deleting:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al desactivar sucursal' } } as ApiResponse);
  }
});
