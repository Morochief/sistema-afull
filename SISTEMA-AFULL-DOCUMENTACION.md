# SISTEMA AFULL — Documentación Técnica Definitiva

> Deep dive completo de arquitectura, módulos, rutas, persistencia, roles y conexiones.
> Generado el 2026-08-27 desde el código fuente en `D:\sistema-afull-googleia`.

---

## TABLA DE CONTENIDOS

1. [Arquitectura General](#1-arquitectura-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Base de Datos (Prisma Schema)](#3-base-de-datos-prisma-schema)
4. [Infraestructura Backend](#4-infraestructura-backend)
5. [Sistema de Autenticación y Autorización (RBAC)](#5-sistema-de-autenticación-y-autorización-rbac)
6. [API REST — Rutas Completas](#6-api-rest--rutas-completas)
7. [Frontend — Arquitectura de Componentes](#7-frontend--arquitectura-de-componentes)
8. [Módulos del Sistema](#8-módulos-del-sistema)
9. [Portal de Clientes](#9-portal-de-clientes)
10. [Comparativa de Roles](#10-comparativa-de-roles)
11. [Tipos de TypeScript (Frontend)](#11-tipos-de-typescript-frontend)
12. [Persistencia y Estado](#12-persistencia-y-estado)
13. [Jobs y Procesos en Background](#13-jobs-y-procesos-en-background)
14. [Flujos de Datos End-to-End](#14-flujos-de-datos-end-to-end)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cliente)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  App Admin   │  │ Portal Cliente│  │  Portal Empleado │  │
│  │  (main.tsx)  │  │(portal/main) │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼────────────────────┼──────────┘
          │                 │                    │
          │  fetch + JWT    │  fetch + token    │ fetch + JWT
          │  (httpOnly      │  (URL param)      │ (httpOnly
          │   cookie)       │                    │  cookie)
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS SERVER (server.ts)                   │
│  Puerto: 3100 (dev) / process.env.PORT                   │
│                                                           │
│  Middlewares: helmet, cors, cookieParser, express.json    │
│  Rate limiters: authLimiter, portalLimiter                 │
│                                                           │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Auth   │ │  Data    │ │ Registros│ │  Colaborador  │   │
│  │ Router  │ │  Router  │ │  Router  │ │    Router     │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Pedidos │ │Presupuest│ │HojaRuta  │ │   Portal      │   │
│  │ Router  │ │  Router  │ │  Router  │ │   Router      │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Timer   │ │  Viaje   │ │ Vehículo │ │  Marcación    │   │
│  │ Router  │ │  Router  │ │  Router  │ │   Router      │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Cartera │ │  Import  │ │ Permisos │ │  Operario     │   │
│  │ Router  │ │  Router  │ │  Router  │ │   Router      │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Clientes│ │ Proyectos│ │Sucursales│ │  Audit/Users  │   │
│  │ Router  │ │  Router  │ │  Router  │ │   Routers     │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│                                                           │
│  Vite Middleware (dev) / Express Static (prod)            │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           SUPABASE (PostgreSQL) — Prisma ORM              │
│  DATABASE_URL  (pooler)  +  DIRECT_URL (direct)           │
│                                                           │
│  22 modelos · 4 enums · ~30 tablas físicas                │
└─────────────────────────────────────────────────────────┘
```

### Dual SPA
- **App Admin** (`src/main.tsx`): monta `<App />` en `#root`. Para usuarios autenticados (Admin, Operario, Visor).
- **Portal Cliente** (`src/portal/main.tsx`): monta `<PortalApp />` en `#root`. Acceso público sin login, autenticado por `tokenPortal` en la URL.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js (Windows) | — |
| Framework Backend | Express | ^4.21.2 |
| ORM | Prisma Client | ^5.22.0 |
| Base de Datos | Supabase (PostgreSQL) | — |
| Framework Frontend | React | ^19.0.1 |
| Bundler | Vite | ^6.2.3 |
| Lenguaje | TypeScript | ~5.8.2 |
| Auth | jsonwebtoken ^9.0.3 + bcryptjs ^3.0.3 |
| Validación | zod ^4.4.3 |
| Seguridad | helmet ^8.2.0, cors ^2.8.6, express-rate-limit ^8.5.2 |
| File Upload | multer ^2.2.0 |
| Animaciones | motion ^12.23.24 |
| Iconos | lucide-react ^0.546.0 |
| Gráficos | recharts ^3.8.1 |
| Excel | xlsx ^0.18.5 |
| OCR | tesseract.js ^7.0.0 |
| AI | @google/genai ^2.4.0 |
| Sanitización | dompurify ^3.4.11, isomorphic-dompurify ^3.18.0 |
| Testing | vitest ^4.1.9, @testing-library/react, supertest, playwright |
| Image Storage | Supabase Storage (vía @supabase/supabase-js ^2.108.2) |

---

## 3. Base de Datos (Prisma Schema)

> Archivo: `prisma/schema.prisma`

### 3.1 Configuración

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooler connection
  directUrl = env("DIRECT_URL")        // Direct connection for migrations
}
```

### 3.2 Modelos

#### `Cliente` → tabla `clientes`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| nombre | String | — |
| codigo | String | @db.VarChar(10) |
| tokenPortal | String? | @unique @map("token_portal") @db.VarChar(64) |
| fechaCreacion | DateTime | @default(now()) @map("fecha_creacion") |
| createdAt | DateTime | @default(now()) @map("created_at") |
| updatedAt | DateTime | @updatedAt @map("updated_at") |

**Relaciones:** `Proyecto[]`, `Registro[]`, `Pedido[]`, `Sucursal[]`, `Presupuesto[]`

#### `Proyecto` → tabla `proyectos`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| clienteId | String | @map("cliente_id") @db.VarChar(50) |
| nombre | String | — |
| activo | Boolean | @default(true) |
| estado | EstadoProyecto | @default(PENDIENTE) |
| fechaInicio | DateTime | @map("fecha_inicio") |
| createdAt / updatedAt | DateTime | — |

**Relaciones:** N:1 `Cliente` (onDelete: Cascade), 1:N `Registro[]`
**Índices:** `[clienteId]`

#### `Sucursal` → tabla `sucursales`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| clienteId | String | @map("cliente_id") @db.VarChar(50) |
| nombre | String | — |
| ciudad | String? | @db.VarChar(100) |
| activo | Boolean | @default(true) |

**Relaciones:** N:1 `Cliente` (onDelete: Cascade), 1:N `Pedido[]`

#### `Colaborador` → tabla `colaboradores`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| nombre | String | — |
| tarifaSugerida | Decimal? | @map("tarifa_sugerida") @db.Decimal(10, 2) |
| rol | String? | — |
| ci | String? | @db.VarChar(20) — *nuevo* |
| cargo | String? | @db.VarChar(100) — *nuevo* |
| departamento | String? | @db.VarChar(100) — *nuevo* |
| jefeInmediato | String? | @map("jefe_inmediato") @db.VarChar(100) — *nuevo* |

**Relaciones:** 1:N `Registro[]`, 1:N `HojaRutaTarea[]`, 1:N `Permiso[]`

#### `Permiso` → tabla `permisos` — *NUEVO*
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| colaboradorId | String | @map("colaborador_id") @db.VarChar(50) |
| nombreSolicitante | String | @map("nombre_solicitante") |
| cargo | String? | — |
| ci | String? | @db.VarChar(20) |
| departamento | String? | — |
| jefeInmediato | String? | @map("jefe_inmediato") @db.VarChar(100) |
| tipoPermiso | String | @map("tipo_permiso") @db.VarChar(100) |
| motivo | String? | @db.Text |
| modoTiempo | String | @default("horas") @map("modo_tiempo") @db.VarChar(10) |
| horaInicio | String? | @map("hora_inicio") @db.VarChar(5) |
| horaFin | String? | @map("hora_fin") @db.VarChar(5) |
| fechaHora | DateTime? | @map("fecha_hora") |
| fechaDesde | DateTime? | @map("fecha_desde") |
| fechaHasta | DateTime? | @map("fecha_hasta") |
| estado | String | @default("Pendiente") @db.VarChar(20) |
| jefeDecision | String? | @map("jefe_decision") @db.VarChar(20) |
| jefeComentario | String? | @map("jefe_comentario") @db.Text |
| jefeFecha | DateTime? | @map("jefe_fecha") |
| rrhhDecision | String? | @map("rrhh_decision") @db.VarChar(20) |
| rrhhComentario | String? | @map("rrhh_comentario") @db.Text |
| rrhhDescontarSalario | Boolean? | @map("rrhh_descontar_salario") |
| rrhhFecha | DateTime? | @map("rrhh_fecha") |
| creadoPor | String | @map("creado_por") @db.VarChar(50) |

**Relaciones:** N:1 `Colaborador` (onDelete: Cascade)
**Índices:** `[colaboradorId]`, `[estado]`, `[createdAt(sort: Desc)]`

#### `Registro` → tabla `registros`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| clienteId / clienteNombre | String | @map |
| proyectoId / proyectoNombre | String | @map |
| fecha | DateTime | — |
| concepto | Concepto (enum) | — |
| descripcion | String | — |
| colaboradorId | String? | @map("colaborador_id") |
| hsInicio | String? | @db.VarChar(5) |
| hsFin | String? | @db.VarChar(5) |
| hsTotal | Decimal? | @db.Decimal(5, 2) |
| cantidad | Decimal | @db.Decimal(10, 4) |
| precioUnitario | Decimal | @db.Decimal(15, 2) |
| total | Decimal | @db.Decimal(15, 2) |
| origen | Origen (enum) | @default(MANUAL) |
| fechaImportacion | DateTime? | @map("fecha_importacion") |

**Relaciones:** N:1 `Cliente`, N:1 `Proyecto`, N:1 `Colaborador`, 1:1 `Pedido?`, 1:1 `Presupuesto?`
**Índices:** `[clienteId]`, `[proyectoId]`, `[fecha(sort: Desc)]`

#### `Pedido` → tabla `pedidos`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| clienteId / sucursalId / sucursalNombre | String | @map |
| marca | String? | @db.VarChar(50) |
| descripcion | String | — |
| cantidad | Decimal | @db.Decimal(10, 4) |
| tipo | String? | @db.VarChar(50) |
| prioridad | String? | @default("Media") @db.VarChar(20) |
| estado | String | @default("Pendiente") @db.VarChar(30) |
| fotoUrl | String? | @map("foto_url") |
| fechaSolicitud | DateTime | @default(now()) @map("fecha_solicitud") |
| fechaFin | DateTime? | @map("fecha_fin") |
| facturaNumero | String? | @map("factura_numero") @db.VarChar(30) |
| registroId | String? | @unique @map("registro_id") |
| contacto | String? | @db.VarChar(200) |
| proyecto | String? | @db.VarChar(200) |
| fechaInicioDeseada | DateTime? | @map("fecha_inicio_deseada") |
| fechaTope | DateTime? | @map("fecha_tope") |
| comentarioCliente | String? | @map("comentario_cliente") @db.Text |
| archivado | Boolean | @default(false) |
| archivadoAt | DateTime? | @map("archivado_at") |

**Relaciones:** N:1 `Cliente`, N:1 `Sucursal`, 1:1 `Registro?`, 1:N `Presupuesto[]`
**Índices:** `[clienteId]`, `[sucursalId]`, `[estado]`, `[fechaSolicitud(sort: Desc)]`

#### `Presupuesto` → tabla `presupuestos`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| pedidoId | String | @map("pedido_id") |
| clienteId / clienteNombre | String | @map |
| proyecto | String | @db.VarChar(200) |
| contacto | String? | @db.VarChar(200) |
| fechaInicio / fechaTope | DateTime? | @map |
| estado | String | @default("Borrador") @db.VarChar(30) |
| total | Decimal | @db.Decimal(15, 2) |
| markup | Decimal | @default(0.35) @db.Decimal(5, 2) |
| costoTotal | Decimal? | @map("costo_total") |
| venta1 / venta2 | Decimal? | @map("venta_1/2") |
| comentarioCliente / respuestaCliente | String? | @db.Text |
| fotos | String[] | @default([]) |
| fechaEnvio / fechaRespuesta | DateTime? | @map |
| registroId | String? | @unique @map |
| createdAt / updatedAt | DateTime | — |

**Relaciones:** N:1 `Pedido` (onDelete: Cascade), N:1 `Cliente`, 1:N `PresupuestoItem[]`, 1:1 `Registro?`, 1:1 `OrdenTrabajo?`
**Índices:** `[clienteId]`, `[pedidoId]`, `[estado]`

#### `PresupuestoItem` → tabla `presupuesto_items`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| presupuestoId | String | @map("presupuesto_id") |
| descripcion | String | — |
| cantidad | Decimal | @db.Decimal(10, 4) |
| precioUnitario | Decimal | @map @db.Decimal(15, 2) |
| total | Decimal | @db.Decimal(15, 2) |
| orden | Int | @default(0) |
| categoria | String | @default("Insumo") @db.VarChar(30) |
| horas | Decimal? | @db.Decimal(10, 2) |
| tarifa | Decimal? | @db.Decimal(15, 2) |

**Relaciones:** N:1 `Presupuesto` (onDelete: Cascade)

#### `OrdenTrabajo` → tabla `ordenes_trabajo`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| presupuestoId | String | @unique @map("presupuesto_id") |
| clienteId / clienteNombre | String | @map |
| proyecto | String | @db.VarChar(200) |
| contacto | String? | @db.VarChar(200) |
| fechaInicio / fechaTope | DateTime? | @map |
| detallesTrabajo | String | @map @db.Text |
| comentarioCliente | String? | @map @db.Text |
| estado | String | @default("Generada") @db.VarChar(30) |
| enviadoWhatsapp | Boolean | @default(false) |
| fechaEnvioWsp | DateTime? | @map |
| mensajeWhatsapp | String? | @map @db.Text |

**Relaciones:** 1:1 `Presupuesto` (onDelete: Cascade), 1:1 `HojaRuta?`

#### `HojaRuta` → tabla `hojas_ruta`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| ordenTrabajoId | String | @unique @map("orden_trabajo_id") |
| clienteId / clienteNombre | String | @map |
| proyecto | String | @db.VarChar(200) |
| fecha | DateTime | @default(now()) |
| estado | String | @default("Borrador") @db.VarChar(30) |
| notas | String? | @db.Text |
| enviadoWhatsapp | Boolean | @default(false) |
| fechaEnvioWsp | DateTime? | @map |

**Relaciones:** 1:1 `OrdenTrabajo` (onDelete: Cascade), 1:N `HojaRutaTarea[]`

#### `HojaRutaTarea` → tabla `hojas_ruta_tareas`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @db.VarChar(50) |
| hojaRutaId | String | @map("hoja_ruta_id") |
| colaboradorId | String? | @map("colaborador_id") |
| operarioNombre | String | @map @db.VarChar(200) — snapshot |
| orden | Int | @default(0) |
| descripcion | String | @db.Text |
| categoria | String | @default("Otro") @db.VarChar(30) |
| cantidad | Decimal? | @db.Decimal(10, 4) |
| unidad | String? | @db.VarChar(20) |
| estado | String | @default("Pendiente") @db.VarChar(30) |
| fechaAsignada | DateTime | @default(now()) @map |
| fechaInicio / fechaFin | DateTime? | @map |
| notasOperario | String? | @map @db.Text |
| fotoUrl | String? | @map @db.Text |

**Relaciones:** N:1 `HojaRuta` (onDelete: Cascade), N:1 `Colaborador?` (onDelete: SetNull)

#### `Usuario` → tabla `usuarios`
| Campo | Tipo | Constraints |
|---|---|---|
| id | String | @id @default(uuid()) |
| username | String | @unique @db.VarChar(50) |
| nombre | String | @db.VarChar(100) |
| passwordHash | String | @map("password_hash") |
| email | String? | @unique @db.VarChar(255) |
| rol | Rol (enum) | @default(OPERADOR) |
| colaboradorId | String? | @map("colaborador_id") @db.VarChar(50) |
| activo | Boolean | @default(true) |

#### `RegistroVehiculo` → tabla `registros_vehiculo`
Campos: id, clienteId, clienteNombre, proyectoId, proyectoNombre, fecha, usuario, kmInicial, kmFinal, distanciaOdometro, distanciaGPS, combustibleLitros, combustibleCosto, total, descripcion, alertaDiscrepancia, discrepancia, consumoPorKm, horaInicio, horaFin, duracionMinutos, ubicacionInicio (Json), ubicacionFin (Json), fotoOdometroInicio/Fin (Text), origen, fechaImportacion.

#### `TimerActivo` → tabla `timers_activos`
Campos: id, usuario, colaboradorId, clienteId, proyectoId, descripcion, precioUnitario, inicio (DateTime), activo, ultimaActualizacion, pausedTime (Int), pauseHistory (Json), isPaused, currentPauseStart, currentPauseType.

#### `ViajeActivo` → tabla `viajes_activos`
Campos: id, usuario, clienteId, proyectoId, inicio, ubicacionInicio (Json), fotoOdometroInicio (Text), kmInicial, descripcion, activo.

#### `Marcacion` → tabla `marcaciones`
Campos: id, usuario, tipo ("entrada"/"salida"), timestamp, lat, lng, precision, ip, dispositivoHash, userAgent, origen ("APP"/"REMOTO"/"HOJA_RUTA"), motivoRemoto, hojaRutaId, marcadoPor.

#### `HojaRutaMarcacion` → tabla `hojas_ruta_marcacion`
Campos: id, nombre, descripcion, estado ("ACTIVA"/"CERRADA"/"CANCELADA"), creadaPor. Relación 1:N con `HojaRutaMarcacionOperario`.

#### `HojaRutaMarcacionOperario` → tabla `hoja_ruta_marcacion_operarios`
Campos: id, hojaRutaId, usuario, rol ("CONDUCTOR"/"OPERARIO"). Unique: `[hojaRutaId, usuario]`.

#### `AuditEvent` → tabla `audit_events`
Campos: id, usuario, accion, recurso, resultado, ip, detalle.

#### `GeocercaConfig` → tabla `geocerca_config`
Campos: id (default "default"), lat, lng, radioMetros, activo. Singleton.

#### `CarteraCliente` → tabla `cartera_clientes`
Campos: id, nombre, ruc? (@unique), activo. Relaciones: 1:N `CarteraContacto`, 1:N `CarteraMarca`.

#### `CarteraContacto` → tabla `cartera_contactos`
Campos: id, clienteId, nombre, cargo?, telefono?, email?, activo.

#### `CarteraMarca` → tabla `cartera_marcas`
Campos: id, clienteId, nombre, activo.

### 3.3 Enums

```prisma
enum EstadoProyecto { PENDIENTE, EN_PROCESO, COMPLETADO }  // → "estado_proyecto"
enum Concepto { MO, INSUMO, VEHICULO }                     // → "concepto"
enum Origen { MANUAL, EXCEL, API }                        // → "origen"
enum Rol { ADMIN, OPERADOR, VISOR }                        // → "rol"
```

---

## 4. Infraestructura Backend

### 4.1 `server.ts` — Entry Point

**Propósito:** Configura y arranca el servidor Express, registra todos los routers, middlewares y el servidor Vite en desarrollo.

**Configuración principal:**
- `helmet` con CSP deshabilitado en desarrollo
- `cors` con origins permitidos (configurados por env)
- `cookieParser` — para leer el JWT de la cookie httpOnly
- `express.json` con límite 50mb (para fotos base64)
- `express.urlencoded` con límite 50mb
- Middleware de logging de requests
- Rate limiting en `/api` (100 requests / 15 min por IP)

**Registro de Routers (prefijo → router):**

| Prefijo | Router | Archivo |
|---|---|---|
| `/api` | authRouter | auth.routes.ts |
| `/api/users` | usersRouter | users.routes.ts |
| `/api/clientes` | clientesRouter | clientes.routes.ts |
| `/api/proyectos` | proyectosRouter | proyectos.routes.ts |
| `/api/colaboradores` | colaboradoresRouter | colaboradores.routes.ts |
| `/api/admin/sucursales` | sucursalesRouter | sucursales.routes.ts |
| `/api/admin/pedidos` | pedidosRouter | pedidos.routes.ts |
| `/api/portal` | portalRouter | portal.routes.ts |
| `/api/timer` | timerRouter | timer.routes.ts |
| `/api/viaje` | viajeRouter | viaje.routes.ts |
| `/api/vehiculo` | vehiculoRouter | vehiculo.routes.ts |
| `/api/admin/cartera` | carteraRouter | cartera.routes.ts |
| `/api` | importRouter | import.routes.ts |
| `/api/admin/presupuestos` | presupuestosRouter | presupuestos.routes.ts |
| `/api/admin/hojas-ruta` | hojasRutaRouter | hojasRuta.routes.ts |
| `/api/operario` | operarioRouter | operario.routes.ts |
| `/api` | dataRouter | data.routes.ts |
| `/api/registros` | registrosRouter | registros.routes.ts |
| `/api/marcacion` | marcacionRouter | marcacion.routes.ts |
| `/api/audit` | auditRouter | audit.routes.ts |
| `/api/permisos` | permisosRouter | permisos.routes.ts |

**Archivos estáticos:**
- `/uploads` → `express.static(path.join(__dirname, 'uploads'))`
- En producción: `dist/` servido como estático
- En desarrollo: Vite middleware para HMR

**Arranque:**
- `prisma.$connect()` antes de levantar el server
- `seedUsersIfEmpty()` — seed de usuarios iniciales (admin, rodrigo, ricardo, eduardo)
- `startPedidosRetentionJob()` — job de archivado automático
- Escucha en `process.env.PORT || 3100`

### 4.2 `server-auth.ts` — Autenticación

**Variables de entorno:**
- `JWT_SECRET` — obligatorio, mínimo 32 caracteres. Lanza error fatal si falta.
- `JWT_EXPIRES_IN` — default `'12h'` (un turno de trabajo)

**Funciones exportadas:**

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `mapDbRolToUi(rol)` | `Rol` | `'Admin'\|'Operario'\|'Visor'` | Mapea enum Prisma a string UI |
| `mapUiRolToDb(rol)` | `string` | `Rol` | Mapeo inverso |
| `seedUsersIfEmpty()` | — | `Promise<void>` | Crea admin + 3 operadores si la DB está vacía |
| `hashPassword(password)` | `string` | `Promise<string>` | bcrypt hash (salt rounds=10) |
| `verifyPassword(password, hash)` | `string, string` | `Promise<boolean>` | bcrypt compare |
| `generateToken(payload)` | `Omit<JWTPayload,'iat'\|'exp'>` | `string` | Firma JWT con JWT_SECRET |
| `verifyToken(token)` | `string` | `JWTPayload` | Verifica y decodifica JWT |
| `authenticateUser(usuario, password)` | `string, string` | `Promise<{...}\|null>` | Busca en DB + verifica password |
| `findUserByUsername(usuario)` | `string` | `Promise<{...}\|null>` | Busca usuario por username (case-insensitive) |

**Middlewares:**

| Middleware | Comportamiento |
|---|---|
| `requireAuth` | Lee JWT de cookie `req.cookies.jwt`. Verifica con `verifyToken`. Consulta DB (cache 60s en `userActiveCache`) para verificar que el usuario siga activo. Si la DB falla, usa datos del JWT como fallback (no cierra sesión). Inyecta `req.user = payload`. |
| `requireAdmin` | Verifica `req.user.rol === 'Admin'`. Si no, 403 FORBIDDEN. |
| `optionalAuth` | Adjunta `req.user` si hay token válido, pero no rechaza si falta. |
| `requireWriteAccess` | Bloquea rol `Visor` (403). Admin y Operario pasan. |

**Cache de usuario activo:**
- `userActiveCache: Map<string, UserCacheEntry>` — cache en memoria, TTL 60s
- Previene saturar la DB en cada request
- Estructura: `{ activo, nombre, rol, colaboradorId, checkedAt }`

**Seed de usuarios iniciales:**
| username | nombre | rol | password | colaboradorId |
|---|---|---|---|---|
| admin | Administrador | ADMIN | admin123 | null |
| rodrigo | Rodrigo | OPERADOR | rodrigo123 | col_1 (Rodrigo Gómez) |
| ricardo | Ricardo | OPERADOR | ricardo123 | col_? (busca por nombre) |
| eduardo | Eduardo | OPERADOR | eduardo123 | col_? (busca por nombre) |

### 4.3 `server-audit.ts` — Auditoría

**Función `auditLog({ usuario, accion, recurso, resultado, ip, detalle })`**
- Crea registro en tabla `audit_events`
- Registra: quién, qué acción, sobre qué recurso, resultado (success/failure), IP, detalle opcional

**Función `getClientIp(req)`**
- Extrae IP del request ( considera `x-forwarded-for`, `x-real-ip`)

### 4.4 `server-validation.ts` — Validaciones

- `PasswordComplexitySchema` (Zod) — valida complejidad de passwords en creación/edición de usuarios
- Validaciones de datos de registros, viajes, etc.

### 4.5 `src/server/shared.ts` — Funciones Compartidas

**`generateId(prefix: string): string`**
- Genera ID con formato `{prefix}_{timestamp}_{random}`

**`convertPrismaToFrontend(prismaData): DatabaseState`**
- Convierte modelos Prisma a interfaces del frontend
- Mapea `EstadoProyecto` enum → string UI ("Pendiente"/"En Proceso"/"Completado")
- Mapea `Concepto` enum → string
- Mapea `Rol` enum → string UI
- Convierte `Decimal` → `number` (parseFloat)
- Convierte `DateTime` → `string` (ISO o substring)
- Adjunta `usuario` (Usuario linked) a cada `Colaborador` via match por `colaboradorId`
- Incluye campos nuevos de Colaborador: `ci`, `cargo`, `departamento`, `jefeInmediato`

### 4.6 Configuración

**`src/server/config/logger.ts`**
- Logger con winston/pino configurado por entorno
- Niveles: debug (solo dev), info, warn, error

**`src/server/config/rate-limiters.ts`**
- `authLimiter` — rate limiting para login/registros (previene brute force)
- `portalLimiter` — rate limiting para endpoints del portal público

**`src/server/config/upload.ts`**
- Configuración de multer para upload de archivos (Excel, imágenes)

### 4.7 Librerías

**`src/lib/prisma.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```
Singleton de Prisma Client compartido por toda la app.

**`src/lib/supabase.ts`**
- Cliente Supabase para Storage (subida de imágenes/fotos)

---

## 5. Sistema de Autenticación y Autorización (RBAC)

### 5.1 Flujo de Login

```
[Login.tsx] → POST /api/auth/login
  → authLimiter (rate limit)
  → authenticateUser(usuario, password)
    → prisma.usuario.findFirst({ username, activo: true })
    → bcrypt.compare(password, user.passwordHash)
  → generateToken({ usuario, nombre, rol, colaboradorId })
  → res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 12h
    })
  → res.json({ success, data: { user: { nombre, rol, usuario } } })
```

### 5.2 Flujo de Logout

```
[App.tsx handleLogout] → POST /api/auth/logout
  → res.clearCookie('jwt')
  → clearCSRFToken()
  → setSession(null), setDbState(null)
```

### 5.3 Verificación de Sesión (en cada request)

```
requireAuth middleware:
  1. Lee req.cookies.jwt
  2. Si no hay cookie → 401 MISSING_TOKEN
  3. verifyToken(token) → decodifica JWT
  4. Chequea cache userActiveCache (TTL 60s)
  5. Si cache miss → prisma.usuario.findFirst({ username })
  6. Si DB error → fallback a datos del JWT (no cerrar sesión)
  7. Si usuario inactivo → 401 INACTIVE_USER
  8. Inyecta req.user = { usuario, nombre, rol, colaboradorId }
```

### 5.4 Matriz de Permisos por Rol

| Acción | ADMIN | OPERADOR | VISOR | Cliente (portal) |
|---|---|---|---|---|
| Dashboard (Panel) | ✅ | ❌ | ❌ | ❌ |
| Registro Operativo | ✅ | ✅ | ❌ | ❌ |
| Mis Registros | ❌ (oculto) | ✅ | ❌ | ❌ |
| Mis Tareas | ❌ (oculto) | ✅ | ❌ | ❌ |
| Importar Excel | ✅ | ❌ | ❌ | ❌ |
| Pedidos (admin) | ✅ | ❌ | ❌ | ❌ |
| Presupuestos (admin) | ✅ | ❌ | ❌ | ❌ |
| Hojas de Ruta (admin) | ✅ | ❌ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ❌ | ❌ |
| Administración | ✅ | ❌ | ❌ | ❌ |
| Crear/Editar registros | ✅ | ✅ | ❌ (requireWriteAccess bloquea) | ❌ |
| Eliminar registros | ✅ | ✅* | ❌ | ❌ |
| Timer (start/stop/pause) | ✅ | ✅ | ❌ | ❌ |
| Viajes (start/stop) | ✅ | ✅ | ❌ | ❌ |
| Marcación entrada/salida | ✅ | ✅ | ❌ | ❌ |
| Crear pedido (portal) | ❌ | ❌ | ❌ | ✅ (con token) |
| Responder presupuesto | ❌ | ❌ | ❌ | ✅ (con token) |

> *El Operario puede eliminar/editar SUS registros (filtrado por colaboradorId)

### 5.5 RBAC en el Frontend

```typescript
// App.tsx — Filtrado de tabs de navegación
const navTabs = [
  { id: 'dashboard',    label: 'Panel',          adminOnly: true },
  { id: 'registro',     label: 'Registro',       adminOnly: false },
  { id: 'misregistros', label: 'Mis Registros',  adminOnly: false, hideForAdmin: true },
  { id: 'import',       label: 'Importar',        adminOnly: true },
  { id: 'pedidos',      label: 'Pedidos',         adminOnly: true },
  { id: 'presupuestos', label: 'Presupuestos',   adminOnly: true },
  { id: 'hojasruta',    label: 'Hojas de Ruta',   adminOnly: true },
  { id: 'mistareas',    label: 'Mis Tareas',      adminOnly: false, hideForAdmin: true },
  { id: 'reportes',     label: 'Reportes',        adminOnly: true },
  { id: 'admin',        label: 'Administración',  adminOnly: true },
]

// Non-admin: solo ve tabs donde adminOnly=false
// Admin: ve todo excepto hideForAdmin=true
```

**Redirección automática:**
```typescript
// Si rol !== 'Admin' y está en un tab adminOnly → redirige a 'registro'
if (session.rol !== 'Admin') {
  const allowedTabs = ['registro', 'misregistros', 'mistareas'];
  if (!allowedTabs.includes(activeTab)) setActiveTab('registro');
}
```

---

## 6. API REST — Rutas Completas

### 6.1 Auth Routes (`/api`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/health` | — | Health check del servidor |
| GET | `/csrf-token` | — | Genera token CSRF |
| POST | `/auth/login` | authLimiter | Autentica usuario, setea cookie JWT |
| POST | `/auth/logout` | — | Limpia cookie JWT |
| GET | `/auth/me` | requireAuth | Retorna datos del usuario autenticado |
| GET | `/auth/users` | requireAuth, requireAdmin | Lista todos los usuarios |

### 6.2 Users Routes (`/api/users`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista usuarios |
| POST | `/` | requireAuth, requireAdmin, authLimiter | Crea usuario (valida PasswordComplexitySchema) |
| DELETE | `/:id` | requireAuth, requireAdmin | Elimina usuario (limpia cache) |
| PUT | `/:id` | requireAuth, requireAdmin | Edita usuario (username, password, rol, activo) |

### 6.3 Clientes Routes (`/api/clientes`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/` | requireAuth, requireAdmin, requireWriteAccess | Crea cliente (nombre, codigo) |
| PUT | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita cliente |
| DELETE | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina cliente |

### 6.4 Proyectos Routes (`/api/proyectos`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/` | requireAuth, requireAdmin, requireWriteAccess | Crea proyecto (clienteId, nombre, estado, fechaInicio) |
| PUT | `/:id` | requireAuth, requireAdmin | Edita proyecto |
| DELETE | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina proyecto |

### 6.5 Colaboradores Routes (`/api/colaboradores`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/` | requireAuth, requireAdmin | Crea colaborador + opcional Usuario vinculado. Campos: nombre, rol, tarifaSugerida, ci, cargo, departamento, jefeInmediato, crearAcceso, username, password, rolAcceso, email. Transacción Prisma: crea Colaborador → si crearAcceso, crea Usuario con passwordHash. |
| PUT | `/:id` | requireAuth, requireAdmin | Edita colaborador + Usuario vinculado. Transacción: update Colaborador → si hasAcceso, update/create Usuario; si !hasAcceso, delete Usuario existente. |
| DELETE | `/:id` | requireAuth, requireAdmin | Elimina colaborador + Usuario vinculado (transacción). |

### 6.6 Sucursales Routes (`/api/admin/sucursales`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista sucursales (filtrado por clienteId opcional) |
| POST | `/` | requireAuth, requireAdmin | Crea sucursal |
| PUT | `/:id` | requireAuth, requireAdmin | Edita sucursal |
| DELETE | `/:id` | requireAuth, requireAdmin | Elimina sucursal |

### 6.7 Pedidos Routes (`/api/admin/pedidos`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista pedidos (con filtros: estado, clienteId, archivado) |
| PUT | `/:id` | requireAuth, requireAdmin | Edita pedido (estado, facturaNumero, fechaFin, etc.) |
| POST | `/:id/convertir` | requireAuth, requireAdmin | Convierte pedido → Registro (crea Registro vinculado) |

### 6.8 Presupuestos Routes (`/api/admin/presupuestos`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista presupuestos (con includes: items, pedido) |
| GET | `/ordenes-trabajo` | requireAuth, requireAdmin | Lista órdenes de trabajo |
| GET | `/ordenes-trabajo/:id` | requireAuth, requireAdmin | Detalle de OT |
| GET | `/:id` | requireAuth, requireAdmin | Detalle de presupuesto (con items) |
| POST | `/` | requireAuth, requireAdmin, requireWriteAccess | Crea presupuesto (con items, markup, costoTotal, venta1, venta2) |
| PUT | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita presupuesto (items, estado, totales) |
| POST | `/:id/enviar` | requireAuth, requireAdmin, requireWriteAccess | Envía presupuesto al cliente (estado→"Enviado", fechaEnvio=now) |
| POST | `/:id/responder` | requireAuth, requireAdmin, requireWriteAccess | Registra respuesta del cliente (estado→"Aprobado"/"Rechazado") |
| POST | `/:id/convertir` | requireAuth, requireAdmin, requireWriteAccess | Convierte presupuesto → Registro |
| GET | `/by-pedido/:pedidoId` | requireAuth, requireAdmin | Presupuestos de un pedido |
| DELETE | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina presupuesto |
| POST | `/:id/orden-trabajo` | requireAuth, requireAdmin, requireWriteAccess | Genera OrdenTrabajo desde presupuesto aprobado |

### 6.9 Hojas de Ruta Routes (`/api/admin/hojas-ruta`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista hojas de ruta (con tareas y OT) |
| GET | `/:id` | requireAuth, requireAdmin | Detalle de hoja de ruta (con tareas) |
| POST | `/` | requireAuth, requireAdmin, requireWriteAccess | Crea hoja de ruta (desde OT, con tareas asignadas a colaboradores) |
| PUT | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita hoja de ruta (tareas, estado, notas) |
| DELETE | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina hoja de ruta |
| POST | `/:id/whatsapp` | requireAuth, requireAdmin, requireWriteAccess | Genera mensaje WhatsApp para enviar al operario |
| GET | `/meta/colaboradores` | requireAuth, requireAdmin | Lista colaboradores para selectores |

### 6.10 Operario Routes (`/api/operario`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/tareas` | requireAuth | Lista tareas del operario logueado (filtrado por `colaboradorId` del usuario). Solo ve SUS tareas. |
| GET | `/tareas/hoy` | requireAuth | Tareas del día para el operario |
| PUT | `/tareas/:tareaId` | requireAuth | Actualiza estado de tarea (Pendiente→EnProgreso→Completada), guarda notas, foto |

### 6.11 Timer Routes (`/api/timer`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/start` | requireAuth, requireWriteAccess | Inicia timer (crea `TimerActivo` con clienteId, proyectoId, descripcion, precioUnitario) |
| POST | `/stop` | requireAuth, requireWriteAccess | Detiene timer → crea `Registro` (MO) con hsTotal calculado, total = hsTotal × precioUnitario |
| POST | `/pause` | requireAuth | Pausa timer (registra motivo, guarda en pauseHistory JSON) |
| POST | `/resume` | requireAuth | Reanuda timer |
| GET | `/active/:usuario` | requireAuth | Obtiene timer activo del usuario |
| POST | `/sync` | requireAuth | Sincroniza estado del timer (heartbeat) |

### 6.12 Viaje Routes (`/api/viaje`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/start` | requireAuth, requireWriteAccess | Inicia viaje (crea `ViajeActivo` con ubicación, kmInicial, foto odómetro) |
| POST | `/cancel` | requireAuth, requireWriteAccess | Cancela viaje activo |
| POST | `/stop` | requireAuth, requireWriteAccess | Finaliza viaje → crea `RegistroVehiculo` con kmFinal, distancia, combustible, costos |
| GET | `/active/:usuario` | requireAuth | Obtiene viaje activo del usuario |

### 6.13 Vehículo Routes (`/api/vehiculo`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/registros/:proyectoId` | requireAuth | Registros de vehículo por proyecto |
| GET | `/mis-registros` | requireAuth | Registros del usuario logueado |
| DELETE | `/registro/:id` | requireAuth, requireAdmin | Elimina registro de vehículo |
| PUT | `/registro/:id` | requireAuth, requireAdmin | Edita registro de vehículo |
| PATCH | `/registro/:id` | requireAuth, requireAdmin | Patch parcial |

### 6.14 Registros Routes (`/api/registros`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/mis-registros` | requireAuth | Registros del operario logueado (filtrado por colaboradorId) |
| POST | `/` | requireAuth, requireWriteAccess | Crea registro manual (MO, Insumo, Vehículo). Valida cliente, proyecto, colaborador. |
| DELETE | `/:id` | requireAuth | Elimina registro (verifica ownership si no es admin) |
| PUT | `/:id` | requireAuth, requireWriteAccess | Edita registro completo |
| PATCH | `/:id` | requireAuth | Patch parcial de registro |

### 6.15 Marcación Routes (`/api/marcacion`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/config` | — | Configuración de geocerca (público, para que el cliente sepa si está en zona) |
| POST | `/entrada` | requireAuth, requireWriteAccess | Registra entrada (crea `Marcacion` tipo="entrada", valida geocerca opcional) |
| POST | `/salida` | requireAuth, requireWriteAccess | Registra salida |
| GET | `/mis-marcaciones` | requireAuth | Marcaciones del usuario logueado |
| GET | `/admin/timeline` | requireAuth, requireAdmin | Timeline de marcaciones de todos los usuarios |
| GET | `/hojas-ruta` | requireAuth | Lista grupos de marcación |
| POST | `/hojas-ruta` | requireAuth, requireAdmin | Crea grupo de marcación (con operarios) |
| PUT | `/hojas-ruta/:id` | requireAuth, requireAdmin | Edita grupo |
| DELETE | `/hojas-ruta/:id` | requireAuth, requireAdmin | Elimina grupo |

### 6.16 Cartera Routes (`/api/admin/cartera`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth, requireAdmin | Lista clientes de cartera (con _count de contactos y marcas) |
| POST | `/` | requireAuth, requireAdmin, requireWriteAccess | Crea cliente de cartera (nombre, ruc) |
| PUT | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita cliente |
| DELETE | `/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina cliente (cascade: elimina contactos y marcas) |
| GET | `/:id/contactos` | requireAuth, requireAdmin | Lista contactos del cliente |
| POST | `/:id/contactos` | requireAuth, requireAdmin, requireWriteAccess | Crea contacto |
| PUT | `/contactos/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita contacto |
| DELETE | `/contactos/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina contacto |
| GET | `/:id/marcas` | requireAuth, requireAdmin | Lista marcas del cliente |
| POST | `/:id/marcas` | requireAuth, requireAdmin, requireWriteAccess | Crea marca |
| PUT | `/marcas/:id` | requireAuth, requireAdmin, requireWriteAccess | Edita marca |
| DELETE | `/marcas/:id` | requireAuth, requireAdmin, requireWriteAccess | Elimina marca |

### 6.17 Import Routes (`/api`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| POST | `/import-excel` | requireAuth, requireWriteAccess, uploadSingleExcel | Parsea Excel con `xlsx`, extrae clientes, proyectos, registros. Usa `tesseract.js` para OCR de imágenes. Mapea datos. |
| POST | `/import/confirm` | requireAuth, requireWriteAccess | Confirma importación → crea registros en DB (transacción masiva). Mapea nombres a IDs existentes. |
| POST | `/gemini-enrich` | requireAuth, requireWriteAccess | Enriquece datos usando Google Gemini AI (@google/genai) |

### 6.18 Data Routes (`/api`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/data` | requireAuth | **Endpoint principal.** Carga toda la `DatabaseState` en paralelo: clientes, proyectos, colaboradores, registros, registrosVehiculo, timersActivos, viajesActivos, usuarios. Convierte con `convertPrismaToFrontend`. |
| POST | `/clear` | requireAuth, requireAdmin | Limpia toda la DB (transacción: borra registros, vehículos, timers, viajes, proyectos, colaboradores, clientes) |

### 6.19 Audit Routes (`/api/audit`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/logins` | requireAuth, requireAdmin | Lista eventos de auditoría (logins, acciones admin) |

### 6.20 Portal Routes (`/api/portal`)

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/:token` | portalLimiter | Valida token del cliente, retorna datos del portal: cliente, sucursales, pedidos (paginados 10/página) |
| POST | `/:token/sucursal` | portalLimiter | Crea sucursal para el cliente |
| POST | `/:token/pedido` | portalLimiter | Crea pedido (clienteId del token, sucursalId, descripcion, cantidad, foto base64) |
| GET | `/:token/presupuestos` | portalLimiter | Lista presupuestos enviados/aprobados/rechazados del cliente (excluye Borrador y En Proceso) |
| POST | `/:token/presupuestos/:id/responder` | portalLimiter | Cliente responde presupuesto (Aprobar/Rechazar + comentario) |

### 6.21 Permisos Routes (`/api/permisos`) — *NUEVO*

| Método | Path | Middleware | Descripción |
|---|---|---|---|
| GET | `/` | requireAuth | Lista permisos (con filtro opcional `?estado=` y `?colaboradorId=`). Incluye datos del colaborador. |
| POST | `/` | requireAuth | Crea solicitud de permiso. Snapshot del colaborador (nombre, cargo, ci, departamento, jefeInmediato). 10 tipos de permiso. Modo horas o días. Estado inicial "Pendiente". |
| PUT | `/:id/jefe` | requireAuth | Jefe inmediato aprueba/rechaza. Estado → "AprobadoJefe" o "Rechazado". |
| PUT | `/:id/rrhh` | requireAuth, requireAdmin | RR.HH. valida. Requiere que jefe haya aprobado. Estado → "Aprobado" o "Rechazado". Opción de descontar salario. |
| GET | `/:id/pdf` | requireAuth | Genera HTML imprimible del formulario de solicitud de permiso. Incluye todos los datos, checkboxes de tipos, secciones de firmas, sección de RR.HH., leyenda de licencias por ley. `window.print()` auto-ejecuta. |
| DELETE | `/:id` | requireAuth, requireAdmin | Elimina permiso (solo si estado="Pendiente") |

---

## 7. Frontend — Arquitectura de Componentes

### 7.1 Estructura de Navegación

```
App.tsx (NotifProvider > ErrorBoundary > AppInner)
├── Login.tsx (si no hay sesión)
├── Header (nav pills + MarcacionesUI + user badge + logout)
└── Main Content (AnimatePresence con tabs):
    ├── dashboard   → Dashboard.tsx
    ├── registro     → RegistroOperativo.tsx
    ├── misregistros → MisRegistros.tsx
    ├── import       → ExcelImporter.tsx
    ├── pedidos      → PedidosAdmin.tsx
    ├── presupuestos → PresupuestosAdmin.tsx
    ├── hojasruta    → HojasRutaAdmin.tsx
    ├── mistareas    → MisTareas.tsx
    ├── reportes     → Reportes.tsx
    └── admin        → AdminPanel.tsx
                         ├── RegistroManualForm.tsx
                         ├── ClientesTab.tsx
                         ├── ProyectosTab.tsx
                         ├── SucursalesTab.tsx
                         ├── CarteraClientesTab.tsx
                         ├── ColaboradoresTab.tsx
                         ├── PermisosTab.tsx       ← NUEVO
                         ├── VehiculosAdminView.tsx
                         ├── TimelineMarcaciones.tsx
                         ├── HojasRutaMarcacionAdmin.tsx
                         └── AuditLogTab.tsx
```

### 7.2 Componentes Clave

#### `App.tsx`
- **Estado global:** `session` (usuario logueado), `dbState` (DatabaseState completa), `activeTab`, `markupRate`, `isImporting`, `vehicleEditId`, `adminSubTab`, `pedidosCache`
- **Persistencia local:**
  - `sessionStorage['afull_active_tab']` — tab activo (sobrevive F5)
  - `localStorage['afull_markup_rate']` — tasa de markup para reportes
- **Carga inicial:** `checkAuthStatus()` → `GET /api/auth/me` → `GET /api/data`
- **Handlers principales:** `handleAddManualRegistro`, `handleEditRegistro`, `handleDeleteRegistro`, `handleAddClienteObj`, `handleEditClienteObj`, `handleDeleteClienteObj`, `handleAddProyectoObj`, `handleEditProyectoObj`, `handleDeleteProyectoObj`, `handleAddColaboradorObj`, `handleEditColaboradorObj`, `handleDeleteColaboradorObj`, `handleImportConfirmed`, `handleResetDatabase`
- **Resiliencia de sesión:** Si `/api/data` falla con 401, verifica con `/api/auth/me` antes de cerrar sesión. Si el server está caído, mantiene la sesión (no cierra sesión por errores transitorios).

#### `Login.tsx`
- Form de usuario/password
- `POST /api/auth/login` → setea cookie JWT httpOnly
- Callback `onLoginSuccess(user)` → App setea sesión

#### `Dashboard.tsx`
- Vista principal del Admin
- Muestra: totales de registros, clientes, proyectos, colaboradores
- Gráficos con recharts (ingresos por concepto, registros por colaborador)
- Tabla de registros recientes con delete/edit
- Navegación a importar y a edición de vehículos

#### `RegistroOperativo.tsx`
- **Accesible por Admin y Operario**
- Form de carga rápida de registro MO
- Timer integrado (start/stop/pause/resume)
- Viaje integrado (start/stop)
- Carga de fotos
- `POST /api/registros` para crear
- `POST /api/timer/start`, `/api/timer/stop` para timer
- `POST /api/viaje/start`, `/api/viaje/stop` para viajes

#### `MisRegistros.tsx`
- **Solo Operario** (oculto para Admin)
- Lista registros filtrados por `colaboradorId` del usuario logueado
- `GET /api/registros/mis-registros`
- Filtro por fecha, edición inline

#### `MisTareas.tsx`
- **Solo Operario** (oculto para Admin)
- Lista tareas de hojas de ruta asignadas al operario
- `GET /api/operario/tareas` y `GET /api/operario/tareas/hoy`
- `PUT /api/operario/tareas/:tareaId` para cambiar estado

#### `ExcelImporter.tsx`
- **Solo Admin**
- Upload de archivo Excel (`POST /api/import-excel` con multer)
- Parsea y preview de datos
- Confirmación → `POST /api/import/confirm`
- Progreso animado con overlay glassmorphic

#### `PedidosAdmin.tsx`
- **Solo Admin**
- Lista pedidos (`GET /api/admin/pedidos`)
- Cambio de estado, asignación de factura, fecha de fin
- Conversión de pedido → registro (`POST /api/admin/pedidos/:id/convertir`)
- Filtros y detalle modal

#### `PresupuestosAdmin.tsx`
- **Solo Admin**
- Lista presupuestos (`GET /api/admin/presupuestos`)
- Crear/editar presupuestos con items (Insumo, Adquisicion, ManoDeObra, Entrega)
- Cálculo de markup, costoTotal, venta1, venta2
- Envío al cliente (`POST /:id/enviar`)
- Conversión a registro (`POST /:id/convertir`)
- Generación de Orden de Trabajo (`POST /:id/orden-trabajo`)

#### `HojasRutaAdmin.tsx`
- **Solo Admin**
- Lista hojas de ruta (`GET /api/admin/hojas-ruta`)
- Crear desde Orden de Trabajo
- Asignar tareas a colaboradores/operarios
- Generar mensaje WhatsApp (`POST /:id/whatsapp`)
- Editar estado de tareas

#### `Reportes.tsx`
- **Solo Admin**
- Gráficos de recharts: ingresos por concepto, por colaborador, por cliente
- Markup configurable (persistido en localStorage)
- Pre-facturación

#### `AdminPanel.tsx`
- **Solo Admin**
- Sidebar con 11 subtabs (ver 7.1)
- Delegación a componentes hijos con callbacks

#### `MarcacionesUI.tsx`
- Widget de marcación (entrada/salida)
- Geolocalización (navigator.geolocation)
- `POST /api/marcacion/entrada` y `/api/marcacion/salida`
- Visible en el header para todos los usuarios autenticados

#### `PermisosTab.tsx` — *NUEVO*
- Pestaña dentro de AdminPanel
- Lista solicitudes de permiso (`GET /api/permisos`)
- Crear solicitud (autocompleta datos del colaborador)
- Aprobar/rechazar como jefe (`PUT /api/permisos/:id/jefe`)
- Validar como RR.HH. con modal (`PUT /api/permisos/:id/rrhh`)
- Imprimir PDF (`GET /api/permisos/:id/pdf` → abre en nueva ventana)
- Eliminar (`DELETE /api/permisos/:id`)
- Filtros por estado

### 7.3 Componentes Shared

#### `AdminShared.tsx`
- `AdminSection` — wrapper de sección con título, icono, descripción
- `DataCard` — tarjeta de datos con título, subtítulo, badge, icono, children

#### `Pagination.tsx`
- Componente de paginación reutilizable
- Props: currentPage, totalPages, itemsPerPage, totalItems, pageNumbers, onPageChange, onItemsPerPageChange

#### `ConfirmModal.tsx` / `NotifContext.tsx`
- `NotifProvider` — contexto global de notificaciones
- `showToast(message, type)` — toast notifications
- `requestConfirm(title, message, type, onConfirm, confirmLabel)` — modal de confirmación

#### `lib/tableUtils.ts`
- `useSortAndPaginate<T, SortField>` — hook de sorting + paginación
- Props: defaultSortField, defaultSortOrder, defaultItemsPerPage, resetDeps

#### `authFetch.ts`
- `authFetch(url, options)` — wrapper de fetch que incluye credentials: 'include'
- `authFetchJSON<T>(url, options)` — igual pero parsea JSON y maneja errores de auth
- `clearCSRFToken()` — limpia token CSRF cacheado

---

## 8. Módulos del Sistema

### 8.1 Módulo de Autenticación
- **Archivos:** server-auth.ts, auth.routes.ts, Login.tsx, App.tsx
- **Persistencia:** JWT en cookie httpOnly (12h expiración), usuario en DB tabla `usuarios`
- **RBAC:** 3 roles (Admin, Operador, Visor) → filtrado en frontend (tabs) + backend (middlewares)

### 8.2 Módulo de Registro Operativo
- **Archivos:** RegistroOperativo.tsx, RegistroManualForm.tsx, registros.routes.ts, timer.routes.ts, viaje.routes.ts
- **Funciones:** Carga manual de registros MO/Insumo/Vehículo, timer con pausas, viajes con odómetro
- **Persistencia:** tabla `registros`, `timer_activos`, `viajes_activos`, `registros_vehiculo`
- **Conexión:** Registro → Cliente + Proyecto + Colaborador. Timer stop → crea Registro. Viaje stop → crea RegistroVehiculo.

### 8.3 Módulo de Clientes y Proyectos
- **Archivos:** ClientesTab.tsx, ProyectosTab.tsx, clientes.routes.ts, proyectos.routes.ts
- **Persistencia:** tablas `clientes`, `proyectos`
- **Conexión:** Cliente 1:N Proyectos. Proyecto → usado en Registros. Cliente → usado en Pedidos, Presupuestos.

### 8.4 Módulo de Colaboradores
- **Archivos:** ColaboradoresTab.tsx, colaboradores.routes.ts
- **Persistencia:** tablas `colaboradores`, `usuarios` (vinculados)
- **Campos:** nombre, tarifaSugerida, rol, ci, cargo, departamento, jefeInmediato
- **Conexión:** Colaborador → Usuario (1:1 opcional). Colaborador → Registros (MO). Colaborador → HojaRutaTareas. Colaborador → Permisos.

### 8.5 Módulo de Pedidos (Portal → Admin)
- **Archivos:** PedidosAdmin.tsx, PedidoDetalleModal.tsx, portal.routes.ts, pedidos.routes.ts
- **Persistencia:** tablas `pedidos`, `sucursales`
- **Flujo:** Cliente crea pedido en portal → Admin lo ve → Admin cambia estado → Admin convierte a Registro
- **Conexión:** Pedido → Cliente + Sucursal. Pedido → Presupuesto. Pedido → Registro (al convertir).

### 8.6 Módulo de Presupuestos
- **Archivos:** PresupuestosAdmin.tsx, presupuestos.routes.ts
- **Persistencia:** tablas `presupuestos`, `presupuesto_items`, `ordenes_trabajo`
- **Flujo:** Admin crea presupuesto desde pedido → agrega items → envía al cliente → cliente responde en portal → si aprobado → convierte a Registro o genera OT
- **Cálculos:** total = Σ(items.total), costoTotal = Σ(items sin markup), venta1/venta2 = escenarios de precio, markup configurable

### 8.7 Módulo de Hojas de Ruta
- **Archivos:** HojasRutaAdmin.tsx, hojasRuta.routes.ts, operario.routes.ts, MisTareas.tsx
- **Persistencia:** tablas `hojas_ruta`, `hojas_ruta_tareas`, `ordenes_trabajo`
- **Flujo:** OT → Admin crea HojaRuta → asigna tareas a operarios → operario ve en "Mis Tareas" → cambia estado → Admin envía WhatsApp
- **Conexión:** HojaRuta → OrdenTrabajo → Presupuesto → Pedido. HojaRutaTarea → Colaborador.

### 8.8 Módulo de Marcaciones
- **Archivos:** MarcacionesUI.tsx, TimelineMarcaciones.tsx, HojasRutaMarcacionAdmin.tsx, marcacion.routes.ts
- **Persistencia:** tablas `marcaciones`, `hojas_ruta_marcacion`, `hoja_ruta_marcacion_operarios`, `geocerca_config`
- **Funciones:** Entrada/salida con geolocalización, validación de geocerca, timeline admin, grupos de marcación
- **Geocerca:** Config singleton en `geocerca_config` (lat, lng, radioMetros)

### 8.9 Módulo de Vehículos
- **Archivos:** VehiculosAdminView.tsx, vehiculos/VehiculosAnalysis.tsx, vehiculos/VehiculosStats.tsx, vehiculo.routes.ts
- **Persistencia:** tabla `registros_vehiculo`
- **Funciones:** Registro de km, combustible, discrepancias GPS vs odómetro, consumo por km, análisis y stats

### 8.10 Módulo de Cartera de Clientes
- **Archivos:** CarteraClientesTab.tsx, cartera.routes.ts
- **Persistencia:** tablas `cartera_clientes`, `cartera_contactos`, `cartera_marcas`
- **Nota:** Independiente del `Cliente` operativo. Es un CRM separado.

### 8.11 Módulo de Importación Excel
- **Archivos:** ExcelImporter.tsx, import.routes.ts
- **Persistencia:** Crea en tablas `clientes`, `proyectos`, `registros` (transacción masiva)
- **OCR:** tesseract.js para extraer texto de imágenes
- **AI:** Google Gemini para enriquecimiento de datos

### 8.12 Módulo de Reportes
- **Archivos:** Reportes.tsx
- **Datos:** Lee de `dbState` (cargado desde `/api/data`)
- **Gráficos:** recharts (bar, line, pie)
- **Markup:** Persistido en localStorage, aplicado a cálculos de venta

### 8.13 Módulo de Permisos (RR.HH.) — *NUEVO*
- **Archivos:** PermisosTab.tsx, permisos.routes.ts
- **Persistencia:** tabla `permisos`, campos en `colaboradores` (ci, cargo, departamento, jefeInmediato)
- **Flujo:** Admin crea solicitud → jefe aprueba → RR.HH. valida → generar PDF imprimible
- **PDF:** HTML generado server-side con `window.print()` para guardar como PDF
- **Tipos:** 10 tipos de permiso según leyes paraguayas (Ley 5508/16, Ley 3384/07, Art. 62 CT, Art. 133 CT)

### 8.14 Módulo de Auditoría
- **Archivos:** AuditLogTab.tsx, audit.routes.ts, server-audit.ts
- **Persistencia:** tabla `audit_events`
- **Eventos registrados:** login, logout, create/update/delete de clientes, proyectos, colaboradores, pedidos, permisos, clear_database

---

## 9. Portal de Clientes

### 9.1 Acceso
- **Sin login.** Autenticación por `tokenPortal` en la URL: `/portal/:token`
- El token está en `Cliente.tokenPortal` (64 chars, único, opcional)
- El admin genera/revoca el token con flags `activarPortal`/`revocarPortal` (no persistidos, son comandos)

### 9.2 Rutas del Portal

| URL | Componente | API |
|---|---|---|
| `/portal/:token` | PortalApp | `GET /api/portal/:token?page=N&limit=10` |
| (acción interna) | PedidoForm | `POST /api/portal/:token/pedido` |
| (acción interna) | PedidoForm | `POST /api/portal/:token/sucursal` |
| (acción interna) | PresupuestosPortal | `GET /api/portal/:token/presupuestos` |
| (acción interna) | PresupuestosPortal | `POST /api/portal/:token/presupuestos/:id/responder` |

### 9.3 Funcionalidades del Cliente

- Ver sus datos (nombre en header)
- Ver historial de pedidos (paginado 10/página, con foto ampliada)
- Crear nuevo pedido (local, descripción máx 1000 chars, cantidad, foto base64 máx 3MB)
- Crear nueva sucursal
- Auto-selección de sucursal única
- Ver presupuestos enviados (excluye Borrador y En Proceso)
- Expandir presupuesto (items por categoría, subtotales, fotos)
- Responder presupuesto (Aprobar/Rechazar + comentario)

---

## 10. Comparativa de Roles

### 10.1 ADMIN

**Tabs visibles:** Panel, Importar, Pedidos, Presupuestos, Hojas de Ruta, Reportes, Administración
**Tabs ocultos:** Mis Registros, Mis Tareas (redundante para admin)

**Puede:**
- Todo el CRUD de clientes, proyectos, colaboradores, sucursales
- Gestión de usuarios (crear, editar, eliminar, suspender)
- Importar Excel
- Gestionar pedidos (cambiar estado, convertir a registro)
- Crear/enviar/convertir presupuestos
- Crear hojas de ruta y asignar tareas
- Generar órdenes de trabajo
- Enviar WhatsApp a operarios
- Ver reportes y dashboards
- Limpiar la base de datos completa
- Gestionar cartera de clientes (CRM separado)
- Ver timeline de marcaciones de todos
- Gestionar grupos de marcación
- Ver audit log
- Gestionar permisos de RR.HH. (crear, aprobar como jefe, validar como RR.HH., imprimir)
- Editar/eliminar cualquier registro (no solo los propios)
- Editar/eliminar registros de vehículos

### 10.2 OPERADOR (Operario)

**Tabs visibles:** Registro, Mis Registros, Mis Tareas
**Tabs ocultos:** Todo lo demás

**Puede:**
- Cargar registros operativos (MO, Insumo, Vehículo)
- Usar timer (start/stop/pause/resume)
- Usar viajes (start/stop con odómetro)
- Ver y editar SUS registros (filtrado por colaboradorId)
- Marcar entrada/salida (con geolocalización)
- Ver y actualizar SUS tareas de hojas de ruta (cambiar estado, notas, foto)

**No puede:**
- Ver dashboard, reportes, importar
- Gestionar clientes, proyectos, colaboradores
- Gestionar pedidos, presupuestos, hojas de ruta (admin)
- Crear/eliminar usuarios
- Ver marcaciones de otros
- Limpiar la base de datos
- Gestionar cartera
- Gestionar permisos

### 10.3 VISOR

**Tabs visibles:** Ninguno (todos son adminOnly excepto registro, pero requireWriteAccess bloquea la creación)

**Puede:**
- Iniciar sesión (pero prácticamente no puede hacer nada)
- Ver la pantalla de registro (sin poder guardar)

**No puede:**
- Crear, editar o eliminar cualquier cosa (requireWriteAccess bloquea)
- Ver tabs de admin

### 10.4 CLIENTE (Portal)

**Autenticación:** tokenPortal (sin JWT)
**Puede:**
- Ver sus pedidos historial
- Crear pedidos y sucursales
- Ver y responder presupuestos enviados

---

## 11. Tipos de TypeScript (Frontend)

> Archivo: `src/types.ts`

### Interfaces principales

| Interfaz | Modelo Prisma | Notas |
|---|---|---|
| `DatabaseState` | — | Estado global: clientes, proyectos, colaboradores, registros, registrosVehiculo, timersActivos, viajesActivos, usuariosSinColaborador |
| `Cliente` | `Cliente` | — |
| `Proyecto` | `Proyecto` | estado mapeado de enum a string |
| `Colaborador` | `Colaborador` | + campos RR.HH. (ci, cargo, departamento, jefeInmediato). + `usuario?` (linked) |
| `Permiso` | `Permiso` | *NUEVO* — flujo completo de RR.HH. |
| `RegistroItem` | `Registro` | Decimal→number, DateTime→string |
| `RegistroVehiculo` | `RegistroVehiculo` | ubicacionInicio/Fin: any (Json) |
| `TimerActivo` | `TimerActivo` | pauseHistory: any (Json) |
| `ViajeActivo` | `ViajeActivo` | ubicacionInicio: any (Json) |
| `Marcacion` | `Marcacion` | — |
| `Pedido` | `Pedido` | + campos enriquecidos del portal |
| `Presupuesto` | `Presupuesto` | + items?, pedido? (anidado) |
| `PresupuestoItem` | `PresupuestoItem` | — |
| `OrdenTrabajo` | `OrdenTrabajo` | — |
| `CarteraCliente` | `CarteraCliente` | + _count (contactos, marcas) |
| `CarteraContacto` | `CarteraContacto` | + clienteNombre (de relación) |
| `CarteraMarca` | `CarteraMarca` | + clienteNombre |
| `Usuario` | `Usuario` | rol mapeado a UI |
| `JWTPayload` | — | usuario, nombre, rol, colaboradorId, iat, exp |
| `LoginRequest` | — | usuario, password |
| `LoginResponse` | — | success, token?, user?, error? |
| `ApiResponse<T>` | — | Wrapper: success, data?, error?, message? |
| `ApiError` | — | code, message, details? |

---

## 12. Persistencia y Estado

### 12.1 Capas de Persistencia

| Capa | Tecnología | Datos |
|---|---|---|
| Base de Datos | Supabase (PostgreSQL) via Prisma | Toda la data persistente |
| Storage | Supabase Storage | Fotos de pedidos, odómetros |
| Cache en memoria (server) | `userActiveCache` Map | Estado activo de usuarios (TTL 60s) |
| Session Storage (browser) | sessionStorage | Tab activo (`afull_active_tab`) |
| Local Storage (browser) | localStorage | Markup rate (`afull_markup_rate`) |
| Cookie httpOnly | Cookie `jwt` | Token JWT (12h, no accesible por JS) |
| File System | `/uploads` | Uploads temporales (multer) |

### 12.2 Estado del Frontend

```
App.tsx
├── session: SessionUser | null          ← desde /api/auth/me
├── dbState: DatabaseState | null         ← desde /api/data
│   ├── clientes: Cliente[]
│   ├── proyectos: Proyecto[]
│   ├── colaboradores: Colaborador[]
│   ├── registros: RegistroItem[]
│   ├── registrosVehiculo: RegistroVehiculo[]
│   ├── timersActivos: TimerActivo[]
│   ├── viajesActivos: ViajeActivo[]
│   └── usuariosSinColaborador?: Usuario[]
├── activeTab: TabType                    ← sessionStorage
├── markupRate: number                    ← localStorage
├── pedidosCache: any[]                   ← fetch on-demand
└── vehicleEditId / adminSubTab           ← navegación inter-module
```

### 12.3 Estrategia de Actualización

- **Carga inicial:** `GET /api/data` carga TODO en un request paralelo (Promise.all)
- **Updates locales:** Después de cada CRUD, App.tsx actualiza `dbState` localmente (optimistic update sin refetch completo)
- **Refetch completo:** `fetchDbState()` recarga todo desde `/api/data` (ej: después de importación)
- **Resiliencia:** Si un request falla por error transitorio, NO se cierra sesión. Se verifica con `/api/auth/me` antes de logout.

---

## 13. Jobs y Procesos en Background

### 13.1 Pedidos Retention Job

**Archivo:** `src/server/jobs/pedidosRetention.ts`
**Frecuencia:** Cada 24 horas
**Función:** Archiva pedidos con más de 90 días de antigüedad
- `UPDATE pedidos SET archivado = true, archivado_at = now() WHERE archivado = false AND fecha_solicitud < NOW() - INTERVAL '90 days'`
- Loggea resultados

### 13.2 Seed de Usuarios

**Ejecución:** Al arrancar el servidor (`server.ts`)
**Función:** `seedUsersIfEmpty()`
- Si tabla `usuarios` está vacía → crea 4 usuarios (admin + 3 operadores)
- Si tabla `colaboradores` está vacía → crea 3 colaboradores default
- Si tabla `clientes` está vacía → crea 3 clientes default
- Si tabla `proyectos` está vacía → crea 3 proyectos default

---

## 14. Flujos de Datos End-to-End

### 14.1 Flujo: Cliente hace pedido → Admin lo procesa

```
1. [Cliente Portal] Form de pedido
   → POST /api/portal/:token/pedido
   → Crea en tabla `pedidos` (estado="Pendiente", prioridad="Media")
   
2. [Admin] PedidosAdmin.tsx
   → GET /api/admin/pedidos
   → Ve el pedido, cambia estado, agrega factura
   → PUT /api/admin/pedidos/:id
   
3. [Admin] Convierte pedido → Registro
   → POST /api/admin/pedidos/:id/convertir
   → Crea `Registro` vinculado (registroId en Pedido)
   
4. [Admin] Crea presupuesto desde pedido
   → POST /api/admin/presupuestos
   → Agrega items, calcula markup
   → POST /api/admin/presupuestos/:id/enviar
   → estado="Enviado", fechaEnvio=now
   
5. [Cliente Portal] Ve presupuesto, responde
   → GET /api/portal/:token/presupuestos
   → POST /api/portal/:token/presupuestos/:id/responder
   → estado="Aprobado" o "Rechazado"
   
6. [Admin] Si aprobado → genera Orden de Trabajo
   → POST /api/admin/presupuestos/:id/orden-trabajo
   → Crea `OrdenTrabajo`
   
7. [Admin] Crea Hoja de Ruta desde OT
   → POST /api/admin/hojas-ruta
   → Asigna tareas a operarios
   
8. [Operario] Ve sus tareas
   → GET /api/operario/tareas
   → PUT /api/operario/tareas/:tareaId (cambia estado)
```

### 14.2 Flujo: Operario carga registro con timer

```
1. [Operario] RegistroOperativo.tsx
   → Selecciona cliente, proyecto
   → POST /api/timer/start (crea TimerActivo)
   
2. [Operario] Pausa (almuerzo, etc.)
   → POST /api/timer/pause (registra motivo)
   → POST /api/timer/resume
   
3. [Operario] Detiene timer
   → POST /api/timer/stop
   → Calcula hsTotal (con pausas descontadas)
   → Crea `Registro` (concepto=MO, cantidad=hsTotal, total=hsTotal×precioUnitario)
   → Elimina TimerActivo
   
4. [Operario] Ve en Mis Registros
   → GET /api/registros/mis-registros (filtrado por colaboradorId)
```

### 14.3 Flujo: Solicitud de Permiso (RR.HH.)

```
1. [Admin] PermisosTab.tsx
   → Selecciona colaborador (autocompleta CI, cargo, depto, jefe)
   → Selecciona tipo de permiso, modo (horas/días), fechas
   → POST /api/permisos
   → Crea `Permiso` (estado="Pendiente")
   
2. [Jefe] Aprueba/Rechaza
   → PUT /api/permisos/:id/jefe
   → estado="AprobadoJefe" o "Rechazado"
   
3. [RR.HH.] Valida
   → PUT /api/permisos/:id/rrhh (con decisión, comentario, descontarSalario)
   → estado="Aprobado" o "Rechazado"
   
4. [Admin] Imprime PDF
   → GET /api/permisos/:id/pdf
   → HTML con formulario completo → window.print() → guardar como PDF
```

### 14.4 Flujo: Importación Excel

```
1. [Admin] ExcelImporter.tsx
   → Upload archivo Excel
   → POST /api/import-excel (multer + xlsx + tesseract.js)
   → Parsea y preview
   
2. [Admin] Confirma importación
   → POST /api/import/confirm
   → Transacción masiva: crea clientes, proyectos, registros
   → Mapea nombres a IDs existentes
   → Recarga dbState (fetchDbState)
```

### 14.5 Flujo: Marcación con Geocerca

```
1. [Cliente] MarcacionesUI.tsx
   → navigator.geolocation.getCurrentPosition()
   → GET /api/marcacion/config (obtiene geocerca)
   → POST /api/marcacion/entrada (con lat, lng, precision, ip, userAgent)
   → Valida si está dentro de geocerca (opcional)
   → Crea `Marcacion` (tipo="entrada", origen="APP")
   
2. [Admin] TimelineMarcaciones.tsx
   → GET /api/marcacion/admin/timeline
   → Ve todas las marcaciones con ubicación
```

---

## APÉNDICE A: Conexiones entre Módulos

```
Cliente ──1:N──→ Proyecto
  ├──1:N──→ Registro ←──N:1── Proyecto
  ├──1:N──→ Pedido ──1:N──→ Presupuesto ──1:N──→ PresupuestoItem
  ├──1:N──→ Sucursal ──1:N──→ Pedido
  └──1:N──→ Presupuesto

Colaborador ──1:N──→ Registro
  ├──1:N──→ HojaRutaTarea
  ├──1:1?──→ Usuario
  └──1:N──→ Permiso

Presupuesto ──1:1?──→ OrdenTrabajo ──1:1?──→ HojaRuta ──1:N──→ HojaRutaTarea
  └──1:1?──→ Registro

Pedido ──1:1?──→ Registro (al convertir)
  └──1:N──→ Presupuesto

Usuario ──N:1?──→ Colaborador
  └──rol: ADMIN | OPERADOR | VISOR

CarteraCliente ──1:N──→ CarteraContacto
  └──1:N──→ CarteraMarca
  (Independiente de Cliente operativo)

HojaRutaMarcacion ──1:N──→ HojaRutaMarcacionOperario
  (Grupos de marcación, separado de HojaRuta)
```

## APÉNDICE B: Variables de Entorno

| Variable | Uso | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Prisma pooler connection | Sí |
| `DIRECT_URL` | Prisma direct connection (migraciones) | Sí |
| `JWT_SECRET` | Firma de JWT (mín 32 chars) | Sí |
| `JWT_EXPIRES_IN` | Expiración del token (default 12h) | No |
| `PORT` | Puerto del servidor (default 3100) | No |
| `NODE_ENV` | Entorno (production/development) | No |
| `CORS_ORIGIN` | Origins permitidos para CORS | Sí |
| `SUPABASE_URL` | URL de Supabase Storage | No |
| `SUPABASE_KEY` | Key de Supabase | No |
| `GEMINI_API_KEY` | Google Gemini AI | No |

---

*Fin del documento. Toda la información fue extraída directamente del código fuente del proyecto `sistema-afull-googleia`.*
