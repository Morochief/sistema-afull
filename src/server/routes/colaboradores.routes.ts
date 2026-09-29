/**
 * Colaboradores Routes — CRUD de colaboradores con vinculación a usuarios
 * Extraído de server.ts como parte del refactor a Express Routers.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, hashPassword as hashPwd, mapDbRolToUi, mapUiRolToDb, userActiveCache } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';
import { generateId } from '../shared.ts';
import { PasswordComplexitySchema } from '../../../server-validation.ts';

export const colaboradoresRouter = Router();

colaboradoresRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { nombre, rol, tarifaSugerida, crearAcceso, username, password, rolAcceso, email, ci, cargo, departamento, jefeInmediato } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nombre requerido' } } as ApiResponse);
  if (crearAcceso) {
    if (!username || !password || !rolAcceso) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de acceso incompletos' } });
    if (!['Admin', 'Operario', 'Visor'].includes(rolAcceso)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rol de acceso inválido' } });
    const pwdValidation = PasswordComplexitySchema.safeParse(password);
    if (!pwdValidation.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: pwdValidation.error.issues[0].message } });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const colaborador = await tx.colaborador.create({ data: { id: generateId('col'), nombre: nombre.trim(), rol: rol?.trim() || null, tarifaSugerida: tarifaSugerida ? new Decimal(tarifaSugerida) : null, ci: ci?.trim() || null, cargo: cargo?.trim() || null, departamento: departamento?.trim() || null, jefeInmediato: jefeInmediato?.trim() || null } });
      let newUser = null;
      if (crearAcceso) {
        const cleanUser = username.toLowerCase().trim();
        const existingUser = await tx.usuario.findFirst({ where: { username: { equals: cleanUser, mode: 'insensitive' } } });
        if (existingUser) throw new Error('El nombre de usuario ya está registrado');
        const passwordHash = await hashPwd(password);
        const dbRol = mapUiRolToDb(rolAcceso);
        newUser = await tx.usuario.create({ data: { username: cleanUser, nombre: nombre.trim(), email: email ? email.trim() : null, passwordHash, rol: dbRol, colaboradorId: colaborador.id, activo: true } });
      }
      return { colaborador, usuario: newUser };
    });
    auditLog({ usuario: req.user!.usuario, accion: 'create_colaborador', recurso: `/api/colaboradores/${result.colaborador.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { ...result.colaborador, tarifaSugerida: result.colaborador.tarifaSugerida ? parseFloat(result.colaborador.tarifaSugerida.toString()) : 0, usuario: result.usuario ? { id: result.usuario.id, username: result.usuario.username, nombre: result.usuario.nombre, email: result.usuario.email, rol: mapDbRolToUi(result.usuario.rol), activo: result.usuario.activo } : null }, message: 'Colaborador creado con éxito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error creating colaborador:', error);
    res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message || 'Error al crear colaborador' } } as ApiResponse);
  }
});

colaboradoresRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, rol, tarifaSugerida, hasAcceso, username, password, rolAcceso, email, activoAcceso, ci, cargo, departamento, jefeInmediato } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nombre requerido' } } as ApiResponse);
  try {
    const existing = await prisma.colaborador.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador no encontrado' } } as ApiResponse);
    const result = await prisma.$transaction(async (tx) => {
      const updatedColaborador = await tx.colaborador.update({ where: { id }, data: { nombre: nombre.trim(), rol: rol?.trim() || existing.rol, tarifaSugerida: tarifaSugerida ? new Decimal(tarifaSugerida) : existing.tarifaSugerida, ci: ci?.trim() || existing.ci, cargo: cargo?.trim() || existing.cargo, departamento: departamento?.trim() || existing.departamento, jefeInmediato: jefeInmediato?.trim() || existing.jefeInmediato } });
      const existingUser = await tx.usuario.findFirst({ where: { colaboradorId: id } });
      let linkedUser = null;
      if (hasAcceso) {
        if (!username?.trim() || !rolAcceso) throw new Error('Datos de acceso incompletos');
        const cleanUser = username.toLowerCase().trim();
        if (existingUser) {
          if (cleanUser !== existingUser.username) {
            const dup = await tx.usuario.findFirst({ where: { username: { equals: cleanUser, mode: 'insensitive' }, id: { not: existingUser.id } } });
            if (dup) throw new Error('El nombre de usuario ya está registrado');
          }
          const updateData: any = { username: cleanUser, nombre: nombre.trim(), email: email ? email.trim() : null, rol: mapUiRolToDb(rolAcceso), activo: activoAcceso !== false };
          if (password) {
            const pwdValidation = PasswordComplexitySchema.safeParse(password);
            if (!pwdValidation.success) throw new Error(pwdValidation.error.issues[0].message);
            updateData.passwordHash = await hashPwd(password);
          }
          linkedUser = await tx.usuario.update({ where: { id: existingUser.id }, data: updateData });
          userActiveCache.delete(existingUser.username.toLowerCase());
          userActiveCache.delete(cleanUser);
        } else {
          if (!password) throw new Error('La contraseña es obligatoria para el nuevo acceso');
          const pwdValidation = PasswordComplexitySchema.safeParse(password);
          if (!pwdValidation.success) throw new Error(pwdValidation.error.issues[0].message);
          const dup = await tx.usuario.findFirst({ where: { username: { equals: cleanUser, mode: 'insensitive' } } });
          if (dup) throw new Error('El nombre de usuario ya está registrado');
          const passwordHash = await hashPwd(password);
          linkedUser = await tx.usuario.create({ data: { username: cleanUser, nombre: nombre.trim(), email: email ? email.trim() : null, passwordHash, rol: mapUiRolToDb(rolAcceso), colaboradorId: id, activo: true } });
        }
      } else {
        if (existingUser) {
          await tx.usuario.delete({ where: { id: existingUser.id } });
          userActiveCache.delete(existingUser.username.toLowerCase());
        }
      }
      return { colaborador: updatedColaborador, usuario: linkedUser };
    });
    auditLog({ usuario: req.user!.usuario, accion: 'update_colaborador', recurso: `/api/colaboradores/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { ...result.colaborador, tarifaSugerida: result.colaborador.tarifaSugerida ? parseFloat(result.colaborador.tarifaSugerida.toString()) : 0, usuario: result.usuario ? { id: result.usuario.id, username: result.usuario.username, nombre: result.usuario.nombre, email: result.usuario.email, rol: mapDbRolToUi(result.usuario.rol), activo: result.usuario.activo } : null }, message: 'Colaborador actualizado con éxito' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error updating colaborador:', error);
    res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message || 'Error al actualizar colaborador' } } as ApiResponse);
  }
});

colaboradoresRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.colaborador.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador no encontrado' } } as ApiResponse);
    await prisma.$transaction(async (tx) => {
      const linkedUser = await tx.usuario.findFirst({ where: { colaboradorId: id } });
      if (linkedUser) {
        await tx.usuario.delete({ where: { id: linkedUser.id } });
        userActiveCache.delete(linkedUser.username.toLowerCase());
      }
      await tx.colaborador.delete({ where: { id } });
    });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_colaborador', recurso: `/api/colaboradores/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Colaborador eliminado' } as ApiResponse);
  } catch (error: any) {
    logger.error('Error deleting colaborador:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar colaborador.' } } as ApiResponse);
  }
});
