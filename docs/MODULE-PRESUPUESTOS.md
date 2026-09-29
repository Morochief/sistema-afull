# Documentación Técnica — Módulo de Presupuestos

> **Sistema aFull** — Plataforma de gestión operativa
> **Versión de documentación:** 1.0.0
> **Alcance:** Portal de Clientes + Módulo de Presupuestos (frontend + backend + data-layer)
> **Autoría:** Arquitectura de Software

---

## 1. Resumen Ejecutivo

El módulo de **Presupuestos** implementa un flujo completo de cotización entre **aFull (proveedor)** y sus **clientes**, permitiendo:

1. Que aFull genere presupuestos a partir de pedidos del cliente (con items, markup y comentarios).
2. Que el cliente los visualice en su portal público (sin login, autenticado por token).
3. Que el cliente los **apruebe o rechace** directamente desde el portal.
4. Que aFull pueda **editar y reenviar** presupuestos rechazados, cerrando el ciclo de negociación.
5. Que aFull **convierta** un presupuesto aprobado en registros operativos.

Esta documentación detalla cada cambio realizado en la iteración de desarrollo, el modelo de datos, los contratos de API, las reglas de negocio, la arquitectura del frontend y los flujos de estados.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE (Browser)                     │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Portal Público     │    │     Admin (aFull)           │ │
│  │   /portal/:token     │    │   /admin (con login JWT)    │ │
│  │                      │    │                             │ │
│  │  • PresupuestosPortal│    │  • PresupuestosAdmin        │ │
│  │    (ver, aprobar,    │    │    (CRUD, enviar,          │ │
│  │     rechazar)        │    │     responder, convertir,  │ │
│  │  • PedidoForm        │    │     reenviar, eliminar)    │ │
│  │  • PedidoHistorial   │    │                             │ │
│  └──────────┬───────────┘    └──────────────┬──────────────┘ │
└─────────────┼───────────────────────────────┼────────────────┘
              │                                │
              │  fetch /api/portal/*           │  authFetch /api/admin/*
              │  (sin JWT, token en URL)      │  (con JWT + cookies)
              ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     SERVIDOR (Express + tsx)                 │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   portalRouter       │    │   presupuestosRouter        │ │
│  │   /api/portal/:token │    │   /api/admin/presupuestos    │ │
│  │                      │    │   (requireAuth +             │ │
│  │   • GET /presupuestos│    │    requireAdmin +            │ │
│  │   • POST /presupuestos/│   │    requireWriteAccess)      │ │
│  │     :id/responder    │    │                             │ │
│  └──────────┬───────────┘    └──────────────┬──────────────┘ │
└─────────────┼───────────────────────────────┼────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    PRISMA ORM → PostgreSQL                   │
│                                                              │
│  modelos: Presupuesto, PresupuestoItem, Cliente, Pedido,     │
│           Proyecto, Registro                                 │
└──────────────────────────────────────────────────────────────┘
```

### Capas del sistema

| Capa             | Tecnología                          | Ubicación                           |
|------------------|--------------------------------------|-------------------------------------|
| Frontend Admin   | React + TypeScript + Tailwind CSS    | `src/components/PresupuestosAdmin.tsx` |
| Frontend Portal  | React + TypeScript + Tailwind CSS    | `src/portal/PresupuestosPortal.tsx`  |
| Orquestador Portal| React + TypeScript                  | `src/portal/PortalApp.tsx`           |
| Tipos compartidos| TypeScript interfaces               | `src/types.ts`                       |
| API Admin        | Express Router                      | `src/server/routes/presupuestos.routes.ts` |
| API Portal        | Express Router                      | `src/server/routes/portal.routes.ts`  |
| ORM              | Prisma                              | `prisma/schema.prisma`               |
| Base de datos    | PostgreSQL                          | externa                              |

---

## 3. Modelo de Datos

### 3.1. Modelo `Presupuesto`

**Esquema Prisma** (`prisma/schema.prisma`, líneas 149–178):

```prisma
model Presupuesto {
  id                String    @id @db.VarChar(50)
  pedidoId          String    @map("pedido_id") @db.VarChar(50)
  clienteId         String    @map("cliente_id") @db.VarChar(50)
  clienteNombre     String    @map("cliente_nombre")
  proyecto          String    @db.VarChar(200)
  contacto          String?   @db.VarChar(200)
  fechaInicio       DateTime? @map("fecha_inicio")
  fechaTope         DateTime? @map("fecha_tope")
  estado            String    @default("Borrador") @db.VarChar(30)
  total             Decimal   @db.Decimal(15, 2)
  markup            Decimal   @default(0.35) @db.Decimal(5, 2)
  comentarioCliente String?   @map("comentario_cliente") @db.Text
  respuestaCliente  String?   @map("respuesta_cliente") @db.Text
  fechaEnvio        DateTime? @map("fecha_envio")
  fechaRespuesta    DateTime? @map("fecha_respuesta")
  registroId        String?   @unique @map("registro_id") @db.VarChar(50)
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  pedido   Pedido           @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  cliente  Cliente          @relation(fields: [clienteId], references: [id])
  items    PresupuestoItem[]
  registro Registro?        @relation(fields: [registroId], references: [id])

  @@index([clienteId])
  @@index([pedidoId])
  @@index([estado])
  @@map("presupuestos")
}
```

**Tabla SQL:** `presupuestos`

| Campo                | Tipo SQL          | Nulo | Default      | Descripción                                  |
|----------------------|-------------------|------|--------------|----------------------------------------------|
| `id`                 | VARCHAR(50) PK    | No   | —            | Identificador (prefijo `pre_`)               |
| `pedido_id`          | VARCHAR(50) FK    | No   | —            | Pedido origen (cascade delete)               |
| `cliente_id`         | VARCHAR(50) FK    | No   | —            | Cliente destinatario                         |
| `cliente_nombre`     | TEXT              | No   | —            | Desnormalización para listados                |
| `proyecto`           | VARCHAR(200)      | No   | —            | Nombre del proyecto cotizado                 |
| `contacto`           | VARCHAR(200)      | Sí   | NULL         | Persona de contacto del cliente               |
| `fecha_inicio`       | TIMESTAMP        | Sí   | NULL         | Fecha de inicio estimada                      |
| `fecha_tope`         | TIMESTAMP        | Sí   | NULL         | Fecha límite de entrega                       |
| `estado`             | VARCHAR(30)      | No   | `'Borrador'` | Estado en la máquina de estados               |
| `total`              | DECIMAL(15,2)    | No   | —            | Total calculado con markup                    |
| `markup`             | DECIMAL(5,2)     | No   | `0.35`       | Porcentaje de markup (35% por defecto)        |
| `comentario_cliente` | TEXT             | Sí   | NULL         | Nota de aFull al cliente                      |
| `respuesta_cliente`  | TEXT             | Sí   | NULL         | Comentario del cliente al responder           |
| `fecha_envio`        | TIMESTAMP        | Sí   | NULL         | Momento del envío al portal                   |
| `fecha_respuesta`    | TIMESTAMP        | Sí   | NULL         | Momento de la respuesta del cliente           |
| `registro_id`        | VARCHAR(50) U FK  | Sí   | NULL         | Registro operativo generado (1:1 opcional)   |
| `created_at`         | TIMESTAMP        | No   | `now()`      | Fecha de creación                             |
| `updated_at`         | TIMESTAMP        | No   | `now()`      | Fecha de última modificación (auto)           |

**Índices:** `clienteId`, `pedidoId`, `estado` — optimizan filtrado y listados.

### 3.2. Modelo `PresupuestoItem`

```prisma
model PresupuestoItem {
  id             String   @id @db.VarChar(50)
  presupuestoId  String   @map("presupuesto_id") @db.VarChar(50)
  descripcion    String
  cantidad       Decimal  @db.Decimal(10, 4)
  precioUnitario Decimal @map("precio_unitario") @db.Decimal(15, 2)
  total          Decimal  @db.Decimal(15, 2)
  orden          Int      @default(0)
  createdAt      DateTime @default(now()) @map("created_at")

  presupuesto Presupuesto @relation(fields: [presupuestoId], references: [id], onDelete: Cascade)

  @@index([presupuestoId])
  @@map("presupuesto_items")
}
```

**Tabla SQL:** `presupuesto_items`

Relación **1 Presupuesto → N PresupuestoItem** (cascade delete). El campo `orden` controla el secuenciado visual en el portal y en el admin.

### 3.3. Tipos TypeScript compartidos

**`src/types.ts`** (líneas 253–282):

```typescript
export interface PresupuestoItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  orden: number;
}

export interface Presupuesto {
  id: string;
  pedidoId: string;
  clienteId: string;
  clienteNombre: string;
  proyecto: string;
  contacto?: string | null;
  fechaInicio?: string | null;
  fechaTope?: string | null;
  estado: 'Borrador' | 'Enviado' | 'Aprobado' | 'Rechazado';
  total: number;
  markup: number;
  comentarioCliente?: string | null;
  respuestaCliente?: string | null;
  fechaEnvio?: string | null;
  fechaRespuesta?: string | null;
  registroId?: string | null;
  createdAt: string;
  items?: PresupuestoItem[];
  pedido?: { id: string; descripcion: string; sucursalNombre: string } | null;
}
```

---

## 4. Máquina de Estados del Presupuesto

```
                      ┌─────────────┐
                      │   Borrador  │
                      └──────┬──────┘
                             │ POST /enviar
                             ▼
        ┌─────────────────────────────────────────────┐
        │                  Enviado                     │
        └──────────────┬──────────────────┬────────────┘
                       │                  │
            Aprobar    │                  │  Rechazar
            (cliente o │                  │  (cliente o
             admin)    │                  │   admin)
                       ▼                  ▼
              ┌─────────────┐    ┌─────────────┐
              │  Aprobado   │    │  Rechazado   │◄──┐
              └──────┬──────┘    └──────┬──────┘    │
                     │                  │            │
        POST /convertir          POST /enviar       │
                     │           (Reenviar)          │
                     ▼                  │            │
              ┌─────────────┐           │            │
              │  Convertido │      vuelve a         │
              │  (Registro) │      Enviado ─────────┘
              └─────────────┘   (ciclo de negociación)
```

### Tabla de transiciones de estado

| Estado actual | Acción              | Estado siguiente | Actor       | Endpoint                                              |
|---------------|---------------------|-------------------|-------------|-------------------------------------------------------|
| Borrador      | Enviar              | Enviado           | Admin       | `POST /api/admin/presupuestos/:id/enviar`            |
| Enviado       | Aprobar             | Aprobado          | Cliente     | `POST /api/portal/:token/presupuestos/:id/responder` |
| Enviado       | Rechazar            | Rechazado         | Cliente     | `POST /api/portal/:token/presupuestos/:id/responder` |
| Enviado       | Aprobar (manual)    | Aprobado          | Admin       | `POST /api/admin/presupuestos/:id/responder`         |
| Enviado       | Rechazar (manual)   | Rechazado         | Admin       | `POST /api/admin/presupuestos/:id/responder`         |
| Rechazado     | **Reenviar**        | Enviado           | Admin       | `POST /api/admin/presupuestos/:id/enviar`            |
| Aprobado      | Convertir           | Aprobado+Registro | Admin       | `POST /api/admin/presupuestos/:id/convertir`         |
| Borrador      | Eliminar            | *(eliminado)*     | Admin       | `DELETE /api/admin/presupuestos/:id`                |

### Invariantes de estado

- Un presupuesto **solo puede enviarse** si está en `Borrador` o `Rechazado`.
- Un presupuesto **solo puede responderse** si está en `Enviado`.
- Un presupuesto **solo puede convertirse** si está en `Aprobado` y no tiene `registroId`.
- Al reenviar (Rechazado → Enviado), se **limpian** `respuestaCliente` y `fechaRespuesta` para permitir una nueva respuesta del cliente.
- Una vez convertido (`registroId` seteado), el presupuesto no puede editarse ni reenviarse.

---

## 5. Contratos de API

### 5.1. API Admin — `presupuestosRouter`

**Middleware stack:** `requireAuth` → `requireAdmin` → `requireWriteAccess` (en escritura)
**Montado en:** `server.ts` bajo `/api/admin/presupuestos`

#### 5.1.1. `GET /api/admin/presupuestos`

Lista presupuestos con filtros opcionales.

**Query params:**

| Parámetro   | Tipo   | Opcional | Descripción                              |
|-------------|--------|----------|------------------------------------------|
| `estado`    | string | Sí       | Filtra por estado exacto                 |
| `clienteId` | string | Sí       | Filtra por cliente                       |
| `search`    | string | Sí       | Búsqueda case-insensitive en `clienteNombre` y `proyecto` |

**Respuesta 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "pre_...",
      "pedidoId": "ped_...",
      "clienteId": "cli_...",
      "clienteNombre": "...",
      "proyecto": "...",
      "estado": "Borrador",
      "total": 1500000,
      "markup": 35,
      "items": [...],
      "pedido": { "id": "...", "descripcion": "...", "sucursalNombre": "..." }
    }
  ]
}
```

#### 5.1.2. `GET /api/admin/presupuestos/:id`

Obtiene un presupuesto individual con items, pedido y cliente.

#### 5.1.3. `POST /api/admin/presupuestos`

Crea un presupuesto nuevo (estado: `Borrador`).

**Body:**

```json
{
  "pedidoId": "ped_...",
  "clienteId": "cli_...",
  "proyecto": "Instalación de equipos",
  "contacto": "Juan Pérez",
  "fechaInicio": "2026-09-01",
  "fechaTope": "2026-09-15",
  "markup": 35,
  "comentarioCliente": "Presupuesto válido por 15 días",
  "items": [
    { "descripcion": "Equipo X", "cantidad": 2, "precioUnitario": 500000 }
  ]
}
```

El servidor calcula `total` de cada item como `cantidad × precioUnitario` y `total` del presupuesto como la suma de items. El `clienteNombre` se resuelve desde la base de datos.

#### 5.1.4. `PUT /api/admin/presupuestos/:id`

Actualiza un presupuesto existente. Si se envían `items`, se **eliminan los items previos** y se **recrean** (reemplazo completo). El `total` se recalcula.

#### 5.1.5. `POST /api/admin/presupuestos/:id/enviar`

Cambia el estado a `Enviado` y registra `fechaEnvio`.

> **⚠️ Cambio de esta iteración:** Anteriormente solo permitía `Borrador`. Ahora también permite `Rechazado` para soportar el flujo de reenvío.

**Validación de estado (post-cambio):**

```typescript
if (existing.estado !== 'Borrador' && existing.estado !== 'Rechazado') {
  return res.status(400).json({
    success: false,
    error: {
      code: 'INVALID_STATE',
      message: 'Solo se pueden enviar presupuestos en estado Borrador o Rechazado'
    }
  });
}
```

**Actualización (post-cambio):**

```typescript
const updated = await prisma.presupuesto.update({
  where: { id },
  data: {
    estado: 'Enviado',
    fechaEnvio: new Date(),
    respuestaCliente: null,   // ← NUEVO: limpia respuesta anterior
    fechaRespuesta: null,     // ← NUEVO: limpia fecha de respuesta anterior
  },
});
```

#### 5.1.6. `POST /api/admin/presupuestos/:id/responder`

Registra la respuesta del cliente desde el panel admin (acción manual).

**Body:**

```json
{
  "respuesta": "Aprobado",
  "comentario": "Cliente confirmó por teléfono"
}
```

Solo funciona si el estado es `Enviado`.

#### 5.1.7. `POST /api/admin/presupuestos/:id/convertir`

Convierte un presupuesto `Aprobado` en registros operativos.

**Lógica:**

1. Busca o crea un `Proyecto` para el cliente con el nombre del presupuesto.
2. Crea un `Registro` por cada `PresupuestoItem`.
3. Vincula el presupuesto al primer registro creado (`registroId`).
4. Si ya tiene `registroId`, rechaza con `ALREADY_CONVERTED`.

#### 5.1.8. `DELETE /api/admin/presupuestos/:id`

Elimina un presupuesto. Solo se permiten eliminar presupuestos en estado `Borrador` (validación en el frontend con `confirm()`).

---

### 5.2. API Portal — `portalRouter`

**Middleware:** `portalLimiter` (rate limiting por IP)
**Autenticación:** Token en URL (sin JWT). El token se valida contra `cliente.tokenPortal`.

#### 5.2.1. `GET /api/portal/:token/presupuestos`

Lista los presupuestos del cliente en estados `Enviado`, `Aprobado` o `Rechazado` (no muestra `Borrador`).

**Mapeo de Decimal a Number:** Todos los campos `Decimal` de Prisma se serializan a `number` para consumo directo en el frontend.

```typescript
res.json({
  success: true,
  data: presupuestos.map((p: any) => ({
    id: p.id,
    proyecto: p.proyecto,
    contacto: p.contacto,
    fechaInicio: p.fechaInicio,
    fechaTope: p.fechaTope,
    estado: p.estado,
    total: Number(p.total),
    markup: Number(p.markup),
    comentarioCliente: p.comentarioCliente,
    respuestaCliente: p.respuestaCliente,
    fechaEnvio: p.fechaEnvio,
    fechaRespuesta: p.fechaRespuesta,
    createdAt: p.createdAt,
    items: p.items.map((it: any) => ({
      id: it.id,
      descripcion: it.descripcion,
      cantidad: Number(it.cantidad),
      precioUnitario: Number(it.precioUnitario),
      total: Number(it.total),
    })),
  }))
});
```

#### 5.2.2. `POST /api/portal/:token/presupuestos/:id/responder`

El cliente responde a un presupuesto desde el portal.

**Validaciones:**

1. Token válido (cliente existe).
2. Presupuesto existe.
3. El presupuesto pertenece al cliente (`existing.clienteId === cliente.id`).
4. El estado es `Enviado` (no se puede responder dos veces).

**Body:**

```json
{
  "respuesta": "Aprobado",
  "comentario": "Lo aprobamos, adelante"
}
```

**Actualización:**

```typescript
const updated = await prisma.presupuesto.update({
  where: { id },
  data: {
    estado: respuesta,
    respuestaCliente: comentario || null,
    fechaRespuesta: new Date(),
  },
});
```

**Auditoría:** Se registra con `usuario: 'portal:' + cliente.nombre`, `accion: 'respond_presupuesto'`.

---

## 6. Frontend — Panel Admin

### 6.1. Componente: `PresupuestosAdmin.tsx`

**Ubicación:** `src/components/PresupuestosAdmin.tsx` (623 líneas)
**Props:**

```typescript
interface PresupuestosAdminProps {
  clientes: Cliente[];
  pedidos: Pedido[];
  onConvertido: () => void;
}
```

#### Estructura interna

```
PresupuestosAdmin
├── Estado: presupuestos[], loading, error, filtros, form, saving
├── loadPresupuestos()        → GET /api/admin/presupuestos
├── handleCrear()             → POST /api/admin/presupuestos
├── handleEditar(p)           → precarga form para edición
├── handleEnviar(id)          → POST /:id/enviar
├── handleResponder(id, resp) → POST /:id/responder
├── handleConvertir(id)       → POST /:id/convertir
├── handleEliminar(id)        → DELETE /:id
├── Render:
│   ├── Barra de filtros (estado, cliente, refrescar, + Nuevo)
│   ├── Formulario crear/editar (cliente→pedido, items, markup, fechas)
│   ├── Tabla de presupuestos con badges de estado
│   └── Modal de detalle
└── Botones de acción por fila (según estado)
```

#### Matriz de botones por estado

Esta es la lógica de renderizado de acciones por fila en la tabla (líneas 484–524):

```tsx
{/* Botón Editar disponible en cualquier estado (si no fue convertido) */}
{!p.registroId && (
  <button onClick={() => handleEditar(p)}>Editar</button>
)}

