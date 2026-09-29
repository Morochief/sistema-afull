/**
 * Users Routes — CRUD de usuarios (Admin)
 * Extraído de server.ts como parte del refactor a Express Routers.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, requireWriteAccess, hashPassword as hashPwd, mapDbRolToUi, mapUiRolToDb, userActiveCache } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse, JWTPayload, DatabaseState, RegistroItem } from '../../types.ts';
import { Decimal } from '@prisma/client/runtime/library';


import { authLimiter } from '../config/rate-limiters.ts';
import { validateSchema, PasswordComplexitySchema } from '../../../server-validation.ts';

export const usersRouter = Router();

usersRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.usuario.findMany({ orderBy: { createdAt: 'desc' } });
    const safeUsers = users.map(u => ({ id: u.id, username: u.username, nombre: u.nombre, email: u.email, rol: mapDbRolToUi(u.rol), colaboradorId: u.colaboradorId, activo: u.activo, createdAt: u.createdAt }));
    return res.json({ success: true, data: safeUsers });
  } catch (err: any) {
    logger.error('Error fetching users:', err);
    return res.status(500).json({ success: false, error: { message: 'Error al obtener usuarios' } });
  }
});

usersRouter.post('/', requireAuth, requireAdmin, authLimiter, async (req: Request, res: Response) => {
  const { username, nombre, email, password, rol, colaboradorId } = req.body;
  if (!username || !nombre || !password || !rol) return res.status(400).json({ success: false, error: { message: 'Datos obligatorios incompletos' } });
  if (!['Admin', 'Operario', 'Visor'].includes(rol)) return res.status(400).json({ success: false, error: { message: 'Rol inválido' } });
  const pwdValidation = PasswordComplexitySchema.safeParse(password);
  if (!pwdValidation.success) return res.status(400).json({ success: false, error: { message: pwdValidation.error.issues[0].message } });
  try {
    const existingUser = await prisma.usuario.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
    if (existingUser) return res.status(400).json({ success: false, error: { message: 'El nombre de usuario ya está registrado' } });
    if (colaboradorId) {
      const linkedUser = await prisma.usuario.findFirst({ where: { colaboradorId, activo: true } });
      if (linkedUser) return res.status(400).json({ success: false, error: { message: 'Este colaborador ya tiene una cuenta activa vinculada' } });
    }
    const passwordHash = await hashPwd(password);
    const dbRol = mapUiRolToDb(rol);
    const newUser = await prisma.usuario.create({ data: { username: username.toLowerCase().trim(), nombre: nombre.trim(), email: email ? email.trim() : null, passwordHash, rol: dbRol, colaboradorId: colaboradorId || null, activo: true } });
    auditLog({ usuario: (req as any).user?.usuario || 'admin', accion: 'create_user', recurso: `/api/users/${newUser.id}`, resultado: 'success', ip: getClientIp(req) });
    return res.status(201).json({ success: true, data: { id: newUser.id, username: newUser.username, nombre: newUser.nombre, rol: mapDbRolToUi(newUser.rol), colaboradorId: newUser.colaboradorId } });
  } catch (err: any) {
    logger.error('Error creating user:', err);
    return res.status(500).json({ success: false, error: { message: 'Error al crear usuario' } });
  }
});

usersRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const hard = req.query.hard === 'true';
  try {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    if (user.username.toLowerCase() === (req as any).user?.usuario?.toLowerCase()) return res.status(400).json({ success: false, error: { message: 'No puedes desactivar o eliminar tu propio usuario en sesión' } });
    if (hard) {
      await prisma.usuario.delete({ where: { id } });
      userActiveCache.delete(user.username.toLowerCase());
      auditLog({ usuario: (req as any).user?.usuario || 'admin', accion: 'delete_user_hard', recurso: `/api/users/${id}`, resultado: 'success', ip: getClientIp(req) });
      return res.json({ success: true, message: 'Usuario eliminado permanentemente de la base de datos' });
    }
    const updatedUser = await prisma.usuario.update({ where: { id }, data: { activo: !user.activo } });
    userActiveCache.delete(user.username.toLowerCase());
    auditLog({ usuario: (req as any).user?.usuario || 'admin', accion: updatedUser.activo ? 'activate_user' : 'deactivate_user', recurso: `/api/users/${id}`, resultado: 'success', ip: getClientIp(req) });
    return res.json({ success: true, message: updatedUser.activo ? 'Usuario activado con éxito' : 'Usuario desactivado con éxito', data: { activo: updatedUser.activo } });
  } catch (err: any) {
    logger.error('Error updating user active status:', err);
    return res.status(500).json({ success: false, error: { message: 'Error al actualizar estado del usuario' } });
  }
});

usersRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, nombre, email, password, rol, colaboradorId } = req.body;
  try {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    const updateData: any = {};
    if (nombre) updateData.nombre = nombre.trim();
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (rol) {
      if (!['Admin', 'Operario', 'Visor'].includes(rol)) return res.status(400).json({ success: false, error: { message: 'Rol inválido' } });
      updateData.rol = mapUiRolToDb(rol);
    }
    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername !== user.username) {
        const duplicate = await prisma.usuario.findFirst({ where: { username: { equals: cleanUsername, mode: 'insensitive' } } });
        if (duplicate) return res.status(400).json({ success: false, error: { message: 'El nombre de usuario ya está registrado' } });
        updateData.username = cleanUsername;
      }
    }
    if (colaboradorId !== undefined) {
      const targetColaboradorId = colaboradorId || null;
      if (targetColaboradorId && targetColaboradorId !== user.colaboradorId) {
        const linked = await prisma.usuario.findFirst({ where: { colaboradorId: targetColaboradorId, activo: true, id: { not: id } } });
        if (linked) return res.status(400).json({ success: false, error: { message: 'Este colaborador ya tiene una cuenta activa vinculada' } });
      }
      updateData.colaboradorId = targetColaboradorId;
    }
    if (password) {
      const pwdValidation = PasswordComplexitySchema.safeParse(password);
      if (!pwdValidation.success) return res.status(400).json({ success: false, error: { message: pwdValidation.error.issues[0].message } });
      updateData.passwordHash = await hashPwd(password);
    }
    const updatedUser = await prisma.usuario.update({ where: { id }, data: updateData });
    userActiveCache.delete(user.username.toLowerCase());
    if (updateData.username) userActiveCache.delete(updateData.username);
    auditLog({ usuario: (req as any).user?.usuario || 'admin', accion: 'update_user', recurso: `/api/users/${id}`, resultado: 'success', ip: getClientIp(req) });
    return res.json({ success: true, message: 'Usuario actualizado con éxito', data: { id: updatedUser.id, username: updatedUser.username, nombre: updatedUser.nombre, rol: mapDbRolToUi(updatedUser.rol), colaboradorId: updatedUser.colaboradorId } });
  } catch (err: any) {
    logger.error('Error updating user:', err);
    return res.status(500).json({ success: false, error: { message: 'Error al actualizar usuario' } });
  }
});
