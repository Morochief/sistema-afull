# Guía Oficial de Infraestructura y Despliegue: GitHub & Vercel
**Sistema aFull — Automatización Operativa y Logística**

---

## 1. Resumen Ejecutivo
Siguiendo las resoluciones de la reunión técnica del 16 de septiembre de 2026, la infraestructura del **Sistema aFull** se estandariza con:
* **Control de versiones corporativo**: GitHub (repositorio organizacional protegido).
* **Plataforma de despliegue**: Vercel (arquitectura Edge + Serverless para Node/Express y CDN global para frontend React Vite).
* **Persistencia de base de datos**: Supabase PostgreSQL con connection pooling (Transaction pooler en puerto 6543, Session/Direct en 5432).
* **Almacenamiento de archivos (POD / Odómetros)**: Supabase Storage (`vehiculos-fotos`).

---

## 2. Configuración del Repositorio Corporativo en GitHub

### A. Estructura de Ramas
* `main`: Rama de producción protegida. Cada push o merge dispara despliegue automático a producción.
* `staging` / `develop`: Rama de pre-producción para validación interna antes de liberar cambios.
* `feature/<nombre>`: Ramas de trabajo individuales creadas a partir de `main` o `staging`.

### B. Reglas de Protección de Ramas (Branch Protection Rules)
En GitHub `Settings` → `Branches` → `Add branch protection rule`:
1. **Branch name pattern**: `main`
2. **Require a pull request before merging**: Habilitado (mínimo 1 aprobación).
3. **Require status checks to pass before merging**: Habilitado.
   * `build` (npm run build)
   * `test` (vitest)
   * `lint` (tsc --noEmit)
4. **Do not allow bypassing the above settings**: Habilitado para administradores.

---

## 3. Despliegue en Vercel

### A. Configuración del Proyecto
1. Iniciar sesión en [Vercel](https://vercel.com) con la cuenta corporativa.
2. Hacer clic en **"Add New..."** → **"Project"**.
3. Importar el repositorio de GitHub (`Morochief/sistemafullnuevo` o repositorio corporativo asignado).
4. En **Build and Output Settings**:
   * **Framework Preset**: Vite
   * **Build Command**: `npm run build` (o `prisma generate && vite build`)
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`

### B. Variables de Entorno (Environment Variables)
Configurar en Vercel → `Settings` → `Environment Variables`:

| Variable | Descripción | Valor / Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexión transaccional Supabase (puerto 6543 con `?pgbouncer=true`) | `postgresql://postgres.[ref]:[pass]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Conexión directa a Supabase (puerto 5432, necesaria para migraciones de Prisma) | `postgresql://postgres.[ref]:[pass]@aws-1-us-east-2.pooler.supabase.com:5432/postgres` |
| `SUPABASE_URL` | Endpoint HTTPS del proyecto Supabase | `https://[ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta Service Role (bypass RLS para subida de fotos del servidor) | `eyJhbG...` |
| `JWT_SECRET` | Llave criptográfica para firma de cookies JWT | Hash aleatorio de 64+ caracteres |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto de escucha para fallback en contenedores | `3000` |

### C. Archivo de Configuración `vercel.json`
El repositorio incluye el archivo `vercel.json` en la raíz que maneja el enrutamiento híbrido (SPA + Serverless Express):
```json
{
  "version": 2,
  "buildCommand": "prisma generate && vite build",
  "outputDirectory": "dist",
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/portal/:token",
      "destination": "/portal.html"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/index.ts"
    },
    {
      "source": "/((?!api/|portal/).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Almacenamiento de Fotos de Entrega (Supabase Storage)

Las fotos de comprobantes de remisión firmada y entrega física de pedidos se almacenan en el bucket `vehiculos-fotos`:
* **Ruta de almacenamiento**: `entregas/<pedidoId>/remision_<timestamp>.jpg` y `entregas/<pedidoId>/entrega_<timestamp>.jpg`.
* **Políticas RLS**: El backend Express utiliza `SUPABASE_SERVICE_ROLE_KEY` para la subida directa, generando URLs públicas deterministas accesibles por el frontend mediante Cache Busters (`?t=timestamp`).

---

## 5. Procedimiento de Verificación Post-Despliegue

Tras completar un deploy en Vercel, ejecutar el siguiente checklist de comprobación:
1. **Frontend Principal**: Cargar la raíz `https://[dominio].vercel.app` y verificar que la pantalla de inicio de sesión cargue limpiamente.
2. **Autenticación**: Iniciar sesión como Administrador y verificar que las cookies HttpOnly se establezcan correctamente.
3. **Portal de Clientes**: Ingresar a `/portal/[tokenValido]` y comprobar:
   * Que el selector de locales y pedidos muestre el número de factura.
   * Que el "Botón ojito" (`Eye`) abra el modal de detalle con las fotos de remisión y entrega.
4. **Módulo Presupuestos**:
   * Abrir "Nuevo Presupuesto", seleccionar un pedido y confirmar que los campos (Proyecto, Contacto, Fechas) se autocompleten.
   * Probar el botón `fx` en la cantidad de un ítem para validar que evalúe fórmulas aritméticas (ej: `(2.5 * 0.8 * 2) + 1.2` $\rightarrow$ `4.60`).
   * Verificar que la relación Markup (%) y Margen Bruto (%) se calcule en tiempo real.
5. **Módulo Operario**:
   * En "Mis Tareas", verificar el botón `📷 Subir Remisión / Entrega` y comprobar la captura y compresión en cliente de fotos.
