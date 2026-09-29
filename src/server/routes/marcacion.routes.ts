/**
 * Marcacion Routes - Control de presencia con geocerca
 * Extraido de server.ts: /api/marcacion/*
 * 
 * Soporta:
 * - Marcacion dentro de geocerca (APP)
 * - Marcacion remota (REMOTO) para operarios que arrancan desde casa con camion
 * - Hoja de ruta compartida (HOJA_RUTA) para multiples operarios en la misma ruta
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireWriteAccess, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { Decimal } from '@prisma/client/runtime/library';

export const marcacionRouter = Router();

// Helper: calcular distancia haversine en metros
function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Helper: generar id de marcacion
function genMarcacionId(): string {
  return 'mar' + Math.random().toString(36).substring(2, 11);
}

// Helper: hash de dispositivo
function hashDispositivo(ua: string, cip: string): string {
  return crypto.createHash('sha256').update((ua||'')+'|'+(cip||'')).digest('hex');
}

// GET /config - Get geofence config
marcacionRouter.get('/config', async (req: Request, res: Response) => {
  try {
    let config = await prisma.geocercaConfig.findFirst({ where: { activo: true } });
    if (!config) {
      config = await prisma.geocercaConfig.create({
        data: { lat: -25.320588291024226, lng: -57.62418119104182, radioMetros: 100, activo: true }
      });
    }
    res.json({ success: true, data: { lat: Number(config.lat), lng: Number(config.lng), radioMetros: config.radioMetros } });
  } catch (error) {
    logger.error('Error fetching geocerca config:', error);
    res.status(500).json({ success: false, error: { code: 'CONFIG_ERROR', message: 'Error al obtener geocerca' } });
  }
});

// POST /entrada - Clock in with GPS
// Body: { lat, lng, precision, modo?: 'APP'|'REMOTO', motivoRemoto?: string, hojaRutaId?: string }
marcacionRouter.post('/entrada', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const { lat, lng, precision, modo, motivoRemoto, hojaRutaId } = req.body;
  const up = req.user!;
  const cip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(400).json({ success: false, error: { code: 'GPS_REQUIRED', message: 'Coordenadas requeridas' } });

  const esRemoto = modo === 'REMOTO';

  try {
    // Validar geocerca solo si no es remoto
    let fueraDeZona = false;
    if (!esRemoto) {
      const cfg = await prisma.geocercaConfig.findFirst({ where: { activo: true } });
      if (!cfg) return res.status(500).json({ success: false, error: { code: 'NO_CONFIG', message: 'Sin geocerca' } });
      fueraDeZona = distanciaMetros(lat, lng, Number(cfg.lat), Number(cfg.lng)) > cfg.radioMetros;
      if (fueraDeZona)
        return res.status(422).json({ success: false, error: { code: 'FUERA_DE_ZONA', message: 'Fuera de zona laboral. Si arrancas desde casa, activá el modo remoto.' } });
    } else if (!motivoRemoto || !motivoRemoto.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MOTIVO_REQUERIDO', message: 'Debes indicar un motivo para la marcación remota' } });
    }

    const ult = await prisma.marcacion.findFirst({ where: { usuario: up.usuario }, orderBy: { timestamp: 'desc' } });
    if (ult && ult.tipo === 'ENTRADA')
      return res.status(409).json({ success: false, error: { code: 'YA_MARCADO', message: 'Ya tenes entrada sin salida' } });

    const dh = hashDispositivo(ua, cip);
    const origen = esRemoto ? 'REMOTO' : 'APP';
    const m = await prisma.marcacion.create({
      data: { id: genMarcacionId(), usuario: up.usuario, tipo: 'ENTRADA', lat: new Decimal(lat), lng: new Decimal(lng), precision: precision ? new Decimal(precision) : null, ip: cip, dispositivoHash: dh, userAgent: ua, origen, motivoRemoto: esRemoto ? motivoRemoto.trim() : null }
    });
    auditLog({ usuario: up.usuario, accion: esRemoto ? 'marcacion_entrada_remota' : 'marcacion_entrada', recurso: '/api/marcacion/entrada', resultado: 'success', ip: cip });

    // Si hay hoja de ruta, replicar a todos los operarios asignados
    let replicados: string[] = [];
    if (hojaRutaId) {
      const operarios = await prisma.hojaRutaMarcacionOperario.findMany({ where: { hojaRutaId } });
      for (const op of operarios) {
        if (op.usuario === up.usuario) continue; // ya marcado
        const ultOp = await prisma.marcacion.findFirst({ where: { usuario: op.usuario }, orderBy: { timestamp: 'desc' } });
        if (ultOp && ultOp.tipo === 'ENTRADA') continue; // ya tiene entrada
        await prisma.marcacion.create({
          data: { id: genMarcacionId(), usuario: op.usuario, tipo: 'ENTRADA', lat: new Decimal(lat), lng: new Decimal(lng), precision: precision ? new Decimal(precision) : null, ip: cip, dispositivoHash: dh, userAgent: ua, origen: 'HOJA_RUTA', hojaRutaId, marcadoPor: up.usuario }
        });
        replicados.push(op.usuario);
      }
      auditLog({ usuario: up.usuario, accion: 'marcacion_entrada_hoja_ruta', recurso: '/api/marcacion/entrada', resultado: 'success', ip: cip, detalle: `Replicada a ${replicados.join(', ')}` });
    }

    res.status(201).json({ success: true, data: { id: m.id, timestamp: m.timestamp, origen, replicados } });
  } catch (e: any) { logger.error('Error marcando entrada:', e); res.status(500).json({ success: false, error: { code: 'MARCACION_ERROR', message: e.message || 'Error' } }); }
});

// POST /salida - Clock out with GPS
// Body: { lat, lng, precision, modo?: 'APP'|'REMOTO', motivoRemoto?: string, hojaRutaId?: string }
marcacionRouter.post('/salida', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const { lat, lng, precision, modo, motivoRemoto, hojaRutaId } = req.body;
  const up = req.user!;
  const cip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(400).json({ success: false, error: { code: 'GPS_REQUIRED', message: 'Coordenadas requeridas' } });

  const esRemoto = modo === 'REMOTO';

  try {
    if (!esRemoto) {
      const cfg = await prisma.geocercaConfig.findFirst({ where: { activo: true } });
      if (!cfg) return res.status(500).json({ success: false, error: { code: 'NO_CONFIG', message: 'Sin geocerca' } });
      if (distanciaMetros(lat, lng, Number(cfg.lat), Number(cfg.lng)) > cfg.radioMetros)
        return res.status(422).json({ success: false, error: { code: 'FUERA_DE_ZONA', message: 'Fuera de zona laboral. Si terminas desde otro lado, activá el modo remoto.' } });
    } else if (!motivoRemoto || !motivoRemoto.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MOTIVO_REQUERIDO', message: 'Debes indicar un motivo para la marcación remota' } });
    }

    const ult = await prisma.marcacion.findFirst({ where: { usuario: up.usuario }, orderBy: { timestamp: 'desc' } });
    if (!ult || ult.tipo !== 'ENTRADA')
      return res.status(409).json({ success: false, error: { code: 'SIN_ENTRADA', message: 'Sin entrada registrada' } });

    const dh = hashDispositivo(ua, cip);
    const origen = esRemoto ? 'REMOTO' : 'APP';
    const m = await prisma.marcacion.create({
      data: { id: genMarcacionId(), usuario: up.usuario, tipo: 'SALIDA', lat: new Decimal(lat), lng: new Decimal(lng), precision: precision ? new Decimal(precision) : null, ip: cip, dispositivoHash: dh, userAgent: ua, origen, motivoRemoto: esRemoto ? motivoRemoto.trim() : null }
    });
    auditLog({ usuario: up.usuario, accion: esRemoto ? 'marcacion_salida_remota' : 'marcacion_salida', recurso: '/api/marcacion/salida', resultado: 'success', ip: cip });

    // Si hay hoja de ruta, replicar salida a todos los operarios
    let replicados: string[] = [];
    if (hojaRutaId) {
      const operarios = await prisma.hojaRutaMarcacionOperario.findMany({ where: { hojaRutaId } });
      for (const op of operarios) {
        if (op.usuario === up.usuario) continue;
        const ultOp = await prisma.marcacion.findFirst({ where: { usuario: op.usuario }, orderBy: { timestamp: 'desc' } });
        if (!ultOp || ultOp.tipo !== 'ENTRADA') continue; // no tiene entrada
        await prisma.marcacion.create({
          data: { id: genMarcacionId(), usuario: op.usuario, tipo: 'SALIDA', lat: new Decimal(lat), lng: new Decimal(lng), precision: precision ? new Decimal(precision) : null, ip: cip, dispositivoHash: dh, userAgent: ua, origen: 'HOJA_RUTA', hojaRutaId, marcadoPor: up.usuario }
        });
        replicados.push(op.usuario);
      }
      auditLog({ usuario: up.usuario, accion: 'marcacion_salida_hoja_ruta', recurso: '/api/marcacion/salida', resultado: 'success', ip: cip, detalle: `Replicada a ${replicados.join(', ')}` });
    }

    res.status(201).json({ success: true, data: { id: m.id, timestamp: m.timestamp, origen, replicados } });
  } catch (e: any) { logger.error('Error marcando salida:', e); res.status(500).json({ success: false, error: { code: 'MARCACION_ERROR', message: e.message || 'Error' } }); }
});

// GET /mis-marcaciones - Get current user's marcaciones
marcacionRouter.get('/mis-marcaciones', requireAuth, async (req: Request, res: Response) => {
  const up = req.user!;
  const { desde, hasta, limite } = req.query;
  try {
    const w: any = { usuario: up.usuario };
    if (desde || hasta) { w.timestamp = {}; if(desde) w.timestamp.gte = new Date(desde as string); if(hasta) w.timestamp.lte = new Date(hasta as string); }
    const ms = await prisma.marcacion.findMany({ where: w, orderBy: { timestamp: 'desc' }, take: limite ? parseInt(limite as string) : 50 });
    res.json({ success: true, data: ms.map(m => ({ id: m.id, tipo: m.tipo, timestamp: m.timestamp, lat: m.lat ? Number(m.lat) : null, lng: m.lng ? Number(m.lng) : null, precision: m.precision ? Number(m.precision) : null, origen: m.origen, motivoRemoto: m.motivoRemoto, hojaRutaId: m.hojaRutaId, marcadoPor: m.marcadoPor })) });
  } catch (e) { res.status(500).json({ success: false, error: { code: 'READ_ERROR', message: 'Error' } }); }
});

// GET /admin/timeline - Admin timeline of all marcaciones
marcacionRouter.get('/admin/timeline', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { usuario, desde, hasta, limite } = req.query;
  try {
    const w: any = {};
    if (usuario) w.usuario = { contains: usuario, mode: 'insensitive' };
    if (desde || hasta) { w.timestamp = {}; if(desde) w.timestamp.gte = new Date(desde as string); if(hasta) w.timestamp.lte = new Date(hasta as string); }
    const ms = await prisma.marcacion.findMany({ where: w, orderBy: { timestamp: 'desc' }, take: limite ? parseInt(limite as string) : 200 });
    const ips: any = {}; const ds: any = {};
    for (const m of ms) { if(!ips[m.usuario]) ips[m.usuario]=new Set(); if(!ds[m.usuario]) ds[m.usuario]=new Set(); if(m.ip) ips[m.usuario].add(m.ip); if(m.dispositivoHash) ds[m.usuario].add(m.dispositivoHash); }
    res.json({ success: true, data: ms.map(m => ({ id: m.id, usuario: m.usuario, tipo: m.tipo, timestamp: m.timestamp, lat: m.lat ? Number(m.lat) : null, lng: m.lng ? Number(m.lng) : null, ip: m.ip, dispositivoHash: m.dispositivoHash, origen: m.origen, motivoRemoto: m.motivoRemoto, hojaRutaId: m.hojaRutaId, marcadoPor: m.marcadoPor, alertas: [...(ips[m.usuario]?.size>1?['MULTIPLES_IPS']:[]), ...(ds[m.usuario]?.size>1?['MULTIPLES_DISPOSITIVOS']:[])] })) });
  } catch (e) { res.status(500).json({ success: false, error: { code: 'READ_ERROR', message: 'Error' } }); }
});

// ─── HOJAS DE RUTA DE MARCACION ─────────────────────────────────────

// GET /hojas-ruta - Listar hojas de ruta de marcacion (admin ve todas, operario ve las asignadas)
marcacionRouter.get('/hojas-ruta', requireAuth, async (req: Request, res: Response) => {
  const up = req.user!;
  try {
    let hojas;
    if (up.rol === 'Admin') {
      hojas = await prisma.hojaRutaMarcacion.findMany({ include: { operarios: true }, orderBy: { createdAt: 'desc' } });
    } else {
      hojas = await prisma.hojaRutaMarcacion.findMany({
        where: { operarios: { some: { usuario: up.usuario } } },
        include: { operarios: true },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json({ success: true, data: hojas.map(h => ({ id: h.id, nombre: h.nombre, descripcion: h.descripcion, estado: h.estado, creadaPor: h.creadaPor, createdAt: h.createdAt, operarios: h.operarios.map(o => ({ usuario: o.usuario, rol: o.rol })) })) });
  } catch (e: any) { logger.error('Error listando hojas de ruta:', e); res.status(500).json({ success: false, error: { code: 'READ_ERROR', message: e.message || 'Error' } }); }
});

// POST /hojas-ruta - Crear hoja de ruta de marcacion (admin)
marcacionRouter.post('/hojas-ruta', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const up = req.user!;
  const { nombre, descripcion, operarios } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ success: false, error: { code: 'NOMBRE_REQUERIDO', message: 'Nombre requerido' } });
  if (!operarios || !Array.isArray(operarios) || operarios.length === 0)
    return res.status(400).json({ success: false, error: { code: 'OPERARIOS_REQUERIDOS', message: 'Debe asignar al menos un operario' } });
  try {
    const hoja = await prisma.hojaRutaMarcacion.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        creadaPor: up.usuario,
        operarios: { create: operarios.map((u: string) => ({ usuario: u, rol: 'OPERARIO' })) }
      },
      include: { operarios: true }
    });
    auditLog({ usuario: up.usuario, accion: 'hoja_ruta_marcacion_creada', recurso: '/api/marcacion/hojas-ruta', resultado: 'success', ip: getClientIp(req), detalle: hoja.nombre });
    res.status(201).json({ success: true, data: { id: hoja.id, nombre: hoja.nombre, descripcion: hoja.descripcion, estado: hoja.estado, operarios: hoja.operarios.map(o => ({ usuario: o.usuario, rol: o.rol })) } });
  } catch (e: any) { logger.error('Error creando hoja de ruta:', e); res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: e.message || 'Error' } }); }
});

// PUT /hojas-ruta/:id - Actualizar hoja de ruta de marcacion (admin)
marcacionRouter.put('/hojas-ruta/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, estado, operarios } = req.body;
  try {
    if (operarios && Array.isArray(operarios)) {
      // Reemplazar operarios
      await prisma.hojaRutaMarcacionOperario.deleteMany({ where: { hojaRutaId: id } });
      if (operarios.length > 0) {
        await prisma.hojaRutaMarcacionOperario.createMany({ data: operarios.map((u: string) => ({ hojaRutaId: id, usuario: u, rol: 'OPERARIO' })) });
      }
    }
    const hoja = await prisma.hojaRutaMarcacion.update({
      where: { id },
      data: { nombre: nombre?.trim(), descripcion: descripcion?.trim(), estado },
      include: { operarios: true }
    });
    res.json({ success: true, data: { id: hoja.id, nombre: hoja.nombre, descripcion: hoja.descripcion, estado: hoja.estado, operarios: hoja.operarios.map(o => ({ usuario: o.usuario, rol: o.rol })) } });
  } catch (e: any) { logger.error('Error actualizando hoja de ruta:', e); res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: e.message || 'Error' } }); }
});

// DELETE /hojas-ruta/:id - Eliminar hoja de ruta de marcacion (admin)
marcacionRouter.delete('/hojas-ruta/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.hojaRutaMarcacion.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) { logger.error('Error eliminando hoja de ruta:', e); res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: e.message || 'Error' } }); }
});
