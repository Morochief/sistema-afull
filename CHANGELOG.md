# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0] - 2026-06-14

### [Added]
- **Base de Datos PostgreSQL:** Script de inicialización `db/init.sql` con esquema de tablas (clientes, proyectos, colaboradores, insumos, registros) y vista `reporte_costos_proyectos`.
- **Lógica en Base de Datos:** Trigger en SQL `calcular_total_registro` para manejar el cruce de medianoche (+1440 mins) y calcular `total_calculado` en base a tarifas por colaborador o precios de insumos.
- **Capa de Datos (ORM):** Integración de Prisma ORM v6 con `schema.prisma` y un cliente singleton en `src/lib/prisma.ts`.
- **Capa de Autenticación:** 
  - Archivo `src/lib/auth.ts` implementando validación de tokens JWT mediante `jose`.
  - Página de Login (`app/login/page.tsx`) conectada al catálogo de colaboradores.
  - Server Action de Login (`app/actions/auth.ts`) que valida y genera cookie HttpOnly.
- **Seguridad (Middleware):** `src/middleware.ts` para proteger las rutas `/` y `/registro` exigiendo la existencia de sesión activa.
- **Server Actions Protegidas:** Funciones `createRegistroMO` y `createRegistroInsumo` envueltas en `withAuth` para inyectar automáticamente el `colaborador_id` de la sesión.

### [Changed]
- **Dashboard (`app/page.tsx`):** Refactorizado de Client Component a Server Component. Ahora obtiene la información directamente ejecutando consultas a la vista `reporte_costos_proyectos` a través de Prisma.
- **Registro Móvil (`app/registro/page.tsx`):** Formularios adaptados para enviar datos a Server Actions en lugar de alterar un contexto local.
- **Estado Global (`AppContext.tsx`):** Despojado de su estado de memoria local de registros, quedando únicamente como un inyector de datos estáticos y gestor de estado `isPending` mediante `useTransition`.
