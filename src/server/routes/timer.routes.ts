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
import { validateSchema, TimerStartSchema, TimerStopSchema, TimerSyncSchema, TimerPauseSchema, TimerResumeSchema, TimerChecklistSchema, TimerAddPasoSchema } from '../../../server-validation.ts';

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

    // Extraer lista de pasos si fueron inyectados en la descripción
    let serverChecklist: Array<{ id: string; texto: string; completado: boolean; duracionSegundos?: number }> | null = null;
    const jsonMatch = activeTimer.descripcion.match(/<!--CHK:(.+?)-->/);
    if (jsonMatch) {
      try {
        serverChecklist = JSON.parse(decodeURIComponent(jsonMatch[1]));
      } catch {}
    }

    res.json({
      success: true,
      data: {
        ...updated,
        precioUnitario: parseFloat(updated.precioUnitario.toString()),
        inicio: updated.inicio.toISOString(),
        ultimaActualizacion: updated.ultimaActualizacion.toISOString(),
        currentPauseStart: updated.currentPauseStart?.toISOString(),
        currentPauseType: updated.currentPauseType,
        pauseHistory: updated.pauseHistory as any[],
        pausedTime: updated.pausedTime,
        isPaused: updated.isPaused,
        serverChecklist,
      }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error syncing timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_SYNC_ERROR', message: 'No se pudo sincronizar el timer: ' + error.message } } as ApiResponse);
  }
});

timerRouter.post('/checklist', requireAuth, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerChecklistSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para actualizar checklist', details: validation.errors }
    } as ApiResponse);
  }
  const { usuario, checklist } = validation.data!;
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) {
      return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_TIMER', message: 'No hay timer activo para este usuario' } } as ApiResponse);
    }

    const total = checklist.length;
    const completados = checklist.filter(c => c.completado).length;
    const primerIncompleto = checklist.find(c => !c.completado);

    // Limpiar tags previos y comentarios ocultos de checklist de la descripción
    let baseDesc = activeTimer.descripcion
      .replace(/\s*<!--CHK:.*?-->/g, '')
      .replace(/\s*\[Checklist:[^\]]*\]/g, '')
      .trim();
    if (!baseDesc) baseDesc = 'Tarea en curso';

    // Construir resumen visual para el dashboard
    let tag = `[Checklist: ${completados}/${total}`;
    if (primerIncompleto) {
      tag += ` · Paso: ${primerIncompleto.texto.slice(0, 40)}`;
    } else if (total > 0 && completados === total) {
      tag += ` · 100% Completo`;
    }
    tag += `]`;

    // Persistir estado completo de checklist serializado de forma oculta en la descripción
    const jsonPayload = encodeURIComponent(JSON.stringify(checklist));
    const nuevaDesc = `${baseDesc} ${tag} <!--CHK:${jsonPayload}-->`;

    const updated = await prisma.timerActivo.update({
      where: { id: activeTimer.id },
      data: {
        descripcion: nuevaDesc,
        ultimaActualizacion: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        descripcion: updated.descripcion,
        checklistStats: { completados, total, porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0 }
      }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error updating timer checklist', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_CHECKLIST_ERROR', message: 'No se pudo actualizar el checklist del timer: ' + error.message } } as ApiResponse);
  }
});

