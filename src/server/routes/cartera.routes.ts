/**
 * Cartera Routes — Cartera de clientes (empresas con RUC, contactos y marcas)
 * Extraído de server.ts como parte del refactor a Express Routers.
 * Todos los endpoints son Admin-only (requireAuth + requireAdmin).
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, requireWriteAccess } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { generateId } from '../shared.ts';
import { validateSchema, CarteraClienteSchema, CarteraClienteUpdateSchema, CarteraContactoSchema, CarteraContactoUpdateSchema, CarteraMarcaSchema, CarteraMarcaUpdateSchema } from '../../../server-validation.ts';

export const carteraRouter = Router();

// ─── Clientes de cartera ───

carteraRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { activo, search } = req.query as { activo?: string; search?: string };
    const where: any = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      const q = String(search).trim();
      if (q) { where.OR = [ { nombre: { contains: q, mode: 'insensitive' } }, { ruc: { contains: q, mode: 'insensitive' } } ]; }
    }
    const clientes = await prisma.carteraCliente.findMany({ where, orderBy: { nombre: 'asc' }, include: { _count: { select: { contactos: true, marcas: true } } } });
    res.json({ success: true, data: clientes.map((c) => ({ id: c.id, nombre: c.nombre, ruc: c.ruc, activo: c.activo, fechaCreacion: c.createdAt.toISOString(), _count: c._count })) } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error listing cartera clientes:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: 'Error al listar clientes de cartera' } } as ApiResponse);
  }
});

carteraRouter.post('/', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const validation = validateSchema(CarteraClienteSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message, details: validation.errors } } as ApiResponse);
  const { nombre, ruc } = validation.data as { nombre: string; ruc: string | null };
  try {
    if (ruc) {
      const dup = await prisma.carteraCliente.findUnique({ where: { ruc } });
      if (dup) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RUC', message: `Ya existe un cliente con el RUC ${ruc}` } } as ApiResponse);
    }
    const cliente = await prisma.carteraCliente.create({ data: { id: generateId('carcli'), nombre, ruc } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_cartera_cliente', recurso: `/api/admin/cartera/${cliente.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { id: cliente.id, nombre: cliente.nombre, ruc: cliente.ruc, activo: true }, message: 'Cliente de cartera creado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error creating cartera cliente:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear cliente de cartera' } } as ApiResponse);
  }
});

carteraRouter.put('/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateSchema(CarteraClienteUpdateSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message } } as ApiResponse);
  const { nombre, ruc, activo } = validation.data as any;
  try {
    const existing = await prisma.carteraCliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente de cartera no encontrado' } } as ApiResponse);
    if (ruc && ruc !== existing.ruc) {
      const dup = await prisma.carteraCliente.findUnique({ where: { ruc } });
      if (dup && dup.id !== id) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RUC', message: `Ya existe un cliente con el RUC ${ruc}` } } as ApiResponse);
    }
    const updated = await prisma.carteraCliente.update({ where: { id }, data: { ...(nombre !== undefined && { nombre }), ...(ruc !== undefined && { ruc }), ...(activo !== undefined && { activo }) } });
    auditLog({ usuario: req.user!.usuario, accion: 'update_cartera_cliente', recurso: `/api/admin/cartera/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { id: updated.id, nombre: updated.nombre, ruc: updated.ruc, activo: updated.activo }, message: 'Cliente de cartera actualizado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error updating cartera cliente:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar cliente de cartera' } } as ApiResponse);
  }
});

carteraRouter.delete('/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.carteraCliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente de cartera no encontrado' } } as ApiResponse);
    await prisma.carteraCliente.delete({ where: { id } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_cartera_cliente', recurso: `/api/admin/cartera/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Cliente de cartera eliminado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error deleting cartera cliente:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar cliente de cartera' } } as ApiResponse);
  }
});

// ─── Contactos de cartera ───

carteraRouter.get('/:id/contactos', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const contactos = await prisma.carteraContacto.findMany({ where: { clienteId: id }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: contactos } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error listing contactos:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: 'Error al listar contactos' } } as ApiResponse);
  }
});

carteraRouter.post('/:id/contactos', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateSchema(CarteraContactoSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message } } as ApiResponse);
  try {
    const existing = await prisma.carteraCliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente de cartera no encontrado' } } as ApiResponse);
    const { nombre, cargo, telefono, email } = validation.data as any;
    const contacto = await prisma.carteraContacto.create({ data: { id: generateId('carcon'), clienteId: id, nombre, cargo: cargo || null, telefono: telefono || null, email: email || null } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_cartera_contacto', recurso: `/api/admin/cartera/${id}/contactos`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: contacto, message: 'Contacto creado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error creating contacto:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear contacto' } } as ApiResponse);
  }
});

carteraRouter.put('/contactos/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateSchema(CarteraContactoUpdateSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message } } as ApiResponse);
  try {
    const existing = await prisma.carteraContacto.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contacto no encontrado' } } as ApiResponse);
    const { nombre, cargo, telefono, email } = validation.data as any;
    const updated = await prisma.carteraContacto.update({ where: { id }, data: { ...(nombre !== undefined && { nombre }), ...(cargo !== undefined && { cargo }), ...(telefono !== undefined && { telefono }), ...(email !== undefined && { email }) } });
    auditLog({ usuario: req.user!.usuario, accion: 'update_cartera_contacto', recurso: `/api/admin/cartera/contactos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: updated, message: 'Contacto actualizado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error updating contacto:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar contacto' } } as ApiResponse);
  }
});

carteraRouter.delete('/contactos/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.carteraContacto.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contacto no encontrado' } } as ApiResponse);
    await prisma.carteraContacto.delete({ where: { id } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_cartera_contacto', recurso: `/api/admin/cartera/contactos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Contacto eliminado' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error deleting contacto:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar contacto' } } as ApiResponse);
  }
});

// ─── Marcas de cartera ───

carteraRouter.get('/:id/marcas', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const marcas = await prisma.carteraMarca.findMany({ where: { clienteId: id }, orderBy: { nombre: 'asc' } });
    res.json({ success: true, data: marcas } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error listing marcas:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: 'Error al listar marcas' } } as ApiResponse);
  }
});

carteraRouter.post('/:id/marcas', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateSchema(CarteraMarcaSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message } } as ApiResponse);
  try {
    const existing = await prisma.carteraCliente.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente de cartera no encontrado' } } as ApiResponse);
    const { nombre } = validation.data as any;
    const marca = await prisma.carteraMarca.create({ data: { id: generateId('carmar'), clienteId: id, nombre } });
    auditLog({ usuario: req.user!.usuario, accion: 'create_cartera_marca', recurso: `/api/admin/cartera/${id}/marcas`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { id: marca.id, clienteId: marca.clienteId, clienteNombre: existing.nombre, nombre: marca.nombre, activo: marca.activo }, message: 'Marca creada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error creating marca:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear marca' } } as ApiResponse);
  }
});

carteraRouter.put('/marcas/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateSchema(CarteraMarcaUpdateSchema, req.body || {});
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors[0].message } } as ApiResponse);
  try {
    const existing = await prisma.carteraMarca.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Marca no encontrada' } } as ApiResponse);
    const { nombre, activo } = validation.data as any;
    const marca = await prisma.carteraMarca.update({ where: { id }, data: { ...(nombre !== undefined && { nombre }), ...(activo !== undefined && { activo }) } });
    const cliente = await prisma.carteraCliente.findUnique({ where: { id: existing.clienteId } });
    auditLog({ usuario: req.user!.usuario, accion: 'update_cartera_marca', recurso: `/api/admin/cartera/marcas/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { id: marca.id, clienteId: marca.clienteId, clienteNombre: cliente?.nombre || '', nombre: marca.nombre, activo: marca.activo }, message: 'Marca actualizada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error updating marca:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar marca' } } as ApiResponse);
  }
});

carteraRouter.delete('/marcas/:id', requireAuth, requireAdmin, requireWriteAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.carteraMarca.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Marca no encontrada' } } as ApiResponse);
    await prisma.carteraMarca.update({ where: { id }, data: { activo: false } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_cartera_marca', recurso: `/api/admin/cartera/marcas/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Marca desactivada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[CARTERA] Error deleting marca:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al desactivar marca' } } as ApiResponse);
  }
});
