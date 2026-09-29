/**
 * Data Routes - Endpoints de estado general de la BD
 * Extraido de server.ts: /api/data, /api/clear, /api/admin/cleanup-duplicates
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse, DatabaseState } from '../../types.ts';
import { convertPrismaToFrontend } from '../shared.ts';

export const dataRouter = Router();

// GET /data - Get active DB State for the application
dataRouter.get('/data', requireAuth, async (req: Request, res: Response) => {
  try {
    const [clientes, proyectos, colaboradores, registros, registrosVehiculo, timersActivos, viajesActivos, usuarios] = await Promise.all([
      prisma.cliente.findMany({ orderBy: { fechaCreacion: 'desc' } }),
      prisma.proyecto.findMany({ orderBy: { fechaInicio: 'desc' } }),
      prisma.colaborador.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.registro.findMany({ orderBy: { fecha: 'desc' } }),
      prisma.registroVehiculo.findMany({ orderBy: { fecha: 'desc' } }),
      prisma.timerActivo.findMany({ where: { activo: true } }),
      prisma.viajeActivo.findMany({ where: { activo: true } }),
      prisma.usuario.findMany()
    ]);

    const data = convertPrismaToFrontend({
      clientes, proyectos, colaboradores, registros, registrosVehiculo,
      timersActivos, viajesActivos, usuarios,
    });

    res.json({ success: true, data } as ApiResponse<DatabaseState>);
  } catch (error: any) {
    logger.error('Error reading data:', error);
    res.status(500).json({
      success: false,
      error: { code: 'READ_ERROR', message: 'Error al leer datos' }
    } as ApiResponse);
  }
});

// POST /clear - Clear DB back to default (ADMIN ONLY)
dataRouter.post('/clear', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userPayload = req.user!;
  try {
    await prisma.$transaction([
      prisma.registro.deleteMany({}),
      prisma.registroVehiculo.deleteMany({}),
      prisma.timerActivo.deleteMany({}),
      prisma.viajeActivo.deleteMany({}),
      prisma.proyecto.deleteMany({}),
      prisma.colaborador.deleteMany({}),
      prisma.cliente.deleteMany({}),
    ]);

    auditLog({
      usuario: userPayload.usuario, accion: 'clear_database',
      recurso: '/api/clear', resultado: 'success', ip: clientIp
    });
    res.json({
      success: true,
      message: 'Base de datos limpiada completamente en Supabase'
    } as ApiResponse);
  } catch (error: any) {
    console.error('Error clearing database:', error);
    auditLog({
      usuario: userPayload.usuario, accion: 'clear_database',
      recurso: '/api/clear', resultado: 'failure', ip: clientIp
    });
    res.status(500).json({
      success: false,
      error: { code: 'CLEAR_ERROR', message: 'Error al restaurar base de datos' }
    } as ApiResponse);
  }
});

// POST /admin/cleanup-duplicates - Merge duplicate clients
dataRouter.post('/admin/cleanup-duplicates', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userPayload = req.user!;
  const dryRun = req.body?.dryRun !== false;

  try {
    const report: any = {
      dryRun,
      clientesDuplicados: [],
      registrosReasignados: 0,
      eliminados: { clientes: 0, proyectos: 0 }
    };

    const todosClientes = await prisma.cliente.findMany({
      include: { _count: { select: { registros: true, proyectos: true } } }
    }) as any;

    const clientesPorNombre = new Map<string, typeof todosClientes>();
    for (const c of todosClientes) {
      const key = c.nombre.toLowerCase().trim();
      if (!clientesPorNombre.has(key)) clientesPorNombre.set(key, []);
      clientesPorNombre.get(key)!.push(c);
    }

    for (const [_nombre, grupo] of clientesPorNombre) {
      if (grupo.length <= 1) continue;

      const ganador = grupo.reduce((best, c) => {
        const scoreB = best._count.registros + best._count.registrosVehiculo;
        const scoreC = c._count.registros + c._count.registrosVehiculo;
        return scoreC > scoreB ? c : best;
      });

      const perdedores = grupo.filter(c => c.id !== ganador.id);

      report.clientesDuplicados.push({
        nombre: ganador.nombre,
        conservando: { id: ganador.id, registros: ganador._count.registros },
        eliminando: perdedores.map(p => ({ id: p.id, registros: p._count.registros }))
      });

      if (!dryRun) {
        for (const perdedor of perdedores) {
          const r1 = await prisma.registro.updateMany({
            where: { clienteId: perdedor.id },
            data: { clienteId: ganador.id, clienteNombre: ganador.nombre }
          });
          report.registrosReasignados += r1.count;

          await prisma.registroVehiculo.updateMany({
            where: { clienteId: perdedor.id },
            data: { clienteId: ganador.id, clienteNombre: ganador.nombre }
          });

          const proyectosPerdedor = await prisma.proyecto.findMany({ where: { clienteId: perdedor.id } });
          const proyectosGanador = await prisma.proyecto.findMany({ where: { clienteId: ganador.id } });

          for (const proj of proyectosPerdedor) {
            const equiv = proyectosGanador.find(
              p => p.nombre.toLowerCase().trim() === proj.nombre.toLowerCase().trim()
            );
            if (equiv) {
              await prisma.registro.updateMany({
                where: { proyectoId: proj.id },
                data: { proyectoId: equiv.id, proyectoNombre: equiv.nombre }
              });
              await prisma.registroVehiculo.updateMany({
                where: { proyectoId: proj.id },
                data: { proyectoId: equiv.id, proyectoNombre: equiv.nombre }
              });
              await prisma.proyecto.delete({ where: { id: proj.id } });
              report.eliminados.proyectos++;
            } else {
              await prisma.proyecto.update({
                where: { id: proj.id },
                data: { clienteId: ganador.id }
              });
            }
          }

          await prisma.cliente.delete({ where: { id: perdedor.id } });
          report.eliminados.clientes++;
        }
      }
    }

    auditLog({
      usuario: userPayload.usuario, accion: 'cleanup_duplicates',
      recurso: '/api/admin/cleanup-duplicates', resultado: 'success',
      ip: clientIp, detalle: `dryRun=${dryRun}, duplicados=${report.clientesDuplicados.length}`
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Error in cleanup-duplicates:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CLEANUP_ERROR', message: error.message }
    } as ApiResponse);
  }
});
