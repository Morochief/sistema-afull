/**
 * Timer Routes — Control horario con timers (start, stop, pause, resume, sync)
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
import { validateSchema, TimerStartSchema, TimerStopSchema, TimerSyncSchema, TimerPauseSchema, TimerResumeSchema } from '../../../server-validation.ts';

export const timerRouter = Router();

timerRouter.post('/start', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerStartSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para iniciar timer', details: validation.errors } } as ApiResponse);
  const { usuario, colaboradorId, clienteId, proyectoId, descripcion, precioUnitario } = validation.data!;
  const clientIp = getClientIp(req);
  try {
    await prisma.timerActivo.updateMany({ where: { usuario, activo: true }, data: { activo: false, updatedAt: new Date() } });
    const now = new Date();
    const newTimer = await prisma.timerActivo.create({ data: { id: generateId('timer'), usuario, colaboradorId: colaboradorId || null, clienteId, proyectoId, descripcion, precioUnitario: new Decimal(precioUnitario), inicio: now, activo: true, ultimaActualizacion: now, pausedTime: 0, pauseHistory: [], isPaused: false } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'timer_start', recurso: `/api/timer/${newTimer.id}`, resultado: 'success', ip: clientIp });
    res.json({ success: true, data: { ...newTimer, precioUnitario: parseFloat(newTimer.precioUnitario.toString()), inicio: newTimer.inicio.toISOString(), ultimaActualizacion: newTimer.ultimaActualizacion.toISOString(), pauseHistory: newTimer.pauseHistory as any[], currentPauseStart: newTimer.currentPauseStart?.toISOString() } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error starting timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_START_ERROR', message: 'No se pudo iniciar el timer: ' + error.message } } as ApiResponse);
  }
});

timerRouter.post('/stop', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerStopSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para detener timer', details: validation.errors } } as ApiResponse);
  const { usuario, pausedTime, pauseHistory } = validation.data!;
  const clientIp = getClientIp(req);
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_TIMER', message: 'No hay timer activo para este usuario' } } as ApiResponse);
    const fin = new Date();
    const duracionBruta = Math.floor((fin.getTime() - activeTimer.inicio.getTime()) / 1000);
    // El servidor es la fuente de verdad para pausedTime y pauseHistory.
    // Si el cliente manda valores, los usamos como fallback, pero siempre
    // recalcamos contra el estado persistido en el server.
    let adjustedPausedTime = activeTimer.pausedTime ?? 0;
    let adjustedPauseHistory: any[] = (activeTimer.pauseHistory as any[]) ?? [];
    if (activeTimer.isPaused && activeTimer.currentPauseStart) {
      const currentPauseDuration = Math.floor((fin.getTime() - activeTimer.currentPauseStart.getTime()) / 1000);
      adjustedPausedTime += currentPauseDuration;
      adjustedPauseHistory.push({ start: activeTimer.currentPauseStart.toISOString(), end: fin.toISOString(), duration: currentPauseDuration, tipo: activeTimer.currentPauseType || 'descanso' });
    }
    const duracionSegundos = duracionBruta - adjustedPausedTime;
    await prisma.timerActivo.update({ where: { id: activeTimer.id }, data: { activo: false, pausedTime: adjustedPausedTime, pauseHistory: adjustedPauseHistory, isPaused: false, currentPauseStart: null, currentPauseType: null, ultimaActualizacion: fin } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'timer_stop', recurso: `/api/timer/${activeTimer.id}`, resultado: 'success', ip: clientIp, detalle: `duracionSegundos=${duracionSegundos}, duracionBruta=${duracionBruta}, pausedTime=${adjustedPausedTime}` });
    res.json({ success: true, data: { timer: { ...activeTimer, activo: false }, duracionSegundos, duracionBruta, pausedTime: adjustedPausedTime, pauseHistory: adjustedPauseHistory, inicio: activeTimer.inicio.toISOString(), fin: fin.toISOString() } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error stopping timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_STOP_ERROR', message: 'No se pudo detener el timer: ' + error.message } } as ApiResponse);
  }
});

timerRouter.post('/pause', requireAuth, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerPauseSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para pausar timer', details: validation.errors } } as ApiResponse);
  const { usuario, tipo } = validation.data!;
  const pauseType = tipo || 'descanso';
  const clientIp = getClientIp(req);
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_TIMER', message: 'No hay timer activo para este usuario' } } as ApiResponse);
    if (activeTimer.isPaused) return res.status(400).json({ success: false, error: { code: 'TIMER_ALREADY_PAUSED', message: 'El timer ya está pausado' } } as ApiResponse);
    const now = new Date();
    const updated = await prisma.timerActivo.update({ where: { id: activeTimer.id }, data: { isPaused: true, currentPauseStart: now, currentPauseType: pauseType, ultimaActualizacion: now } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'timer_pause', recurso: `/api/timer/${activeTimer.id}`, resultado: 'success', ip: clientIp, detalle: `tipo=${pauseType}` });
    res.json({ success: true, data: { ...updated, precioUnitario: parseFloat(updated.precioUnitario.toString()), inicio: updated.inicio.toISOString(), ultimaActualizacion: updated.ultimaActualizacion.toISOString(), currentPauseStart: updated.currentPauseStart?.toISOString(), currentPauseType: updated.currentPauseType, pauseHistory: updated.pauseHistory as any[] } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error pausing timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_PAUSE_ERROR', message: 'No se pudo pausar el timer: ' + error.message } } as ApiResponse);
  }
});

timerRouter.post('/resume', requireAuth, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerResumeSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para reanudar timer', details: validation.errors } } as ApiResponse);
  const { usuario } = validation.data!;
  const clientIp = getClientIp(req);
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_TIMER', message: 'No hay timer activo para este usuario' } } as ApiResponse);
    if (!activeTimer.isPaused) return res.status(400).json({ success: false, error: { code: 'TIMER_NOT_PAUSED', message: 'El timer no está pausado' } } as ApiResponse);
    const now = new Date();
    const pauseDuration = activeTimer.currentPauseStart ? Math.floor((now.getTime() - activeTimer.currentPauseStart.getTime()) / 1000) : 0;
    const newPausedTime = (activeTimer.pausedTime || 0) + pauseDuration;
    const pauseType = activeTimer.currentPauseType || 'descanso';
    const newPauseHistory = [...((activeTimer.pauseHistory as any[]) || []), {
      start: activeTimer.currentPauseStart?.toISOString(),
      end: now.toISOString(),
      duration: pauseDuration,
      tipo: pauseType,
    }];
    const updated = await prisma.timerActivo.update({ where: { id: activeTimer.id }, data: { isPaused: false, currentPauseStart: null, currentPauseType: null, pausedTime: newPausedTime, pauseHistory: newPauseHistory, ultimaActualizacion: now } });
    auditLog({ usuario: req.user?.usuario || usuario, accion: 'timer_resume', recurso: `/api/timer/${activeTimer.id}`, resultado: 'success', ip: clientIp, detalle: `pauseDuration=${pauseDuration}, tipo=${pauseType}, totalPaused=${newPausedTime}` });
    res.json({ success: true, data: { ...updated, precioUnitario: parseFloat(updated.precioUnitario.toString()), inicio: updated.inicio.toISOString(), ultimaActualizacion: updated.ultimaActualizacion.toISOString(), currentPauseStart: updated.currentPauseStart?.toISOString(), pauseHistory: updated.pauseHistory as any[], pausedTime: updated.pausedTime } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error resuming timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_RESUME_ERROR', message: 'No se pudo reanudar el timer: ' + error.message } } as ApiResponse);
  }
});

timerRouter.get('/active/:usuario', requireAuth, async (req: Request, res: Response) => {
  try {
    const { usuario } = req.params;
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) return res.json({ success: true, data: null } as ApiResponse);
    res.json({ success: true, data: { ...activeTimer, precioUnitario: parseFloat(activeTimer.precioUnitario.toString()), inicio: activeTimer.inicio.toISOString(), ultimaActualizacion: activeTimer.ultimaActualizacion.toISOString(), currentPauseStart: activeTimer.currentPauseStart?.toISOString(), currentPauseType: activeTimer.currentPauseType, pauseHistory: activeTimer.pauseHistory as any[], pausedTime: activeTimer.pausedTime } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error fetching active timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_FETCH_ERROR', message: 'No se pudo obtener el timer activo: ' + error.message } } as ApiResponse);
  }
});

timerRouter.post('/sync', requireAuth, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerSyncSchema, req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para sincronizar timer', details: validation.errors } } as ApiResponse);
  const { usuario } = validation.data!;
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) return res.json({ success: true, data: { activo: false, message: 'Timer no encontrado o detenido' } } as ApiResponse);
    const updated = await prisma.timerActivo.update({ where: { id: activeTimer.id }, data: { ultimaActualizacion: new Date() } });
    res.json({ success: true, data: { ...updated, precioUnitario: parseFloat(updated.precioUnitario.toString()), inicio: updated.inicio.toISOString(), ultimaActualizacion: updated.ultimaActualizacion.toISOString(), currentPauseStart: updated.currentPauseStart?.toISOString(), currentPauseType: updated.currentPauseType, pauseHistory: updated.pauseHistory as any[], pausedTime: updated.pausedTime, isPaused: updated.isPaused } } as ApiResponse);
  } catch (error: any) {
    logger.error('Error syncing timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_SYNC_ERROR', message: 'No se pudo sincronizar el timer: ' + error.message } } as ApiResponse);
  }
});