{p.estado === 'Borrador' && (
  <>
    <button onClick={() => handleEnviar(p.id)}>Enviar</button>
    <button onClick={() => handleEliminar(p.id)}>Eliminar</button>
  </>
)}

{p.estado === 'Enviado' && (
  <>
    <button onClick={() => handleResponder(p.id, 'Aprobado')}>Aprobar</button>
    <button onClick={() => handleResponder(p.id, 'Rechazado')}>Rechazar</button>
  </>
)}

{/* NUEVO: Reenviar cuando fue rechazado */}
{p.estado === 'Rechazado' && (
  <button onClick={() => handleEnviar(p.id)}>Reenviar</button>
)}

{p.estado === 'Aprobado' && !p.registroId && (
  <button onClick={() => handleConvertir(p.id)}>Convertir</button>
)}

{p.registroId && (
  <span>Registro ✓</span>
)}
```

**Tabla visual de acciones por estado:**

| Estado      | Editar | Enviar | Reenviar | Aprobar | Rechazar | Eliminar | Convertir | Registro ✓ |
|-------------|:------:|:------:|:--------:|:-------:|:--------:|:--------:|:---------:|:----------:|
| Borrador    |   ✅   |   ✅   |    —     |    —    |    —     |   ✅     |     —     |     —      |
| Enviado     |   ✅   |    —   |    —     |   ✅    |   ✅     |    —     |     —     |     —      |
| Rechazado   |   ✅   |    —   |   ✅     |    —    |    —     |    —     |     —     |     —      |
| Aprobado    |   ✅   |    —   |    —     |    —    |    —     |    —     |    ✅     |     —      |
| Convertido  |    —   |    —   |    —     |    —    |    —     |    —     |     —     |     ✅     |

> **Cambio de esta iteración:** El botón **Editar** antes solo aparecía en estado `Borrador`. Ahora aparece en cualquier estado mientras no tenga `registroId`. El botón **Reenviar** es nuevo: aparece en estado `Rechazado` y ejecuta el mismo endpoint `/enviar`.

#### Formato de moneda y fechas

```typescript
function formatGs(value: number): string {
  return 'Gs. ' + Math.round(value).toLocaleString('es-PY');
}

function formatFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}
```

---

## 7. Frontend — Portal del Cliente

### 7.1. Componente: `PortalApp.tsx`

**Ubicación:** `src/portal/PortalApp.tsx` (113 líneas)

Es el orquestador del portal público. Se accede vía `/portal/:token` y no requiere login.

**Responsabilidades:**

- Extraer el token de la URL (`window.location.pathname`)
- Cargar datos del cliente, sucursales y pedidos vía `GET /api/portal/:token`
- Renderizar tres secciones verticales:
  1. `PresupuestosPortal` (presupuestos enviados al cliente)
  2. `PedidoForm` (formulario para crear nuevos pedidos)
  3. `PedidoHistorial` (historial paginado de pedidos)

> **Cambio de esta iteración:** Se agregó el import y el render del componente `<PresupuestosPortal>` en la sección superior del portal, antes del formulario de pedidos.

**Cambio aplicado (línea 5 y 94):**

```tsx
// Import (línea 5):
import PresupuestosPortal from './PresupuestosPortal.tsx';

// Render (línea 94):
<PresupuestosPortal token={token} />
```

El token se pasa al componente para que pueda hacer sus propias llamadas autenticadas a la API del portal.

### 7.2. Componente: `PresupuestosPortal.tsx`

**Ubicación:** `src/portal/PresupuestosPortal.tsx` (274 líneas)

**Props:**

```typescript
interface Props {
  token: string;
}
```

**Estado interno:**

```typescript
const [presupuestos, setPresupuestos] = useState<PresupuestoPortal[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [expandido, setExpandido] = useState<string | null>(null);
const [respondiendo, setRespondiendo] = useState<string | null>(null);
const [comentario, setComentario] = useState('');
const [saving, setSaving] = useState(false);
```

**Ciclo de vida:**

1. Al montarse, llama a `GET /api/portal/:token/presupuestos`.
2. Si no hay presupuestos, retorna `null` (la sección no se muestra).
3. Si hay presupuestos, renderiza una lista de cards colapsables.
4. Al expandir un presupuesto, muestra items, fechas, comentarios y acciones.
5. Si el estado es `Enviado`, muestra el botón **Responder** que despliega:
   - Textarea para comentario opcional.
   - Botones **Rechazar** y **Aprobar**.
6. Al responder, recarga la lista para reflejar el nuevo estado.

**Tipos del portal (locales):**

```typescript
interface PresupuestoPortal {
  id: string;
  proyecto: string;
  contacto?: string | null;
  fechaInicio?: string | null;
  fechaTope?: string | null;
  estado: 'Enviado' | 'Aprobado' | 'Rechazado';
  total: number;
  markup: number;
  comentarioCliente?: string | null;
  respuestaCliente?: string | null;
  fechaEnvio?: string | null;
  fechaRespuesta?: string | null;
  createdAt: string;
  items: PresupuestoItemPortal[];
}
```

**Función `responder`:**

```typescript
const responder = async (id: string, respuesta: 'Aprobado' | 'Rechazado') => {
  setSaving(true);
  try {
    const res = await fetch(`/api/portal/${encodeURIComponent(token)}/presupuestos/${id}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta, comentario }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json?.error?.message || 'Error');
    setRespondiendo(null);
    setComentario('');
    load();
  } catch (e: any) {
    setError(e.message || 'Error al responder');
  } finally {
    setSaving(false);
  }
};
```

**Estados visuales del portal:**

| Estado del presupuesto | Visualización                            | Acciones del cliente                          |
|-----------------------|------------------------------------------|-----------------------------------------------|
| Enviado               | Badge azul + botón "Responder"          | Aprobar / Rechazar + comentario opcional      |
| Aprobado              | Badge verde + mensaje "✓ Aprobado"      | Ninguna (solo lectura)                        |
| Rechazado             | Badge rojo + mensaje "✕ Rechazado"       | Ninguna (solo lectura)                        |

---

## 8. Detalle de Cambios de Esta Iteración

### 8.1. Resumen de cambios

| # | Archivo                                    | Tipo     | Descripción                                                           |
|---|--------------------------------------------|----------|-----------------------------------------------------------------------|
| 1 | `src/portal/PresupuestosPortal.tsx`         | Nuevo    | Componente de portal para que el cliente vea y responda presupuestos |
| 2 | `src/portal/PortalApp.tsx`                  | Modificado | Import y render de `<PresupuestosPortal>` en el orquestador          |
| 3 | `src/server/routes/portal.routes.ts`        | Modificado | Endpoints `GET /presupuestos` y `POST /presupuestos/:id/responder`   |
| 4 | `src/server/routes/presupuestos.routes.ts`  | Modificado | Endpoint `/enviar` ahora permite estado `Rechazado` + limpieza       |
| 5 | `src/components/PresupuestosAdmin.tsx`      | Modificado | Botón Editar en cualquier estado + botón Reenviar en Rechazado       |

### 8.2. Cambio #1 — Nuevo componente `PresupuestosPortal.tsx`

**Archivo:** `src/portal/PresupuestosPortal.tsx`
**Líneas:** 274
**Tipo:** Archivo nuevo

Se creó un componente React completo para el portal del cliente con:

- Carga autónoma de presupuestos vía API del portal.
- Renderizado de cards colapsables con items, totales, fechas y comentarios.
- Interfaz de respuesta (aprobar/rechazar) con comentario opcional.
- Manejo de estados: loading, error, vacío, expandido, respondiendo, saving.
- Badges de estado con colores consistentes con el admin.
- Formato de moneda en Guaraníes (`Gs.`).
- Se oculta automáticamente si no hay presupuestos (`return null`).

### 8.3. Cambio #2 — Integración en `PortalApp.tsx`

**Archivo:** `src/portal/PortalApp.tsx`
**Tipo:** Modificación

Se agregaron dos líneas:

**Línea 5 — Import:**

```tsx
import PresupuestosPortal from './PresupuestosPortal.tsx';
```

**Línea 94 — Render (dentro del bloque de datos cargados):**

```tsx
<PresupuestosPortal token={token} />
<PedidoForm token={token} sucursales={state.data.sucursales} onPedidoCreado={handlePedidoCreado} />
```

El componente se renderiza **antes** del formulario de pedidos, dando prioridad visual a los presupuestos pendientes de respuesta.

### 8.4. Cambio #3 — Endpoints del portal

**Archivo:** `src/server/routes/portal.routes.ts`

Se agregaron dos endpoints al `portalRouter`:

1. **`GET /api/portal/:token/presupuestos`** — Lista presupuestos del cliente en estados `Enviado`, `Aprobado` o `Rechazado` (excluye `Borrador`). Serializa `Decimal` → `number` para consumo en el frontend.

2. **`POST /api/portal/:token/presupuestos/:id/responder`** — Permite al cliente responder (aprobar/rechazar) un presupuesto. Valida pertenencia (`clienteId`) y estado (`Enviado`).

Ambos endpoints usan `portalLimiter` para rate limiting y registran auditoría.

### 8.5. Cambio #4 — Endpoint `/enviar` permite reenvío

**Archivo:** `src/server/routes/presupuestos.routes.ts`
**Endpoint:** `POST /api/admin/presupuestos/:id/enviar`
**Tipo:** Modificación de lógica de negocio

**Antes:**

```typescript
if (existing.estado !== 'Borrador') {
  return res.status(400).json({
    success: false,
    error: {
      code: 'INVALID_STATE',
      message: 'Solo se pueden enviar presupuestos en estado Borrador'
    }
  });
}

const updated = await prisma.presupuesto.update({
  where: { id },
  data: {
    estado: 'Enviado',
    fechaEnvio: new Date(),
  },
});
```

**Después:**

```typescript
if (existing.estado !== 'Borrador' && existing.estado !== 'Rechazado') {
  return res.status(400).json({
    success: false,
    error: {
      code: 'INVALID_STATE',
      message: 'Solo se pueden enviar presupuestos en estado Borrador o Rechazado'
    }
  });
}

const updated = await prisma.presupuesto.update({
  where: { id },
  data: {
    estado: 'Enviado',
    fechaEnvio: new Date(),
    respuestaCliente: null,   // Limpia respuesta anterior
    fechaRespuesta: null,     // Limpia fecha de respuesta anterior
  },
});
```

**Justificación:** Permite que un presupuesto rechazado pueda ser editado y reenviado al cliente, cerrando el ciclo de negociación. La limpieza de `respuestaCliente` y `fechaRespuesta` garantiza que el cliente vea el presupuesto como "nuevo" en su portal y pueda responder nuevamente.

### 8.6. Cambio #5 — Botones del admin (Editar + Reenviar)

**Archivo:** `src/components/PresupuestosAdmin.tsx`

#### 8.6.1. Botón Editar en cualquier estado

**Antes:** El botón Editar solo aparecía cuando `p.estado === 'Borrador'`.

**Después:** Aparece cuando `!p.registroId` (sin importar el estado, mientras no esté convertido a registro).

```tsx
{!p.registroId && (
  <button onClick={() => handleEditar(p)} className="...">
    Editar
  </button>
)}
```

**Justificación:** Permite editar un presupuesto enviado o rechazado (por ejemplo, ajustar precios tras una negociación) antes de reenviarlo.

#### 8.6.2. Botón Reenviar (nuevo)

**Sección agregada (líneas 511–515):**

```tsx
{p.estado === 'Rechazado' && (
  <button onClick={() => handleEnviar(p.id)} disabled={saving} className="...">
    Reenviar
  </button>
)}
```

**Justificación:** El botón reutiliza la función `handleEnviar` (que llama a `POST /:id/enviar`), que ahora está habilitada para estado `Rechazado` gracias al cambio del backend.

---

## 9. Auditoría y Seguridad

### 9.1. Auditoría

Todos los endpoints de escritura registran entradas en el log de auditoría:

| Acción                  | Usuario             | Recurso                                              |
|-------------------------|---------------------|------------------------------------------------------|
| `create_presupuesto`    | `req.user.usuario`  | `/api/admin/presupuestos`                            |
| `update_presupuesto`    | `req.user.usuario`  | `/api/admin/presupuestos/:id`                        |
| `send_presupuesto`      | `req.user.usuario`  | `/api/admin/presupuestos/:id/enviar`                 |
| `respond_presupuesto`   | `req.user.usuario`  | `/api/admin/presupuestos/:id/responder`              |
| `respond_presupuesto`   | `portal:cliente`    | `/api/portal/:token/presupuestos/:id/responder`      |
| `convert_presupuesto`   | `req.user.usuario`  | `/api/admin/presupuestos/:id/convertir`              |

Cada entrada incluye: usuario, acción, recurso, resultado (`success`/`error`), IP del cliente (`getClientIp`).

### 9.2. Seguridad

| Capa         | Mecanismo                                                            |
|--------------|----------------------------------------------------------------------|
| Admin API    | `requireAuth` (JWT en cookie) + `requireAdmin` (rol admin) + `requireWriteAccess` |
| Portal API   | Token en URL (sin JWT). Validación contra `cliente.tokenPortal`. Rate limiter (`portalLimiter`). |
| Pertenencia  | El endpoint `/responder` del portal valida que `presupuesto.clienteId === cliente.id` (403 si no coincide). |
| Validación   | Todos los inputs se sanitizan (`String().trim().slice()`). `respuesta` se valida contra enum `['Aprobado', 'Rechazado']`. |
| Rate limiting| `portalLimiter` aplicado a todos los endpoints del portal.            |

### 9.3. Rate Limiting

El `portalLimiter` está definido en `src/server/config/rate-limiters.ts` y se aplica exclusivamente a las rutas del portal público. Las rutas admin no lo necesitan porque ya están protegidas por JWT + rol.

---

## 10. Consideraciones de Diseño

### 10.1. ¿Por qué `Decimal` en la base de datos?

Los campos monetarios (`total`, `precioUnitario`, `cantidad`, `markup`) usan `Decimal` en Prisma para evitar problemas de precisión de punto flotante. En la capa de API se serializan a `number` para el frontend, lo cual es seguro porque los montos no exceden la precisión de `DECIMAL(15,2)`.

### 10.2. ¿Por qué desnormalizar `clienteNombre`?

El campo `clienteNombre` se almacena en `Presupuesto` (y en `PresupuestoItem`) para evitar joins costosos en listados. Se actualiza al crear el presupuesto desde el cliente relacionado.

### 10.3. ¿Por qué reemplazar items en lugar de actualizar?

El `PUT /api/admin/presupuestos/:id` elimina todos los items existentes y crea nuevos cuando se envían items en el body. Esto simplifica la lógica de edición (no hay que diff entre items existentes y nuevos) y garantiza que el `orden` sea secuencial.

### 10.4. ¿Por qué limpiar `respuestaCliente` al reenviar?

Cuando un presupuesto rechazado se reenvía, la respuesta anterior (el rechazo) ya no es relevante. Limpiar `respuestaCliente` y `fechaRespuesta` permite que:
- El cliente vea el presupuesto como pendiente de respuesta.
- El portal muestre los botones de Aprobar/Rechazar nuevamente.
- El admin no vea información obsoleta del ciclo anterior.

### 10.5. ¿Por qué el portal no muestra `Borrador`?

El endpoint `GET /api/portal/:token/presupuestos` filtra con `estado: { in: ['Enviado', 'Aprobado', 'Rechazado'] }`. Los borradores son internos de aFull y no deben ser visibles para el cliente hasta que se envíen oficialmente.

---

## 11. Flujos de Uso

### 11.1. Flujo completo: Crear → Enviar → Responder → Convertir

```
ADMIN                              PORTAL (CLIENTE)
─────                              ────────────────
1. Crea presupuesto (Borrador)
   POST /api/admin/presupuestos

2. Envía al cliente (Enviado)
   POST /:id/enviar
                                   3. Cliente ve presupuesto en portal
                                      GET /api/portal/:token/presupuestos

                                   4. Cliente responde
                                      POST /api/portal/:token/presupuestos/:id/responder
                                      → estado: Aprobado o Rechazado

5. Admin ve la respuesta
   GET /api/admin/presupuestos

6. Si Aprobado → convierte a Registro
   POST /:id/convertir
   → crea Proyecto + Registros
   → setea registroId en el presupuesto
```

### 11.2. Flujo de reenvío tras rechazo

```
ADMIN                              PORTAL (CLIENTE)
─────                              ────────────────
                                   1. Cliente rechaza presupuesto
                                      estado: Enviado → Rechazado

2. Admin ve "Rechazado"
   Botones: [Editar] [Reenviar]

3. Admin edita (opcional)
   PUT /:id
   → ajusta items, precios, fechas

4. Admin reenvía
   POST /:id/enviar
   → estado: Rechazado → Enviado
   → limpia respuestaCliente y fechaRespuesta
                                   5. Cliente ve presupuesto nuevamente
                                      como "Enviado" con botones de respuesta
```

### 11.3. Flujo de conversión a registro

```
ADMIN
─────
1. Presupuesto en estado Aprobado
2. POST /:id/convertir
3. Backend:
   a. Busca Proyecto existente por (clienteId + nombre)
   b. Si no existe, lo crea (estado: PENDIENTE)
   c. Por cada PresupuestoItem:
      - Crea un Registro operativo
   d. Vincula presupuesto.registroId al primer registro
4. Presupuesto ahora muestra "Registro ✓"
   → no se puede editar ni reenviar
```

---

## 12. Verificación y Testing

### 12.1. Verificación de compilación

```bash
npx tsc --noEmit
# Resultado: 0 errores en archivos de presupuestos y portal
```

### 12.2. Verificación de runtime

| Verificación                                      | Método                                   | Resultado |
|---------------------------------------------------|------------------------------------------|-----------|
| Server responde en `:3100`                        | `curl http://localhost:3100/`            | HTTP 200  |
| Vite sirve `PresupuestosPortal.tsx`               | `curl http://localhost:3100/src/portal/PresupuestosPortal.tsx` | Compilado |
| API portal devuelve presupuestos                   | `curl /api/portal/:token/presupuestos`   | `success: true`, `count: 1` |
| TypeScript sin errores                             | `npx tsc --noEmit`                       | Sin errores |

### 12.3. Casos de prueba recomendados

| Caso                                              | Estado inicial | Acción              | Resultado esperado          |
|---------------------------------------------------|----------------|---------------------|-----------------------------|
| Crear presupuesto con items válidos               | —              | POST /presupuestos  | 201, estado Borrador        |
| Enviar borrador                                   | Borrador       | POST /:id/enviar    | 200, estado Enviado         |
| Enviar presupuesto ya enviado                     | Enviado        | POST /:id/enviar    | 400 INVALID_STATE           |
| Cliente aprueba                                   | Enviado        | POST /responder     | 200, estado Aprobado        |
| Cliente rechaza                                   | Enviado        | POST /responder     | 200, estado Rechazado       |
| Reenviar rechazado                                | Rechazado      | POST /:id/enviar    | 200, estado Enviado, respuesta limpiada |
| Responder presupuesto no enviado                  | Borrador       | POST /responder     | 400 INVALID_STATE           |
| Responder presupuesto ajeno                       | Enviado        | POST /responder     | 403 FORBIDDEN              |
| Convertir aprobado                                | Aprobado       | POST /:id/convertir | 200, registroId seteado     |
| Convertir no aprobado                             | Enviado        | POST /:id/convertir | 400 INVALID_STATE           |
| Convertir dos veces                               | Aprobado+Registro | POST /:id/convertir | 400 ALREADY_CONVERTED    |
| Editar presupuesto convertido                     | Aprobado+Registro | PUT /:id         | Botón Editar no visible     |

---

## 13. Dependencias y Relaciones

### 13.1. Modelos relacionados

```
Cliente ──< Pedido ──< Presupuesto ──< PresupuestoItem
   │                      │
   │                      ├──> Registro (1:1 opcional, via registroId)
   │                      └──> Proyecto (creado al convertir)
   │
   └──tokenPortal──> Portal access
```

### 13.2. Imports del frontend

| Componente            | Importa de                              |
|-----------------------|-----------------------------------------|
| `PresupuestosAdmin`   | `../authFetch.ts`, `../types.ts`        |
| `PresupuestosPortal`  | `react` (hooks nativos)                 |
| `PortalApp`           | `../types.ts`, `./PedidoForm`, `./PedidoHistorial`, `./PresupuestosPortal` |

### 13.3. Imports del backend

| Router               | Importa de                                   |
|----------------------|-----------------------------------------------|
| `presupuestosRouter` | `express`, `../../lib/prisma.ts`, `../../../server-auth.ts`, `../../../server-audit.ts`, `../config/logger.ts`, `../../types.ts` |
| `portalRouter`       | `express`, `../../lib/prisma.ts`, `../../../server-audit.ts`, `../config/logger.ts`, `../../types.ts`, `@prisma/client/runtime/library`, `../config/rate-limiters.ts`, `../shared.ts` |

---

## 14. Glosario

| Término          | Definición                                                  |
|------------------|-------------------------------------------------------------|
| **Presupuesto**  | Cotización de aFull al cliente, generada a partir de un pedido |
| **PresupuestoItem** | Línea de detalle de un presupuesto (descripción, cantidad, precio, total) |
| **Markup**       | Porcentaje de ganancia aplicado sobre el costo (default: 35%) |
| **Token Portal**  | UUID único por cliente que autentica el acceso al portal público |
| **Registro**     | Entidad operativa que representa el trabajo a realizar, creado al convertir un presupuesto aprobado |
| **Reenvío**      | Acción de volver a enviar al cliente un presupuesto previamente rechazado |
| **Conversión**   | Transformación de un presupuesto aprobado en registros operativos |
| **Portal público** | Interfaz del cliente sin login, autenticada por token en la URL |

---

## 15. Apéndice — Índice de Archivos

| Archivo                                           | Líneas | Rol                        |
|---------------------------------------------------|--------|----------------------------|
| `src/portal/PresupuestosPortal.tsx`               | 274    | Componente portal (cliente)|
| `src/portal/PortalApp.tsx`                        | 113    | Orquestador portal         |
| `src/components/PresupuestosAdmin.tsx`            | 623    | Componente admin (aFull)   |
| `src/server/routes/presupuestos.routes.ts`        | 493    | API admin de presupuestos  |
| `src/server/routes/portal.routes.ts`              | 171    | API del portal público     |
| `prisma/schema.prisma`                            | 415    | Esquema de base de datos   |
| `src/types.ts`                                    | 329    | Tipos compartidos          |

---

*Fin del documento*
