# Sistema aFull — Documento Técnico y Arquitectónico

**Versión 2.0 | Agosto 2026**
**Documento para presentación a stakeholders**

---

## 1. Resumen Ejecutivo

Sistema aFull es una **plataforma integral de gestión operativa** desarrollada a medida para una empresa de servicios gráficos y ploteo en Paraguay. Automatiza el registro de horas de mano de obra, consumo de insumos, importación de planillas Excel y control de viajes en vehículo con verificación GPS, reemplazando procesos manuales en papel o planillas sueltas por un sistema centralizado, seguro y con capacidades de reportería y pre-facturación.

---

## 2. Arquitectura General

### 2.1 Modelo de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR WEB                           │
│  React 19 + Vite + Tailwind CSS 4 + Motion + Recharts      │
│  (localhost:3100 en dev / dominio propio en prod)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (REST JSON)
                           │ JWT en cookie httpOnly
                           │ CSRF tokens
┌──────────────────────────▼──────────────────────────────────┐
│               SERVIDOR MONOLÍTICO Node.js                   │
│  Express 4 + TypeScript (server.ts)                         │
│  ┌─────────────┬──────────────┬─────────────────────────┐  │
│  │ server-     │ server-      │ server-audit.ts         │  │
│  │ auth.ts     │ validation   │ (JSONL audit log)       │  │
│  │ (JWT+bcrypt)│ .ts (Zod)    │                         │  │
│  └─────────────┴──────────────┴─────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────┐
│              PostgreSQL (Supabase Cloud)                     │
│  Tablas: clientes, proyectos, colaboradores, registros,     │
│          registros_vehiculo, timers_activos, viajes_activos,│
│          usuarios, marcaciones, audit_events, pedidos       │
│  + Supabase Storage (fotos de odómetro y pedidos)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PORTAL DE PEDIDOS (página pública)              │
│  /portal/:token — sin login, link compartible por cliente   │
│  El cliente carga: Local, Descripción, Cantidad (+ foto)    │
│  Se vincula automáticamente a clientes/proyectos en BD      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico Completo

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Runtime** | Node.js + TypeScript | Lenguaje principal |
| **Backend** | Express 4 | Servidor HTTP/REST |
| **Frontend** | React 19 | UI declarativa |
| **Bundler** | Vite 6 | Dev server + build |
| **Estilos** | Tailwind CSS 4 | Utility-first CSS + glassmorphism |
| **Animaciones** | Motion (Framer Motion) | Transiciones y micro-interacciones |
| **Gráficos** | Recharts | Charts interactivos (área, pie, barras) |
| **Íconos** | Lucide React | Iconografía consistente |
| **ORM** | Prisma | Mapeo objeto-relacional |
| **Base de Datos** | PostgreSQL (Supabase) | Almacenamiento principal |
| **Storage** | Supabase Storage | Fotos de odómetro |
| **Auth** | JWT + bcryptjs | Autenticación y autorización |
| **Validación** | Zod | Schemas de validación de entrada |
| **Sanitización** | DOMPurify | Prevención XSS |
| **Excel** | SheetJS (xlsx) | Parseo y exportación |
| **OCR** | Tesseract.js | Lectura de kilómetros del odómetro |
| **IA (opcional)** | Google Gemini | Enriquecimiento de descripciones |
| **Testing** | Vitest + Testing Library + Playwright | Tests unitarios, integración y E2E |
| **PWA** | Service Worker | Instalación nativa en PC y móvil |

---

## 3. Modelo de Datos

### 3.1 Diagrama Entidad-Relación

```
┌──────────┐       ┌───────────┐       ┌──────────────┐
│  Cliente │ 1───N │ Proyecto  │ 1───N │   Registro   │
│          │       │           │       │ (MO/Insumos)  │
└──────────┘       └───────────┘       └──────┬───────┘
     │                                        │ N───1
     │ 1───N                          ┌───────▼───────┐
     │                    ┌───────────│  Colaborador   │
     │                    │           └───────────────┘
     │           ┌────────▼────────┐
     │           │RegistroVehiculo │ (viajes con GPS)
     │           └─────────────────┘
     │
     ├─── TimerActivo (sesiones de trabajo en curso)
     ├─── ViajeActivo (viajes de vehículo activos)
     ├─── Usuario (cuentas de acceso)
     ├─── Marcacion (geofencing de entrada/salida)
     └─── AuditEvent (auditoría en base de datos)
```

### 3.2 Tablas Principales

**clientes** — Empresas y razones sociales
- `id`, `nombre`, `codigo`, `fecha_creacion`

**proyectos** — Obras o trabajos asociados a un cliente
- `id`, `cliente_id`, `nombre`, `estado` (Pendiente/En Proceso/Completado), `fecha_inicio`
- Relación cascade: al eliminar un cliente se eliminan sus proyectos

**colaboradores** — Técnicos, operarios y contratistas
- `id`, `nombre`, `tarifa_sugerida` (Gs./minuto), `rol`

**registros** — Partes diarios de trabajo (tabla principal de negocio)
- `id`, `cliente_id`, `proyecto_id`, `fecha`, `concepto` (MO/Insumo/Vehículo)
- `descripcion`, `colaborador_id`
- `hs_inicio`, `hs_fin`, `hs_total`
- `cantidad`, `precio_unitario`, `total`
- `origen` (Manual/Excel), `fecha_importacion`

