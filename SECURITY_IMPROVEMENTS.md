# Plan de Mejoras - Seguridad, Backend y UX
**Status: PROPUESTA** | Fecha: 2026-06-15 | Versión: 1.0

---

## 📊 ESTADO ACTUAL
- **Seguridad:** 3/10 (Vulnerabilidades críticas)
- **Backend:** 5/10 (Buen schema, lógica débil)
- **UX:** 7/10 (Visual moderno, accesibilidad incompleta)
- **Puntuación General:** 4.5/10 (NO LISTO PARA PRODUCCIÓN)

---

## 🔐 FASE 1: SEGURIDAD CRÍTICA (Semana 1)

### 1.1 Gestión de Secretos
**Problema:** Credenciales en `.env` público  
**Impacto:** Acceso no autorizado a BD  
**Solución:** Variables de entorno en `.env.local` (no versionado)

```bash
# Paso 1: Crear .env.local (NUNCA hacer commit)
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Paso 2: Si ya está en git, eliminar histórico
git rm -r --cached .env .env.local
git commit -m "Remove: sensitive credentials from version control"
```

**Archivos a crear:**
- `.env.local` - Variables locales (desarrollo)
- `.env.example` - Template sin valores

```bash
# .env.example (SEGURO DE COMPARTIR)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
DIRECT_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

---

### 1.2 Autenticación con Contraseña
**Problema:** Sin verificación de contraseña  
**Impacto:** Cualquiera puede acceder como cualquier usuario

**Instalación:**
```bash
npm install bcrypt @types/bcrypt
```

**Actualizar Schema (prisma/schema.prisma):**
```prisma
model Colaboradores {
  id              String   @id @default(cuid())
  nombre          String   @unique
  email           String?  @unique
  password        String   @db.Char(60)  // bcrypt hash
  activo          Boolean  @default(true)
  rol             String   @default("usuario")  // "admin", "jefe", "usuario"
  creado_en       DateTime @default(now())
  actualizado_en  DateTime @updatedAt
  
  registros       Registros[]
  logs            LogsAuditoria[]
  
  @@map("colaboradores")
}

// Agregar tabla de sesiones
model Sesiones {
  id             String   @id @default(cuid())
  colaborador_id String
  token_refresh  String
  expires_at     DateTime
  creado_en      DateTime @default(now())
  
  colaborador    Colaboradores @relation(fields: [colaborador_id], references: [id], onDelete: Cascade)
  
  @@map("sesiones")
}
```

**Nuevo archivo: `src/lib/auth.ts` (mejorado):**
```typescript
import bcrypt from 'bcrypt'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production')
    }
    return 'dev-secret-key-change-me'
  })()
)

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-key'
)

export interface UserPayload {
  colaborador_id: string
  nombre: string
  rol: string
  type: 'access' | 'refresh'
}

// ✅ Hash contraseña
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres')
  }
  return bcrypt.hash(password, 12)
}

// ✅ Verificar contraseña
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ✅ Crear access token (corta duración)
export async function signAccessToken(payload: Omit<UserPayload, 'type'>) {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')  // 1 hora
    .sign(JWT_SECRET)
}

// ✅ Crear refresh token (larga duración)
export async function signRefreshToken(payload: Omit<UserPayload, 'type'>) {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')  // 7 días
    .sign(JWT_REFRESH_SECRET)
}

// ✅ Verificar token
export async function verifyToken(
  token: string,
  type: 'access' | 'refresh' = 'access'
): Promise<UserPayload | null> {
  try {
    const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET
    const verified = await jwtVerify(token, secret)
    
    if (verified.payload.type !== type) {
      return null
    }
    
    return verified.payload as UserPayload
  } catch {
    return null
  }
}

// ✅ Obtener usuario desde cookies
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) return null

  return verifyToken(token)
}

// ✅ Logout - eliminar cookies
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}
```

**Nueva acción: `src/app/actions/auth.ts` (reemplazar):**
```typescript
'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  hashPassword,
  verifyToken
} from '@/lib/auth'

