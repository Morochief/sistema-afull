/**
 * Proyectos Routes — CRUD de proyectos
 * Extraído de server.ts como parte del refactor a Express Routers.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, requireWriteAccess, hashPassword as hashPwd, mapDbRolToUi, mapUiRolToDb, userActiveCache } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse, JWTPayload, DatabaseState, RegistroItem } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';


import { generateId } from '../shared.ts';
import { validateSchema, ProyectoSchema } from '../../../server-validation.ts';

export const proyectosRouter = Router();

proyectosRouter.post('/', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const validation = validateSchema(ProyectoSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para crear proyecto', details: validation.errors } } as ApiResponse);
  const { clienteId, nombre, estado, fechaInicio } = validation.data!;
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return res.status(400).json({ success: false, error: { code: 'INVALID_REFERENCE', message: 'Cliente no encontrado' } } as ApiResponse);
    const existing = await prisma.proyecto.findFirst({ where: { clienteId, nombre: { equals: nombre.trim(), mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ success: false, error: { code: 'DUPLICATE_NAME', message: 'Ya existe un proyecto con ese nombre para este cliente' } } as ApiResponse);
    const estadoEnum = estado === 'En Proceso' ? 'EN_PROCESO' as const : estado === 'Completado' ? 'COMPLETADO' as const : 'PENDIENTE' as const;
    const proyecto = await prisma.proyecto.create({ data: { id: generateId('pro'), clienteId, nombre: nombre.trim(), estado: estadoEnum, fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date() } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_proyecto', recurso: `/api/proyectos/${proyecto.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { ...proyecto, estado: proyecto.estado === 'EN_PROCESO' ? 'En Proceso' : proyecto.estado === 'COMPLETADO' ? 'Completado' : 'Pendiente', fechaInicio: proyecto.fechaInicio.toISOString().substring(0, 10) }, message: 'Proyecto creado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error creating proyecto:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear proyecto' } } as ApiResponse);
  }
});

proyectosRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, estado, activo } = req.body;
  try {
    const proyecto = await prisma.proyecto.findUnique({ where: { id } });
    if (!proyecto) return res.status(404).json({ success: false, error: { message: 'Proyecto no encontrado' } });
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (activo !== undefined) updateData.activo = activo;
    if (estado !== undefined) {
      if (estado === 'En Proceso') updateData.estado = 'EN_PROCESO';
      else if (estado === 'Completado') updateData.estado = 'COMPLETADO';
      else if (estado === 'Pendiente') updateData.estado = 'PENDIENTE';
    }
    const updated = await prisma.proyecto.update({ where: { id }, data: updateData });
    auditLog({ usuario: (req as any).user?.usuario || 'admin', accion: 'update_proyecto', recurso: `/api/proyectos/${id}`, resultado: 'success', ip: getClientIp(req) });
    const estadoUI = updated.estado === 'EN_PROCESO' ? 'En Proceso' : updated.estado === 'COMPLETADO' ? 'Completado' : 'Pendiente';
    res.json({ success: true, data: { id: updated.id, nombre: updated.nombre, activo: updated.activo, estado: estadoUI } });
  } catch (error: any) {
    logger.error('Error al actualizar proyecto:', error);
    res.status(500).json({ success: false, error: { message: 'Error interno del servidor' } });
  }
});

proyectosRouter.delete('/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.proyecto.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } } as ApiResponse);
    await prisma.proyecto.delete({ where: { id } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_proyecto', recurso: `/api/proyectos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Proyecto eliminado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error deleting proyecto:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar proyecto. Verificá que no tenga registros asociados.' } } as ApiResponse);
  }
});
