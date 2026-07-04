# sistema-afull-workflow

Protocolo oficial de cambios para Sistema aFull. Todo cambio debe seguir este flujo secuencial.

## 1. Pre-Flight Checklist

- [ ] Leer `prisma/schema.prisma` si el cambio toca DB
- [ ] Leer `.env.local` para credenciales actuales (Prisma CLI usa `.env`, no `.env.local`)
- [ ] Identificar el tipo de cambio en la tabla de abajo
- [ ] Leer `.agents/AGENTS.md` sección del subsistema afectado

## 2. Matriz de Tipos de Cambio

| Tipo | Ejemplos | Schema? | DB Push? | Frontend? |
|------|----------|---------|----------|-----------|
| Schema-only | Nuevo modelo, nuevo campo, nuevo enum | ✅ | ✅ | ❌ |
| FK/Relation | Agregar/sacar @relation, magic IDs | ✅ | ✅ (--accept-data-loss) | ❌ |
| Precision | Decimal(10,2) → Decimal(10,4) | ✅ | ✅ (--accept-data-loss) | ❌ |
| Backend logic | Nuevo endpoint, regla de negocio | ❌ | ❌ | ❌ |
| Frontend UI | Componente, formulario, display | ❌ | ❌ | ✅ |
| Full subsystem | Nueva feature (ambas capas) | ✅ | ✅ | ✅ |

## 3. Flujo Completo (Orden Obligatorio)

### Paso 1: Schema
- Editar `prisma/schema.prisma`
- Magic IDs (Lesson 33): omitir `@relation` en modelos con valores centinela
- Nuevos enums: usar `@map()` para display values
- Precisión numérica: siempre 4 decimales para cantidades de insumos
- Usar `@@index()` para performance, `@@map()` para snake_case

### Paso 2: Sync Types
```bash
npx prisma generate
```
- Actualizar `src/types.ts` si cambiaron tipos de Prisma
- Actualizar schemas Zod (`server-validation.ts`) para que coincidan

### Paso 3: Database Migration
⚠️ **Prisma CLI lee `.env`, no `.env.local`** — hay que inyectar variables:

```powershell
$env:DATABASE_URL="postgresql://postgres.opscthfkeqlqyrfvafmv:Mjjagkaz012.@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"; `
$env:DIRECT_URL="postgresql://postgres.opscthfkeqlqyrfvafmv:Mjjagkaz012.@aws-1-us-east-2.pooler.supabase.com:5432/postgres"; `
npx prisma db push --accept-data-loss
```

**Verificar post-push:**
- [ ] `--accept-data-loss` no reseteó defaults de columna (Lesson 15)
- [ ] IDs vinculados no quedaron huérfanos (Lesson 19)
- [ ] FK constraints no bloquean valores centinela (Lesson 33)

### Paso 4: Backend
- Usar `{ prisma }` de `src/lib/prisma.ts` — nunca crear otro PrismaClient (Lesson 1)
- Mutaciones: siempre `requireAuth` + `requireWriteAccess` (Lesson 23)
- Schemas Zod en `server-validation.ts` deben coincidir con Prisma
- Traducción de enums DB a UI con `mapDbRolToUi / mapUiRolToDb` (Lesson B)

### Paso 5: Frontend
- ✅ Verificar imports de React: `import { useState, useEffect, useMemo, useCallback } from 'react'` — incluir TODOS los hooks usados
- Mutaciones visibles en múltiples tabs: pasar `onRefresh` desde App.tsx (Lesson 34)
- `NotifProvider` para toasts — nunca `alert()` / `confirm()` (Lesson A)
- Cache Buster `?t=timestamp` para URLs de Supabase Storage
- Formularios de edición deben coincidir con creación (Lesson 36)
- Operaciones críticas: obtener datos del servidor, no del estado local (Lesson 41)

### Paso 6: Build
```bash
npm run build
```
Build script: `prisma generate && vite build && esbuild server.ts ...`

### Paso 7: Lecciones Aprendidas
Si encontraste un problema nuevo, agregar lección en `.agents/AGENTS.md` siguiendo el formato: **Problema/Regla/Solución/Síntoma**.

## 4. Errores Comunes

| # | Riesgo | Prevención |
|---|--------|------------|
| 1 | `prisma generate` no crea tablas | Seguir con `prisma db push` (Lesson 8) |
| 2 | `db push --accept-data-loss` resetea defaults | Verificar + restaurar después del push (Lesson 15) |
| 3 | IDs centinela violan FK | Omitir `@relation` cuando se usan magic IDs (Lesson 33) |
| 4 | esbuild renombra PrismaClient2 | Usar singleton de `prisma.ts`, nunca `new PrismaClient()` (Lesson 1) |
| 5 | Prisma CLI no encuentra .env.local | Inyectar `DATABASE_URL` y `DIRECT_URL` en PowerShell (Lesson M) |
| 6 | CRLF vs LF en scripts de reemplazo | Usar `git diff` para verificar, no confiar en scripts (Lessons 20-22) |
| 7 | `onRefresh` no definido en hooks | Pasar explícitamente como parámetro (Lesson 40) |
| 8 | Estado local corrupto para km inicial | Obtener del servidor al momento de la acción (Lesson 41) |
| 9 | Formulario de edición desincronizado | En cascada: Zod → Handler → Hook → Form → Submit (Lesson 36) |
| 10 | Métricas muestran L en vez de Gs | Actualizar TODOS los componentes que referencian el campo (Lesson 37) |
| 11 | **`useEffect`/`useMemo`/`useCallback` no importados** | Al agregar hooks de React (`useState` solo no alcanza), verificar que el import de React incluya todos los hooks usados: `import React, { useState, useEffect, useMemo, useCallback } from 'react'`. Este error no se detecta en build, solo en runtime (ReferenceError). |

## 5. Rollback

**DB falló:** Restaurar backup de Supabase → `git checkout <commit-estable> prisma/` → `npx prisma db push`

**Backend falló:** Render Dashboard > Deploys > Rollback al último deploy estable
