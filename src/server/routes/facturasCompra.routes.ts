/**
 * Facturas de Compra Routes — Sistema aFull
 * Permite registrar facturas de compras de insumos/materiales (ej. ferretería, placas, tornillos)
 * y consumir fraccionadamente su stock en las actividades operativas.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';

export const facturasCompraRouter = Router();

const facturaCompraSchema = z.object({
  facturaNumero: z.string().min(1, 'El número de factura es obligatorio').max(50),
  proveedor: z.string().min(1, 'El proveedor es obligatorio').max(100),
  fecha: z.string().optional(),
  descripcion: z.string().min(1, 'La descripción es obligatoria').max(255),
  cantidadComprada: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad: z.string().default('u'),
  precioUnitario: z.number().nonnegative('El precio unitario no puede ser negativo'),
  total: z.number().nonnegative().optional(),
  notas: z.string().optional(),
});

function formatFacturaCompra(f: any) {
  const comprada = Number(f.cantidadComprada) || 0;
  const usada = Number(f.cantidadUsada) || 0;
  const disponible = Math.max(0, Math.round((comprada - usada) * 1000) / 1000);
  return {
    id: f.id,
    facturaNumero: f.facturaNumero,
    proveedor: f.proveedor,
    fecha: f.fecha ? new Date(f.fecha).toISOString() : new Date().toISOString(),
    descripcion: f.descripcion,
    cantidadComprada: comprada,
    cantidadUsada: usada,
    cantidadDisponible: disponible,
    unidad: f.unidad,
    precioUnitario: Number(f.precioUnitario) || 0,
    total: Number(f.total) || 0,
    notas: f.notas || null,
    createdAt: f.createdAt,
  };
}

/**
 * GET /api/facturas-compra
 * Lista facturas de compra disponibles
 */
facturasCompraRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { disponibles } = req.query;
    const facturas = await prisma.facturaCompra.findMany({
      orderBy: { fecha: 'desc' },
      take: 100,
    });

    let resultado = facturas.map(formatFacturaCompra);

    if (disponibles === 'true') {
      resultado = resultado.filter((f) => f.cantidadDisponible > 0);
    }

    res.json({
      success: true,
      data: resultado,
    } as ApiResponse);
  } catch (error: any) {
    logger.error('[FACTURAS COMPRA] Error fetching:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Error al obtener facturas' },
    } as ApiResponse);
  }
});

/**
 * POST /api/facturas-compra
 * Registra una nueva factura de compra de insumos (Admin)
 */
facturasCompraRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = facturaCompraSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Datos inválidos' },
      } as ApiResponse);
    }

    const {
      facturaNumero,
      proveedor,
      fecha,
      descripcion,
      cantidadComprada,
      unidad,
      precioUnitario,
      total,
      notas,
    } = parsed.data;

    const id = `fac_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const totalCalculado = total ?? Math.round(cantidadComprada * precioUnitario);

    const created = await prisma.facturaCompra.create({
      data: {
        id,
        facturaNumero: facturaNumero.trim(),
        proveedor: proveedor.trim(),
        fecha: fecha ? new Date(fecha) : new Date(),
        descripcion: descripcion.trim(),
        cantidadComprada,
        cantidadUsada: 0,
        unidad: unidad.trim(),
        precioUnitario,
        total: totalCalculado,
        notas: notas ? notas.trim() : null,
      },
    });

    auditLog({
      usuario: req.user!.usuario,
      accion: 'crear_factura_compra',
      recurso: `/api/facturas-compra/${created.id}`,
      resultado: 'success',
      ip: getClientIp(req),
      detalle: `Factura ${created.facturaNumero} (${created.proveedor}) - ${created.descripcion}`,
    });

    res.status(201).json({
      success: true,
      data: formatFacturaCompra(created),
      message: 'Factura de compra registrada exitosamente',
    } as ApiResponse);
  } catch (error: any) {
    logger.error('[FACTURAS COMPRA] Error creating:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message || 'Error al registrar factura' },
    } as ApiResponse);
  }
});

/**
 * DELETE /api/facturas-compra/:id
 * Elimina una factura de compra si no tiene consumos registrados
 */
facturasCompraRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.facturaCompra.findUnique({
      where: { id },
      include: { _count: { select: { registros: true } } },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Factura no encontrada' },
      } as ApiResponse);
    }

    if (existing._count.registros > 0 || Number(existing.cantidadUsada) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'IN_USE',
          message: 'No se puede eliminar la factura porque ya tiene consumos asignados a proyectos',
        },
      } as ApiResponse);
    }

    await prisma.facturaCompra.delete({ where: { id } });

    auditLog({
      usuario: req.user!.usuario,
      accion: 'eliminar_factura_compra',
      recurso: `/api/facturas-compra/${id}`,
      resultado: 'success',
      ip: getClientIp(req),
    });

    res.json({ success: true, message: 'Factura eliminada' } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message },
    } as ApiResponse);
  }
});
