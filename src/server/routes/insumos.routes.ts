/**
 * Insumos Routes — Catálogo de Insumos y Tarifas desde insumos.xlsx
 * Proporciona búsqueda, categorización y emparejamiento automático
 * de tarifas de impresión y desperdicio para taller y administración.
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';

export const insumosRouter = Router();

export interface InsumoCatalogoItem {
  id: string;
  nombre: string;
  costo: number;
  unidadMedida: string;
  categoria: string;
  proveedor?: string;
  costoDesperdicio?: number;
  esLona?: boolean;
  esImpresion?: boolean;
}

// Caché en memoria
let insumosCache: InsumoCatalogoItem[] = [];
let categoriasCache: string[] = [];
let lastLoadedTime: number = 0;

/**
 * Normaliza nombres para búsqueda y emparejamiento
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Carga y procesa el archivo insumos.xlsx desde la raíz del proyecto
 */
export function cargarInsumosDesdeExcel(): { insumos: InsumoCatalogoItem[]; categorias: string[] } {
  const rutaArchivo = path.resolve(process.cwd(), 'insumos.xlsx');

  if (!fs.existsSync(rutaArchivo)) {
    logger.warn(`[INSUMOS] No se encontró el archivo en: ${rutaArchivo}`);
    return { insumos: [], categorias: [] };
  }

  try {
    const workbook = XLSX.readFile(rutaArchivo);
    const primeraHoja = workbook.SheetNames[0] || 'Hoja1';
    const worksheet = workbook.Sheets[primeraHoja];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

    // 1. Mapeo inicial de ítems
    const items: InsumoCatalogoItem[] = rawData
      .map((row, idx) => {
        const nombre = String(row['Insumo'] || '').trim();
        if (!nombre) return null;

        const costoRaw = row['Costo'];
        const costo = typeof costoRaw === 'number' ? Math.round(costoRaw) : parseFloat(String(costoRaw).replace(',', '.')) || 0;
        const unidadMedida = String(row['Unidad Medida'] || 'unidad').trim();
        let categoria = String(row['Unidad'] || 'General').trim();

        // Normalizar nombres de categorías
        if (categoria === 'electricidad') categoria = 'Electricidad';
        if (categoria === 'Impresión') categoria = 'Impresiones';
        if (categoria === 'N/A' || categoria === '169000') categoria = 'General';

        // Detectar proveedor si está explícito en el nombre
        let proveedor: string | undefined = undefined;
        if (/serimax/i.test(nombre)) proveedor = 'Serimax';
        else if (/altatec/i.test(nombre)) proveedor = 'Altatec';

        const esLona = /lona/i.test(nombre);
        const esImpresion = /impresi|lona|vinil|adhesiv|microperf|rollup|banner/i.test(categoria + ' ' + nombre);

        return {
          id: `ins_${idx + 1}`,
          nombre,
          costo,
          unidadMedida,
          categoria,
          proveedor,
          esLona,
          esImpresion,
        } as InsumoCatalogoItem;
      })
      .filter((item): item is InsumoCatalogoItem => item !== null);

    // 2. Emparejamiento inteligente de tarifas de impresión y desperdicio
    // (Ej: "Lona x m (impresión) Serimax" <-> "Lona desperdicio Serimax")
    for (const item of items) {
      if (item.esImpresion && !/desperdicio|merma/i.test(item.nombre)) {
        // Buscar un ítem correspondiente de desperdicio con el mismo proveedor o tipo
        const matchingWaste = items.find(other => {
          if (!/desperdicio|merma/i.test(other.nombre)) return false;
          if (item.proveedor && other.proveedor) {
            return item.proveedor.toLowerCase() === other.proveedor.toLowerCase() &&
              ((item.esLona && other.esLona) || (!item.esLona && !other.esLona));
          }
          if (/esmerilado/i.test(item.nombre) && /esmerilado/i.test(other.nombre)) return true;
          if (/transparente/i.test(item.nombre) && /transparente/i.test(other.nombre)) return true;
          if (item.esLona && other.esLona) return true;
          return false;
        });

        if (matchingWaste) {
          item.costoDesperdicio = matchingWaste.costo;
        }
      }
    }

    // 3. Extraer categorías únicas ordenadas
    const categoriasSet = new Set<string>();
    items.forEach(i => {
      if (i.categoria) categoriasSet.add(i.categoria);
    });
    const categorias = Array.from(categoriasSet).sort((a, b) => a.localeCompare(b));

    insumosCache = items;
    categoriasCache = categorias;
    lastLoadedTime = Date.now();

    logger.info(`[INSUMOS] ${items.length} insumos cargados exitosamente desde insumos.xlsx (${categorias.length} categorías)`);
    return { insumos: items, categorias };
  } catch (error: any) {
    logger.error('[INSUMOS] Error al leer insumos.xlsx:', error);
    return { insumos: [], categorias: [] };
  }
}

