/**
 * Vehiculo Routes — Registros de vehículos (historial, mis-registros, CRUD)
 * Extraído de server.ts como parte del refactor a Express Routers.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';
import { validateSchema, RegistroVehiculoUpdateSchema, RegistroVehiculoPatchSchema } from '../../../server-validation.ts';
import fs from 'fs';
import path from 'path';

export const vehiculoRouter = Router();

vehiculoRouter.get('/registros/:proyectoId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { proyectoId } = req.params;
    const registros = await prisma.registroVehiculo.findMany({ where: { proyectoId }, orderBy: { fecha: 'desc' }, take: 10 });
    res.json({ success: true, data: registros.map(rv => ({ ...rv, kmInicial: parseFloat(rv.kmInicial.toString()), kmFinal: parseFloat(rv.kmFinal.toString()), distanciaOdometro: parseFloat(rv.distanciaOdometro.toString()), distanciaGPS: rv.distanciaGPS ? parseFloat(rv.distanciaGPS.toString()) : undefined, combustibleLitros: rv.combustibleLitros ? parseFloat(rv.combustibleLitros.toString()) : undefined, combustibleCosto: parseFloat(rv.combustibleCosto.toString()), total: parseFloat(rv.total.toString()), discrepancia: rv.discrepancia ? parseFloat(rv.discrepancia.toString()) : undefined, consumoPorKm: rv.consumoPorKm ? parseFloat(rv.consumoPorKm.toString()) : undefined, fecha: rv.fecha.toISOString().substring(0, 10), fechaImportacion: rv.fechaImportacion?.toISOString().substring(0, 10) })) } as ApiResponse);
  } catch (error: any) {
    logger.error('Error getting registros vehiculo', error);
    res.status(500).json({ success: false, error: { code: 'GET_REGISTROS_ERROR', message: 'Error al obtener registros' } } as ApiResponse);
  }
});

vehiculoRouter.get('/mis-registros', requireAuth, async (req: Request, res: Response) => {
  const userPayload = req.user!;
  try {
    const whereClause = userPayload.rol === 'Admin' ? {} : { usuario: userPayload.usuario };
    const registros = await prisma.registroVehiculo.findMany({ where: whereClause, orderBy: { fecha: 'desc' } });
    res.json({ success: true, data: registros.map(rv => ({ ...rv, kmInicial: parseFloat(rv.kmInicial.toString()), kmFinal: parseFloat(rv.kmFinal.toString()), distanciaOdometro: parseFloat(rv.distanciaOdometro.toString()), distanciaGPS: rv.distanciaGPS ? parseFloat(rv.distanciaGPS.toString()) : undefined, combustibleLitros: rv.combustibleLitros ? parseFloat(rv.combustibleLitros.toString()) : undefined, combustibleCosto: parseFloat(rv.combustibleCosto.toString()), total: parseFloat(rv.total.toString()), discrepancia: rv.discrepancia ? parseFloat(rv.discrepancia.toString()) : undefined, consumoPorKm: rv.consumoPorKm ? parseFloat(rv.consumoPorKm.toString()) : undefined, fecha: rv.fecha.toISOString().substring(0, 10), fechaImportacion: rv.fechaImportacion?.toISOString().substring(0, 10) })) } as ApiResponse);
  } catch (error: any) {
    logger.error('Error reading user vehicle registros:', error);
    res.status(500).json({ success: false, error: { code: 'READ_ERROR', message: 'Error al leer registros de vehículo del usuario' } } as ApiResponse);
  }
});

vehiculoRouter.delete('/registro/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;
  if (!id) return res.status(400).json({ success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' } } as ApiResponse);
  try {
    const registro = await prisma.registroVehiculo.findUnique({ where: { id } });
    if (!registro) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registro de vehículo no encontrado' } } as ApiResponse);
    await prisma.registroVehiculo.delete({ where: { id } });
    auditLog({ usuario: userPayload.usuario, accion: 'delete_vehiculo_registro', recurso: `/api/vehiculo/registro/${id}`, resultado: 'success', ip: clientIp, detalle: `Eliminado registro de vehículo: ${registro.proyectoNombre}` });
    res.json({ success: true, message: 'Registro de vehículo eliminado con éxito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error deleting vehiculo registro:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar registro de vehículo' } } as ApiResponse);
  }
});

vehiculoRouter.put('/registro/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;
  if (!id) return res.status(400).json({ success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' } } as ApiResponse);
  const validation = validateSchema(RegistroVehiculoUpdateSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos del registro inválidos', details: validation.errors } } as ApiResponse);
  const updatedData = validation.data!;
  try {
    const existing = await prisma.registroVehiculo.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registro de vehículo no encontrado' } } as ApiResponse);
    const distanciaOdometro = updatedData.kmFinal - updatedData.kmInicial;
    const existingDistanciaGPS = existing.distanciaGPS ? parseFloat(existing.distanciaGPS.toString()) : distanciaOdometro;
    const discrepancia = existingDistanciaGPS > 0 ? Math.abs((distanciaOdometro - existingDistanciaGPS) / existingDistanciaGPS) * 100 : 0;
    const alertaDiscrepancia = discrepancia > 20;
    const total = updatedData.total;
    const updated = await prisma.registroVehiculo.update({ where: { id }, data: { kmInicial: new Decimal(updatedData.kmInicial), kmFinal: new Decimal(updatedData.kmFinal), distanciaOdometro: new Decimal(Math.round(distanciaOdometro * 10) / 10), combustibleCosto: new Decimal(total), total: new Decimal(total), discrepancia: new Decimal(Math.round(discrepancia * 10) / 10), alertaDiscrepancia, descripcion: updatedData.descripcion, fecha: updatedData.fecha ? new Date(updatedData.fecha) : existing.fecha } });
    auditLog({ usuario: userPayload.usuario, accion: 'update_vehiculo_registro', recurso: `/api/vehiculo/registro/${id}`, resultado: 'success', ip: clientIp });
    res.json({ success: true, data: { ...updated, kmInicial: parseFloat(updated.kmInicial.toString()), kmFinal: parseFloat(updated.kmFinal.toString()), distanciaOdometro: parseFloat(updated.distanciaOdometro.toString()), combustibleCosto: parseFloat(updated.combustibleCosto.toString()), total: parseFloat(updated.total.toString()), fecha: updated.fecha.toISOString().substring(0, 10) }, message: 'Registro de vehículo actualizado con éxito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error updating vehiculo registro:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar registro de vehículo' } } as ApiResponse);
  }
});

vehiculoRouter.patch('/registro/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;
  logger.info('[PATCH VEHICULO] Request received, ID:', id, 'User:', userPayload.usuario);
  if (!id) return res.status(400).json({ success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' } } as ApiResponse);
  const validation = validateSchema(RegistroVehiculoPatchSchema, req.body);
  if (!validation.valid) { logger.error('[PATCH VEHICULO] Validation errors:', JSON.stringify(validation.errors)); return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos del registro inválidos', details: validation.errors } } as ApiResponse); }
  const patchData = validation.data!;
  try {
    const existing = await prisma.registroVehiculo.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registro de vehículo no encontrado' } } as ApiResponse);
    const kmInicial = patchData.kmInicial ?? parseFloat(existing.kmInicial.toString());
    const kmFinal = patchData.kmFinal ?? parseFloat(existing.kmFinal.toString());
    const distanciaOdometro = kmFinal - kmInicial;
    const existingDistanciaGPS = existing.distanciaGPS ? parseFloat(existing.distanciaGPS.toString()) : distanciaOdometro;
    const discrepancia = existingDistanciaGPS > 0 ? Math.abs((distanciaOdometro - existingDistanciaGPS) / existingDistanciaGPS) * 100 : 0;
    const alertaDiscrepancia = discrepancia > 20;
    const total = patchData.total ?? parseFloat(existing.total.toString());
    let fotoInicio: string | undefined;
    let fotoFin: string | undefined;
    const uploadSingleFoto = async (base64: string, nombre: string): Promise<string> => {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const raw = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(raw, 'base64');
        const storagePath = `vehiculos/${id}/${nombre}.jpg`;
        const { error } = await supabaseAdmin.storage.from('vehiculos-fotos').upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
        if (error) throw new Error(`Storage upload failed: ${error.message}`);
        const { data } = supabaseAdmin.storage.from('vehiculos-fotos').getPublicUrl(storagePath);
        return data.publicUrl;
      }
      const uploadsDir = path.join(process.cwd(), 'uploads', 'vehiculos', id);
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      await fs.promises.writeFile(path.join(uploadsDir, `${nombre}.jpg`), base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      return `/uploads/vehiculos/${id}/${nombre}.jpg`;
    };
    if (patchData.fotoOdometroInicio?.startsWith('data:')) fotoInicio = await uploadSingleFoto(patchData.fotoOdometroInicio, 'odometro_inicio');
    if (patchData.fotoOdometroFin?.startsWith('data:')) fotoFin = await uploadSingleFoto(patchData.fotoOdometroFin, 'odometro_fin');
    const updated = await prisma.registroVehiculo.update({
      where: { id },
      data: {
        kmInicial: new Decimal(kmInicial), kmFinal: new Decimal(kmFinal),
        distanciaOdometro: new Decimal(Math.round(distanciaOdometro * 10) / 10),
        combustibleCosto: new Decimal(total), total: new Decimal(total),
        discrepancia: new Decimal(Math.round(discrepancia * 10) / 10), alertaDiscrepancia,
        ...(patchData.descripcion !== undefined && { descripcion: patchData.descripcion }),
        ...(patchData.fecha !== undefined && { fecha: new Date(patchData.fecha) }),
        ...(fotoInicio !== undefined && { fotoOdometroInicio: fotoInicio }),
        ...(fotoFin !== undefined && { fotoOdometroFin: fotoFin }),
      }
    });
    auditLog({ usuario: userPayload.usuario, accion: 'patch_vehiculo_registro', recurso: `/api/vehiculo/registro/${id}`, resultado: 'success', ip: clientIp });
    res.json({ success: true, data: { ...updated, kmInicial: parseFloat(updated.kmInicial.toString()), kmFinal: parseFloat(updated.kmFinal.toString()), distanciaOdometro: parseFloat(updated.distanciaOdometro.toString()), combustibleCosto: parseFloat(updated.combustibleCosto.toString()), total: parseFloat(updated.total.toString()), fecha: updated.fecha.toISOString().substring(0, 10) }, message: 'Registro de vehículo actualizado con éxito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error patching vehiculo registro:', error);
    res.status(500).json({ success: false, error: { code: 'PATCH_ERROR', message: 'Error al actualizar registro de vehículo' } } as ApiResponse);
  }
});
