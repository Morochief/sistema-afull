/**
 * Registros Routes - CRUD de registros (manuales y de Excel)
 * Extraido de server.ts: /api/registros/*
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireWriteAccess } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse, RegistroItem } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';
import { validateSchema, RegistroItemSchema } from '../../../server-validation.ts';
import { generateId } from '../shared.ts';

export const registrosRouter = Router();

/**
 * Helper para verificar si un usuario tiene rol de operario
 */
function esUsuarioOperario(user?: any): boolean {
  if (!user || !user.rol) return false;
  const r = String(user.rol).toUpperCase();
  return r === 'OPERADOR' || r === 'OPERARIO' || r.includes('OPER');
}

// GET /mis-registros - Get current user's registros
registrosRouter.get('/mis-registros', requireAuth, async (req: Request, res: Response) => {
  const userPayload = req.user!;
  const isOperario = esUsuarioOperario(userPayload);
  try {
    const registros = await prisma.registro.findMany({
      where: { concepto: 'MO', colaboradorId: userPayload.colaboradorId },
      orderBy: { fecha: 'desc' }
    });

    const userRegistros = registros.map(r => ({
      id: r.id,
      clienteId: r.clienteId,
      clienteNombre: r.clienteNombre,
      proyectoId: r.proyectoId,
      proyectoNombre: r.proyectoNombre,
      fecha: r.fecha.toISOString().substring(0, 10),
      concepto: 'MO' as const,
      descripcion: r.descripcion,
      colaboradorId: r.colaboradorId || undefined,
      hsInicio: r.hsInicio || undefined,
      hsFin: r.hsFin || undefined,
      hsTotal: r.hsTotal ? parseFloat(r.hsTotal.toString()) : undefined,
      cantidad: parseFloat(r.cantidad.toString()),
      precioUnitario: isOperario ? 0 : parseFloat(r.precioUnitario.toString()),
      total: isOperario ? 0 : parseFloat(r.total.toString()),
      origen: r.origen === 'MANUAL' ? 'Manual' as const : 'Excel' as const,
      fechaImportacion: r.fechaImportacion ? r.fechaImportacion.toISOString().substring(0, 10) : undefined
    }));

    res.json({ success: true, data: userRegistros } as ApiResponse<RegistroItem[]>);
  } catch (error: any) {
    logger.error('Error reading user registros:', error);
    res.status(500).json({
      success: false,
      error: { code: 'READ_ERROR', message: 'Error al leer registros del usuario' }
    } as ApiResponse);
  }
});