export async function register(nombre: string, email: string, password: string) {
  try {
    // Validar input
    if (!nombre.trim() || !email.trim() || !password) {
      return { error: 'Todos los campos son requeridos' }
    }

    if (password.length < 8) {
      return { error: 'La contraseña debe tener al menos 8 caracteres' }
    }

    // Verificar si existe
    const existing = await prisma.colaboradores.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } }
    })

    if (existing) {
      return { error: 'El usuario ya existe' }
    }

    // Hash y guardar
    const hashedPassword = await hashPassword(password)
    const colaborador = await prisma.colaboradores.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        rol: 'usuario'
      }
    })

    // Auditoría
    await prisma.logsAuditoria.create({
      data: {
        colaborador_id: colaborador.id,
        accion: 'REGISTRO_NUEVO_USUARIO',
        tabla_afectada: 'colaboradores',
        registro_id: colaborador.id,
        cambios: { email: colaborador.email }
      }
    })

    return { success: true, colaborador_id: colaborador.id }
  } catch (error) {
    console.error('[REGISTER_ERROR]', error)
    return { error: 'Error al registrar usuario' }
  }
}

export async function login(nombre: string, password: string) {
  try {
    // Validar input
    if (!nombre.trim() || !password) {
      return { error: 'Usuario y contraseña requeridos' }
    }

    // Buscar usuario
    const colaborador = await prisma.colaboradores.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        activo: true
      }
    })

    if (!colaborador) {
      // Respuesta genérica para no revelar si existe el usuario
      return { error: 'Credenciales inválidas' }
    }

    // Verificar contraseña
    const validPassword = await verifyPassword(password, colaborador.password)
    if (!validPassword) {
      return { error: 'Credenciales inválidas' }
    }

    // Crear tokens
    const accessToken = await signAccessToken({
      colaborador_id: colaborador.id,
      nombre: colaborador.nombre,
      rol: colaborador.rol
    })

    const refreshToken = await signRefreshToken({
      colaborador_id: colaborador.id,
      nombre: colaborador.nombre,
      rol: colaborador.rol
    })

    // Guardar refresh token en BD
    await prisma.sesiones.create({
      data: {
        colaborador_id: colaborador.id,
        token_refresh: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    // Auditoría
    await prisma.logsAuditoria.create({
      data: {
        colaborador_id: colaborador.id,
        accion: 'LOGIN_EXITOSO',
        tabla_afectada: 'sesiones',
        registro_id: colaborador.id
      }
    })

    // Guardar en cookies
    const cookieStore = await cookies()
    cookieStore.set({
      name: 'access_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60  // 1 hora
    })

    cookieStore.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60  // 7 días
    })

    return { success: true, colaborador_id: colaborador.id, nombre: colaborador.nombre }
  } catch (error) {
    console.error('[LOGIN_ERROR]', error)
    return { error: 'Error al iniciar sesión' }
  }
}
```

---

### 1.3 Validación de Input con Zod
**Problema:** Validación manual, inconsistente  
**Solución:** Schema validation centralizado

```bash
npm install zod
```

**Nuevo archivo: `src/lib/schemas.ts`:**
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128)
})

export const createProyectoSchema = z.object({
  nombre: z.string().min(3).max(200),
  cliente_id: z.string().uuid('Cliente ID inválido'),
  presupuesto: z.number().positive().optional(),
  fecha_inicio: z.date().optional(),
  fecha_fin: z.date().optional(),
  descripcion: z.string().max(1000).optional()
})

export const createRegistroSchema = z.object({
  proyecto_id: z.string().uuid(),
  insumo_id: z.string().uuid().optional(),
  colaborador_id: z.string().uuid().optional(),
  cantidad: z.number().positive('Cantidad debe ser positiva'),
  fecha: z.date(),
  observaciones: z.string().max(500).optional()
})

// Validar en server actions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    return { error: result.error.errors[0]?.message || 'Validación fallida' }
  }
  return { data: result.data }
}
```

---

### 1.4 Rate Limiting en Login
**Problema:** Ataques de fuerza bruta sin protección  
**Solución:** Limitar intentos por IP

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Actualizar `src/app/actions/auth.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Solo en producción
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })
  : null

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 intentos/hora
      analytics: true
    })
  : null

export async function login(nombre: string, password: string, clientIp?: string) {
  try {
    // Rate limiting
    if (loginLimiter && clientIp) {
      const { success } = await loginLimiter.limit(clientIp)
      if (!success) {
        return { error: 'Demasiados intentos. Intenta más tarde.' }
      }
    }

    // ... resto del login
  } catch (error) {
    // ...
  }
}
```

