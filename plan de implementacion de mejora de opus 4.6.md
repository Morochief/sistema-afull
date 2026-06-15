# Transformación: De Sistema Rígido a UI Profesional

> **Auditoría completada:** Se analizaron 30+ archivos, 18 componentes ShadCN, 6 páginas, 2 server actions, middleware, context y CSS.

## User Review Required

> [!CAUTION]
> **Login roto en producción:** La página de login se renderiza DENTRO del layout principal — el sidebar y bottom nav aparecen en la pantalla de login. Esto se corrige en Fase 1.

> [!WARNING]
> **Métricas falsas visibles al usuario:** Los deltas del dashboard ("+3", "+8.2%", "-2.1%", "+12.5%") son valores hardcodeados, no calculados. Cualquier usuario que los vea pensará que son reales.

> [!IMPORTANT]
> **Usuario hardcodeado:** El sidebar muestra "María Reyes / Administradora" fijo, sin importar quién esté logueado. El `AppHeader` en móvil muestra "??" porque no recibe el nombre de la sesión.

## Open Questions

> [!IMPORTANT]
> 1. **Tasa de markup:** `projects-data.ts` usa `0.45` (45%) pero `page.tsx` del dashboard usa `0.35` (35%). ¿Cuál es la correcta?
> 2. **Tarifa por hora:** El dashboard convierte costo MO a horas con `/350` hardcodeado. ¿Es correcto `350 Gs/minuto` para todos, o cada colaborador tiene su propia tarifa?
> 3. **Configuración y Soporte:** Los links del sidebar van a `#`. ¿Quieres que cree páginas placeholder o los elimino del menú?
> 4. **Dark mode:** ¿Quieres un toggle manual o mantener detección automática del sistema?

---

## 🔴 Bugs Críticos Detectados (se corrigen TODOS en Fase 1)

| # | Bug | Impacto |
|---|-----|---------|
| 1 | Login renderiza dentro del layout con sidebar | El usuario ve la nav antes de loguearse |
| 2 | AppHeader no recibe `name` de la sesión | Muestra "Hola, undefined" y avatar "??" en móvil |
| 3 | Sidebar hardcodea "María Reyes / Administradora" | Identidad incorrecta para todos los usuarios |
| 4 | Deltas de métricas son valores fake hardcodeados | Información falsa presentada como real |
| 5 | Feedback usa `alert()` nativo | Bloquea UI, terrible en móvil |
| 6 | Export PDF/Excel son placeholders con `alert()` | Botones que no hacen nada |
| 7 | `formatCurrency()` duplicada 3 veces | Mantenimiento frágil |
| 8 | Bottom nav móvil solo tiene 2 de 6 items | 4 páginas inaccesibles en móvil |
| 9 | 2 componentes sin uso (`dashboard-shell`, `material-combobox`) | Código muerto |
| 10 | `RecentLogs` importado pero no renderizado | Dead code |

---

## Fase 1 — Refactor de Diseño y Corrección de Bugs Críticos

**Objetivo:** Arreglar todo lo roto, establecer Design System coherente, profesionalizar la primera impresión.

### Layout y Autenticación

#### [MODIFY] [layout.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/layout.tsx)
- Separar layout autenticado del layout público
- Leer la sesión JWT con `getSession()` y pasar `nombre` al sidebar y header
- Envolver el layout autenticado en un **grupo de rutas** `(dashboard)` o usar lógica condicional por pathname
- Agregar `<metadata>` con título y descripción SEO
- Importar tipografía **Geist Sans** desde `next/font/local` o Google Fonts Inter

#### [NEW] [src/app/(auth)/layout.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/(auth)/layout.tsx)
- Layout minimalista sin sidebar ni bottom nav, solo para `/login`
- Centrado vertical, fondo con gradiente sutil

#### [MODIFY] [login/page.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/login/page.tsx)
- Mover a `src/app/(auth)/login/page.tsx` para que use el layout limpio
- Agregar `role="alert"` y `aria-live="polite"` al mensaje de error

---

### Design System y CSS

#### [MODIFY] [globals.css](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/globals.css)
- Definir tokens de animación reutilizables (`--transition-fast: 150ms`, `--transition-normal: 200ms`)
- Agregar clases utility para glassmorphism (`glass`), hover premium (`hover-lift`), y skeleton screens
- Agregar smooth scroll `html { scroll-behavior: smooth }`
- Definir font-family con Geist Sans / Inter como primaria

---

### Sidebar y Navegación