// POST / - Add a single registro manually
registrosRouter.post('/', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const validation = validateSchema(RegistroItemSchema, req.body);

  if (!validation.valid) {
    logger.error('[DEBUG /api/registros] Zod validation failed:', JSON.stringify({
      errors: validation.errors,
      body: {
        clienteId: req.body?.clienteId,
        proyectoId: req.body?.proyectoId,
        fecha: req.body?.fecha,
        concepto: req.body?.concepto,
        cantidad: req.body?.cantidad,
        precioUnitario: req.body?.precioUnitario,
        total: req.body?.total,
        descripcion: req.body?.descripcion?.substring(0, 30),
      }
    }));
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos del registro invalidos', details: validation.errors }
    } as ApiResponse);
  }

  const rawItem = validation.data!;
  const userPayload = req.user!;
  const clientIp = getClientIp(req);

  try {
    const [client, project] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: rawItem.clienteId } }),
      prisma.proyecto.findUnique({ where: { id: rawItem.proyectoId } })
    ]);

    if (!client || !project) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: 'Cliente o proyecto no encontrado' }
      } as ApiResponse);
    }

    // SECURITY: Non-admin users can only register hours for themselves
    if (rawItem.concepto === 'MO' && rawItem.colaboradorId && userPayload.rol !== 'Admin') {
      if (rawItem.colaboradorId !== userPayload.colaboradorId) {
        auditLog({
          usuario: userPayload.usuario, accion: 'create_registro',
          recurso: '/api/registros', resultado: 'failure',
          ip: clientIp, detalle: 'Intento de registrar horas de otro colaborador'
        });
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No tenes permiso para registrar horas de otros colaboradores' }
        } as ApiResponse);
      }
    }

    let conceptoEnum: 'MO' | 'INSUMO' | 'VEHICULO' = 'MO';
    if (rawItem.concepto === 'Insumo') conceptoEnum = 'INSUMO';
    else if (rawItem.concepto === 'MO') conceptoEnum = 'MO';

    const isOperario = esUsuarioOperario(userPayload);
    let precioUnitarioCalculado = rawItem.precioUnitario;
    let totalCalculado = rawItem.total;

    // RESOLUCIÓN AUTOMÁTICA DE PRECIOS PARA INSUMOS (DEFENSE-IN-DEPTH)
    // Si el usuario es Operario (no debe ver ni fijar precios) o si precioUnitario viene en 0,
    // buscamos el insumo en el catálogo de PostgreSQL para computar su costo exacto.
    if (conceptoEnum === 'INSUMO' && (isOperario || !precioUnitarioCalculado || precioUnitarioCalculado === 0)) {
      try {
        const desc = rawItem.descripcion.trim();
        const baseNombre = desc.includes('—') ? desc.split('—')[0].trim() : desc;
        const esMerma = /merma|desperdicio/i.test(desc);

        // 1. Buscar coincidencia en la tabla Insumo
        const insumoDb = await prisma.insumo.findFirst({
          where: {
            activo: true,
            OR: [
              { nombre: { equals: baseNombre, mode: 'insensitive' } },
              { nombre: { contains: baseNombre, mode: 'insensitive' } },
            ]
          },
          orderBy: { nombre: 'asc' }
        });

        if (insumoDb) {
          const costoUnit = esMerma && insumoDb.costoDesperdicio != null && Number(insumoDb.costoDesperdicio) > 0
            ? Number(insumoDb.costoDesperdicio)
            : Number(insumoDb.costo);

          precioUnitarioCalculado = costoUnit;
          totalCalculado = Math.round(rawItem.cantidad * costoUnit);
        } else if (isOperario && (!precioUnitarioCalculado || precioUnitarioCalculado === 0)) {
          // Si no se encuentra exacta, buscar por palabras clave (ej. "serimax", "altatec", "lona")
          const palabras = baseNombre.split(' ').filter(w => w.length > 3);
          if (palabras.length > 0) {
            const fallbackInsumo = await prisma.insumo.findFirst({
              where: {
                activo: true,
                OR: palabras.map(w => ({ nombre: { contains: w, mode: 'insensitive' } }))
              }
            });
            if (fallbackInsumo) {
              const costoUnit = esMerma && fallbackInsumo.costoDesperdicio != null && Number(fallbackInsumo.costoDesperdicio) > 0
                ? Number(fallbackInsumo.costoDesperdicio)
                : Number(fallbackInsumo.costo);
              precioUnitarioCalculado = costoUnit;
              totalCalculado = Math.round(rawItem.cantidad * costoUnit);
            }
          }
        }
      } catch (lookupErr) {
        logger.warn('[REGISTROS] Error al resolver costo de insumo desde catálogo:', lookupErr);
      }
    }

    const newRegistro = await prisma.registro.create({
      data: {
        id: generateId('reg'),
        clienteId: rawItem.clienteId,
        clienteNombre: client.nombre,
        proyectoId: rawItem.proyectoId,
        proyectoNombre: project.nombre,
        fecha: new Date(rawItem.fecha || new Date().toISOString().substring(0, 10)),
        concepto: conceptoEnum,
        descripcion: rawItem.descripcion,
        colaboradorId: rawItem.colaboradorId || null,
        hsInicio: rawItem.hsInicio ? rawItem.hsInicio.substring(0, 5) : null,
        hsFin: rawItem.hsFin ? rawItem.hsFin.substring(0, 5) : null,
        hsTotal: rawItem.hsTotal ? new Decimal(rawItem.hsTotal) : null,
        cantidad: new Decimal(rawItem.cantidad),
        precioUnitario: new Decimal(precioUnitarioCalculado),
        total: new Decimal(totalCalculado),
        origen: 'MANUAL',
        modoInsumo: req.body?.modoInsumo || null,
        anchoCm: req.body?.anchoCm != null ? new Decimal(req.body.anchoCm) : null,
        altoCm: req.body?.altoCm != null ? new Decimal(req.body.altoCm) : null,
        desperdicioCalculado: Boolean(req.body?.desperdicioCalculado),
        porcentajeUsado: req.body?.porcentajeUsado != null ? new Decimal(req.body.porcentajeUsado) : null,
        facturaCompraId: req.body?.facturaCompraId || null,
        prorrateoGrupoId: req.body?.prorrateoGrupoId || null,
        porcentajeProrrateo: req.body?.porcentajeProrrateo != null ? new Decimal(req.body.porcentajeProrrateo) : null,
        fechaImportacion: new Date()
      }
    });

    if (req.body?.facturaCompraId) {
      try {
        await prisma.facturaCompra.update({
          where: { id: req.body.facturaCompraId },
          data: { cantidadUsada: { increment: rawItem.cantidad } }
        });
      } catch (fErr) {
        logger.warn('[REGISTROS] Error updating facturaCompra cantidadUsada:', fErr);
      }
    }

    const newItem: RegistroItem = {
      id: newRegistro.id,
      clienteId: newRegistro.clienteId,
      clienteNombre: newRegistro.clienteNombre,
      proyectoId: newRegistro.proyectoId,
      proyectoNombre: newRegistro.proyectoNombre,
      fecha: newRegistro.fecha.toISOString().substring(0, 10),
      concepto: newRegistro.concepto === 'INSUMO' ? 'Insumo' : 'MO',
      descripcion: newRegistro.descripcion,
      colaboradorId: newRegistro.colaboradorId || undefined,
      hsInicio: newRegistro.hsInicio || undefined,
      hsFin: newRegistro.hsFin || undefined,
      hsTotal: newRegistro.hsTotal ? parseFloat(newRegistro.hsTotal.toString()) : undefined,
      cantidad: parseFloat(newRegistro.cantidad.toString()),
      precioUnitario: isOperario ? 0 : parseFloat(newRegistro.precioUnitario.toString()),
      total: isOperario ? 0 : parseFloat(newRegistro.total.toString()),
      origen: 'Manual',
      fechaImportacion: newRegistro.fechaImportacion ? newRegistro.fechaImportacion.toISOString().substring(0, 10) : undefined
    };

    auditLog({
      usuario: userPayload.usuario, accion: 'create_registro',
      recurso: `/api/registros/${newItem.id}`, resultado: 'success', ip: clientIp
    });

    res.status(201).json({
      success: true, data: newItem, message: 'Registro creado con exito'
    } as ApiResponse);
  } catch (error: any) {
    logger.error('[DEBUG] Error creating registro:', error?.message);
    logger.error('[DEBUG] Prisma error details:', JSON.stringify({
      code: error?.code, meta: error?.meta, message: error?.message
    }));
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Error al crear registro' }
    } as ApiResponse);
  }
});

