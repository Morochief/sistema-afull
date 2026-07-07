# sistema-afull-workflow

Protocolo oficial de cambios para Sistema aFull. Todo cambio debe seguir este flujo secuencial.

## Skills Obligatorias por Capa (NINGUNA SE OMITE)

| Capa | Skill | Cuándo |
|------|-------|--------|
| **Backend** | `backend-patterns` | Todo cambio en server.ts, server-validation.ts, API endpoints |
| **Frontend** | `frontend-patterns` | Todo cambio en componentes React, hooks, estados |
| **Testing** | `tdd-workflow` | Nuevas features, bugs, refactors con tests |
| **Auditoría** | `ponytail-review` + `code-reviewer` | Después de escribir/modificar código, antes de commit |
| **Seguridad** | `security-reviewer` | Endpoints de autenticación, manejo de datos sensibles, exports |

**REGLAS ESTRICTAS:**
- **No se omite ninguna skill.** Si el cambio toca frontend → `frontend-patterns`. Si toca backend → `backend-patterns`. Siempre → `ponytail-review` + `code-reviewer`. Siempre → `security-reviewer` (al menos para revisar vectors de inyección).
- Si el cambio no es de una capa específica, documentar por qué no aplica en el commit message.
- Skills se ejecutan en orden: backend/frontend según corresponda → ponytail-review + code-reviewer → security-reviewer → tdd-workflow si aplica.

## Regla Obligatoria: Actualizar Framework

Si el cambio introduce un patrón nuevo, corrige un error recurrente, o modifica la arquitectura, se debe actualizar TANTO:
1. **`.agents/AGENTS.md`** — agregar lección aprendida (sección 6 o I)
2. **Framework skills** — actualizar el skill correspondiente:
   - `sistema-afull-workflow.md` → errores comunes o pasos
   - `admin-list-pattern.md` → nuevos componentes o patrones reutilizables
   - `ponytail.md` → nuevos anti-patrones detectados

No registrar solo en AGENTS.md. Si el cambio es un patrón que se repetirá, debe vivir en un skill.

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

### Paso 7: Lecciones Aprendidas + Framework Update
Si encontraste un problema nuevo:
1. Agregar lección en `.agents/AGENTS.md` siguiendo el formato: **Problema/Regla/Solución/Síntoma**
2. Si el cambio introduce un patrón reutilizable, actualizar el skill correspondiente (ver Skills Obligatorias arriba)
3. Si el cambio es un nuevo error común, agregarlo a la tabla de Errores Comunes abajo
4. Si el cambio es un nuevo patrón de lista/admin, actualizar `admin-list-pattern.md`

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

## 5. Post-Deploy: Cache del Service Worker

Después de cada deploy, el Service Worker (sw.js) puede servir HTML/JS/CSS viejos de la caché del navegador. Esto causa errores como:
- `Refused to apply style from '.../assets/index-XXXX.css' because its MIME type ('text/html') is not a supported stylesheet MIME type`
- Bundle JS del deploy anterior solicitando assets que ya no existen

**Solución para el usuario:** Abrir DevTools → Application → Storage → Clear site data, o abrir en una pestaña incógnita.

**Solución para el desarrollador:** Verificar que el sw.js implemente Network-First para navegación y Cache-First solo para `/assets/` con hashes (Lección 30 de AGENTS.md). Si el error persiste, incrementar `CACHE_NAME` (ej: `afull-cache-v2`) para forzar la invalidación de todo el cache.

## 6. Rollback

**DB falló:** Restaurar backup de Supabase → `git checkout <commit-estable> prisma/` → `npx prisma db push`

**Backend falló:** Render Dashboard > Deploys > Rollback al último deploy estable

---

## 7. SkillOpt — Definición de Cuándo Aplica

### ¿Qué es SkillOpt?
**SkillOpt** es un framework de Microsoft (repo: `microsoft/SkillOpt`) para entrenar skills de lenguaje natural para agentes LLM frozen. Trata el texto del skill como un tensor optimizable: rollouts → reflect → aggregate → select → update → evaluate, todo contra un benchmark con métrica cuantificable.

**No es una skill de ECC.** Es un framework externo de investigación instalable vía `pip install skillopt`.

### ¿Cuándo SkillOpt APLICA en este proyecto?
SkillOpt solo puede usarse cuando se cumplen **las 3 condiciones simultáneamente**:

| # | Condición | Pregunta Guía | Ejemplo que Sí Aplica |
|---|-----------|---------------|----------------------|
| 1 | **Benchmark/evaluador existe** | ¿Hay un conjunto de pruebas o un evaluador automático que mida calidad? | Una suite de tests de integración con supertest, o un script que compile y mida el bundle |
| 2 | **Loop de iteración es viable** | ¿Hay múltiples enfoques posibles que comparar? | Varias formas de estructurar un import de Excel, diferentes abordajes de UI |
| 3 | **Métrica cuantificable** | ¿Hay un número que mejore? | "% de filas importadas correctamente", "tamaño del bundle", "tests que pasan" |

### ¿Cuándo NO aplica?
SkillOpt **no aplica** cuando:

- El cambio es **determinístico y binario** (cambiar una constante, renombrar una variable, corregir un typo)
- **No hay iteración** — solo existe una forma correcta de hacerlo
- **No hay métrica** — el éxito es binario (compila/no compila, funciona/no funciona)
- Es un **cambio trivial de 1-2 líneas** sin efectos secundarios

### Árbol de Decisión SkillOpt

```
¿Hay un evaluador/benchmark que mida calidad?
├── NO  → ✅ Usar skills regulares del workflow. SkillOpt no aplica.
└── SÍ  → ¿Hay múltiples candidatos/iteraciones posibles?
         ├── NO  → ✅ Usar skills regulares. SkillOpt no aplica.
         └── SÍ  → ¿Hay una métrica cuantificable de mejora?
                    ├── NO  → ✅ Usar skills regulares. SkillOpt no aplica.
                    └── SÍ  → 🚀 SkillOpt APLICA.
                              Usar: pip install skillopt → crear benchmark en skillopt/envs/
                              → entrenar → desplegar best_skill.md

Ejemplos Reales en Sistema aFull:
┌──────────────────────────────────┬──────┬──────┬──────┬────────────┐
│ Cambio                          │ Eval │ Loop │ Metr │ ¿Aplica?  │
├──────────────────────────────────┼──────┼──────┼──────┼────────────┤
│ Timer 30s → 60s (valor fijo)    │  ❌  │  ❌  │  ❌  │ NO         │
│ Importar Excel múltiples formatos│  ✅  │  ✅  │  ✅  │ SÍ         │
│ Refactor UI a glass system       │  ✅  │  ✅  │  ✅  │ SÍ         │
│ Bug fix (solución única)         │  ❌  │  ❌  │  ❌  │ NO         │
│ Optimizar bundle size            │  ✅  │  ✅  │  ✅  │ SÍ         │
│ Crear nuevo subsistema           │  ❌  │  ❌  │  ❌  │ NO (único) │
└──────────────────────────────────┴──────┴──────┴──────┴────────────┘
```

### SkillOpt no Reemplaza las Skills del Workflow
Cuando SkillOpt aplica, se añade **antes** de las skills regulares:
```
SkillOpt (entrenar skill) → frontend-patterns/backend-patterns → ponytail-review + code-reviewer → security-reviewer
```
El `best_skill.md` que produce SkillOpt es una mejora sobre el `initial.md`. Las skills del workflow se ejecutan igual después.