#### [MODIFY] [dashboard-sidebar.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/dashboard-sidebar.tsx)
- Recibir `userName` y `userRole` como props desde el layout (extraídos del JWT)
- Reemplazar "María Reyes" hardcodeado por datos reales de sesión
- Diferenciar iconos: `Users` para Clientes, `UserCog` o `HardHat` para Colaboradores
- Eliminar links muertos (Configuración/Soporte) o convertirlos en items deshabilitados con tooltip "Próximamente"
- Agregar botón de **Logout** en la sección inferior

#### [MODIFY] [layout.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/layout.tsx)
- Expandir bottom nav móvil de 2 a 5 items (Panel, Proyectos, Registrar, Insumos, Más)
- Envolver en `<nav aria-label="Navegación principal">`
- Agregar `aria-current="page"` al item activo

---

### AppHeader (Móvil)

#### [MODIFY] [app-header.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/app-header.tsx)
- Recibir `name` desde el layout (de la sesión JWT)
- Mostrar nombre real en saludo y avatar con iniciales correctas

---

### Dashboard: Métricas Honestas

#### [MODIFY] [metrics-cards.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/metrics-cards.tsx)
- **Eliminar los deltas falsos** ("+3", "+8.2%", etc.)
- Reemplazar con información útil real: "X proyectos activos", "Total acumulado", etc.
- O simplemente mostrar el valor sin delta hasta que se implemente comparación histórica real
- Rediseñar como **Bento Grid** con tarjetas de altura variable y micro-animaciones de entrada

---

### Limpieza de Código

#### [DELETE] [dashboard-shell.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/dashboard-shell.tsx)
- Componente legacy no usado

#### [DELETE] [material-combobox.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/material-combobox.tsx)
- Componente legacy no usado

#### [MODIFY] [projects-data.ts](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/lib/projects-data.ts)
- Eliminar los 10 proyectos mock hardcodeados (ya no se usan)
- Conservar solo `statusConfig`, `formatCurrency`, y tipos `Project`
- Unificar `REVENUE_MARKUP` en un solo lugar

#### [MODIFY] Páginas de catálogos (insumos, colaboradores)
- Eliminar las copias duplicadas de `formatCurrency()` e importar desde `@/lib/projects-data`

---

### Toast Notifications (reemplazo de alert())

#### [NEW] [src/components/ui/sonner.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/ui/sonner.tsx)
- Instalar `sonner` (librería de toasts minimal, compatible con Next.js App Router)
- Agregar `<Toaster>` en el layout raíz

#### [MODIFY] [AppContext.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/context/AppContext.tsx)
- Reemplazar todos los `alert()` por `toast.success()` / `toast.error()` de sonner
- Tipar correctamente las props (eliminar `any[]`)

---

## Fase 2 — Introducción de Interactividad

**Objetivo:** Convertir las vistas estáticas en interfaces que reaccionan al instante.

### Sistema de Loading States

#### [NEW] [src/components/ui/skeleton.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/ui/skeleton.tsx)
- Componente Skeleton de ShadCN para shimmer loading

#### [NEW] [src/app/loading.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/loading.tsx)
- Skeleton del dashboard (4 cards + tabla placeholder)

#### [NEW] [src/app/proyectos/loading.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/proyectos/loading.tsx)
- Skeleton de tabla genérica para cada página de catálogo

#### [NEW] [src/app/error.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/error.tsx)
- Error boundary con botón "Reintentar" y mensaje amigable

---

### CRUD en Catálogos

#### [NEW] [src/app/actions/catalogs.ts](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/actions/catalogs.ts)
- Server Actions protegidas con `withAuth`:
  - `createProyecto(data)`, `updateProyecto(id, data)`, `deleteProyecto(id)`
  - `createCliente(data)`, `updateCliente(id, data)`
  - `createInsumo(data)`, `updateInsumo(id, data)`, `toggleInsumoActivo(id)`
  - `createColaborador(data)`, `updateColaborador(id, data)`, `toggleColaboradorActivo(id)`

#### [NEW] [src/components/ui/sheet.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/ui/sheet.tsx)
- Componente Sheet de ShadCN (slide-over panel)

#### [NEW] [src/components/create-project-sheet.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/create-project-sheet.tsx)
- Slide-over para crear/editar proyectos
- Formulario con validación inline, selector de cliente existente o nuevo