// POST /add-paso - Permite a Gerardo o Admin agregar un paso en vivo al checklist de un operario activo
timerRouter.post('/add-paso', requireAuth, async (req: Request, res: Response) => {
  const validation = validateSchema(TimerAddPasoSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos para agregar paso', details: validation.errors }
    } as ApiResponse);
  }
  const { usuario, texto } = validation.data!;
  try {
    const activeTimer = await prisma.timerActivo.findFirst({ where: { usuario, activo: true } });
    if (!activeTimer) {
      return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_TIMER', message: 'No hay timer activo para este usuario' } } as ApiResponse);
    }

    // Extraer checklist existente o inicializar
    let checklist: Array<{ id: string; texto: string; completado: boolean; duracionSegundos?: number }> = [];
    const jsonMatch = activeTimer.descripcion.match(/<!--CHK:(.+?)-->/);
    if (jsonMatch) {
      try {
        checklist = JSON.parse(decodeURIComponent(jsonMatch[1]));
      } catch {}
    }

    const nuevoId = generateId('chk');
    checklist.push({ id: nuevoId, texto: texto.trim(), completado: false });

    const total = checklist.length;
    const completados = checklist.filter(c => c.completado).length;
    const primerIncompleto = checklist.find(c => !c.completado);

    let baseDesc = activeTimer.descripcion
      .replace(/\s*<!--CHK:.*?-->/g, '')
      .replace(/\s*\[Checklist:[^\]]*\]/g, '')
      .trim();
    if (!baseDesc) baseDesc = 'Tarea en curso';

    let tag = `[Checklist: ${completados}/${total}`;
    if (primerIncompleto) {
      tag += ` · Paso: ${primerIncompleto.texto.slice(0, 40)}`;
    } else if (total > 0 && completados === total) {
      tag += ` · 100% Completo`;
    }
    tag += `]`;

    const jsonPayload = encodeURIComponent(JSON.stringify(checklist));
    const nuevaDesc = `${baseDesc} ${tag} <!--CHK:${jsonPayload}-->`;

    await prisma.timerActivo.update({
      where: { id: activeTimer.id },
      data: {
        descripcion: nuevaDesc,
        ultimaActualizacion: new Date(),
      }
    });

    res.json({
      success: true,
      data: {
        id: activeTimer.id,
        checklist,
        nuevoPaso: { id: nuevoId, texto: texto.trim(), completado: false }
      }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error adding paso to active timer', error);
    res.status(500).json({ success: false, error: { code: 'TIMER_ADD_PASO_ERROR', message: 'No se pudo agregar el paso: ' + error.message } } as ApiResponse);
  }
});

// GET /activos - Obtener todos los timers activos para el Panel de Control en Tiempo Real (Admin / Gerardo)
timerRouter.get('/activos', requireAuth, async (req: Request, res: Response) => {
  try {
    const [timers, clientes, proyectos, colaboradores] = await Promise.all([
      prisma.timerActivo.findMany({
        where: { activo: true },
        orderBy: { inicio: 'desc' }
      }),
      prisma.cliente.findMany({ select: { id: true, nombre: true } }),
      prisma.proyecto.findMany({ select: { id: true, nombre: true } }),
      prisma.colaborador.findMany({ select: { id: true, nombre: true } })
    ]);

    const clienteMap = new Map(clientes.map(c => [c.id, c.nombre]));
    const proyectoMap = new Map(proyectos.map(p => [p.id, p.nombre]));
    const colabMap = new Map(colaboradores.map(c => [c.id, c.nombre]));

    res.json({
      success: true,
      data: timers.map(t => {
        let checklistProgress: { completados: number; total: number; porcentaje: number; pasoActual?: string; pasos?: any[] } | null = null;
        let pasosChecklist: any[] = [];
        const jsonMatch = t.descripcion.match(/<!--CHK:(.+?)-->/);
        if (jsonMatch) {
          try {
            pasosChecklist = JSON.parse(decodeURIComponent(jsonMatch[1]));
          } catch {}
        }

        const match = t.descripcion.match(/\[Checklist:\s*(\d+)\/(\d+)(?:\s*·\s*Paso:\s*([^\]]+)|\s*·\s*([^\]]+))?\]/);
        if (match || pasosChecklist.length > 0) {
          const comp = match ? parseInt(match[1], 10) : pasosChecklist.filter(p => p.completado).length;
          const tot = match ? parseInt(match[2], 10) : pasosChecklist.length;
          const paso = match ? (match[3] || match[4] || '') : (pasosChecklist.find(p => !p.completado)?.texto || '');
          checklistProgress = {
            completados: comp,
            total: tot,
            porcentaje: tot > 0 ? Math.round((comp / tot) * 100) : 0,
            pasoActual: paso.trim(),
            pasos: pasosChecklist
          };
        }

        const cleanDesc = t.descripcion
          .replace(/\s*<!--CHK:.*?-->/g, '')
          .replace(/\s*\[Checklist:[^\]]*\]/g, '')
          .trim();

        return {
          id: t.id,
          usuario: t.usuario,
          colaboradorNombre: (t.colaboradorId ? colabMap.get(t.colaboradorId) : null) || t.usuario,
          clienteNombre: clienteMap.get(t.clienteId) || 'Sin cliente',
          proyectoNombre: proyectoMap.get(t.proyectoId) || 'Sin proyecto',
          descripcion: cleanDesc || 'Tarea en progreso',
          checklistProgress,
          inicio: t.inicio.toISOString(),
          isPaused: t.isPaused,
          currentPauseType: t.currentPauseType,
          pausedTime: t.pausedTime,
        };
      })
    });
  } catch (error: any) {
    logger.error('Error fetching all active timers', error);
    res.status(500).json({ success: false, error: { code: 'TIMERS_FETCH_ERROR', message: 'Error al listar timers activos' } });
  }
});