// DELETE /:id - Delete timesheet/supplies record
registrosRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;

  if (!id) {
    return res.status(400).json({
      success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' }
    } as ApiResponse);
  }

  try {
    const registro = await prisma.registro.findUnique({ where: { id } });
    if (!registro) {
      return res.status(404).json({
        success: false, error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
      } as ApiResponse);
    }

    await prisma.registro.delete({ where: { id } });

    auditLog({
      usuario: userPayload.usuario, accion: 'delete_registro',
      recurso: `/api/registros/${id}`, resultado: 'success', ip: clientIp
    });

    res.json({ success: true, message: 'Registro eliminado con exito' } as ApiResponse);
  } catch (error: any) {
    console.error('Error deleting registro:', error);
    res.status(500).json({
      success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar registro' }
    } as ApiResponse);
  }
});

// PUT /:id - Update/Edit a registro
registrosRouter.put('/:id', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;

  if (!id) {
    return res.status(400).json({
      success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' }
    } as ApiResponse);
  }

  const validation = validateSchema(RegistroItemSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos del registro invalidos', details: validation.errors }
    } as ApiResponse);
  }

  const updatedData = validation.data!;

  try {
    const existingRegistro = await prisma.registro.findUnique({ where: { id } });
    if (!existingRegistro) {
      return res.status(404).json({
        success: false, error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
      } as ApiResponse);
    }

    const [client, project] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: updatedData.clienteId } }),
      prisma.proyecto.findUnique({ where: { id: updatedData.proyectoId } })
    ]);

    if (!client || !project) {
      return res.status(400).json({
        success: false, error: { code: 'INVALID_REFERENCE', message: 'Cliente o proyecto no encontrado' }
      } as ApiResponse);
    }

    if (existingRegistro.concepto === 'MO' && userPayload.rol !== 'Admin') {
      if (existingRegistro.colaboradorId !== userPayload.colaboradorId) {
        auditLog({
          usuario: userPayload.usuario, accion: 'update_registro',
          recurso: `/api/registros/${id}`, resultado: 'failure',
          ip: clientIp, detalle: 'Intento de editar horas de otro colaborador'
        });
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No tenes permiso para editar horas de otros colaboradores' }
        } as ApiResponse);
      }
    }

    let hsTotal = updatedData.hsTotal;
    if (updatedData.concepto === 'MO' && updatedData.cantidad > 0) {
      hsTotal = parseFloat((updatedData.cantidad / 60).toFixed(2));
    }

    let conceptoEnum: 'MO' | 'INSUMO' | 'VEHICULO' = 'MO';
    if (updatedData.concepto === 'Insumo') conceptoEnum = 'INSUMO';
    else if (updatedData.concepto === 'MO') conceptoEnum = 'MO';

    const isOperario = esUsuarioOperario(userPayload);
    const updatedRegistro = await prisma.registro.update({
      where: { id },
      data: {
        clienteId: updatedData.clienteId,
        clienteNombre: client.nombre,
        proyectoId: updatedData.proyectoId,
        proyectoNombre: project.nombre,
        fecha: new Date(updatedData.fecha || existingRegistro.fecha),
        concepto: conceptoEnum,
        descripcion: updatedData.descripcion,
        colaboradorId: updatedData.colaboradorId || existingRegistro.colaboradorId,
        hsInicio: updatedData.hsInicio || existingRegistro.hsInicio,
        hsFin: updatedData.hsFin || existingRegistro.hsFin,
        hsTotal: hsTotal ? new Decimal(hsTotal) : existingRegistro.hsTotal,
        cantidad: new Decimal(updatedData.cantidad),
        precioUnitario: isOperario ? existingRegistro.precioUnitario : new Decimal(updatedData.precioUnitario),
        total: isOperario ? existingRegistro.total : new Decimal(updatedData.total)
      }
    });

    const responseData: RegistroItem = {
      id: updatedRegistro.id,
      clienteId: updatedRegistro.clienteId,
      clienteNombre: updatedRegistro.clienteNombre,
      proyectoId: updatedRegistro.proyectoId,
      proyectoNombre: updatedRegistro.proyectoNombre,
      fecha: updatedRegistro.fecha.toISOString().substring(0, 10),
      concepto: updatedRegistro.concepto === 'INSUMO' ? 'Insumo' : 'MO',
      descripcion: updatedRegistro.descripcion,
      colaboradorId: updatedRegistro.colaboradorId || undefined,
      hsInicio: updatedRegistro.hsInicio || undefined,
      hsFin: updatedRegistro.hsFin || undefined,
      hsTotal: updatedRegistro.hsTotal ? parseFloat(updatedRegistro.hsTotal.toString()) : undefined,
      cantidad: parseFloat(updatedRegistro.cantidad.toString()),
      precioUnitario: isOperario ? 0 : parseFloat(updatedRegistro.precioUnitario.toString()),
      total: isOperario ? 0 : parseFloat(updatedRegistro.total.toString()),
      origen: updatedRegistro.origen === 'MANUAL' ? 'Manual' : 'Excel',
      fechaImportacion: updatedRegistro.fechaImportacion ? updatedRegistro.fechaImportacion.toISOString().substring(0, 10) : undefined
    };

    auditLog({
      usuario: userPayload.usuario, accion: 'update_registro',
      recurso: `/api/registros/${id}`, resultado: 'success', ip: clientIp
    });

    res.json({ success: true, data: responseData, message: 'Registro actualizado con exito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error updating registro:', error);
    res.status(500).json({
      success: false, error: { code: 'UPDATE_ERROR', message: 'Error al actualizar registro' }
    } as ApiResponse);
  }
});