/**
/**
 * Helper para verificar si un usuario tiene rol de operario
 */
export function esUsuarioOperario(user?: any): boolean {
  if (!user || !user.rol) return false;
  const r = String(user.rol).toUpperCase();
  return r === 'OPERADOR' || r === 'OPERARIO' || r.includes('OPER');
}

/**
 * Formatea un registro de Prisma a la interfaz esperada por el frontend
 * Si el usuario es operario, enmascara el costo y costo de desperdicio a 0 / undefined
 */
export function formatInsumoDb(i: any, isOperario: boolean = false): InsumoCatalogoItem & {
  activo?: boolean;
  notas?: string;
  anchoEstandar?: number;
  altoEstandar?: number;
  createdAt?: Date;
  updatedAt?: Date;
} {
  return {
    id: i.id,
    nombre: i.nombre,
    costo: isOperario ? 0 : Number(i.costo),
    unidadMedida: i.unidad,
    categoria: i.categoria,
    proveedor: i.proveedor || undefined,
    costoDesperdicio: isOperario ? undefined : (i.costoDesperdicio != null ? Number(i.costoDesperdicio) : undefined),
    esLona: Boolean(i.esLona),
    esImpresion: Boolean(i.esImpresion),
    anchoEstandar: i.anchoEstandar != null ? Number(i.anchoEstandar) : undefined,
    altoEstandar: i.altoEstandar != null ? Number(i.altoEstandar) : undefined,
    activo: Boolean(i.activo),
    notas: i.notas || undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

/**
 * Semilla inicial: Si la tabla insumos está vacía, puebla desde insumos.xlsx en PostgreSQL
 */
export async function seedInsumosIfEmpty(): Promise<void> {
  try {
    const count = await prisma.insumo.count();
    if (count > 0) {
      return;
    }

    logger.info('[INSUMOS SEED] Tabla vacía. Sembrando 261 insumos desde insumos.xlsx en PostgreSQL...');
    const { insumos } = cargarInsumosDesdeExcel();
    if (insumos.length === 0) return;

    await prisma.insumo.createMany({
      data: insumos.map(item => ({
        id: item.id,
        codigo: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        proveedor: item.proveedor || null,
        unidad: item.unidadMedida || 'm2',
        costo: item.costo,
        costoDesperdicio: item.costoDesperdicio ?? null,
        esLona: !!item.esLona,
        esImpresion: !!item.esImpresion,
        activo: true,
      })),
      skipDuplicates: true,
    });

    logger.info(`[INSUMOS SEED] ${insumos.length} insumos importados exitosamente a la base de datos.`);
  } catch (err: any) {
    logger.error('[INSUMOS SEED] Error durante la semilla de insumos:', err.message);
  }
}

// Esquemas de validación Zod para el CRUD
const insumoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  categoria: z.string().min(1, 'La categoría es requerida').max(100),
  costo: z.number().nonnegative('El costo debe ser mayor o igual a 0'),
  costoDesperdicio: z.number().nonnegative().optional().nullable(),
  proveedor: z.string().max(100).optional().nullable(),
  unidad: z.string().default('m2').optional(),
  esLona: z.boolean().default(false).optional(),
  esImpresion: z.boolean().default(false).optional(),
  anchoEstandar: z.number().optional().nullable(),
  altoEstandar: z.number().optional().nullable(),
  activo: z.boolean().default(true).optional(),
  notas: z.string().optional().nullable(),
});

/**
 * GET /api/insumos
 * Devuelve insumos desde PostgreSQL con soporte de búsqueda, categoría y estado
 */
insumosRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Asegurar semilla si la DB está vacía
    await seedInsumosIfEmpty();

    const { search, categoria, activo, limit, page } = req.query;

    const whereClause: any = {};

    // Filtro activo: 'all' muestra todos, 'false' solo inactivos, default solo activos
    if (activo === 'all') {
      // sin filtro de activo
    } else if (activo === 'false') {
      whereClause.activo = false;
    } else {
      whereClause.activo = true;
    }

    if (categoria && typeof categoria === 'string' && categoria !== 'Todas') {
      whereClause.categoria = { equals: categoria, mode: 'insensitive' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { proveedor: { contains: q, mode: 'insensitive' } },
        { categoria: { contains: q, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.insumo.count({ where: whereClause });

    const maxLimit = limit ? parseInt(String(limit), 10) : undefined;
    const currentPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
    const skip = maxLimit ? (currentPage - 1) * maxLimit : undefined;

    const itemsDb = await prisma.insumo.findMany({
      where: whereClause,
      orderBy: { nombre: 'asc' },
      take: maxLimit,
      skip,
    });

    // Categorías disponibles en la base de datos
    const distinctCats = await prisma.insumo.findMany({
      select: { categoria: true },
      distinct: ['categoria'],
      where: { activo: true },
      orderBy: { categoria: 'asc' },
    });
    const categorias = distinctCats.map(c => c.categoria).filter(Boolean);

    const isOperario = esUsuarioOperario(req.user);

    res.json({
      success: true,
      data: {
        insumos: itemsDb.map(i => formatInsumoDb(i, isOperario)),
        categorias,
        total,
        origen: 'POSTGRESQL',
      }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error al obtener insumos desde BD:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Error al consultar catálogo de insumos en la base de datos' }
    } as ApiResponse);
  }
});

/**
 * GET /api/insumos/lonas
 * Devuelve solo insumos de lonas e impresiones para calculadoras de taller
 */
insumosRouter.get('/lonas', requireAuth, async (req: Request, res: Response) => {
  try {
    await seedInsumosIfEmpty();

    const itemsDb = await prisma.insumo.findMany({
      where: {
        activo: true,
        OR: [
          { esLona: true },
          { esImpresion: true },
          { categoria: { in: ['Impresiones', 'Ploteo', 'Carteleria'] } }
        ]
      },
      orderBy: { nombre: 'asc' }
    });

    const isOperario = esUsuarioOperario(req.user);

    res.json({
      success: true,
      data: itemsDb.map(i => formatInsumoDb(i, isOperario))
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error al obtener lonas desde BD:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Error al consultar insumos de lonas' }
    } as ApiResponse);
  }
});

/**
 * GET /api/insumos/:id
 * Obtiene un insumo por ID
 */
insumosRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const item = await prisma.insumo.findUnique({
      where: { id: req.params.id }
    });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' }
      } as ApiResponse);
    }
    const isOperario = esUsuarioOperario(req.user);
    res.json({ success: true, data: formatInsumoDb(item, isOperario) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * POST /api/insumos
 * Crea un nuevo insumo en la base de datos (ADMIN ONLY)
 */
insumosRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = insumoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Datos de insumo inválidos'
        }
      } as ApiResponse);
    }

    const data = parsed.data;
    const nuevoId = `ins_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    // Auto-detectar flags si no fueron enviados explícitamente
    const esLona = data.esLona ?? /lona/i.test(data.nombre);
    const esImpresion = data.esImpresion ?? /impresi|lona|vinil|adhesiv|microperf|rollup|banner/i.test(data.categoria + ' ' + data.nombre);

    const created = await prisma.insumo.create({
      data: {
        id: nuevoId,
        codigo: nuevoId,
        nombre: data.nombre.trim(),
        categoria: data.categoria.trim(),
        proveedor: data.proveedor ? data.proveedor.trim() : null,
        unidad: data.unidad || 'm2',
        costo: data.costo,
        costoDesperdicio: data.costoDesperdicio ?? null,
        esLona,
        esImpresion,
        anchoEstandar: data.anchoEstandar ?? null,
        altoEstandar: data.altoEstandar ?? null,
        activo: data.activo !== false,
        notas: data.notas ? data.notas.trim() : null,
      }
    });

    auditLog({
      usuario: req.user!.usuario,
      accion: 'crear_insumo',
      recurso: `/api/insumos/${created.id}`,
      resultado: 'success',
      ip: getClientIp(req),
      detalle: `Insumo creado: ${created.nombre} (${created.categoria}) - Costo: ${created.costo}`
    });

    res.status(201).json({
      success: true,
      message: 'Insumo creado exitosamente en la base de datos',
      data: formatInsumoDb(created)
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error al crear insumo:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message || 'Error al crear insumo' }
    } as ApiResponse);
  }
});

/**
 * PUT /api/insumos/:id
 * Actualiza un insumo existente (ADMIN ONLY)
 */
insumosRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.insumo.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' }
      } as ApiResponse);
    }

    const partialSchema = insumoSchema.partial();
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Datos de actualización inválidos'
        }
      } as ApiResponse);
    }

    const data = parsed.data;
    const updated = await prisma.insumo.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.categoria !== undefined && { categoria: data.categoria.trim() }),
        ...(data.proveedor !== undefined && { proveedor: data.proveedor ? data.proveedor.trim() : null }),
        ...(data.unidad !== undefined && { unidad: data.unidad }),
        ...(data.costo !== undefined && { costo: data.costo }),
        ...(data.costoDesperdicio !== undefined && { costoDesperdicio: data.costoDesperdicio }),
        ...(data.esLona !== undefined && { esLona: data.esLona }),
        ...(data.esImpresion !== undefined && { esImpresion: data.esImpresion }),
        ...(data.anchoEstandar !== undefined && { anchoEstandar: data.anchoEstandar }),
        ...(data.altoEstandar !== undefined && { altoEstandar: data.altoEstandar }),
        ...(data.activo !== undefined && { activo: data.activo }),
        ...(data.notas !== undefined && { notas: data.notas ? data.notas.trim() : null }),
      }
    });

    auditLog({
      usuario: req.user!.usuario,
      accion: 'editar_insumo',
      recurso: `/api/insumos/${id}`,
      resultado: 'success',
      ip: getClientIp(req),
      detalle: `Insumo actualizado: ${updated.nombre} - Costo: ${updated.costo}`
    });

    res.json({
      success: true,
      message: 'Insumo actualizado exitosamente',
      data: formatInsumoDb(updated)
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error al actualizar insumo:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message || 'Error al actualizar insumo' }
    } as ApiResponse);
  }
});

/**
 * DELETE /api/insumos/:id
 * Desactiva (soft delete) o elimina permanentemente un insumo (ADMIN ONLY)
 */
insumosRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.insumo.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' }
      } as ApiResponse);
    }

    const hard = req.query.hard === 'true';

    if (hard) {
      await prisma.insumo.delete({ where: { id } });
      auditLog({
        usuario: req.user!.usuario,
        accion: 'eliminar_insumo_fisico',
        recurso: `/api/insumos/${id}`,
        resultado: 'success',
        ip: getClientIp(req),
        detalle: `Insumo eliminado permanentemente: ${existing.nombre}`
      });

      return res.json({
        success: true,
        message: 'Insumo eliminado permanentemente de la base de datos',
        data: { id, deleted: true }
      } as ApiResponse);
    }

    // Toggle de estado activo/inactivo
    const nuevoEstado = !existing.activo;
    const toggled = await prisma.insumo.update({
      where: { id },
      data: { activo: nuevoEstado }
    });

    auditLog({
      usuario: req.user!.usuario,
      accion: nuevoEstado ? 'activar_insumo' : 'desactivar_insumo',
      recurso: `/api/insumos/${id}`,
      resultado: 'success',
      ip: getClientIp(req),
      detalle: `Insumo ${nuevoEstado ? 'activado' : 'desactivado'}: ${existing.nombre}`
    });

    res.json({
      success: true,
      message: nuevoEstado ? 'Insumo activado exitosamente' : 'Insumo desactivado',
      data: formatInsumoDb(toggled)
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error al alternar estado de insumo:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message || 'Error al modificar insumo' }
    } as ApiResponse);
  }
});

/**
 * POST /api/insumos/sync
 * Sincroniza / re-importa desde insumos.xlsx hacia PostgreSQL (ADMIN ONLY)
 */
insumosRouter.post('/sync', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { insumos } = cargarInsumosDesdeExcel();
    if (insumos.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'No se encontró el archivo insumos.xlsx en la raíz' }
      } as ApiResponse);
    }

    let insertados = 0;
    let actualizados = 0;

    for (const item of insumos) {
      const existing = await prisma.insumo.findUnique({ where: { id: item.id } });
      if (existing) {
        await prisma.insumo.update({
          where: { id: item.id },
          data: {
            nombre: item.nombre,
            categoria: item.categoria,
            proveedor: item.proveedor || null,
            unidad: item.unidadMedida || 'm2',
            costo: item.costo,
            costoDesperdicio: item.costoDesperdicio ?? null,
            esLona: !!item.esLona,
            esImpresion: !!item.esImpresion,
          }
        });
        actualizados++;
      } else {
        await prisma.insumo.create({
          data: {
            id: item.id,
            codigo: item.id,
            nombre: item.nombre,
            categoria: item.categoria,
            proveedor: item.proveedor || null,
            unidad: item.unidadMedida || 'm2',
            costo: item.costo,
            costoDesperdicio: item.costoDesperdicio ?? null,
            esLona: !!item.esLona,
            esImpresion: !!item.esImpresion,
            activo: true,
          }
        });
        insertados++;
      }
    }

    auditLog({
      usuario: req.user!.usuario,
      accion: 'sync_insumos_excel_db',
      recurso: '/api/insumos/sync',
      resultado: 'success',
      ip: getClientIp(req),
      detalle: `Sincronizados en PostgreSQL: ${insertados} creados, ${actualizados} actualizados`
    });

    res.json({
      success: true,
      message: `Base de datos sincronizada: ${insertados} insumos creados, ${actualizados} actualizados`,
      data: { insertados, actualizados, total: insumos.length }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error sincronizando insumos con DB:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: 'Error al sincronizar insumos.xlsx con la base de datos' }
    } as ApiResponse);
  }
});