// GET /terminados - Historial diario de tareas concluidas para Gerardo / Admin (con filtro por fecha)
timerRouter.get('/terminados', requireAuth, async (req: Request, res: Response) => {
  try {
    const fechaParam = typeof req.query.fecha === 'string' ? req.query.fecha : new Date().toISOString().substring(0, 10);
    
    // Rango del día seleccionado en UTC/local
    const startOfDay = new Date(`${fechaParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${fechaParam}T23:59:59.999Z`);

    const [registrosMO, colaboradores, clientes, proyectos] = await Promise.all([
      prisma.registro.findMany({
        where: {
          concepto: 'MO',
          fecha: {
            gte: startOfDay,
            lte: endOfDay,
          }
        },
        orderBy: { hsFin: 'desc' }
      }),
      prisma.colaborador.findMany({ select: { id: true, nombre: true } }),
      prisma.cliente.findMany({ select: { id: true, nombre: true } }),
      prisma.proyecto.findMany({ select: { id: true, nombre: true } }),
    ]);

    const colabMap = new Map(colaboradores.map(c => [c.id, c.nombre]));
    const clienteMap = new Map(clientes.map(c => [c.id, c.nombre]));
    const proyectoMap = new Map(proyectos.map(p => [p.id, p.nombre]));

    const items = registrosMO.map(r => {
      // Extraer desglose de subtareas de checklist si está presente
      // Formato: [Checklist: 5/5 | Medición: 15m, Nesting: 35m, ...]
      let desglosePasos: string[] = [];
      const matchDesglose = r.descripcion.match(/\[Checklist:\s*\d+\/\d+\s*\|\s*([^\]]+)\]/);
      if (matchDesglose && matchDesglose[1]) {
        desglosePasos = matchDesglose[1].split(',').map(s => s.trim());
      }

      const cleanDesc = r.descripcion
        .replace(/\s*<!--CHK:.*?-->/g, '')
        .replace(/\s*\[Checklist:[^\]]*\]/g, '')
        .trim();

      return {
        id: r.id,
        colaboradorId: r.colaboradorId,
        colaboradorNombre: (r.colaboradorId ? colabMap.get(r.colaboradorId) : null) || 'Sin asignar',
        clienteId: r.clienteId,
        clienteNombre: r.clienteNombre || clienteMap.get(r.clienteId) || 'Sin cliente',
        proyectoId: r.proyectoId,
        proyectoNombre: r.proyectoNombre || proyectoMap.get(r.proyectoId) || 'Sin proyecto',
        descripcion: cleanDesc || 'Tarea finalizada',
        hsInicio: r.hsInicio || null,
        hsFin: r.hsFin || null,
        hsTotal: r.hsTotal ? parseFloat(r.hsTotal.toString()) : null,
        minutos: r.cantidad ? parseFloat(r.cantidad.toString()) : 0,
        fecha: r.fecha.toISOString().substring(0, 10),
        desglosePasos,
      };
    });

    res.json({
      success: true,
      data: {
        fecha: fechaParam,
        totalTareas: items.length,
        horasTotales: items.reduce((acc, i) => acc + (i.hsTotal || 0), 0),
        tareas: items,
      }
    });
  } catch (error: any) {
    logger.error('Error fetching terminados timers', error);
    res.status(500).json({ success: false, error: { code: 'TERMINADOS_FETCH_ERROR', message: 'Error al listar tareas terminadas' } });
  }
});