// PATCH /:id - Partial update (only descripcion and proyectoId)
registrosRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id;
  const clientIp = getClientIp(req);
  const userPayload = req.user!;

  if (!id) {
    return res.status(400).json({
      success: false, error: { code: 'MISSING_ID', message: 'ID de registro requerido' }
    } as ApiResponse);
  }

  const { descripcion, proyectoId } = req.body;

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Descripcion requerida y debe ser un texto valido' }
    } as ApiResponse);
  }

  if (!proyectoId || typeof proyectoId !== 'string') {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: 'Proyecto requerido' }
    } as ApiResponse);
  }

  try {
    const existingRegistro = await prisma.registro.findUnique({ where: { id } });
    if (!existingRegistro) {
      return res.status(404).json({
        success: false, error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
      } as ApiResponse);
    }

    if (existingRegistro.concepto === 'MO' && userPayload.rol !== 'Admin') {
      if (existingRegistro.colaboradorId !== userPayload.colaboradorId) {
        auditLog({
          usuario: userPayload.usuario, accion: 'patch_registro',
          recurso: `/api/registros/${id}`, resultado: 'failure',
          ip: clientIp, detalle: 'Intento de editar registro de otro colaborador'
        });
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No tenes permiso para editar registros de otros colaboradores' }
        } as ApiResponse);
      }
    }

    const project = await prisma.proyecto.findUnique({ where: { id: proyectoId } });
    if (!project) {
      return res.status(400).json({
        success: false, error: { code: 'INVALID_REFERENCE', message: 'Proyecto no encontrado' }
      } as ApiResponse);
    }

    if (project.clienteId !== existingRegistro.clienteId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: 'El proyecto debe pertenecer al mismo cliente' }
      } as ApiResponse);
    }

    const updatedRegistro = await prisma.registro.update({
      where: { id },
      data: { descripcion: descripcion.trim(), proyectoId: proyectoId, proyectoNombre: project.nombre }
    });

    const isOperario = esUsuarioOperario(userPayload);
    const responseData: RegistroItem = {
      id: updatedRegistro.id,
      clienteId: updatedRegistro.clienteId,
      clienteNombre: updatedRegistro.clienteNombre,
      proyectoId: updatedRegistro.proyectoId,
      proyectoNombre: updatedRegistro.proyectoNombre,
      fecha: updatedRegistro.fecha.toISOString().substring(0, 10),
      concepto: updatedRegistro.concepto === 'INSUMO' ? 'Insumo' : 'MO',
      descripcion: updatedRegistro.descripcion,
      colaboradorId: updatedRegistro.colaboradorId || undefined,
      hsInicio: updatedRegistro.hsInicio || undefined,
      hsFin: updatedRegistro.hsFin || undefined,
      hsTotal: updatedRegistro.hsTotal ? parseFloat(updatedRegistro.hsTotal.toString()) : undefined,
      cantidad: parseFloat(updatedRegistro.cantidad.toString()),
      precioUnitario: isOperario ? 0 : parseFloat(updatedRegistro.precioUnitario.toString()),
      total: isOperario ? 0 : parseFloat(updatedRegistro.total.toString()),
      origen: updatedRegistro.origen === 'MANUAL' ? 'Manual' : 'Excel',
      fechaImportacion: updatedRegistro.fechaImportacion ? updatedRegistro.fechaImportacion.toISOString().substring(0, 10) : undefined
    };

    auditLog({
      usuario: userPayload.usuario, accion: 'patch_registro',
      recurso: `/api/registros/${id}`, resultado: 'success', ip: clientIp
    });

    res.json({ success: true, data: responseData, message: 'Registro actualizado con exito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error patching registro:', error);
    res.status(500).json({
      success: false, error: { code: 'PATCH_ERROR', message: 'Error al actualizar registro' }
    } as ApiResponse);
  }
});

