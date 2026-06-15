# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.4.0] - 2026-06-15

### [Added]
- **Saludo y Acciones Rápidas:** Añadida sección superior en el Dashboard desktop con saludo personalizado y botones de acceso directo a "Ver Proyectos" y "Nuevo Registro".

### [Changed]
- **Unificación de Estados de Proyecto:** Removido el componente legacy `ProjectStatusToggle`, unificando a `ProjectStatusSelect` en el Dashboard. Ahora respeta los roles de usuario (solo Admins y Jefes de Proyecto pueden editar el estado).
- **Limpieza de Datos Obsoletos:** Eliminados más de 90 líneas de datos dummy legacy en `projects-data.ts` manteniendo solo definiciones limpias de tipos y utilidades.
- **Consistencia de Markup:** Eliminada la constante redundante `REVENUE_MARKUP` (45%) a favor de `MARKUP_RATE` (35%) de `constants.ts`.
- **Limpieza Visual de Tabla:** Ocultado el UUID del proyecto en la tabla del panel principal para simplificar y limpiar la visualización.
- **Visualización de Roles:** La barra lateral (Sidebar) ahora detecta y muestra el rol real del usuario logueado (ej. Administrador, Jefe de Proyecto) en lugar del valor hardcodeado "Colaborador".

## [1.3.0] - 2026-06-15

### [Added]
- **Sistema de Roles:** Añadida columna `rol` (`VARCHAR(20)`) a la tabla `colaboradores` con valores posibles: `admin`, `jefe_proyecto`, `usuario`. El login ahora lee el rol de la base de datos en lugar de hardcodear `'usuario'` para todos.
- **Cambio de Estado de Proyectos:** Nuevo componente interactivo `ProjectStatusSelect` que permite a usuarios con rol `admin` o `jefe_proyecto` cambiar el estado de un proyecto (`En Progreso`, `Completado`, `En Pausa`) directamente desde la tabla de `/proyectos`. Usuarios con rol `usuario` ven un badge de solo lectura.
- **Funciones de Autorización por Rol:** `requireRole()` y `withRole()` en `auth.ts` para proteger Server Actions según el rol del usuario.
- **Migración SQL:** Script `db/add-rol.sql` para agregar la columna de roles sin afectar datos existentes.

### [Changed]
- **Login Rediseñado (Elite Minimalist):** Pantalla de login completamente rediseñada con estilo Swiss Minimalist + Glassmorphism suave. Incluye: tarjeta translúcida con `backdrop-blur-md`, input profesional con `focus:ring-2 focus:ring-indigo-500`, botón con micro-animación `active:scale-[0.98]`, spinner de carga animado (`Loader2Icon`), mensajes de error inline con transición de altura, y orbes decorativos de fondo con gradientes difuminados.
- **Auth Layout:** Rediseñado con `grid place-items-center`, fondo `bg-slate-50` y dos orbes decorativos con `blur-3xl` para profundidad ambiental.

---

## [1.2.0] - 2026-06-15

### [Added]
- **Pantalla de carga (Skeletons):** Añadido `ui/skeleton.tsx` para animaciones pulse tipo shimmer. Implementados Skeletons personalizados para el Dashboard (`loading.tsx`) y las tablas de catálogos (`proyectos/loading.tsx`, `clientes/loading.tsx`, `insumos/loading.tsx`, `colaboradores/loading.tsx`).
- **Global Error Boundary:** Creado `error.tsx` en el grupo de dashboard para atrapar errores de red o Base de Datos, mostrando un aviso amigable y botón de reintento.
- **Creación en Catálogos (CRUD):** Añadidos formularios tipo slide-over (`Sheet` de ShadCN/Base UI) y Server Actions para crear proyectos, clientes, insumos y colaboradores sin cambiar de página.
- **Toggle de Estados Activo/Inactivo:** Componentes interactivos `ToggleInsumoButton` y `ToggleColaboradorButton` para cambiar instantáneamente la disponibilidad de insumos y equipo de trabajo desde sus respectivas tablas.
- **Notificaciones Toast:** Integrada la biblioteca `sonner` para mostrar feedbacks de éxito o error no bloqueantes al usuario.
- **Ordenamiento y Paginación en Panel:** La tabla de proyectos activos ahora cuenta con sorting real de columnas (Proyecto, Horas, Costo Total) y paginación en el cliente (10 filas por página).

### [Changed]
- **Costo en Tiempo Real en Formularios:**
  - El panel de Mano de Obra calcula y dibuja el costo proyectado en tiempo real basado en la diferencia horaria y la tarifa del colaborador.
  - El panel de Insumos muestra el subtotal de consumo en vivo según el precio unitario del material seleccionado.

---

## [1.1.0] - 2026-06-15

### [Added]
- **Páginas de Catálogos:** Nuevas vistas Server Component para `/proyectos`, `/clientes`, `/insumos` y `/colaboradores` con tablas de datos, badges de estado y formateo de moneda.
- **Importación Completa de Datos:** Script `prisma/import-excel-full.ts` para migración total desde `Kevin.xlsx` incluyendo 4 clientes, 3 proyectos, 9 colaboradores, 29 insumos y 63 registros históricos de consumos (MO e Insumos).
- **Navegación Funcional del Sidebar:** `DashboardSidebar.tsx` actualizado con rutas reales usando `<Link>` y `usePathname()` para tracking de página activa.

### [Changed]
- **Formato de Moneda Unificado:** `formatCurrency()` en `projects-data.ts` cambiado de `es-CL / USD` a `es-PY / PYG` (Guaraníes Paraguayos). Ahora Dashboard, métricas y tablas usan el mismo formato que las páginas de catálogos.

### [Fixed]
- **Sidebar no navegaba:** Los enlaces del menú lateral tenían `href="#"` como placeholder. Ahora apuntan a las rutas correspondientes.

### [Security]
- **Rutas de catálogos protegidas:** Se agregaron `/proyectos`, `/clientes`, `/insumos` y `/colaboradores` al `matcher` y `protectedRoutes` del middleware. Antes eran accesibles sin autenticación.

---

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