**registros_vehiculo** — Viajes en vehículo con tracking GPS
- `km_inicial`, `km_final`, `distancia_odometro`, `distancia_gps`
- `combustible_litros`, `combustible_costo`, `consumo_por_km`
- `ubicacion_inicio`, `ubicacion_fin` (JSON)
- `foto_odometro_inicio`, `foto_odometro_fin` (Supabase Storage)
- `alerta_discrepancia` (>20% diferencia GPS vs odómetro)

**timers_activos** — Sesiones de trabajo con pause/resume
**viajes_activos** — Viajes de vehículo en curso
**marcaciones** — Geofencing de fichajes entrada/salida con IP y dispositivo
**audit_events** — Auditoría en base de datos

**pedidos** — Pedidos cargados por clientes externos vía portal público
- `id`, `cliente_id`, `proyecto_id` (Local), `descripcion`, `cantidad`
- `tipo`, `prioridad`, `estado` (Pendiente/En Proceso/Completado/Entregado)
- `foto_url` (Supabase Storage), `fecha_solicitud`, `fecha_fin`, `factura_numero`
- `registro_id` — FK opcional al registro generado al convertir el pedido
- El campo `token_portal` en `clientes` habilita el link compartible del portal

---

## 4. Flujos Principales

### 4.1 Importación de Excel

1. **Subir archivo**: Drag & drop de .xlsx/.xls/.csv
2. **Parseo inteligente**: Detección automática de columnas en español, conversión de fechas y horas Excel
3. **Preview editable**: Tabla con conceptos, cantidades y precios ajustables
4. **Confirmación**: Transacción atómica en BD con UPSERT de clientes/proyectos

### 4.2 Registro de Horas con Timer

- Timer híbrido: servidor (Prisma) + localStorage para resistencia a refrescos
- Pause/Resume con historial completo de pausas
- Cálculo automático: duración = (fin - inicio) - tiempoPausado
- Registro automático al finalizar

### 4.3 Registro de Viajes en Vehículo

- **Inicio**: Foto del odómetro con OCR (Tesseract.js), GPS del navegador
- **Fin**: Foto final, km, litros de combustible, costo
- **Cálculos en servidor**: distancia GPS (Haversine), distancia odómetro, discrepancia %
- **Alerta**: >20% diferencia → marcado y visible en el panel
- **Fotos**: Supabase Storage (prod) o filesystem local (dev)
- **Viajes particulares**: IDs especiales, sin cliente/proyecto

### 4.4 Pre-Facturación

- Selección de proyecto → desglose automático de costos
- Markup configurable (default 35%)
- Precio de venta = Costo Base × (1 + Markup)
- Exportación Excel e impresión/PDF

### 4.5 Portal de Pedidos del Cliente

- **Link compartible** por cliente: `https://sistema-afull.onrender.com/portal/{token}` (generado desde Administración → Clientes)
- **El cliente carga**: Local (dropdown), Descripción, Cantidad (+ foto opcional)
- **Sin login**: el token del link autentica el acceso; rate limiting 30 req/min por IP
- **Historial**: el cliente ve sus pedidos anteriores con estado (Pendiente/En Proceso/Completado/Entregado)
- **Vinculación automática**: el Local mapea a un proyecto existente del cliente; los pedidos quedan en la tabla `pedidos` con su `cliente_id`
- **Desde el panel admin**: pestaña "Pedidos" → filtros, cambio de prioridad/estado, y botón "Convertir a Registro" que genera un `Registro` (concepto Insumo, origen API) en la base de datos

---

## 5. Sistema de Seguridad

- **JWT en cookies httpOnly** (no accesible desde JavaScript, 12h expiración)
- **CSRF**: token único por sesión, requerido en mutaciones
- **Rate limiting**: 5 intentos/15min (prod), 20 (dev)
- **RBAC**: Admin vs Operario con permisos diferenciados
- **Bcrypt**: salt 10 rounds para passwords
- **DOMPurify**: sanitización HTML en todos los inputs
- **Helmet**: CSP, HSTS, frameguard, noSniff, XSS filter
- **Auditoría dual**: archivo audit.log (JSONL) + tabla audit_events (PostgreSQL)
- **Geofencing**: Marcaciones de entrada/salida con coordenadas GPS
- **PWA**: Service Worker con estrategia Network-First para caché

---

## 6. Capacidades del Sistema

| Antes | Ahora |
|-------|-------|
| Planillas Excel sueltas | Importación drag & drop con mapeo automático |
| Cálculo manual de horas | Timer automático con pause/resume |
| Sin control de viajes | GPS + foto de odómetro + alerta de discrepancias |
| Sin visibilidad de rentabilidad | Pre-factura con markup configurable |
| Datos sin backup | PostgreSQL en Supabase con backups |
| Sin trazabilidad | Auditoría completa de cada acción |
| Sin control de asistencia | Geofencing de marcaciones entrada/salida |
| Solo PC | PWA instalable en PC y móvil |
| Pedidos por planilla Google/WhatsApp | Portal de pedidos con link compartible por cliente |

---

## 7. Infraestructura

- **Desarrollo**: `npm run dev` → tsx en puerto 3100
- **Producción**: `npm run build` → `npm run start` → Node.js + archivos estáticos
- **Base de datos**: Supabase PostgreSQL con pgBouncer
- **Storage**: Supabase Storage bucket `vehiculos-fotos`
- **Testing**: Vitest (unitarios/integración) + Playwright (E2E)

---

*Documento generado el 3 de agosto de 2026. Preparado para presentación a stakeholders.*
