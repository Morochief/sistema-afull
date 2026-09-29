/**
 * Viaje Routes — Viajes de vehículos (start, cancel, stop, active)
 * Extraído de server.ts como parte del refactor a Express Routers.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireWriteAccess } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';
import { generateId } from '../shared.ts';
import { validateSchema, ViajeStartSchema, ViajeStopSchema } from '../../../server-validation.ts';
import fs from 'fs';
import path from 'path';

export const viajeRouter = Router();

function calcularDistanciaHaversine(origen: { lat: number; lng: number }, destino: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(destino.lat - origen.lat);
  const dLng = toRad(destino.lng - origen.lng);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(origen.lat)) * Math.cos(toRad(destino.lat)) * Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function guardarFotosVehiculo(registroId: string, fotoBase64Inicio: string, fotoBase64Fin: string): Promise<{ inicio: string; fin: string }> {
  const isUrlOrPath = (str: string) => !str || str.startsWith('http') || str.startsWith('/uploads');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const uploadFoto = async (dataUrl: string, nombre: string): Promise<string> => {
      if (isUrlOrPath(dataUrl)) return dataUrl || '';
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `vehiculos/${registroId}/${nombre}.jpg`;
      const { error } = await supabaseAdmin.storage.from('vehiculos-fotos').upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
      const { data } = supabaseAdmin.storage.from('vehiculos-fotos').getPublicUrl(storagePath);
      return data.publicUrl;
    };
    return { inicio: await uploadFoto(fotoBase64Inicio, 'odometro_inicio'), fin: await uploadFoto(fotoBase64Fin, 'odometro_fin') };
  }
  const uploadsDir = path.join(process.cwd(), 'uploads', 'vehiculos', registroId);
  const processLocalFoto = async (dataUrl: string, filename: string, relativePath: string): Promise<string> => {
    if (isUrlOrPath(dataUrl)) return dataUrl || '';
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const raw = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    await fs.promises.writeFile(path.join(uploadsDir, filename), raw, 'base64');
    return relativePath;
  };
  return {
    inicio: await processLocalFoto(fotoBase64Inicio, 'odometro_inicio.jpg', `/uploads/vehiculos/${registroId}/odometro_inicio.jpg`),
    fin: await processLocalFoto(fotoBase64Fin, 'odometro_fin.jpg', `/uploads/vehiculos/${registroId}/odometro_fin.jpg`),
  };
}

viajeRouter.post('/start', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const validation = validateSchema(ViajeStartSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para iniciar viaje', details: validation.errors } } as ApiResponse);
  const { usuario, ubicacionInicio, clienteId, proyectoId, descripcion, fotoOdometroInicio, kmInicial } = validation.data!;
  try {
    const viajeExistente = await prisma.viajeActivo.findFirst({ where: { usuario, activo: true } });
    if (viajeExistente) return res.status(400).json({ success: false, error: { code: 'VIAJE_ACTIVO', message: 'Ya tenés un viaje activo' } } as ApiResponse);
    const esParticular = clienteId === 'viaje_particular' || proyectoId === 'viaje_particular';
    if (!esParticular) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) return res.status(400).json({ success: false, error: { code: 'CLIENTE_NOT_FOUND', message: 'El cliente seleccionado no existe o fue eliminado.' } } as ApiResponse);
      const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId } });
      if (!proyecto) return res.status(400).json({ success: false, error: { code: 'PROYECTO_NOT_FOUND', message: 'El proyecto seleccionado no existe o fue eliminado.' } } as ApiResponse);
    }
    const nuevoViaje = await prisma.viajeActivo.create({
      data: {
        id: `viaje_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        usuario, clienteId, proyectoId, inicio: new Date(), ubicacionInicio: ubicacionInicio as any,
        fotoOdometroInicio: fotoOdometroInicio || '', kmInicial: new Decimal(kmInicial),
        descripcion: descripcion || 'Viaje en vehículo', activo: true,
      }
    });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'viaje_start', recurso: `/api/viaje/${nuevoViaje.id}`, detalle: `proyectoId=${proyectoId}, clienteId=${clienteId}, kmInicial=${kmInicial}`, resultado: 'success', ip: clientIp });
    res.json({ success: true, data: { ...nuevoViaje, kmInicial: parseFloat(nuevoViaje.kmInicial.toString()), inicio: nuevoViaje.inicio.toISOString() } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error starting viaje', error);
    res.status(500).json({ success: false, error: { code: 'VIAJE_START_ERROR', message: 'No se pudo iniciar el viaje: ' + error.message } } as ApiResponse);
  }
});

viajeRouter.post('/cancel', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const { usuario } = req.body;
  if (!usuario) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Usuario requerido' } } as ApiResponse);
  try {
    const viajeActivo = await prisma.viajeActivo.findFirst({ where: { usuario, activo: true } });
    if (!viajeActivo) return res.json({ success: true, data: { message: 'No había viaje activo' } } as ApiResponse);
    await prisma.viajeActivo.update({ where: { id: viajeActivo.id }, data: { activo: false } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'viaje_cancel', recurso: `/api/viaje/${viajeActivo.id}`, detalle: 'Viaje cancelado sin guardar', resultado: 'success', ip: getClientIp(req) });
    return res.json({ success: true, data: { message: 'Viaje cancelado' } } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'VIAJE_CANCEL_ERROR', message: error.message } } as ApiResponse);
  }
});

viajeRouter.post('/stop', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const validation = validateSchema(ViajeStopSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para finalizar viaje', details: validation.errors } } as ApiResponse);
  const { usuario, ubicacionFin, fotoOdometroFin, kmFinal, combustibleLitros, combustibleCosto, descripcion } = validation.data!;
  try {
    const viajeActivo = await prisma.viajeActivo.findFirst({ where: { usuario, activo: true } });
    if (!viajeActivo) return res.status(400).json({ success: false, error: { code: 'NO_VIAJE_ACTIVO', message: 'No hay viaje activo' } } as ApiResponse);
    const kmInicialNum = parseFloat(viajeActivo.kmInicial.toString());
    const ubicacionInicioGPS = viajeActivo.ubicacionInicio as { lat: number; lng: number } | null;
    const distanciaGPS = (ubicacionInicioGPS?.lat != null && ubicacionInicioGPS?.lng != null && ubicacionFin?.lat != null && ubicacionFin?.lng != null) ? calcularDistanciaHaversine(ubicacionInicioGPS, ubicacionFin) : null;
    const distanciaOdometro = kmFinal - kmInicialNum;
    const diferencia = distanciaGPS != null ? Math.abs(distanciaOdometro - distanciaGPS) : 0;
    const discrepanciaPorcentaje = distanciaGPS != null && distanciaGPS > 0 && distanciaOdometro > 0 ? (diferencia / distanciaGPS) * 100 : 0;
    const alertaDiscrepancia = discrepanciaPorcentaje > 20;
    const discrepanciaGuardada = Math.min(Math.round(discrepanciaPorcentaje * 10) / 10, 999.9);
    const consumoPorKm = combustibleLitros && distanciaOdometro > 0 ? Math.round((combustibleLitros / distanciaOdometro) * 100) / 100 : undefined;
    const fin = new Date();
    const duracionMinutos = Math.floor((fin.getTime() - viajeActivo.inicio.getTime()) / 60000);
    const registroId = `regveh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fotosGuardadas = await guardarFotosVehiculo(registroId, viajeActivo.fotoOdometroInicio, fotoOdometroFin);
    const esParticular = viajeActivo.clienteId === 'viaje_particular' || viajeActivo.proyectoId === 'viaje_particular';
    const [cliente, proyecto] = esParticular ? [null, null] : await Promise.all([
      prisma.cliente.findUnique({ where: { id: viajeActivo.clienteId } }),
      prisma.proyecto.findUnique({ where: { id: viajeActivo.proyectoId } })
    ]);
    const registroVehiculo = await prisma.registroVehiculo.create({
      data: {
        id: registroId, usuario: viajeActivo.usuario, clienteId: viajeActivo.clienteId,
        clienteNombre: esParticular ? 'Viaje Particular' : (cliente?.nombre || ''),
        proyectoId: viajeActivo.proyectoId, proyectoNombre: esParticular ? 'Uso Personal' : (proyecto?.nombre || ''),
        fecha: fin, kmInicial: viajeActivo.kmInicial, kmFinal: new Decimal(kmFinal),
        distanciaOdometro: new Decimal(Math.round(distanciaOdometro * 10) / 10),
        distanciaGPS: distanciaGPS != null ? new Decimal(Math.round(distanciaGPS * 10) / 10) : null,
        combustibleLitros: combustibleLitros ? new Decimal(combustibleLitros) : null,
        combustibleCosto: new Decimal(combustibleCosto), total: new Decimal(combustibleCosto),
        descripcion: descripcion || viajeActivo.descripcion, alertaDiscrepancia,
        discrepancia: new Decimal(discrepanciaGuardada), ubicacionInicio: viajeActivo.ubicacionInicio as any,
        ubicacionFin: ubicacionFin as any, fotoOdometroInicio: fotosGuardadas.inicio, fotoOdometroFin: fotosGuardadas.fin,
        horaInicio: new Date(viajeActivo.inicio).toLocaleTimeString('es-AR', { hour12: false }),
        horaFin: fin.toLocaleTimeString('es-AR', { hour12: false }), duracionMinutos,
        consumoPorKm: consumoPorKm ? new Decimal(consumoPorKm) : null, origen: 'MANUAL', fechaImportacion: fin,
      }
    });
    await prisma.viajeActivo.update({ where: { id: viajeActivo.id }, data: { activo: false } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'viaje_stop', recurso: `/api/viaje/${viajeActivo.id}`, detalle: `proyectoId=${viajeActivo.proyectoId}, distanciaGPS=${distanciaGPS != null ? distanciaGPS.toFixed(1) : 'N/A'}, distanciaOdometro=${distanciaOdometro.toFixed(1)}, discrepancia=${discrepanciaPorcentaje.toFixed(1)}%, alerta=${alertaDiscrepancia}`, resultado: 'success', ip: clientIp });
    res.json({
      success: true,
      data: {
        ...registroVehiculo, kmInicial: parseFloat(registroVehiculo.kmInicial.toString()), kmFinal: parseFloat(registroVehiculo.kmFinal.toString()),
        distanciaOdometro: parseFloat(registroVehiculo.distanciaOdometro.toString()), distanciaGPS: registroVehiculo.distanciaGPS ? parseFloat(registroVehiculo.distanciaGPS.toString()) : undefined,
        combustibleLitros: registroVehiculo.combustibleLitros ? parseFloat(registroVehiculo.combustibleLitros.toString()) : undefined,
        combustibleCosto: parseFloat(registroVehiculo.combustibleCosto.toString()), total: parseFloat(registroVehiculo.total.toString()),
        discrepancia: registroVehiculo.discrepancia ? parseFloat(registroVehiculo.discrepancia.toString()) : undefined,
        consumoPorKm: registroVehiculo.consumoPorKm ? parseFloat(registroVehiculo.consumoPorKm.toString()) : undefined,
        fecha: registroVehiculo.fecha.toISOString().substring(0, 10), fechaImportacion: registroVehiculo.fechaImportacion?.toISOString().substring(0, 10),
      },
      alertas: alertaDiscrepancia ? [{ tipo: 'discrepancia', mensaje: `Diferencia de ${discrepanciaPorcentaje.toFixed(1)}% entre GPS y odómetro` }] : []
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error stopping viaje', error);
    res.status(500).json({ success: false, error: { code: 'VIAJE_STOP_ERROR', message: 'No se pudo finalizar el viaje: ' + error.message } } as ApiResponse);
  }
});

viajeRouter.get('/active/:usuario', requireAuth, async (req: Request, res: Response) => {
  try {
    const { usuario } = req.params;
    if (req.user?.rol !== 'Admin' && req.user?.usuario !== usuario) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No autorizado' } } as ApiResponse);
    const viajeActivo = await prisma.viajeActivo.findFirst({ where: { usuario, activo: true } });
    if (!viajeActivo) return res.json({ success: true, data: null } as ApiResponse);
    res.json({ success: true, data: { ...viajeActivo, kmInicial: parseFloat(viajeActivo.kmInicial.toString()), inicio: viajeActivo.inicio.toISOString() } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error getting active viaje', error);
    res.status(500).json({ success: false, error: { code: 'GET_VIAJE_ERROR', message: 'Error al obtener viaje activo' } } as ApiResponse);
  }
});
