# Documentación Técnica: Sistema aFull (app-unificada)

> **Última actualización:** 2026-06-15  
> **Versión:** 0.1.0  
> **Stack:** Next.js 16 · React 19 · Prisma 6 · PostgreSQL (Supabase) · JWT (jose)

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Variables de Entorno](#2-variables-de-entorno)
3. [Base de Datos y Prisma](#3-base-de-datos-y-prisma)
4. [Triggers y Lógica SQL](#4-triggers-y-lógica-sql)
5. [Autenticación y Seguridad](#5-autenticación-y-seguridad)
6. [Server Actions](#6-server-actions)
7. [AppContext (Estado Global del Cliente)](#7-appcontext-estado-global-del-cliente)
8. [Estructura de Rutas y Vistas](#8-estructura-de-rutas-y-vistas)
9. [Componentes](#9-componentes)
10. [Scripts y Herramientas](#10-scripts-y-herramientas)
11. [Dependencias Principales](#11-dependencias-principales)
12. [Convenciones y Decisiones de Diseño](#12-convenciones-y-decisiones-de-diseño)

---

## 1. Arquitectura General

**Sistema aFull** es una aplicación monolítica Full-Stack construida sobre **Next.js (App Router)**, enfocada en el costeo, registro de horas (Mano de Obra) y consumo de insumos en proyectos.

### Pila Tecnológica

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Framework** | Next.js (App Router) | 16.2.9 |
| **UI Library** | React | 19.2.4 |
| **Styling** | Tailwind CSS v4 + ShadCN UI | ^4 |
| **ORM** | Prisma Client | ^6.4.1 |
| **Base de Datos** | PostgreSQL (Supabase) | — |
| **Autenticación** | JWT via `jose` | ^6.2.3 |
| **Icons** | Lucide React | ^1.18.0 |
| **Excel Parsing** | SheetJS (`xlsx`) | ^0.18.5 |

### Diagrama de Capas

```
┌──────────────────────────────────────────────────┐
│  Browser (React 19 Client Components)            │
│  ├── AppContext (estado global: catálogos, MO)    │
│  ├── DashboardSidebar (navegación desktop)       │
│  └── Bottom Nav (navegación móvil)               │
├──────────────────────────────────────────────────┤
│  Next.js Middleware (Edge Runtime)               │
│  └── JWT validation → protege rutas / y /registro│
├──────────────────────────────────────────────────┤
│  Server Components (SSR pages)                   │
│  ├── Dashboard (page.tsx) → prisma queries       │
│  ├── Proyectos, Clientes, Insumos, Colaboradores │
│  └── Layout → carga catálogos para AppProvider   │
├──────────────────────────────────────────────────┤
│  Server Actions (src/app/actions/)               │
│  ├── auth.ts → login/logout                      │
│  └── registros.ts → createRegistroMO/Insumo      │
├──────────────────────────────────────────────────┤
│  Prisma ORM (Singleton)                          │
│  └── prisma.ts → PrismaClient global             │
├──────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)                           │
│  ├── Tablas: clientes, proyectos, colaboradores, │
│  │          insumos, registros, logs_auditoria   │
│  ├── Trigger: calcular_total_registro()          │
│  └── Vista: reporte_costos_proyectos             │
└──────────────────────────────────────────────────┘
```

---

## 2. Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión al pooler transaccional de Supabase (PgBouncer, puerto 6543). Usa `?pgbouncer=true`. | `postgresql://postgres.xxx:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | URL de conexión directa al pooler de sesión (puerto 5432). Usada por Prisma para migraciones. | `postgresql://postgres.xxx:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT. **Obligatorio en producción.** Fallback en dev: `"super-secret-key-for-dev"` | Una cadena aleatoria de 32+ caracteres |

> **⚠️ IMPORTANTE:** En Vercel, las variables deben configurarse como Environment Variables del proyecto. La contraseña de Supabase no se versiona en el repositorio.

---

## 3. Base de Datos y Prisma

### 3.1 Esquema de Modelos (`prisma/schema.prisma`)

#### `Clientes` → tabla `clientes`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria, generada por `uuid_generate_v4()` |
| `nombre` | `VARCHAR(150)` | Nombre del cliente (empresa o persona) |
| `creado_en` | `TIMESTAMPTZ` | Fecha de creación automática |
| **Relación** | `proyectos[]` | Un cliente tiene muchos proyectos |

#### `Proyectos` → tabla `proyectos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria |
| `cliente_id` | `UUID` (FK) | Referencia a `clientes.id` |
| `nombre` | `VARCHAR(200)` | Nombre descriptivo del proyecto |
| `estado` | `VARCHAR(50)` | `'in_progress'` \| `'completed'` \| `'on_hold'` |
| `creado_en` | `TIMESTAMPTZ` | Fecha de creación automática |
| **Relaciones** | `cliente`, `registros[]` | FK a Clientes; uno a muchos con Registros |
| **Índice** | `idx_proyectos_cliente_id` | Índice en `cliente_id` para JOINs rápidos |

#### `Colaboradores` → tabla `colaboradores`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria |
| `nombre` | `VARCHAR(100)` | Nombre del colaborador. **También sirve como credencial de login.** |
| `tarifa_minuto` | `DECIMAL(10,2)` | Tarifa por minuto trabajado. Default: `350.00` |
| `activo` | `BOOLEAN` | Si está activo (`true`) puede loguearse y registrar horas |
| `creado_en` | `TIMESTAMPTZ` | Fecha de creación automática |
| **Relación** | `registros[]` | Registros de MO asociados |

#### `Insumos` → tabla `insumos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria |
| `nombre` | `VARCHAR(150)` | Nombre del insumo/material |
| `precio_unitario` | `DECIMAL(15,2)` | Precio por unidad |
| `activo` | `BOOLEAN` | Si está disponible para consumo |
| `creado_en` | `TIMESTAMPTZ` | Fecha de creación automática |
| **Relación** | `registros[]` | Registros de consumo de este insumo |

#### `Registros` → tabla `registros` (tabla transaccional polimórfica)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria |
| `proyecto_id` | `UUID` (FK) | Proyecto al que pertenece (CASCADE en delete) |
| `tipo` | `VARCHAR(20)` | **`'MO'`** (Mano de Obra) o **`'INSUMO'`** |
| `fecha` | `DATE` | Fecha del registro, default `CURRENT_DATE` |
| `colaborador_id` | `UUID?` (FK) | Solo para tipo `MO`. RESTRICT en delete |
| `hora_inicio` | `TIME?` | Solo para tipo `MO` |
| `hora_fin` | `TIME?` | Solo para tipo `MO` |
| `minutos_calculados` | `INTEGER?` | **Calculado por trigger.** Diferencia en minutos entre inicio y fin |
| `insumo_id` | `UUID?` (FK) | Solo para tipo `INSUMO`. RESTRICT en delete |
| `cantidad` | `DECIMAL(10,2)?` | Solo para tipo `INSUMO` |
| `total_calculado` | `DECIMAL(15,2)` | **Calculado por trigger.** Costo total del registro |
| `descripcion` | `TEXT?` | Descripción libre de la actividad |
| `creado_por` | `VARCHAR(100)` | Nombre del usuario que creó el registro |
| `creado_en` | `TIMESTAMPTZ` | Fecha de creación automática |

**Constraint de integridad a nivel de fila (`chk_mo_requiere_colaborador`):**
- Si `tipo = 'MO'`: requiere `colaborador_id`, `hora_inicio`, `hora_fin`; prohíbe `insumo_id`, `cantidad`.
- Si `tipo = 'INSUMO'`: requiere `insumo_id`, `cantidad`; prohíbe `colaborador_id`, `hora_inicio`, `hora_fin`.

#### `LogsAuditoria` → tabla `logs_auditoria`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `UUID` (auto) | Clave primaria |
| `tabla_afectada` | `VARCHAR(50)` | Nombre de la tabla modificada |
| `registro_id` | `UUID` | ID del registro afectado |
| `accion` | `VARCHAR(10)` | `'INSERT'` \| `'UPDATE'` \| `'DELETE'` |
| `usuario` | `VARCHAR(100)` | Quién realizó la acción |
| `fecha_accion` | `TIMESTAMPTZ` | Cuándo ocurrió |
| `detalles` | `JSONB?` | Datos adicionales del cambio |

#### `ReporteCostosProyectos` → vista `reporte_costos_proyectos`
Vista SQL (no materializada) que consolida costos por proyecto:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `proyecto_id` | `UUID` (unique) | Clave del proyecto |
| `nombre_proyecto` | `String?` | Nombre del proyecto |
| `nombre_cliente` | `String?` | Nombre del cliente asociado |
| `estado` | `String?` | Estado del proyecto |
| `total_mo` | `Decimal?` | Suma de `total_calculado` donde `tipo = 'MO'` |
| `total_insumos` | `Decimal?` | Suma de `total_calculado` donde `tipo = 'INSUMO'` |
| `costo_total` | `Decimal?` | Suma total de todos los registros |

### 3.2 Prisma Client Singleton (`src/lib/prisma.ts`)

**Por qué:** En desarrollo, Next.js realiza hot-reloads frecuentes. Sin el patrón singleton, cada reload crearía una nueva conexión a la base de datos, agotando rápidamente el pool de conexiones de Supabase (límite: 15 para Nano).

**Cómo:** Se almacena la instancia de `PrismaClient` en `globalThis.prismaGlobal`. En producción, se crea una sola vez; en desarrollo, se reutiliza entre reloads.

```typescript
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
```

---

## 4. Triggers y Lógica SQL

### 4.1 Función `calcular_total_registro()`

**Definida en:** `db/init.sql` (líneas 97-127)

**Por qué:** Para evitar que la lógica del frontend o la red introduzcan errores al calcular tiempos y costos. La base de datos siempre actúa como la **fuente de verdad** para los totales.

**Cómo funciona:**

1. **Para tipo `MO` (Mano de Obra):**
   - Calcula `minutos_dif = (hora_fin - hora_inicio) / 60`
   - **Cruce de medianoche:** si `minutos_dif < 0`, suma `1440` (24 horas en minutos)
   - Busca la `tarifa_minuto` del colaborador en la tabla `colaboradores`
   - Asigna `minutos_calculados = minutos_dif`
   - Asigna `total_calculado = minutos_dif × tarifa_minuto`

2. **Para tipo `INSUMO`:**
   - Busca el `precio_unitario` del insumo en la tabla `insumos`
   - Asigna `total_calculado = cantidad × precio_unitario`

### 4.2 Trigger `trigger_calcular_total`

```sql
CREATE TRIGGER trigger_calcular_total
BEFORE INSERT OR UPDATE ON registros
FOR EACH ROW EXECUTE FUNCTION calcular_total_registro();
```

Se ejecuta **ANTES** de cada INSERT o UPDATE, garantizando que `total_calculado` y `minutos_calculados` siempre sean consistentes con los datos ingresados.

### 4.3 Vista `reporte_costos_proyectos`

**Por qué:** Renderizar el dashboard requiere procesar todos los registros agrupados. Hacerlo en la aplicación sería lento e ineficiente.

**Cómo:** Vista SQL que realiza `JOIN` entre `proyectos`, `clientes` y `registros`, con `SUM` agrupado por `proyecto_id` y filtro por tipo (`MO`/`INSUMO`). Prisma la consulta directamente como si fuera un modelo.

---

## 5. Autenticación y Seguridad

### 5.1 Flujo de Login (`src/app/actions/auth.ts`)

```
Usuario ingresa nombre → Server Action "login(nombre)"
  → Busca en DB: colaboradores.findFirst({ nombre, mode: insensitive, activo: true })
  → Si no existe: devuelve error "Colaborador no encontrado o inactivo"
  → Si existe: firma JWT con { colaborador_id, nombre }
  → Guarda token en cookie HTTP-Only (maxAge: 24h, secure en prod, sameSite: lax)
  → Redirige a "/"
```

**Decisión de diseño:** No se usan contraseñas. La autenticación es por nombre del colaborador (case-insensitive). Es un sistema interno de confianza, no expuesto a internet público.

### 5.2 Biblioteca de Auth (`src/lib/auth.ts`)

| Función | Descripción |
|---------|-------------|
| `signToken(payload)` | Firma un JWT HS256 con el payload `{ colaborador_id, nombre }`, expiración 24h |
| `verifyToken(token)` | Verifica la firma JWT. Retorna el payload o `null` si es inválido/expirado |
| `getSession()` | Lee la cookie `auth_token`, la verifica y retorna el payload de sesión |
| `withAuth(action)` | **HOF (Higher-Order Function).** Envuelve una Server Action para inyectar la sesión como segundo parámetro. Si no hay sesión, lanza `Error("No autenticado")` |

**Tipo `UserPayload`:**
```typescript
{ colaborador_id: string; nombre: string }
```

### 5.3 Middleware (`src/middleware.ts`)

**Por qué:** Para restringir el acceso a usuarios no autorizados de forma centralizada, sin verificar sesión vista por vista.

**Cómo:**
1. Intercepta las rutas definidas en `config.matcher`: `["/", "/registro", "/login"]`
2. **Rutas protegidas** (`/`, `/registro`, `/proyectos`, `/clientes`, `/insumos`, `/colaboradores`): si no hay token o es inválido → redirige a `/login`
3. **Ruta de login** (`/login`): si ya hay token válido → redirige a `/` (evita doble login)

---

## 6. Server Actions

### 6.1 `login(nombre: string)` — `src/app/actions/auth.ts`

- **Directiva:** `"use server"`
- **Parámetros:** `nombre` (string) — nombre del colaborador
- **Flujo:** Busca colaborador activo por nombre (insensitive), firma JWT, guarda cookie
- **Retorno:** `{ success: true }` o `{ error: string }`
- **Seguridad:** NO requiere `withAuth` (es la acción de autenticación)

### 6.2 `logout()` — `src/app/actions/auth.ts`

- **Directiva:** `"use server"`
- **Parámetros:** Ninguno
- **Flujo:** Elimina la cookie `auth_token`
- **Retorno:** `void`

### 6.3 `createRegistroMO(data)` — `src/app/actions/registros.ts`

- **Directiva:** `"use server"`
- **Protegida por:** `withAuth` (inyecta `session.colaborador_id` y `session.nombre`)
- **Parámetros:**
  ```typescript
  { proyectoId: string, inicio: string, fin: string, description: string }
  ```
- **Flujo:**
  1. Extrae `colaborador_id` del JWT (NO del formulario — previene fraude)
  2. Parsea `inicio` y `fin` como `HH:MM` → crea objetos `Date` para Prisma
  3. Crea registro en DB con `tipo: 'MO'`
  4. El trigger SQL calcula `minutos_calculados` y `total_calculado` automáticamente
  5. Llama `revalidatePath("/")` para refrescar el dashboard
- **Retorno:** `{ success: true, registro }` o `{ error: string }`

### 6.4 `createRegistroInsumo(data)` — `src/app/actions/registros.ts`

- **Directiva:** `"use server"`
- **Protegida por:** `withAuth`
- **Parámetros:**
  ```typescript
  { proyectoId: string, insumoId: string, cantidad: number }
  ```
- **Flujo:**
  1. Valida que `insumoId` existe en DB
  2. Valida que `cantidad > 0`
  3. Crea registro con `tipo: 'INSUMO'`
  4. El trigger SQL calcula `total_calculado` automáticamente
  5. Llama `revalidatePath("/")` para refrescar el dashboard
- **Retorno:** `{ success: true, registro }` o `{ error: string }`

---

## 7. AppContext (Estado Global del Cliente)

**Archivo:** `src/context/AppContext.tsx`  
**Directiva:** `"use client"`

### Por qué existe

El `AppProvider` centraliza los catálogos (insumos, colaboradores, proyectos) que se cargan desde el servidor en el `layout.tsx` y se necesitan en múltiples componentes hijos del formulario de registro. Evita el "prop drilling" excesivo.

### Datos que provee

| Key | Tipo | Origen | Descripción |
|-----|------|--------|-------------|
| `INSUMOS_CATALOGO` | `any[]` | `layout.tsx` → `prisma.insumos.findMany({ activo: true })` | Insumos activos para el selector |
| `COLABORADORES` | `any[]` | `layout.tsx` → `prisma.colaboradores.findMany({ activo: true })` | Colaboradores activos para el selector |
| `PROYECTOS` | `any[]` | `layout.tsx` → `prisma.proyectos.findMany({ estado: 'in_progress' })` | Proyectos en progreso para el selector |
| `isPending` | `boolean` | `useTransition()` | Indica si una acción está en curso |
| `handleAgregarMO` | `(data) => void` | Invoca `createRegistroMO` vía `startTransition` | Registra horas de trabajo |
| `handleAgregarInsumo` | `(data) => void` | Invoca `createRegistroInsumo` vía `startTransition` | Registra consumo de insumo |

### Cómo se carga

1. `layout.tsx` (Server Component) realiza 3 queries Prisma en paralelo
2. Pasa los resultados como props al `<AppProvider>`
3. Los componentes hijos acceden via `useContext(AppContext)`

> **Decisión de diseño:** Se usa `useTransition` en lugar de `useState` para las operaciones asíncronas porque permite que React mantenga la UI interactiva durante la operación sin bloquear renders.

---

## 8. Estructura de Rutas y Vistas

### Mapa de Rutas

| Ruta | Archivo | Tipo | Protegida | Descripción |
|------|---------|------|-----------|-------------|
| `/` | `src/app/page.tsx` | Server Component | ✅ Middleware | Dashboard principal: métricas y tabla de proyectos |
| `/login` | `src/app/login/page.tsx` | Client Component | ❌ (redirige si autenticado) | Formulario de login por nombre |
| `/registro` | `src/app/registro/page.tsx` | Client Component | ✅ Middleware | Formulario de registro de horas e insumos |
| `/proyectos` | `src/app/proyectos/page.tsx` | Server Component | ✅ Middleware | Listado de todos los proyectos |
| `/clientes` | `src/app/clientes/page.tsx` | Server Component | ✅ Middleware | Listado de clientes registrados |
| `/insumos` | `src/app/insumos/page.tsx` | Server Component | ✅ Middleware | Catálogo de insumos con precios |
| `/colaboradores` | `src/app/colaboradores/page.tsx` | Server Component | ✅ Middleware | Equipo de trabajo con tarifas |

### 8.1 Dashboard (`/` — `app/page.tsx`)

- **Tipo:** Server Component (SSR con `force-dynamic`)
- **Queries:**
  - `prisma.proyectos.findMany({ include: { cliente: true } })` — todos los proyectos
  - `prisma.reporteCostosProyectos.findMany()` — métricas de costos
- **Lógica:**
  - Mapea proyectos con sus métricas usando un `Map` por `proyecto_id`
  - Calcula: proyectos activos, costo MO acumulado, costo insumos, rentabilidad estimada (markup 35%)
  - Estima horas como `Math.round(total_mo / 350)`
- **Componentes:** `<MetricsCards>`, `<ProjectsTable>`

### 8.2 Login (`/login` — `app/login/page.tsx`)

- **Tipo:** Client Component
- **Flujo:** Input de nombre → `login(nombre)` Server Action → redirect a `/`
- **UX:** Muestra spinner "Ingresando..." durante la transición

### 8.3 Registro (`/registro` — `app/registro/page.tsx`)

- **Tipo:** Client Component wrapper → `<TaskLoggerScreen />`
- **Funcionalidad:** Seleccionar proyecto → Tab "Mano de Obra" o "Insumos" → Enviar registro

### 8.4 Proyectos (`/proyectos`)

- **Tipo:** Server Component (`force-dynamic`)
- **Query:** `prisma.proyectos.findMany({ include: { cliente, _count: { registros } }, orderBy: { creado_en: 'desc' } })`
- **Muestra:** Nombre, cliente, cantidad de registros, fecha de creación, estado (badge)

### 8.5 Clientes (`/clientes`)

- **Tipo:** Server Component (`force-dynamic`)
- **Query:** `prisma.clientes.findMany({ include: { _count: { proyectos } }, orderBy: { nombre: 'asc' } })`
- **Muestra:** UUID, nombre, cantidad de proyectos, fecha de registro

### 8.6 Insumos (`/insumos`)

- **Tipo:** Server Component (`force-dynamic`)
- **Query:** `prisma.insumos.findMany({ orderBy: { nombre: 'asc' } })`
- **Muestra:** Nombre, precio unitario (formato PYG), estado activo/inactivo

### 8.7 Colaboradores (`/colaboradores`)

- **Tipo:** Server Component (`force-dynamic`)
- **Query:** `prisma.colaboradores.findMany({ orderBy: { nombre: 'asc' } })`
- **Muestra:** Nombre, tarifa/minuto, tarifa/hora calculada (×60), estado activo/inactivo

---

## 9. Componentes

### 9.1 Componentes de Layout

| Componente | Archivo | Tipo | Descripción |
|------------|---------|------|-------------|
| `DashboardSidebar` | `dashboard-sidebar.tsx` | Client | Sidebar lateral (desktop). Usa `usePathname()` para marcar activo. Incluye overlay móvil y navegación principal + secundaria |
| `AppHeader` | `app-header.tsx` | Server | Header con avatar, nombre del usuario y fecha actual en español |

**Navegación del Sidebar:**

| Label | Ruta | Icono |
|-------|------|-------|
| Panel | `/` | `LayoutDashboard` |
| Proyectos | `/proyectos` | `FolderKanban` |
| Clientes | `/clientes` | `Users` |
| Registrar Horas/Insumos | `/registro` | `Receipt` |
| Insumos | `/insumos` | `Boxes` |
| Colaboradores | `/colaboradores` | `Users` |
| Configuración | `#` (placeholder) | `Settings` |
| Soporte | `#` (placeholder) | `LifeBuoy` |

**Navegación móvil (Bottom Nav — definida en `layout.tsx`):**

| Label | Ruta |
|-------|------|
| Dashboard | `/` |
| Registrar | `/registro` |

### 9.2 Componentes de Dashboard

| Componente | Archivo | Props | Descripción |
|------------|---------|-------|-------------|
| `MetricsCards` | `metrics-cards.tsx` | `activos, costoMO, costoInsumos, rentabilidad` | 4 tarjetas KPI con iconos, valores y deltas de tendencia |
| `ProjectsTable` | `projects-table.tsx` | `projects: Project[]` | Tabla interactiva con filtros (búsqueda, cliente, estado) y exportación placeholder |

### 9.3 Componentes de Registro

| Componente | Archivo | Props | Descripción |
|------------|---------|-------|-------------|
| `TaskLoggerScreen` | `task-logger-screen.tsx` | — (usa `AppContext`) | Pantalla principal de registro. Selector de proyecto + tabs MO/Insumos |
| `ManoDeObraPanel` | `mano-de-obra-panel.tsx` | `colaboradores[], onComplete` | Formulario de horas: selector de colaborador, hora inicio/fin (con botones "Iniciar/Finalizar labor"), descripción |
| `InsumosPanel` | `insumos-panel.tsx` | `insumosCatalogo[], onAdd` | Formulario de consumo: selector de insumo, cantidad numérica |

### 9.4 Componentes UI (ShadCN)

Todos en `src/components/ui/`: `avatar`, `badge`, `button`, `card`, `command`, `dialog`, `dropdown-menu`, `field`, `input`, `input-group`, `label`, `popover`, `select`, `separator`, `table`, `tabs`, `textarea`.

---

## 10. Scripts y Herramientas

### 10.1 Scripts npm (`package.json`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `next dev` | Servidor de desarrollo con hot-reload |
| `build` | `prisma generate && next build` | Genera cliente Prisma + build de producción |
| `start` | `next start` | Sirve la build de producción |
| `lint` | `eslint` | Lint del código |

### 10.2 Prisma Seed (`prisma/seed.ts`)

**Ejecutar:** `npx prisma db seed`

**Qué hace:**
1. Lee el archivo `Kevin.xlsx` de la raíz del proyecto
2. Busca una hoja con nombre que contenga "colaborador" → extrae nombres y tarifas
3. Busca una hoja con nombre que contenga "insumo" → extrae nombres y precios
4. Inserta los datos en una transacción (rollback automático si falla)

**Limitación actual:** Solo importa Colaboradores e Insumos. **No importa Clientes, Proyectos ni Registros.**

### 10.3 SQL de Inicialización (`db/init.sql`)

Script que crea toda la estructura desde cero:
- Extensión `uuid-ossp`
- 5 tablas + 1 tabla de auditoría
- 3 índices de rendimiento
- 1 función + 1 trigger
- 1 vista SQL

---

## 11. Dependencias Principales

### Producción

| Paquete | Uso |
|---------|-----|
| `next` 16.2.9 | Framework web |
| `react` 19.2.4 | UI library |
| `@prisma/client` ^6.4.1 | ORM para PostgreSQL |
| `jose` ^6.2.3 | JWT compatible con Edge Runtime |
| `xlsx` ^0.18.5 | Lectura de archivos Excel |
| `shadcn` ^4.11.0 | Generador de componentes UI |
| `lucide-react` ^1.18.0 | Iconos SVG |
| `clsx` + `tailwind-merge` | Utilidades de clases CSS |
| `cmdk` ^1.1.1 | Command palette (instalado, no usado activamente) |

### Desarrollo

| Paquete | Uso |
|---------|-----|
| `tailwindcss` ^4 | Framework CSS |
| `typescript` ^5.9.3 | Tipado estático |
| `ts-node` ^10.9.2 | Ejecución de scripts TypeScript (seed) |

---

## 12. Convenciones y Decisiones de Diseño

### Base de Datos
- **Naming:** `snake_case` para tablas y columnas
- **IDs:** UUID v4 generados por PostgreSQL (`uuid_generate_v4()`)
- **Dinero:** Tipo `NUMERIC(15,2)` / `DECIMAL(15,2)` — nunca float
- **Soft delete:** No implementado. Los colaboradores/insumos se marcan como `activo = false`
- **Cascada:** Eliminar un proyecto elimina sus registros. Eliminar un colaborador o insumo se restringe si tiene registros

### Frontend
- **Moneda:** Formato unificado `es-PY / PYG` (Guaraníes Paraguayos) en todo el sistema. La función `formatCurrency()` centralizada en `projects-data.ts` es importada por `MetricsCards` y `ProjectsTable`. Las páginas de catálogos definen su propia copia local con el mismo formato.
- **Estado de carga:** Se usa `useTransition` (React 19) para operaciones asíncronas, no `useState` + `loading`
- **Feedback al usuario:** Actualmente usa `alert()` para confirmaciones. **TODO:** Migrar a toast/notification system

### Seguridad
- **JWT:** Algoritmo HS256, expiración 24h, almacenado en cookie HTTP-Only
- **Identificación del usuario:** El `colaborador_id` se extrae del JWT, **nunca** del formulario. Esto previene que un colaborador registre horas en nombre de otro
- **Rutas no protegidas:** `/proyectos`, `/clientes`, `/insumos`, `/colaboradores` no están en el matcher del middleware. **Riesgo potencial si se despliega públicamente.**

---

## Apéndice: Archivos Legacy

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `src/lib/projects-data.ts` | Datos de ejemplo estáticos (hardcoded) | **Obsoleto** — el dashboard ahora consume DB. Se conserva por los tipos `Project`, `statusConfig` y `formatCurrency` que importan otros componentes |
