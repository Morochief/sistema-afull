/**
 * Portal Routes — Portal público de clientes (token-based, sin JWT)
 * Extraído de server.ts como parte del refactor a Express Routers.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';
import { portalLimiter } from '../config/rate-limiters.ts';
import { generateId } from '../shared.ts';

export const portalRouter = Router();

portalRouter.get('/:token', portalLimiter, async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 8) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido' } });
  try {
    const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido o expirado' } });
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
    const skip = (page - 1) * limit;
    const { search, estado, sucursalId } = req.query;

    const wherePedidos: any = { clienteId: cliente.id, archivado: false };
    if (estado && typeof estado === 'string') {
      wherePedidos.estado = estado;
    }
    if (sucursalId && typeof sucursalId === 'string') {
      wherePedidos.sucursalId = sucursalId;
    }
    if (search && typeof search === 'string' && search.trim()) {
      wherePedidos.OR = [
        { descripcion: { contains: search.trim(), mode: 'insensitive' } },
        { sucursalNombre: { contains: search.trim(), mode: 'insensitive' } },
        { facturaNumero: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [sucursales, pedidos, total] = await Promise.all([
      prisma.sucursal.findMany({ where: { clienteId: cliente.id, activo: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
      prisma.pedido.findMany({
        where: wherePedidos,
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          sucursalNombre: true,
          descripcion: true,
          cantidad: true,
          estado: true,
          prioridad: true,
          fotoUrl: true,
          fechaSolicitud: true,
          fechaFin: true,
          facturaNumero: true,
          fotoRemisionUrl: true,
          fotoEntregaUrl: true,
          fechaEntrega: true,
          receptorNombre: true,
        }
      }),
      prisma.pedido.count({ where: wherePedidos })
    ]);
    res.json({
      success: true,
      data: {
        cliente: { id: cliente.id, nombre: cliente.nombre },
        sucursales: sucursales.map((l) => ({ id: l.id, nombre: l.nombre })),
        pedidos: pedidos.map((p) => ({
          id: p.id,
          local: p.sucursalNombre,
          descripcion: p.descripcion,
          cantidad: Number(p.cantidad),
          estado: p.estado,
          prioridad: p.prioridad,
          fotoUrl: p.fotoUrl,
          fechaSolicitud: p.fechaSolicitud,
          fechaFin: p.fechaFin,
          facturaNumero: p.facturaNumero,
          fotoRemisionUrl: p.fotoRemisionUrl,
          fotoEntregaUrl: p.fotoEntregaUrl,
          fechaEntrega: p.fechaEntrega,
          receptorNombre: p.receptorNombre,
        })),
        paginacion: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      }
    });
  } catch (error: any) {
    logger.error('[PORTAL] Error fetching portal data:', error);
    res.status(500).json({ success: false, error: { code: 'PORTAL_ERROR', message: 'Error al obtener el portal' } });
  }
});

portalRouter.post('/:token/sucursal', portalLimiter, async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 8) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido' } });
  const { nombre, ciudad } = req.body || {};
  const nombreLimpio = String(nombre || '').trim().slice(0, 100);
  if (!nombreLimpio) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'El nombre del local es requerido' } });
  try {
    const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido o expirado' } });
    const duplicado = await prisma.sucursal.findFirst({ where: { clienteId: cliente.id, nombre: { equals: nombreLimpio, mode: 'insensitive' } } });
    if (duplicado) return res.status(400).json({ success: false, error: { code: 'DUPLICADO', message: 'Ese local ya existe' } });
    const sucursal = await prisma.sucursal.create({ data: { id: generateId('suc'), clienteId: cliente.id, nombre: nombreLimpio, ciudad: ciudad ? String(ciudad).trim().slice(0, 100) : null } });
    auditLog({ usuario: 'portal:' + cliente.nombre, accion: 'create_sucursal', recurso: `/api/portal/${token}/sucursal`, resultado: 'success', ip: getClientIp(req), detalle: `Sucursal ${sucursal.id}: ${nombreLimpio}` });
    res.status(201).json({ success: true, data: { id: sucursal.id, nombre: sucursal.nombre, ciudad: sucursal.ciudad }, message: 'Local creado correctamente' });
  } catch (error: any) {
    logger.error('[PORTAL] Error creating sucursal:', error);
    res.status(500).json({ success: false, error: { code: 'PORTAL_ERROR', message: 'Error al crear el local' } });
  }
});

portalRouter.post('/:token/pedido', portalLimiter, async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 8) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido' } });
  const { sucursalId, descripcion, cantidad, foto } = req.body || {};
  if (!sucursalId || !descripcion?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Local y descripción son requeridos' } });
  const cantNum = Number(cantidad);
  if (isNaN(cantNum) || cantNum <= 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'La cantidad debe ser mayor a 0' } });
  const descripcionLimpia = String(descripcion).trim().slice(0, 1000);
  try {
    const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido o expirado' } });
    const sucursal = await prisma.sucursal.findFirst({ where: { id: sucursalId, clienteId: cliente.id, activo: true } });
    if (!sucursal) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Local no válido para este cliente' } });
    let fotoUrl: string | undefined;
    if (foto && typeof foto === 'string' && foto.startsWith('data:image')) {
      const pedidoId = generateId('ped');
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const base64 = foto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        const storagePath = `pedidos/${pedidoId}/foto.jpg`;
        const { error } = await supabaseAdmin.storage.from('pedidos-fotos').upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
        if (!error) { const { data } = supabaseAdmin.storage.from('pedidos-fotos').getPublicUrl(storagePath); fotoUrl = data.publicUrl; }
      }
    }
    const pedido = await prisma.pedido.create({ data: { id: generateId('ped'), clienteId: cliente.id, sucursalId: sucursal.id, sucursalNombre: sucursal.nombre, descripcion: descripcionLimpia, cantidad: new Decimal(cantNum), estado: 'Pendiente', fotoUrl } });
    auditLog({ usuario: 'portal:' + cliente.nombre, accion: 'create_pedido', recurso: `/api/portal/${token}/pedido`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { id: pedido.id, local: pedido.sucursalNombre, descripcion: pedido.descripcion, cantidad: Number(pedido.cantidad), estado: pedido.estado }, message: 'Pedido creado correctamente' });
  } catch (error: any) {
    logger.error('[PORTAL] Error creating pedido:', error);
    res.status(500).json({ success: false, error: { code: 'PORTAL_ERROR', message: 'Error al crear el pedido' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/portal/:token/presupuestos
// Listar presupuestos enviados al cliente (público, sin JWT)
// ═══════════════════════════════════════════════════════════════
portalRouter.get('/:token/presupuestos', portalLimiter, async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 8) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido' } });
  try {
    const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido o expirado' } });
    const presupuestos = await prisma.presupuesto.findMany({
      where: { clienteId: cliente.id, estado: { in: ['Enviado', 'Aprobado', 'Rechazado'] } },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { orden: 'asc' } } },
    });
    res.json({ success: true, data: presupuestos.map((p: any) => ({
      id: p.id,
      proyecto: p.proyecto,
      contacto: p.contacto,
      fechaInicio: p.fechaInicio,
      fechaTope: p.fechaTope,
      estado: p.estado,
      total: Number(p.total),
      // markup y costoTotal son internos — no se exponen al cliente del portal
      venta1: p.venta1 != null ? Number(p.venta1) : null,
      venta2: p.venta2 != null ? Number(p.venta2) : null,
      comentarioCliente: p.comentarioCliente,
      respuestaCliente: p.respuestaCliente,
      fotos: p.fotos || [],
      fechaEnvio: p.fechaEnvio,
      fechaRespuesta: p.fechaRespuesta,
      createdAt: p.createdAt,
      items: p.items.map((it: any) => ({
        id: it.id,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
        total: Number(it.total),
        categoria: it.categoria || 'Insumo',
        horas: it.horas != null ? Number(it.horas) : null,
        tarifa: it.tarifa != null ? Number(it.tarifa) : null,
      })),
    })) });
  } catch (error: any) {
    logger.error('[PORTAL] Error fetching presupuestos:', error);
    res.status(500).json({ success: false, error: { code: 'PORTAL_ERROR', message: 'Error al obtener presupuestos' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/portal/:token/presupuestos/:id/responder
// Cliente responde a un presupuesto (Aprobar/Rechazar) — público
// Body: { respuesta: 'Aprobado' | 'Rechazado', comentario?: string }
// ═══════════════════════════════════════════════════════════════
portalRouter.post('/:token/presupuestos/:id/responder', portalLimiter, async (req: Request, res: Response) => {
  const { token, id } = req.params;
  const { respuesta, comentario } = req.body || {};
  if (!token || typeof token !== 'string' || token.length < 8) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido' } });
  if (!respuesta || !['Aprobado', 'Rechazado'].includes(respuesta)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: "respuesta debe ser 'Aprobado' o 'Rechazado'" } });
  }
  try {
    const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
    if (!cliente) return res.status(404).json({ success: false, error: { code: 'PORTAL_NOT_FOUND', message: 'Link no válido o expirado' } });
    const existing = await prisma.presupuesto.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Presupuesto no encontrado' } });
    if (existing.clienteId !== cliente.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Este presupuesto no pertenece a su cuenta' } });
    if (existing.estado !== 'Enviado') return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Este presupuesto ya fue respondido' } });

    const updated = await prisma.presupuesto.update({
      where: { id },
      data: {
        estado: respuesta,
        respuestaCliente: comentario || null,
        fechaRespuesta: new Date(),
      },
    });

    // Si el cliente aprobó el presupuesto, mover el pedido a "En Proceso"
    if (respuesta === 'Aprobado' && existing.pedidoId) {
      await prisma.pedido.updateMany({
        where: { id: existing.pedidoId, estado: 'Pendiente' },
        data: { estado: 'En Proceso' },
      });
    }

    auditLog({ usuario: 'portal:' + cliente.nombre, accion: 'respond_presupuesto', recurso: `/api/portal/${token}/presupuestos/${id}/responder`, resultado: 'success', ip: getClientIp(req), detalle: `Respuesta: ${respuesta}` });
    res.json({ success: true, data: { id: updated.id, estado: updated.estado }, message: respuesta === 'Aprobado' ? 'Presupuesto aprobado' : 'Presupuesto rechazado' });
  } catch (error: any) {
    logger.error('[PORTAL] Error responding presupuesto:', error);
    res.status(500).json({ success: false, error: { code: 'PORTAL_ERROR', message: 'Error al responder presupuesto' } });
  }
});