---

## 🏗️ FASE 2: BACKEND ROBUSTO (Semana 2)

### 2.1 Autorización basada en Roles
**Problema:** Sin control de acceso  
**Solución:** Middleware de roles

**Archivo: `src/lib/auth-middleware.ts`:**
```typescript
import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type UserRole = 'admin' | 'jefe_proyecto' | 'usuario'

export async function requireRole(requiredRoles: UserRole[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('No autenticado')
  }
  
  if (!requiredRoles.includes(user.rol as UserRole)) {
    throw new Error('Permiso denegado')
  }
  
  return user
}

export function withAuth(fn: Function) {
  return async (...args: any[]) => {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'No autenticado' }
    }
    return fn(...args, user)
  }
}

export function withRole(requiredRoles: UserRole[], fn: Function) {
  return async (...args: any[]) => {
    try {
      const user = await requireRole(requiredRoles)
      return fn(...args, user)
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Error' }
    }
  }
}
```

**Usar en acciones:**
```typescript
export const deleteProyecto = withRole(['admin', 'jefe_proyecto'], 
  async (id: string, user) => {
    const proyecto = await prisma.proyectos.findUnique({
      where: { id }
    })
    
    if (!proyecto) {
      return { error: 'Proyecto no encontrado' }
    }
    
    // Verificar que solo admin o dueño puedan eliminar
    if (user.rol !== 'admin') {
      return { error: 'Sin permiso' }
    }
    
    await prisma.proyectos.delete({ where: { id } })
    return { success: true }
  }
)
```

---

### 2.2 Auditoría Activa
**Problema:** Sin registro de cambios  
**Solución:** Log cada acción importante

**Actualizar schema:**
```prisma
model LogsAuditoria {
  id               String   @id @default(cuid())
  colaborador_id   String
  accion           String   // LOGIN, CREATE_PROYECTO, UPDATE_CLIENTE, etc.
  tabla_afectada   String   // proyectos, clientes, etc.
  registro_id      String   // ID del registro modificado
  cambios          Json?    // Diferencia antes/después
  ip_address       String?
  user_agent       String?
  creado_en        DateTime @default(now())
  
  colaborador      Colaboradores @relation(fields: [colaborador_id], references: [id])
  
  @@index([colaborador_id, creado_en])
  @@index([tabla_afectada])
  @@map("logs_auditoria")
}
```

**Helper: `src/lib/audit.ts`:**
```typescript
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function logAction(
  colaborador_id: string,
  accion: string,
  tabla_afectada: string,
  registro_id: string,
  cambios?: Record<string, any>
) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim()
  const userAgent = headersList.get('user-agent')

  return prisma.logsAuditoria.create({
    data: {
      colaborador_id,
      accion,
      tabla_afectada,
      registro_id,
      cambios: cambios || null,
      ip_address: ip,
      user_agent: userAgent
    }
  })
}
```

**Usar en acciones:**
```typescript
export const createProyecto = withAuth(async (data, user) => {
  const proyecto = await prisma.proyectos.create({
    data: {
      nombre: data.nombre,
      cliente_id: data.clienteId
    }
  })
  
  await logAction(user.colaborador_id, 'CREATE_PROYECTO', 'proyectos', proyecto.id, {
    nombre: proyecto.nombre,
    cliente_id: proyecto.cliente_id
  })
  
  return { success: true, proyecto }
})
```

---

### 2.3 Transacciones Explícitas
**Problema:** Operaciones multi-paso sin garantía de consistencia

```typescript
export const createProyectoConInsumos = withAuth(async (data, user) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Crear proyecto
      const proyecto = await tx.proyectos.create({
        data: {
          nombre: data.nombre,
          cliente_id: data.clienteId
        }
      })

      // Agregar insumos
      if (data.insumos?.length) {
        await tx.proyectoInsumos.createMany({
          data: data.insumos.map(insumo => ({
            proyecto_id: proyecto.id,
            insumo_id: insumo.id,
            cantidad_requerida: insumo.cantidad
          }))
        })
      }

      return proyecto
    })

    await logAction(user.colaborador_id, 'CREATE_PROYECTO', 'proyectos', result.id)
    return { success: true, proyecto: result }
  } catch (error) {
    console.error('Transaction failed:', error)
    return { error: 'Error al crear proyecto' }
  }
})
```

