# Documentación Técnica: Sistema aFull

## 1. Arquitectura General

**Sistema aFull** es una aplicación monolítica Full-Stack construida sobre Next.js (App Router), enfocada en el costeo, registro de horas (Mano de Obra) y consumo de insumos en proyectos.

### Pila Tecnológica
- **Frontend:** Next.js, React, Tailwind CSS, ShadCN UI.
- **Backend:** Next.js Server Actions, Next.js Middleware.
- **Base de Datos:** PostgreSQL.
- **ORM:** Prisma.
- **Autenticación:** JWT vía la librería `jose`.

---

## 2. Lógica de Base de Datos y Triggers

### 2.1 Tablas Principales
- `proyectos`: Eje central al que se asocian los registros.
- `colaboradores`: Contiene las `tarifa_minuto` individuales. Sirve además como base de usuarios para la aplicación.
- `insumos`: Catálogo con `precio_unitario`.
- `registros`: Tabla transaccional polimórfica (maneja tipos `MO` e `INSUMO`).

### 2.2 Cruce de Medianoche y Cálculos Automáticos
**Por qué:** Para evitar que la lógica del frontend o la red introduzcan errores al calcular los tiempos y costos. La base de datos siempre actúa como la fuente de verdad.
**Cómo:** El trigger `trigger_calcular_total` ejecuta la función `calcular_total_registro()` antes de cada `INSERT` o `UPDATE` en la tabla `registros`.
- Calcula la diferencia entre `hora_inicio` y `hora_fin`.
- Si el resultado es negativo (ej. 23:00 a 02:00), suma `1440` minutos (24 horas).
- Multiplica los minutos resultantes por la tarifa del `colaborador_id`.

### 2.3 Vista de Rentabilidad
**Por qué:** Renderizar el dashboard requiere procesar miles de registros agrupados.
**Cómo:** Se utiliza la vista `reporte_costos_proyectos`, la cual realiza el `JOIN` y los `SUM` agrupados por `proyecto_id` directamente a nivel del motor SQL, siendo extremadamente rápida de consultar a través de Prisma.

---

## 3. Seguridad y Autenticación

### 3.1 Middleware y JWT
**Por qué:** Para restringir el acceso a usuarios no autorizados de forma centralizada sin tener que verificar sesión vista por vista.
**Cómo:** El archivo `src/middleware.ts` intercepta la navegación hacia `/` (Dashboard) y `/registro`.
- Busca la cookie `auth_token`.
- Valida la firma JWT (utilizando `jose`, compatible con el Edge Runtime).
- Si la validación falla o la cookie no existe, redirige a `/login`.

### 3.2 Server Actions Seguras (`withAuth`)
**Por qué:** Cualquier endpoint HTTP (como lo son las Server Actions en el fondo) puede ser atacado. Se debe validar quién realiza la petición.
**Cómo:** La función utilitaria `withAuth` envuelve cada Server Action de negocio (ej. `createRegistroMO`). Extrae la información del usuario del token JWT y la inyecta directamente como argumento en la función (ej. `session.colaborador_id`). Esto elimina la necesidad de que el operario elija su nombre en la interfaz, evitando el fraude ("fichar horas de otro compañero").

---

## 4. Estructura de Vistas

### 4.1 Dashboard (`app/page.tsx`)
Renderizado exclusivamente en el servidor (Server Component). No depende de contextos. Extrae métricas consumiendo la vista de Prisma (`prisma.reporteCostosProyectos.findMany()`) y mapea los resultados a componentes UI puramente visuales (`MetricsCards`, `ProjectsTable`).

### 4.2 Registro Móvil (`app/registro/page.tsx`)
Presenta selectores y formularios. A través de transacciones asíncronas (`useTransition`), invoca las Server Actions. Al concluir exitosamente, llama a `revalidatePath("/")` para invalidar la caché de Next.js y refrescar el Dashboard instantáneamente.