#### [MODIFY] Todas las páginas de catálogos
- Agregar botón "＋ Nuevo" que abre un Sheet/Dialog
- Agregar acciones por fila: Editar (Sheet), Activar/Desactivar (toggle instantáneo con Optimistic UI)
- Agregar confirmación de acciones destructivas con Dialog

---

### Tabla Interactiva Mejorada

#### [MODIFY] [projects-table.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/projects-table.tsx)
- Implementar sorting real (clickear columna → ordena asc/desc)
- Agregar paginación (10 items por página)
- Cada fila clickeable → abre detalle del proyecto en Sheet
- Eliminar botones de export placeholder o implementar export CSV real

---

### Formulario de Registro Mejorado

#### [MODIFY] [task-logger-screen.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/task-logger-screen.tsx)
- Reemplazar `alert("Selecciona un proyecto")` por validación visual inline
- Re-habilitar `<RecentLogs>` debajo del formulario mostrando registros del día
- Agregar preview de costo en tiempo real (ej: "Estimado: 12,600 Gs" mientras se llenan horas)

#### [MODIFY] [insumos-panel.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/insumos-panel.tsx)
- Mostrar subtotal en tiempo real: `precio_unitario × cantidad = total_estimado`
- Agregar Combobox con búsqueda en lugar de Select plano

#### [MODIFY] [mano-de-obra-panel.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/components/mano-de-obra-panel.tsx)
- Validación visual: hora fin debe ser > hora inicio (con warning de cruce de medianoche)
- Mostrar cálculo en vivo: "X minutos × tarifa = Y Gs"
- Confirmación antes de enviar con resumen del registro

---

## Fase 3 — Optimización de Rendimiento y Polish

**Objetivo:** La app debe sentirse instantánea y pulida como Linear o Vercel.

### Micro-animaciones

#### [MODIFY] [globals.css](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/app/globals.css)
- Agregar keyframes de entrada para cards (`fade-in-up`), filas de tabla (`fade-in`), y page transitions
- Clases: `.animate-fade-in`, `.animate-slide-up`, `.animate-scale-in`
- Transiciones hover suaves para botones y cards (transform + shadow)

### Optimistic UI

#### [MODIFY] [AppContext.tsx](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/src/context/AppContext.tsx)
- Implementar patrón optimistic: actualizar UI inmediatamente al enviar, revertir si el server devuelve error
- Usar `useOptimistic` de React 19 donde aplique

### Accesibilidad

#### [MODIFY] Layout y componentes
- Agregar `<a href="#main-content" className="sr-only focus:not-sr-only">Saltar al contenido</a>`
- Envolver navegaciones en `<nav>` con `aria-label`
- `aria-live="polite"` en regiones dinámicas
- Focus management después de form submissions
- `aria-label` en tablas

### Cleanup Final

- Eliminar todos los `any` types — tipar correctamente con interfaces Prisma
- Agregar `revalidatePath` en TODAS las rutas afectadas, no solo `"/"`
- Crear archivo `src/lib/constants.ts` para centralizar magic numbers (`MARKUP_RATE`, `DEFAULT_TARIFA`)

---

## Resumen Visual del Cambio

```
ANTES (Rígido)                    DESPUÉS (Profesional)
─────────────────                 ─────────────────────
❌ alert() para feedback          ✅ Toast notifications (sonner)
❌ Páginas estáticas read-only    ✅ CRUD con Sheets/Modals
❌ Sin estados de carga           ✅ Skeleton screens en cada página
❌ Sin paginación                 ✅ Tablas con sort + paginación
❌ Métricas falsas                ✅ Datos reales o sin deltas
❌ Usuario hardcodeado            ✅ Datos de sesión JWT reales
❌ Login dentro del layout        ✅ Layout separado para auth
❌ 2 items en nav móvil           ✅ 5 items + menú "Más"
❌ Export placeholder              ✅ Export CSV funcional
❌ Sin validación visual          ✅ Inline validation + previews
❌ Código muerto/duplicado        ✅ Limpio y modular
```

## Verificación

### Automated Tests
```bash
npm run build
```
- Build de producción sin errores TypeScript al final de cada fase.

### Manual Verification
1. Verificar que `/login` NO muestre sidebar ni bottom nav
2. Verificar que el sidebar muestre el nombre real del usuario logueado
3. Verificar que las métricas no muestren deltas falsos
4. Verificar toast notifications al crear registros
5. Verificar skeleton screens al navegar entre páginas
6. Probar CRUD completo en cada catálogo
7. Probar en móvil: navegación completa desde bottom nav
