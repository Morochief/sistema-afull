/**
 * Clientes Routes — CRUD de clientes
 * Extraído de server.ts como parte del refactor a Express Routers.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, requireWriteAccess, hashPassword as hashPwd, mapDbRolToUi, mapUiRolToDb, userActiveCache } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse, JWTPayload, DatabaseState, RegistroItem } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';


import crypto from 'crypto';
import { generateId } from '../shared.ts';

export const clientesRouter = Router();

clientesRouter.post('/', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { nombre, codigo } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nombre requerido' } } as ApiResponse);
  try {
    const cliente = await prisma.cliente.create({ data: { id: generateId('cli'), nombre: nombre.trim(), codigo: (codigo || nombre.substring(0, 4).toUpperCase()).trim(), fechaCreacion: new Date() } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_cliente', recurso: `/api/clientes/${cliente.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { ...cliente, tokenPortal: cliente.tokenPortal || null, fechaCreacion: cliente.fechaCreacion.toISOString().substring(0, 10) }, message: 'Cliente creado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error creating cliente:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear cliente' } } as ApiResponse);
  }
});

clientesRouter.put('/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, codigo, activarPortal, revocarPortal } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nombre requerido' } } as ApiResponse);
  try {
    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' } } as ApiResponse);
    const data: any = { nombre: nombre.trim(), codigo: codigo ? codigo.trim() : existing.codigo };
    if (activarPortal === true && !existing.tokenPortal) data.tokenPortal = crypto.randomUUID();
    if (revocarPortal === true && existing.tokenPortal) data.tokenPortal = null;
    const updated = await prisma.cliente.update({ where: { id }, data });
    auditLog({ usuario: req.user!.usuario, accion: 'update_cliente', recurso: `/api/clientes/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { ...updated, tokenPortal: updated.tokenPortal || null, fechaCreacion: updated.fechaCreacion.toISOString().substring(0, 10) }, message: 'Cliente actualizado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error updating cliente:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar cliente' } } as ApiResponse);
  }
});

clientesRouter.delete('/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' } } as ApiResponse);
    await prisma.cliente.delete({ where: { id } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_cliente', recurso: `/api/clientes/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Cliente eliminado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error deleting cliente:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar cliente. Verificá que no tenga proyectos o registros asociados.' } } as ApiResponse);
  }
});