---

### 2.4 Soft Deletes
**Problema:** Datos eliminados permanentemente, sin auditoría

```prisma
model Proyectos {
  id           String   @id @default(cuid())
  nombre       String
  deleted_at   DateTime?  // Soft delete
  // ... otros campos
}
```

**Helper:**
```typescript
export async function softDelete(table: string, id: string) {
  return prisma[table].update({
    where: { id },
    data: { deleted_at: new Date() }
  })
}

// En queries, excluir soft deleted
export async function getProyectos() {
  return prisma.proyectos.findMany({
    where: { deleted_at: null }
  })
}
```

---

### 2.5 Mejor Manejo de Errores
**Problema:** Errores genéricos o exponen detalles internos

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
  }
}

// Usar:
export async function createProyecto(data, user) {
  try {
    if (!data.nombre) {
      throw new AppError('Nombre es requerido', 400, 'INVALID_NAME')
    }

    const cliente = await prisma.clientes.findUnique({
      where: { id: data.clienteId }
    })

    if (!cliente) {
      throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND')
    }

    // ... crear proyecto
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message, code: error.code }
    }
    
    console.error('Unexpected error:', error)
    return { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
  }
}
```

---

## 🎨 FASE 3: UX/UI MEJORADO (Semana 3)

### 3.1 Accesibilidad WCAG AA
**Problema:** Contraste bajo, falta de labels, navegación incompleta

**Cambios en componentes:**

```typescript
// src/components/projects-table.tsx - ANTES
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Cliente</TableHead>
```

// DESPUÉS
<Table role="table">
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Nombre</TableHead>
      <TableHead scope="col">Cliente</TableHead>
```

**Fix de contraste:**
```typescript
// ANTES: text-sidebar-foreground/40 (40% opacidad = contraste bajo)
// DESPUÉS:
<p className="text-foreground/70">Subtítulo con buen contraste</p>

// Verificar con WAVE: https://wave.webaim.org/
```

**Agregar landmarks semánticos:**
```typescript
// src/app/(dashboard)/page.tsx
export default function Dashboard() {
  return (
    <>
      <header>
        <AppHeader />
      </header>
      
      <div className="flex flex-1">
        <aside aria-label="Navegación principal">
          <DashboardSidebar />
        </aside>
        
        <main className="flex-1 p-8">
          <h1>Dashboard</h1>
          {/* Contenido */}
        </main>
      </div>
    </>
  )
}
```

---

### 3.2 Dark Mode Activado
**Problema:** CSS existe pero no está activado

**`src/app/layout.tsx`:**
```typescript
import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Nuevo componente: `src/components/theme-provider.tsx`:**
```typescript
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ReactNode } from 'react'