/**
 * POST /api/registros/prorrateo
 * Registra una actividad dividida entre múltiples clientes por porcentaje
 */
registrosRouter.post('/prorrateo', requireAuth, requireWriteAccess, async (req: Request, res: Response) => {
  const { distribucion, registroBase } = req.body || {};

  if (!Array.isArray(distribucion) || distribucion.length < 2) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DISTRIBUTION', message: 'Se requieren al menos 2 clientes para prorratear' }
    } as ApiResponse);
  }

  const suma = distribucion.reduce((acc: number, d: any) => acc + (Number(d.porcentaje) || 0), 0);
  if (Math.abs(suma - 100) > 0.1) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PERCENTAGE', message: `La suma de los porcentajes debe ser exactamente 100% (suma actual: ${suma}%)` }
    } as ApiResponse);
  }

  if (!registroBase || !registroBase.descripcion || !registroBase.concepto) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BASE', message: 'Faltan datos del registro base' }
    } as ApiResponse);
  }

  const userPayload = req.user!;
  const isOperario = esUsuarioOperario(userPayload);
  const clientIp = getClientIp(req);
  const grupoId = generateId('grp');
  const conceptoEnum = String(registroBase.concepto).toUpperCase() === 'INSUMO' ? 'INSUMO' : 'MO';

  const cantTotal = Number(registroBase.cantidad) || 0;
  const precioUnit = Number(registroBase.precioUnitario) || 0;
  const totalBase = Number(registroBase.total) || Math.round(cantTotal * precioUnit);
  const hsTotalNum = registroBase.hsTotal != null ? Number(registroBase.hsTotal) : null;

  try {
    const creados: any[] = [];

    await prisma.$transaction(async (tx) => {
      let acumuladoCant = 0;
      let acumuladoTotal = 0;
      let acumuladoHs = 0;

      for (let i = 0; i < distribucion.length; i++) {
        const dist = distribucion[i];
        const isLast = i === distribucion.length - 1;
        const pct = Number(dist.porcentaje);

        const cli = await tx.cliente.findUnique({ where: { id: dist.clienteId } });
        const pro = await tx.proyecto.findUnique({ where: { id: dist.proyectoId } });

        if (!cli || !pro) {
          throw new Error(`Cliente o Proyecto inválido en la distribución (${dist.clienteId}/${dist.proyectoId})`);
        }

        let cantPart: number;
        let totalPart: number;
        let hsPart: number | null = null;

        if (isLast) {
          cantPart = Math.max(0, Math.round((cantTotal - acumuladoCant) * 1000) / 1000);
          totalPart = Math.max(0, totalBase - acumuladoTotal);
          if (hsTotalNum != null) {
            hsPart = Math.max(0, Math.round((hsTotalNum - acumuladoHs) * 100) / 100);
          }
        } else {
          cantPart = Math.round(((cantTotal * pct) / 100) * 1000) / 1000;
          acumuladoCant += cantPart;

          totalPart = Math.round((totalBase * pct) / 100);
          acumuladoTotal += totalPart;

          if (hsTotalNum != null) {
            hsPart = Math.round(((hsTotalNum * pct) / 100) * 100) / 100;
            acumuladoHs += hsPart;
          }
        }

        const reg = await tx.registro.create({
          data: {
            id: generateId('reg'),
            clienteId: cli.id,
            clienteNombre: cli.nombre,
            proyectoId: pro.id,
            proyectoNombre: pro.nombre,
            fecha: new Date(registroBase.fecha || new Date().toISOString().substring(0, 10)),
            concepto: conceptoEnum as any,
            descripcion: `[Prorrateo ${pct}%] ${registroBase.descripcion}`,
            colaboradorId: registroBase.colaboradorId || null,
            hsInicio: registroBase.hsInicio ? String(registroBase.hsInicio).substring(0, 5) : null,
            hsFin: registroBase.hsFin ? String(registroBase.hsFin).substring(0, 5) : null,
            hsTotal: hsPart != null ? new Decimal(hsPart) : null,
            cantidad: new Decimal(cantPart),
            precioUnitario: new Decimal(precioUnit),
            total: new Decimal(totalPart),
            origen: 'MANUAL',
            modoInsumo: registroBase.modoInsumo || null,
            anchoCm: registroBase.anchoCm != null ? new Decimal(registroBase.anchoCm) : null,
            altoCm: registroBase.altoCm != null ? new Decimal(registroBase.altoCm) : null,
            desperdicioCalculado: Boolean(registroBase.desperdicioCalculado),
            porcentajeUsado: registroBase.porcentajeUsado != null ? new Decimal(registroBase.porcentajeUsado) : null,
            facturaCompraId: registroBase.facturaCompraId || null,
            prorrateoGrupoId: grupoId,
            porcentajeProrrateo: new Decimal(pct),
            fechaImportacion: new Date(),
          },
        });

        creados.push({
          id: reg.id,
          clienteId: reg.clienteId,
          clienteNombre: reg.clienteNombre,
          proyectoId: reg.proyectoId,
          proyectoNombre: reg.proyectoNombre,
          fecha: reg.fecha.toISOString().substring(0, 10),
          concepto: reg.concepto === 'INSUMO' ? 'Insumo' : 'MO',
          descripcion: reg.descripcion,
          colaboradorId: reg.colaboradorId || undefined,
          hsInicio: reg.hsInicio || undefined,
          hsFin: reg.hsFin || undefined,
          hsTotal: reg.hsTotal ? parseFloat(reg.hsTotal.toString()) : undefined,
          cantidad: parseFloat(reg.cantidad.toString()),
          precioUnitario: isOperario ? 0 : parseFloat(reg.precioUnitario.toString()),
          total: isOperario ? 0 : parseFloat(reg.total.toString()),
          origen: 'Manual',
        });
      }

      if (registroBase.facturaCompraId && cantTotal > 0) {
        await tx.facturaCompra.update({
          where: { id: registroBase.facturaCompraId },
          data: { cantidadUsada: { increment: cantTotal } },
        });
      }
    });

    auditLog({
      usuario: userPayload.usuario,
      accion: 'crear_prorrateo',
      recurso: `/api/registros/prorrateo`,
      resultado: 'success',
      ip: clientIp,
      detalle: `Prorrateo de ${distribucion.length} clientes para grupo ${grupoId}`,
    });

    res.status(201).json({
      success: true,
      message: `Actividad prorrateada exitosamente entre ${distribucion.length} clientes`,
      data: creados,
    } as ApiResponse);
  } catch (error: any) {
    logger.error('[REGISTROS PRORRATEO] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PRORRATEO_ERROR', message: error.message || 'Error al prorratear actividad' },
    } as ApiResponse);
  }
});
