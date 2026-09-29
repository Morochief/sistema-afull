/**
 * Shared state and helpers used across all route modules.
 * Extracted from server.ts to enable modular router architecture.
 */

import { DatabaseState } from '../types.ts';
import { mapDbRolToUi } from '../../server-auth.ts';
import { logger } from './config/logger.ts';

export { logger };

// ─── CSRF Token Storage (in-memory, use Redis in production) ───
export const csrfTokens = new Map<string, { token: string; createdAt: number }>();
export const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour

// Clean up expired CSRF tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(sessionId);
    }
  }
}, 600000);

// ─── Excel helpers ───
export function parseExcelDate(excelDate: any): string {
  if (!excelDate) return new Date().toISOString().substring(0, 10);

  if (typeof excelDate === 'number') {
    const date = new Date((excelDate - (excelDate > 60 ? 2 : 1)) * 24 * 60 * 60 * 1000 + new Date('1900-01-01').getTime());
    return date.toISOString().substring(0, 10);
  }

  try {
    const parsedStr = String(excelDate).trim();
    if (parsedStr.includes('/') || parsedStr.includes('-')) {
      const parts = parsedStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    const d = new Date(excelDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substring(0, 10);
    }
  } catch (e) {}

  return new Date().toISOString().substring(0, 10);
}

export function formatExcelTime(val: any): string {
  if (val === undefined || val === null || val === '') return '';

  const valStr = String(val).trim();
  if (valStr.includes(':')) {
    return valStr.substring(0, 5);
  }

  const num = parseFloat(valStr);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  return valStr;
}

// ─── ID generator ───
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

// ─── Prisma → Frontend converter ───
export function convertPrismaToFrontend(prismaData: any): DatabaseState {
  const mapEstadoProyecto = (estado: string): 'Pendiente' | 'En Proceso' | 'Completado' => {
    if (estado === 'EN_PROCESO') return 'En Proceso';
    if (estado === 'COMPLETADO') return 'Completado';
    return 'Pendiente';
  };

  return {
    clientes: prismaData.clientes.map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo,
      tokenPortal: c.tokenPortal || null,
      fechaCreacion: c.fechaCreacion.toISOString().substring(0, 10),
    })),
    proyectos: prismaData.proyectos.map((p: any) => ({
      id: p.id,
      clienteId: p.clienteId,
      nombre: p.nombre,
      estado: mapEstadoProyecto(p.estado),
      fechaInicio: p.fechaInicio.toISOString().substring(0, 10),
      activo: p.activo,
    })),
    colaboradores: prismaData.colaboradores.map((c: any) => {
      const linkedUser = (prismaData.usuarios || []).find((u: any) => u.colaboradorId === c.id);
      return {
        id: c.id,
        nombre: c.nombre,
        tarifaSugerida: c.tarifaSugerida ? parseFloat(c.tarifaSugerida.toString()) : 0,
        rol: c.rol || undefined,
        ci: c.ci || undefined,
        cargo: c.cargo || undefined,
        departamento: c.departamento || undefined,
        jefeInmediato: c.jefeInmediato || undefined,
        usuario: linkedUser
          ? {
              id: linkedUser.id,
              username: linkedUser.username,
              nombre: linkedUser.nombre,
              email: linkedUser.email,
              rol: mapDbRolToUi(linkedUser.rol),
              activo: linkedUser.activo,
            }
          : null,
      };
    }),
    registros: prismaData.registros.map((r: any) => ({
      id: r.id,
      clienteId: r.clienteId,
      clienteNombre: r.clienteNombre,
      proyectoId: r.proyectoId,
      proyectoNombre: r.proyectoNombre,
      fecha: r.fecha.toISOString().substring(0, 10),
      concepto: r.concepto === 'MO' ? 'MO' : r.concepto === 'INSUMO' ? 'Insumo' : 'Otros',
      descripcion: r.descripcion,
      colaboradorId: r.colaboradorId || undefined,
      hsInicio: r.hsInicio || undefined,
      hsFin: r.hsFin || undefined,
      hsTotal: r.hsTotal ? parseFloat(r.hsTotal.toString()) : undefined,
      cantidad: parseFloat(r.cantidad.toString()),
      precioUnitario: parseFloat(r.precioUnitario.toString()),
      total: parseFloat(r.total.toString()),
      origen: r.origen === 'MANUAL' ? 'Manual' : 'Excel',
      fechaImportacion: r.fechaImportacion ? r.fechaImportacion.toISOString().substring(0, 10) : undefined,
    })),
    registrosVehiculo: prismaData.registrosVehiculo.map((rv: any) => ({
      id: rv.id,
      clienteId: rv.clienteId,
      clienteNombre: rv.clienteNombre,
      proyectoId: rv.proyectoId,
      proyectoNombre: rv.proyectoNombre,
      fecha: rv.fecha.toISOString().substring(0, 10),
      kmInicial: parseFloat(rv.kmInicial.toString()),
      kmFinal: parseFloat(rv.kmFinal.toString()),
      distanciaOdometro: parseFloat(rv.distanciaOdometro.toString()),
      distanciaGPS: rv.distanciaGPS ? parseFloat(rv.distanciaGPS.toString()) : undefined,
      combustibleLitros: rv.combustibleLitros ? parseFloat(rv.combustibleLitros.toString()) : undefined,
      combustibleCosto: parseFloat(rv.combustibleCosto.toString()),
      total: parseFloat(rv.total.toString()),
      descripcion: rv.descripcion || undefined,
      alertaDiscrepancia: rv.alertaDiscrepancia,
      discrepancia: rv.discrepancia ? parseFloat(rv.discrepancia.toString()) : undefined,
      consumoPorKm: rv.consumoPorKm ? parseFloat(rv.consumoPorKm.toString()) : undefined,
      fotoOdometroInicio: rv.fotoOdometroInicio || undefined,
      fotoOdometroFin: rv.fotoOdometroFin || undefined,
      ubicacionInicio: rv.ubicacionInicio || undefined,
      ubicacionFin: rv.ubicacionFin || undefined,
      horaInicio: rv.horaInicio || undefined,
      horaFin: rv.horaFin || undefined,
      duracionMinutos: rv.duracionMinutos || undefined,
      usuario: rv.usuario || undefined,
      origen: rv.origen === 'MANUAL' ? 'Manual' : 'Excel',
      fechaImportacion: rv.fechaImportacion ? rv.fechaImportacion.toISOString().substring(0, 10) : undefined,
    })),
    timersActivos: (prismaData.timersActivos || []).map((t: any) => ({
      id: t.id,
      usuario: t.usuario,
      colaboradorId: t.colaboradorId || undefined,
      clienteId: t.clienteId,
      proyectoId: t.proyectoId,
      descripcion: t.descripcion,
      precioUnitario: parseFloat(t.precioUnitario.toString()),
      inicio: t.inicio.toISOString(),
      activo: t.activo,
      ultimaActualizacion: t.ultimaActualizacion.toISOString(),
      pausedTime: t.pausedTime,
      pauseHistory: t.pauseHistory as any[],
      isPaused: t.isPaused,
      currentPauseStart: t.currentPauseStart?.toISOString(),
    })),
    viajesActivos: (prismaData.viajesActivos || []).map((v: any) => ({
      id: v.id,
      usuario: v.usuario,
      clienteId: v.clienteId,
      proyectoId: v.proyectoId,
      inicio: v.inicio.toISOString(),
      ubicacionInicio: v.ubicacionInicio,
      fotoOdometroInicio: v.fotoOdometroInicio,
      kmInicial: parseFloat(v.kmInicial.toString()),
      descripcion: v.descripcion,
      activo: v.activo,
    })),
    usuariosSinColaborador: (prismaData.usuarios || [])
      .filter((u: any) => !u.colaboradorId)
      .map((u: any) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        email: u.email,
        rol: mapDbRolToUi(u.rol),
        activo: u.activo,
      })),
  };
}