export function ThemeProvider({ children, ...props }: { children: ReactNode }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```bash
npm install next-themes
```

---

### 3.3 Mejor Feedback de Carga
**Problema:** Spinners limitados, sin estados claros

```typescript
// src/components/ui/loading-state.tsx
export function LoadingState({ 
  message = 'Cargando...',
  size = 'md'
}: { message?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className={`animate-spin rounded-full border-4 border-muted border-t-primary ${
        size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
      }`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// Usar:
{isPending ? (
  <LoadingState message="Ingresando al sistema..." />
) : (
  <Button>Ingresar</Button>
)}
```

---

### 3.4 Confirmaciones Mejoradas
**Problema:** Sin confirmación antes de acciones destructivas

```typescript
// src/components/delete-confirm-dialog.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  isLoading,
}: {
  title: string
  description: string
  onConfirm: () => void
  isLoading?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Eliminar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading} className="bg-destructive">
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

### 3.5 Validación Mejorada en Forms
**Problema:** Errores confusos, sin formato claro

```typescript
// src/components/form-field.tsx
export function FormField({
  label,
  error,
  required,
  children,
  description,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex gap-1">
        {label}
        {required && <span className="text-destructive" aria-label="requerido">*</span>}
      </label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && (
        <p className="text-sm font-medium text-destructive flex items-center gap-1" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}

// Usar:
<FormField label="Nombre del Proyecto" required error={errors.nombre} description="Entre 3 y 200 caracteres">
  <Input {...register('nombre')} />
</FormField>
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ Semana 1: Seguridad
- [ ] Remover `.env` de git
- [ ] Instalar bcrypt
- [ ] Actualizar schema con `password` y `sesiones`
- [ ] Implementar `hashPassword` y `verifyPassword`
- [ ] Crear `signAccessToken` y `signRefreshToken`
- [ ] Reemplazar `login` con validación de contraseña
- [ ] Instalar zod
- [ ] Crear `schemas.ts` con validaciones
- [ ] Instalar y configurar rate limiting
- [ ] Probar login con credenciales
- [ ] Probar rate limiting

### ✅ Semana 2: Backend
- [ ] Crear middleware de roles (`withRole`, `withAuth`)
- [ ] Actualizar todas las acciones con autorización
- [ ] Activar tabla `logs_auditoria`
- [ ] Crear helper `logAction()`
- [ ] Agregar logs a acciones CRUD
- [ ] Implementar transacciones en operaciones multi-step
- [ ] Agregar soft deletes (added `deleted_at`)
- [ ] Mejorar error handling con `AppError`
- [ ] Crear endpoints para auditoría admin
- [ ] Probar que logs se registran

### ✅ Semana 3: UX
- [ ] Actualizar componentes con `scope="col"` en tablas
- [ ] Verificar contraste con WAVE
- [ ] Agregar landmarks semánticos (`<main>`, `<aside>`)
- [ ] Implementar `ThemeProvider` para dark mode
- [ ] Instalar `next-themes`
- [ ] Crear componente `LoadingState`
- [ ] Actualizar forms con `LoadingState`
- [ ] Crear `DeleteConfirmDialog`
- [ ] Actualizar deletes para usar confirmación
- [ ] Crear `FormField` componente
- [ ] Mejorar validación visual en forms
- [ ] Probar accesibilidad con screen reader
- [ ] Pruebas en móvil

---

## 🚀 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
DÍA 1-2: Seguridad básica
├─ Credenciales → .env.local
├─ Contraseña hasheada
└─ Validación con Zod

DÍA 3-4: Autenticación completa
├─ Access/Refresh tokens
├─ Rate limiting
└─ Pruebas de login

DÍA 5-6: Autorización
├─ Roles y permisos
├─ Middleware de roles
└─ Restricción de acciones

DÍA 7-8: Auditoría
├─ Tabla logs actualizada
├─ Helpers de logging
└─ Registro en todas las acciones

DÍA 9: Backend robusto
├─ Transacciones
├─ Soft deletes
└─ Mejor error handling

DÍA 10-12: UX mejorado
├─ Accesibilidad WCAG
├─ Dark mode
├─ Loading states
└─ Confirmaciones

DÍA 13: Testing completo
├─ Seguridad
├─ Funcionalidad
└─ UX
```

---

## 📊 MATRIZ DE IMPACTO

| Mejora | Impacto | Esfuerzo | Prioridad |
|--------|---------|----------|-----------|
| Contraseñas | 🔴 CRÍTICO | 2h | 1 |
| Validación Input | 🔴 CRÍTICO | 3h | 2 |
| Autorización | 🟠 ALTO | 4h | 3 |
| Auditoría | 🟠 ALTO | 3h | 4 |
| Rate Limiting | 🟠 ALTO | 2h | 5 |
| Transacciones | 🟡 MEDIO | 2h | 6 |
| Accesibilidad | 🟡 MEDIO | 4h | 7 |
| Dark Mode | 🟢 BAJO | 1h | 8 |
| UX Polish | 🟢 BAJO | 3h | 9 |

---

## 🎯 MÉTRICAS DE ÉXITO

Después de implementar:

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| Seguridad | 3/10 | 8/10 | 8+ |
| Backend | 5/10 | 8/10 | 8+ |
| UX | 7/10 | 8.5/10 | 8+ |
| **Total** | **4.5/10** | **8/10** | **8+** ✅ |

---

**Próximo paso:** ¿Empezamos por la Semana 1 (Seguridad)?
