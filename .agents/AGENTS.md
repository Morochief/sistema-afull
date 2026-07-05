# Sistema aFull - Agent Specification & Environment Rules

Este documento define la base de conocimiento, las reglas de arquitectura y las directrices operativas que deben seguir todos los agentes de IA que colaboren en este proyecto.

---

## 1. Información General del Proyecto

**Sistema aFull** es una plataforma de automatización operativa diseñada para gestionar:
* **Registros de Horas / Mano de Obra (MO)** de colaboradores.
* **Registros de Insumos y Costos** asociados a proyectos y clientes.
* **Registro y Control de Vehículos** (kilometraje inicial/final, discrepancias por GPS, consumo y fotos de odómetro).
* **Importación y Enriquecimiento de Datos** desde archivos Excel utilizando IA (Gemini).

### Arquitectura Técnica:
* **Frontend**: React 19, Vite, TailwindCSS (Vite plugin), Lucide Icons, Framer Motion.
* **Backend**: Node.js Express (ESM format), TypeScript, Prisma ORM.
* **Base de Datos**: PostgreSQL alojado en Supabase (con pooler de transacciones en puerto 6543 y directo en 5432).
* **Almacenamiento**: Supabase Storage (Bucket: `vehiculos-fotos`).

---

## 2. Convenciones del Entorno de Desarrollo

* **Variables de Entorno**:
  * Para desarrollo local, las credenciales se cargan desde `.env.local`.
  * En producción (Render/Vercel), las credenciales se inyectan a través del panel de control.
  * **CRITICAL**: El servidor de Express siempre debe cargar `.env.local` antes que `.env` para asegurar que las variables de Supabase estén disponibles localmente.
* **Puertos por Defecto**:
  * Servidor Backend: Puerto `3000` por defecto en el código (`process.env.PORT || 3000`), o puerto `3100` si es configurado explícitamente en el archivo `.env.local` mediante la variable `PORT`.

---

## 3. Matriz de Restricciones del Agente (ALWAYS / ASK / NEVER)

| SIEMPRE (ALWAYS) | PREGUNTAR (ASK) | NUNCA (NEVER) |
| :--- | :--- | :--- |
| Cargar `.env.local` antes de `.env` en scripts y servidores backend. | Ejecutar migraciones destructivas en la base de datos (`prisma migrate`). | Subir una URL pública (e.g. `http...` o `/uploads...`) a la función `guardarFotosVehiculo`. |
| Traducir explícitamente enums de Base de Datos a valores de UI (ej: mapDbRolToUi / mapUiRolToDb) al interactuar con Prisma. | | Insertar strings arbitrarios directamente en columnas mapeadas a Enums en Prisma. |
| Añadir un *Cache Buster* (`?t=timestamp`) al renderizar URLs de Supabase Storage en el frontend. | Realizar `git push` directo a la rama `main` en producción. | Omitir `preventDefault()` en controladores de envío de formularios. |
| Correr el compilador/typecheck (`npm run build`) después de cada cambio en los archivos. | Modificar esquemas de bases de datos (`schema.prisma`). | Dejar llamadas a APIs del servidor sin protección de autorización (`requireAuth`). |
| Invalidar inmediatamente la caché de sesión (`userActiveCache.delete`) al desactivar o modificar un usuario. | Cambiar la configuración de variables de entorno globales. | Guardar contraseñas o datos sensibles sin encriptación previa. |
| Comprimir y optimizar imágenes en cliente antes de enviarlas al servidor. | | |

---

## 4. Agentes Especializados (Subagents)

Cuando sea necesario realizar tareas complejas, se delegará en los siguientes **roles conceptuales de subagentes** (configurando el prompt del sistema de la tarea según corresponda, sin requerir la presencia de archivos físicos en el repositorio):

* **`db-guardian`**: Especializado en Prisma, migraciones seguras y rendimiento de queries de bases de datos.
* **`ui-auditor`**: Especializado en responsive design, transiciones fluidas de UI (Framer Motion) y optimización de renderizados.
* **`security-inspector`**: Especializado en sanitización de inputs, protección CSRF y autenticación segura con cookies httpOnly.

---

## 5. Documentación de Subsistemas Clave

### Flujo de Fotos de Vehículos
1. **Inicio de Viaje**: El usuario toma una foto del odómetro. El frontend la comprime y la envía al endpoint `/api/viaje/start`, el cual la almacena en base64 en la tabla `ViajeActivo`.
2. **Fin de Viaje**: El usuario toma la foto final. El frontend envía la foto final en base64 junto con los datos del viaje al endpoint `/api/viaje/stop`.
3. **Procesamiento de Fotos**: El servidor invoca `guardarFotosVehiculo()`. Esta función toma las fotos en base64, las decodifica a binario y las sube a Supabase Storage bajo la ruta `vehiculos/<registroId>/odometro_[inicio/fin].jpg`. Retorna las URLs públicas deterministas de las fotos.
4. **Paridad de URL**: Dado que las URLs de Supabase son deterministas, no cambian aunque se actualice la foto física. Por lo tanto, el frontend debe usar el *Cache Buster* (`?t=timestamp`) para evitar que el navegador cargue fotos antiguas de la caché o páginas de error 404 previas.

### Gestión de Usuarios y Roles (RBAC)
1. **Roles Soportados (Prisma Enum)**:
   - **`ADMIN`**: Acceso total al panel de administración, reportes, importaciones y creación/desactivación de cuentas.
   - **`OPERADOR`**: Registro de horas y control de viajes. No puede ver datos de administración general.
   - **`VISOR`**: Vista de solo lectura. Útil para auditoría y visualización de reportes, sin privilegios de edición o borrado.
2. **Endpoints de Administración (Admin-Only + rate limited)**:
    - `GET /api/users`: Retorna lista de cuentas sin contraseñas.
    - `POST /api/users`: Crea nuevo usuario validando contraseña con `PasswordComplexitySchema`.
    - `PUT /api/users/:id`: Actualiza perfiles de usuario, roles y/o contraseñas (hasheándolas con bcrypt).
    - `DELETE /api/users/:id`: Desactiva/activa una cuenta (soft toggle) e invalida inmediatamente la sesión en caché. Admite el parámetro query `?hard=true` para realizar una eliminación física permanente en la base de datos.


---

## 6. Lecciones Aprendidas & Decisiones de Diseño

### A. Interfaz y Diálogos de Notificación (Eliminación de Nativos)
- **Regla:** Queda estrictamente prohibido el uso de `alert()` o `confirm()` nativos del navegador.
- **Solución:** Utilizar el provider global `NotifProvider` y sus métodos `showToast(msg, type)` y `requestConfirm(title, msg, type, callback, confirmText)`.
- **Estilos:** Toda notificación o modal debe usar el estilo glassmorphic (`glass-panel`, `glass-input`, `glass-select`) y transiciones de muelle (spring) con `motion/react` para mantener una estética premium coherente.

### B. Sincronización de Tipos y Enums (Prisma/PostgreSQL)
- **Regla:** Cuando se interactúe con enums nativos de base de datos (ej. Rol en la tabla de usuarios), nunca se deben insertar strings libres o realizar conversiones implícitas en crudo en el backend.
- **Solución:** Implementar funciones helper explícitas de traducción bidireccional (ej. `mapDbRolToUi` y `mapUiRolToDb`) para asegurar que el backend se comunique con la DB usando los tipos exactos de Prisma, evitando crasheos en tiempo de ejecución.

### C. Caché de Sesión de Usuario y Seguridad
- **Regla:** Al cachear en memoria el estado de actividad de un usuario para proteger endpoints pesados o recurrentes (ej. `requireAuth` con TTL de 60s), cualquier mutación que deshabilite, edite o elimine un usuario debe invalidar inmediatamente la caché.
- **Solución:** Ejecutar de forma explícita `userActiveCache.delete(username)` en los endpoints de mutación (`PUT`, `DELETE`) para garantizar la revocación inmediata de acceso sin esperar la expiración del TTL.

### D. Filosofía de Desarrollo Minimalista (Ponytail)
- **Regla:** Seguir la escalera de PonyTail antes de escribir código: YAGNI -> Reutilizar -> Usar stdlib -> Usar APIs nativas -> Usar dependencias ya instaladas -> Escribir el mínimo diff posible.
- **Seguridad:** No escatimar en validaciones de seguridad (ej. `PasswordComplexitySchema` y sanitización CSRF) bajo el pretexto de simplificar código.

### E. Procedimiento de Rollback en Despliegues (Producción)
- **Fallo en Base de Datos / Migración Fallida:**
  1. Restaurar backup de la base de datos Supabase desde el panel de control.
  2. Revertir el esquema y migrations locales corriendo `git checkout <commit_anterior_estable> prisma/`.
  3. Ejecutar `npx prisma db push` para asegurar que el motor de la base de datos vuelva a estar en sincronía con el esquema anterior estable.
- **Fallo en Servidor Backend:**
  1. En el panel de control de **Render**, ir a la sección **Deploys**.
  2. Identificar el último deploy estable y hacer clic en **Rollback** para redesplegar el build anterior exitoso.

### F. Defensa en Progreso contra Inconsistencias de Base de Datos (Fail-Fast)
- **Regla:** En flujos asíncronos de dos fases (ej: iniciar viaje -> finalizar viaje), el backend debe validar la existencia física en DB de todas las llaves foráneas en la primera fase (`/api/viaje/start`).
- **Solución:** Prevenir que el flujo comience con IDs obsoletos o inválidos si el usuario vació tablas. Esto evita que el servidor explote con un error 500 por violaciones de FK (`P2003`) en la segunda fase (`/api/viaje/stop`), la cual es mucho más difícil de corregir reactivamente en el cliente.

### G. Coherencia de Seeding (Sincronización UI-DB)
- **Regla:** Al programar seeds automáticos por base de datos vacía, nunca se deben crear registros genéricos ficticios (ej: "Cliente General") si el frontend o los fixtures históricos tienen hardcodeados IDs específicos (`cli_1`, `pro_1`).
- **Solución:** Sintonizar los IDs sembrados de forma unívoca con el `initialData` del negocio original para garantizar que los dropdowns y consultas funcionen perfectamente tras limpiezas de base de datos.

### H. Evitar Dependencias Circulares de Módulos (ESM / esbuild)
- **Regla:** En proyectos empaquetados bajo ESM con esbuild, si un módulo dependiente (como `server-auth.ts`) requiere el singleton de Prisma (`prisma.ts`), el archivo principal (`server.ts`) debe colocar la importación de `prisma` al inicio del archivo (antes que los middlewares).
- **Solución:** Si se evalúan las rutas y middlewares antes de que se resuelva la inicialización de la base de datos por dependencias circulares, la constante `prisma` quedará como `undefined`, provocando errores `Cannot read properties of undefined` en tiempo de ejecución.

### I. Caching Seguro de Sesión en Memoria (Pérdida de Payload)
- **Regla:** Al cachear el estado de actividad del usuario en `requireAuth` para mitigar latencias, se debe guardar en la entrada de la caché la metadata de negocio completa (`nombre`, `rol`, `colaboradorId`).
- **Solución:** No confiar únicamente en los datos planos que vienen originalmente en la cookie JWT (los cuales pueden estar obsoletos o no tener campos como `colaboradorId` tras migraciones). La caché debe actuar como snapshot sincronizado del usuario en la base de datos para inyectarlo en `req.user` de forma consistente en cada petición recurrente.

### J. Habilitación de Instalación Nativa (PWA / Progressive Web App)
- **Regla:** Para que la web sea instalable como App nativa en móviles y PC, debe proveer un archivo `manifest.json` enlazado en `index.html` con iconos cuadrados en PNG (mínimo de 192px y 512px) y registrar un `sw.js` (Service Worker) que controle las solicitudes fetch.
- **Solución:** El Service Worker no debe almacenar en caché solicitudes mutativas (`POST`, `PUT`, `DELETE`) ni llamadas a APIs de bases de datos/IA externas. Se debe validar de forma explícita: `if (event.request.method !== 'GET') return;` para evitar romper las validaciones transaccionales CSRF o la autenticación HttpOnly.

### K. Prohibición de require() Dinámico en Módulos ESM
- **Regla:** En ambientes compilados bajo ESM puro (`type: "module"` en `package.json`), el uso de `require('modulo')` está estrictamente prohibido y causa un crash crítico en tiempo de ejecución.
- **Solución:** Utilizar siempre imports estáticos al inicio del archivo (ej: `import crypto from 'crypto'`) y evitar importaciones dinámicas inline en los endpoints para mantener la compatibilidad con el agrupador esbuild.

### L. Preservación del Historial en Soft-Deactivations (Proyectos Finalizados)
- **Regla:** Al deshabilitar lógicamente una entidad de relación (como proyectos con `activo: false`), no se debe filtrar ciegamente la entidad en todos los flujos de la interfaz.
- **Solución:** Los dropdowns de nuevos registros sí deben ocultar el proyecto inactivo, pero los dropdowns de edición en registros históricos **deben concatenar de forma explícita el proyecto actualmente seleccionado en el registro** (aunque esté inactivo) para evitar crasheos visuales y pérdida de datos al guardar modificaciones.

### M. Ejecución de Prisma CLI en Entornos Locales de Windows
- **Regla:** El ejecutable `prisma db push` lee directamente el archivo `.env` de la raíz del proyecto y no reconoce de forma automática archivos `.env.local` de desarrollo.
- **Solución:** Para realizar migraciones y pushes seguros localmente sin alterar el archivo `.env` global de producción, se deben inyectar las variables DATABASE_URL y DIRECT_URL en el comando del shell antes de la llamada (ej. en PowerShell: `$env:DATABASE_URL="..."; npx prisma db push`).

### N. Mapeo de Variantes de Color en Componentes Visuales Reutilizables
- **Regla:** Al inyectar dinámicamente nuevas clases de colores o estilos basadas en propiedades de negocio (ej. badge `rose` para estados finalizados), el componente receptor (ej. `DataCard`) debe tener mapeadas explícitamente esas clases en su diccionario de estilos.
- **Solución:** Si se pasa una variante de color no registrada en el diccionario de Tailwind del componente, las clases correspondientes de borde y fondo se evalúan como `undefined`, provocando que el elemento visual se renderice sin estilos (invisible o desalineado).

### O. Prevención de Pérdida de Dependencias en esbuild Bundles
- **Regla:** Cuando se compila el backend con la bandera `--packages=external`, dependencias runtime obligatorias (como `@prisma/client` y `@supabase/supabase-js`) no deben colocarse en `devDependencies`.
- **Solución:** Mantener estos paquetes estrictamente en `dependencies`. En caso contrario, los despliegues de producción (como Render) descartarán el código de estos módulos durante el `npm prune --production`, rompiendo el arranque con errores `Cannot find module`.

### P. Detección Fiel de IPs de Clientes Detrás de Proxies Inversos
- **Regla:** Para que auditorías de seguridad o geocercas basadas en IP capturen la IP pública real del dispositivo (y no la IP interna del proxy del hosting).
- **Solución:** Configurar explícitamente `app.set('trust proxy', 1)` en Express al arrancar en entornos de nube como Render para habilitar la lectura de las cabeceras `X-Forwarded-For`.

### Q. Evitar Bucles Infinitos de Crash con Cookies Stale
- **Regla:** Si un token o sesión JWT causa un crash en los Hooks globales del ciclo de carga inicial en la UI, el error renderizado no debe atrapar al usuario.
- **Solución:** El componente `ErrorBoundary` siempre debe incorporar un botón de "Cerrar Sesión" que borre proactivamente las cookies del cliente mediante `POST /api/auth/logout` y lo redirija a la raíz, permitiendo una recuperación autónoma y limpia.

### R. Flujos UI Síncronos y Preservación de Datos ante Errores de API
- **Regla:** El éxito y reseteo de un formulario de administración no debe asumirse de forma anticipada ("eager").
- **Solución:** Las notificaciones verdes de éxito, el limpiado de inputs de formularios y el cerrado de ventanas modales deben secuenciarse a la resolución exitosa (HTTP status 200) de la petición fetch. Ante errores del servidor (como nombres duplicados), los datos introducidos deben preservarse intactos y el error debe mostrarse mediante toast rojo en pantalla.




## 7. Estrategia y Suite de Tests de Integración

Para blindar la lógica de negocio sin sobre-ingeniería (filosofía *Ponytail*), se cuenta con una suite de tests de integración que realiza llamadas HTTP reales usando `supertest` contra la base de datos de desarrollo (sin mockear Prisma).

### Matriz de Cobertura
| Suite | Flujo | Gap que Cierra |
| :--- | :--- | :--- |
| `users-integration.test.ts` | CRUD completo de usuarios con JWT + CSRF | Regresiones en payload (ej: colaboradorId null/undefined) |
| `auth-integration.test.ts` | Login exitoso/fallido y Logout | Fallas en entrega o limpieza de cookies JWT |
| `import-integration.test.ts` | Confirmar importación masiva en transacción | Integridad transaccional, errores en conteos de inserción |
| `vehiculos-integration.test.ts` | Viajes start/stop con fotos base64 | Fallas en subida de fotos a Supabase Storage y validaciones Zod |

### Directrices y Lecciones Aprendidas de Tests
1. **Aislamiento del Listener:** El inicio del servidor en `server.ts` está condicionado a `process.env.NODE_ENV !== 'test'`. Esto permite exportar `app` y que `supertest` realice peticiones sin causar conflictos de puertos ocupados.
2. **Ambiente de Ejecución:** Los tests de API deben correr bajo el ambiente de Node puro. Se debe incluir la directiva `// @vitest-environment node` en la cabecera del archivo de pruebas para evitar colisiones con variables globales del navegador simuladas por `jsdom`.
3. **Gestión de Timeouts:** Las pruebas que involucren criptografía (hasheo de contraseñas con bcrypt en creación) o llamadas de red externas reales (subida de fotos de odómetro a Supabase Storage) deben tener un timeout extendido (mínimo `15000`ms a `20000`ms) para evitar falsos negativos por latencia.
4. **Limpieza en Cascada (Cleanup):** Al finalizar los tests de integración (`afterAll`), se debe realizar el borrado en cascada respetando las restricciones de llave foránea (Foreign Keys) de Supabase (ej: primero eliminar registros, luego proyectos, luego el cliente temporal).


## H. Subsistema de Marcaciones (Control Horario con Geocerca)

### Proposito
Permitir a empleados marcar entrada y salida solo si estan fisicamente dentro de la zona laboral (validado por GPS). Proporciona al admin un timeline auditable con deteccion de uso compartido de credenciales.

### Modelos de Datos (Prisma)
- **Marcacion**: id, usuario, tipo (ENTRADA|SALIDA), timestamp (server-side), lat/lng, precision, ip, dispositivoHash (SHA-256 de user-agent + IP), userAgent, origen (APP|API)
- **GeocercaConfig**: id, lat, lng, radioMetros, activo (una fila, id='default')

### Endpoints
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | /api/marcacion/config | Publico | Devuelve geocerca activa. Seed automatico si no existe |
| POST | /api/marcacion/entrada | requireAuth | Marca entrada. Valida geocerca y GPS. Guarda IP + hash dispositivo |
| POST | /api/marcacion/salida | requireAuth | Marca salida. Mismas validaciones |
| GET | /api/marcacion/mis-marcaciones | requireAuth | Historial del usuario (ultimas 50) |
| GET | /api/marcacion/admin/timeline | requireAdmin | Timeline completo con deteccion de anomalias (MULTIPLES_IPS, MULTIPLES_DISPOSITIVOS) |

### Frontend
- **MarcacionesUI.tsx** — Boton ENTRADA/SALIDA en el header (visible para todos los usuarios). Usa Geolocation API del navegador. Muestra historial de ultimas 5 marcaciones en dropdown. Cambia de color segun estado (azul = sin entrada, verde = entrada activa).
- **TimelineMarcaciones.tsx** — Pestana "Marcaciones" en AdminPanel (color ambar). Filtro por usuario, muestra IPs, coordenadas, y alertas de anomalias.

### Reglas de Negocio
1. **Geocerca como firewall** — no se puede marcar fuera de la zona. Sin excepcion.
2. **Timestamp del servidor** — el servidor estampa la hora, no el cliente.
3. **GPS requerido** — si el navegador no da permisos, no se puede marcar.
4. **Pares entrada-salida** — no se permite doble entrada sin salida, ni salida sin entrada previa.

### Deteccion de Credenciales Compartidas
El endpoint /api/marcacion/admin/timeline agrupa marcaciones por usuario y detecta:
- MULTIPLES_IPS: mismo usuario desde distintas IPs
- MULTIPLES_DISPOSITIVOS: mismo usuario con distinto dispositivoHash

### Seed Automatico
Al primer GET /api/marcacion/config si no existe geocerca, se crea con coordenadas del local y radio 100m.

### Coordenadas de Geocerca
- Lat: -25.320588291024226
- Lng: -57.62418119104182
- Radio: 100 metros


## I. Lecciones Aprendidas — Sesion de Debugging (Junio 2026)

### 1. esbuild + PrismaClient: Una Sola Instancia Compartida
**Problema:** esbuild renombra la segunda importacion de PrismaClient como "PrismaClient2" en el bundle. Como @prisma/client es externo (--packages=external), el alias no existe en el package, resultando en undefined.
**Regla:** NUNCA tener dos archivos con su propio `new PrismaClient()`. Crear un unico singleton en `src/lib/prisma.ts` y que todos los archivos importen `{ prisma }` desde ahi. Esto evita que esbuild renombre la clase y que se generen instancias duplicadas.
**Sintoma:** "Cannot read properties of undefined (reading 'findFirst')" en handlers que usan prisma en el bundle de produccion.

### 2. prisma generate en Build Script
**Problema:** Render ejecuta npm run build, pero si el script no incluye `prisma generate`, el Prisma Client empaquetado NO tiene los modelos agregados al schema despues de la instalacion inicial.
**Regla:** El script build en package.json DEBE empezar con `prisma generate && ...` para asegurar que el cliente tenga todos los modelos del schema actual.
**Sintoma:** `prisma.ModeloNuevo` es undefined en produccion aunque el schema local tenga el modelo.

### 3. Cache de requireAuth con nombre Stale
**Problema:** La cache de 60s en requireAuth almacena `activo/checkedAt`. Si un JWT se firmo sin `nombre` en el payload (codigo anterior), la cache quedaba con `nombre: undefined` y nunca refrescaba porque el cache hit no volvia a consultar DB.
**Regla:** Invalidar la cache si `nombre` (u otros campos de sesion) estan vacios: `const cacheStale = cached && !cached.nombre;`. En cache hit con nombre vacio, forzar DB fetch.
**Sintoma:** `user: undefined` en logs de auth aunque el usuario exista en DB.

### 4. Safe Checks en .toLowerCase()
**Problema:** Cualquier `.toLowerCase()` sobre `user.nombre`, `col.nombre` o `currentUser.nombre` crashea si el valor es undefined. El safe check `col.nombre ?` no protege si `col` mismo es undefined (como cuando `dbState?.colaboradores` es undefined).
**Regla:** Siempre usar: `(dbState?.colaboradores || []).find(col => { if (!col?.nombre || !currentUser?.nombre) return false; ... })`. Nunca asumir que un array existe ni que un elemento tiene todas las propiedades.

### 5. ErrorBoundary con Boton de Cerrar Sesion
**Problema:** Si la app crashea durante la carga inicial (ej: session invalida), el ErrorBoundary atrapa el error pero solo ofrece "Reintentar" o "Recargar Pagina". Ambos llevan al mismo crash. El usuario queda atrapado en un bucle infinito sin poder limpiar su cookie JWT.
**Regla:** El ErrorBoundary SIEMPRE debe incluir un boton "Cerrar Sesion" que llame a `POST /api/auth/logout` y redirija a /.

### 6. Insercion de Codigo Grande con Node Scripts
**Problema:** Los Scripts de Node que modifican archivos grandes (3000+ lineas) usando reemplazos de texto exactos fallan silenciosamente por diferencias minimas de whitespace, encoding (CRLF vs LF), o caracteres especiales.
**Regla:** Para modificaciones grandes, usar scritps .mjs en archivos separados (no -e inline) y verificar con Select-String que los cambios se aplicaron. Mejor aun: hacer los cambios manualmente o con herramientas disenadas para AST en vez de texto plano.

### 7. Bundle Hash de Produccion
**Problema:** Al debuggear errores de produccion, el bundle hash del JS cambia con cada build. Los errores del bundle anterior pueden confundirse con el actual si Render no termino de desplegar.
**Regla:** Verificar el hash del bundle (index-XXXX.js) en los logs del navegador contra el hash del ultimo build local. Si no coinciden, el deploy no se completo.

### 8. prisma db push para Tablas Nuevas
**Problema:** Agregar modelos nuevos al schema.prisma y hacer prisma generate NO crea las tablas en la base de datos. prisma generate solo genera el cliente TypeScript. Las tablas en Supabase/PostgreSQL se crean con prisma db push.
**Regla:** Despues de agregar modelos nuevos al schema:
1. `npx prisma generate` (cliente local)
2. `npx prisma db push --accept-data-loss` (crea las tablas en Supabase)
3. El build script en package.json debe incluir `prisma generate &&` para Render.
**Sintoma:** "The table public.X does not exist" en produccion. Las queries fallan aunque el schema local este correcto.

### 9. Verificacion de Geocerca (403 FUERA_DE_ZONA)
**Problema:** El endpoint /api/marcacion/entrada devuelve 403 FUERA_DE_ZONA. Esto NO es un error - el sistema de geocerca esta funcionando. El usuario debe estar fisicamente dentro del radio (100m) del local para marcar.
**Regla:** Para probar sin estar en el local:
- Aumentar radioMetros en tabla geocerca_config via DB
- O desactivar la geocerca (activo = false)
- O mockear GPS en DevTools del navegador > Sensors > Location
El sistema RECHAZA marcaciones fuera de zona por diseno.

### 10. Secuencia Completa para Agregar un Nuevo Subsistema
Basado en la experiencia de agregar el subsistema de Marcaciones:
1. Schema: Agregar modelos a schema.prisma
2. prisma generate (cliente local)
3. prisma db push (tablas en Supabase)
4. Endpoints: Agregar rutas en server.ts
5. Build: Verificar que server.mjs se genera sin errores de esbuild
6. prisma generate en build script (para Render)
7. Frontend: Componente + integracion
8. Lecciones: Documentar problemas encontrados en AGENTS.md
**Errores comunes:** esbuild renombra PrismaClient duplicado, cache de requireAuth con datos stale, tablas no creadas en Supabase, .toLowerCase() sin safe checks.

### 11. UI/UX Consistency Audit — Hallazgos Clave
**Problema:** 17 componentes con estilos inconsistentes — botones con 3 radios distintos, inputs con clases inline en vez del sistema glass, labels con 3 formatos de texto diferentes, 4 easing curves distintas para animaciones.
**Regla:** Antes de tocar UI, auditar todos los componentes revisando:
1. className patterns: glass-panel, glass-input, glass-select deben usarse en TODOS los componentes
2. Button radii: estandarizar a rounded-xl para botones
3. Labels: text-xs font-mono uppercase tracking-wider text-slate-400, un solo formato
4. Gradients: botones primarios siempre from-blue-600 to-indigo-600, nunca hex hardcodeados
5. ErrorBoundary: debe seguir el mismo glass design system
6. Mobile: no usar hidden md:flex para elementos funcionales como botones de accion

### 12. Shared Animation Config
**Problema:** 4 easing curves diferentes en componentes: duration:0.22, [0.22,1,0.36,1], [0.16,1,0.3,1], y spring(stiffness:300,damping:25).
**Regla:** Una config compartida:
- Tabs/paginas: { duration: 0.22 } con opacity:0, y:15
- Modales: type: spring, stiffness: 300, damping: 25 con scale:0.95, y:20
- Tarjetas/metricas: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } con opacity:0, y:20

### 13. Bottom Navigation para Mobile
**Problema:** En mobile, las tabs compiten por espacio en el header con logo, badge de usuario, boton de marcacion y logout.
**Regla:** Para mobile (<768px), mover navegacion a barra inferior fija (bottom nav) estilo app nativa. Header solo con logo + acciones de usuario.

### 14. Mobile Metrics Grid
**Problema:** VehiculosAdminView usa grid-cols-2 en mobile mientras Dashboard usa grid-cols-1. Inconsistencia en grillas de metricas.
**Regla:** Todas las grillas de metricas: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4.

### 15. prisma db push --accept-data-loss Resetea Valores de Columna
**Problema:** Ejecutar `prisma db push --accept-data-loss` sobre una tabla existente (ej: `usuarios.rol`) **recrea la columna con su valor default**. Si la columna tiene un default (`@default(OPERADOR)`), todos los registros existentes se sobrescriben con ese default, independientemente del valor que tuvieran antes.
**Regla:** Despues de cualquier `prisma db push --accept-data-loss`, verificar y restaurar los valores de las columnas afectadas:
1. Consultar los valores actuales: `prisma.usuario.findMany({ select: { username: true, rol: true } })`
2. Restaurar los valores correctos via query directa o desde el codigo de seed
3. El log "Users already exist in DB, skipping seed" significa que el seed NO se ejecuta, incluso si los datos estan corruptos. Considerar agregar un check de integridad que compare los valores esperados vs reales.

### 16. Shared Animation Config y Bottom Nav
**Problema:** Al crear `src/lib/animations.ts` para estandarizar animaciones, los scripts de Node que modifican App.tsx fallan porque las cadenas de texto exactas (como strings con saltos de linea) no coinciden con el archivo real debido a diferencias de whitespace, CRLF vs LF, o encoding.
**Regla:** Para modificar App.tsx (+3000 lineas), NO usar scripts de reemplazo de texto. Usar herramientas que operen sobre AST (como jscodeshift) o hacer los cambios a mano. Alternativa: extraer las variantes de motion a un archivo compartido es correcto, pero la integracion debe verificarse con git diff antes de commitear.

### 17. Bottom Nav para Mobile con RBAC
**Regla:** La navegacion inferior (bottom nav) en mobile debe replicar exactamente las mismas reglas RBAC que la navegacion superior. Si el admin ve ciertos tabs arriba, debe ver los mismos abajo. Usar el mismo array de tabs y el mismo filtro `.filter()` para evitar desincronizacion.
**Implementacion:** `{tabs.filter(tab => { ... }).map(tab => <button>...)}` — mismo array, mismo filtro, distinto render (iconos verticales vs texto horizontal).

### 18. Encoding UTF-8 en Strings de Columna Excel
**Problema:** El caracter `ó` en `Descripción` se guardó como `DescripciÃ³n` en server.ts (UTF-8 bytes `0xC3 0xB3` interpretados como Latin-1). El import de Excel buscaba la columna `'Descripción'` con el string corrupto, nunca encontraba match, y todas las descripciones caían al fallback `'Sin descripción'`.
**Regla:** En Node.js/TypeScript, NUNCA confiar en que los acentos y caracteres UTF-8 se guarden correctamente al editar archivos via scripts de reemplazo de texto. El encoding del archivo puede ser UTF-8 BOM, UTF-8 sin BOM, o Latin-1, y el editor/script puede interpretarlo incorrectamente.
- Para verificar: `hexdump -C server.ts | grep -i "descrip"` y buscar los bytes correctos (Ã³ = 0xC3 0xB3 para ó). Si aparecen como 0xC3 0x83 0xC2 0xB3, estan doblemente encodeados.
- Para arreglar: usar un script .mjs (no inline -e) que lea y escriba con encoding explícito UTF-8.
- Prevenir: Usar `row['Descripci\\u00f3n']` en vez del caracter literal, o definir los nombres de columna en una constante al inicio del archivo.
**Sintoma:** Al importar Excel, todas las descripciones aparecen como "Sin descripciÃ³n" aunque el Excel tenga descripciones reales.

### 19. Vinculacion Usuario-Colaborador: IDs Huérfanos despues de db push
**Problema:** El seed de usuarios asigna `colaboradorId` basado en `prisma.colaborador.findFirst({ where: { nombre: { contains: searchName } } })`. Si los colaboradores se recrearon (ej: despues de `prisma db push --accept-data-loss` o un clear de DB), los IDs generados en el seed NO coinciden con los IDs reales de los colaboradores en la DB. El usuario queda vinculado a un ID que no existe.
**Regla:** Despues de cualquier operacion que pueda cambiar IDs en la DB (`db push`, `clear`, restore), verificar las vinculaciones:
```
const users = await prisma.usuario.findMany({ select: { username: true, colaboradorId: true }});
const cols = await prisma.colaborador.findMany({ select: { id: true, nombre: true }});
// Verificar que cada colaboradorId de usuario exista en cols
```
Si hay IDs huerfanos, re-vincular manualmente:
```
const c = await prisma.colaborador.findFirst({ where: { nombre: { contains: 'Rodrigo' } }});
await prisma.usuario.update({ where: { username: 'rodrigo' }, data: { colaboradorId: c.id }});
```
**Sintoma:** "No tenes permiso para registrar horas de otros colaboradores" (403) aunque el usuario sea el colaborador correcto. "Sin Vinculacion" en la lista de usuarios aunque se haya seleccionado un colaborador en el formulario de edicion.

### 20. Verificar Integracion con git diff Antes de Commiteary
**Problema:** Los scripts de Node que modifican archivos grandes (3000+ lineas) usando reemplazos de texto exactos fallan silenciosamente. El script se ejecuta, no tira error, pero el archivo no se modifica porque el patron de busqueda no coincide exactamente (diferencia de whitespace, CRLF vs LF, encoding, o escape de caracteres). El desarrollador commitea y sube el cambio, pero el archivo nunca se actualizo.
**Regla:** Despues de ejecutar cualquier script de modificacion de archivos via Node:
1. Verificar con `git diff --stat` que los archivos esperados aparezcan como modificados
2. Verificar con `git diff HEAD -- <archivo>` que los cambios especificos esten
3. Si no hay diff, el script fallo silenciosamente. Usar `findstr /N "texto-esperado"` (Windows) para confirmar que el patron existe en el archivo
4. Alternativa: en vez de scripts con replace(), usar herramientas AST o edicion directa con edit_file
**Sintoma:** Se sube un commit con "feat: add X to component" pero el componente en produccion no tiene X. El diff del commit muestra 0 cambios en el componente esperado.

### 21. Leer el Archivo Real Antes de Reemplazar Texto
**Problema:** Al intentar modificar `server-audit.ts` via script de Node, se uso un patron de busqueda basado en como se recordaba el archivo (con `const timestamp = ...` y `logLine`), pero el archivo REAL tenia una implementacion diferente (con `const record = { timestamp: ... }` y `JSON.stringify`). El script se ejecuto sin error, pero no reemplazo nada porque el patron no existia.
**Regla:** Antes de escribir un script de reemplazo de texto:
1. `cat server-audit.ts` para ver el contenido EXACTO del archivo (no confiar en la memoria)
2. Copiar y pegar el texto exacto a buscar (incluyendo saltos de linea y espacios)
3. Despues de ejecutar, verificar con `git diff` que el archivo cambio
4. Alternativa mas segura: leer el archivo, buscar el contenido real con `c.includes('texto')`, y solo entonces reemplazar
**Sintoma:** El commit muestra pocos cambios (ej: 1 linea) cuando deberia mostrar muchos. La funcionalidad nueva no aparece en produccion aunque el codigo se haya deployado.

### 22. CRLF vs LF en Reemplazos de Texto
**Problema:** Los scripts de Node que buscan texto en archivos usando `c.replace('texto', 'nuevo')` fallan cuando el archivo tiene saltos de linea CRLF (`\r\n`, Windows) y el patron de busqueda usa LF (`\n`, Unix). El string literal en el script no coincide con el contenido real del archivo aunque se vean identicos en pantalla.
**Regla:** 
1. Verificar con `JSON.stringify(textoDelArchivo)` que los saltos de linea coinciden
2. Usar `c.indexOf('texto')` primero para confirmar que el patron existe ANTES de hacer el replace
3. Si el indexOf encuentra el texto pero el replace no funciona, el problema es CRLF vs LF
4. Solucion: buscar con `contains` (no sensible a CRLF) o normalizar el archivo primero con `c.replace(/\r\n/g, '\n')`
**Sintoma:** El script devuelve "Pattern not found" aunque el texto exista en el archivo. El commit muestra menos cambios de los esperados.

### 23. E2E Tests: Visor Role Write Enforcement & Playwright webServer Optimization
**Problema:** Al ejecutar pruebas E2E en Windows, el webServer de Playwright usando `npx tsx server.ts` puede chocar con puertos ocupados o tardar demasiado en inicializar (timeout de 120s). Además, el rol `Visor` debe ser bloqueado estrictamente tanto en la UI (ocultando botones) como en las peticiones directas de API.
**Regla:** 
1. Desactivar el gestor `webServer` en `playwright.config.ts` para evitar que intente iniciar/matar el servidor en bucle bajo Windows, corriendo las pruebas directamente contra el servidor activo (en el puerto configurado).
2. Proteger siempre todos los endpoints mutativos (`POST`, `PUT`, `DELETE` en `/api/registros`, `/api/clientes`, `/api/proyectos`) con el middleware `requireWriteAccess` además de `requireAuth` para que cualquier petición directa de API desde la consola del navegador por un `Visor` retorne `403 Forbidden`.
**Sintoma:** Los tests E2E fallan localmente por timeout en el puerto 3100, o un usuario Visor logra saltarse las restricciones visuales haciendo fetch directo en consola.

### 24. Unificación de Módulos Relacionados (Colaboradores y Accesos)
**Regla:** Para optimizar la experiencia de usuario y evitar tareas repetitivas de vinculación manual, la gestión de entidades físicas (como Colaboradores) y sus accesos al sistema (Usuarios) debe realizarse en un único módulo unificado. Al crear o editar la entidad física, se debe proveer un switch para habilitar/deshabilitar su login de manera transaccional.

### 25. Relajación Controlada de Password Complexity por Usabilidad de Negocio
**Regla:** Aunque las directrices de seguridad estándar exijan contraseñas robustas con múltiples reglas de entropía (mayúsculas, números, caracteres especiales), se deben flexibilizar estas reglas si el negocio lo requiere (por ejemplo, para soportar accesos simplificados mediante Cédula de Identidad y contraseñas cortas fáciles de memorizar para personal de campo como operarios). En tales casos, reducir la complejidad de validación en los esquemas de Zod (ej. a un mínimo de 3 caracteres libres) para evitar errores innecesarios y soporte continuo de IT.

### 26. Evitar Falsos Alertas en Consola por Extensiones de Navegador
**Regla:** Los navegadores de los usuarios suelen ejecutar extensiones que inyectan scripts cargando telemetrías externas (ej: Blackbox AI). Sus fallos de red por CORS llenan la consola del navegador con errores llamativos como `TypeError: Failed to fetch`.
- **Acción:** No asumir fallos del servidor local basándose ciegamente en la consola del navegador sin antes filtrar por el origen de la petición. La UI de la aplicación debe contar con notificaciones (toasts) claros e independientes de los errores de red del navegador.

### 27. Prevención de Doble Envío (Double Submission)
**Regla:** En formularios transaccionales que interactúan con base de datos, el botón de envío debe deshabilitarse de inmediato tras el primer clic (`disabled={isSubmitting}`). De lo contrario, un doble clic rápido generará dos peticiones concurrentes; la primera se guardará con éxito, pero la segunda devolverá un error `400` ("Usuario ya registrado") que confundirá al usuario haciéndole pensar que todo el proceso falló.

### 28. Aislamiento de Rutas Estáticas en Producción (Vite vs Express)
**Problema:** Si el middleware para servir archivos estáticos compilados (`express.static('dist')`) y la ruta fallback de la aplicación SPA (`app.get('*')`) se anidan por error dentro del bloque condicional destinado a desarrollo (`process.env.NODE_ENV !== 'production'`), el backend arrancará sin problemas en producción pero se rehusará a servir el frontend, causando pantallas en blanco o errores 404.
**Regla:** Estructurar de manera explícita la bifurcación de entornos (`if/else`) en el inicio del servidor, garantizando que el bloque de producción sirva siempre los archivos estáticos desde el directorio `dist` compilado.

### 29. Restricción de Métricas Financieras en UI (RBAC de Datos Confidenciales)
**Problema:** Mostrar el valor de las tarifas horarias y el total de costos de mano de obra a los operarios en sus módulos personales expone datos de facturación administrativa interna.
**Regla:** Ocultar condicionalmente en el frontend todas las leyendas de costos, columnas de "Precio Unitario", subtotales de dinero, inputs de modificación de tarifa y tarjetas KPI de acumulados financieros si el usuario logueado no posee privilegios administrativos (ej. `currentUser.rol === 'Operario'`). Estos usuarios deben trabajar exclusivamente con unidades físicas (como minutos, horas y descripciones).

### 30. Estrategia de Caché del Service Worker (PWA MIME Type Script Error)
**Problema:** Al cachear de forma permanente la página de entrada (`index.html`) en el Service Worker, los nuevos despliegues de producción rompen la aplicación. El navegador sirve el HTML viejo desde la caché del cliente, el cual solicita bundles JS/CSS obsoletos que ya no existen en el servidor. El servidor responde a estos recursos con el fallback `index.html` (MIME Type `text/html`), provocando que la carga del script del módulo falle por error de tipo de medio estricto en el navegador.
**Regla:** El Service Worker (`sw.js`) debe implementar una estrategia **Network-First** para los archivos de carga y navegación (`/` y `index.html`), asegurando obtener el HTML con los nombres de bundle compilados más recientes si hay conexión. La estrategia **Cache-First** se debe restringir a los assets locales en `/assets/` que contienen hashes únicos en sus nombres.

### 31. Viajes Particulares: Handler debe Saltar Verificación de Cliente/Proyecto
**Problema:** El schema Zod (`ViajeStartSchema`) permite viajes particulares mediante el .refine() con `clienteId === 'viaje_particular'`, pero el handler del endpoint `POST /api/viaje/start` ejecutaba `prisma.cliente.findUnique({ where: { id: clienteId } })` sin saltar para viajes particulares. Como `'viaje_particular'` no es un ID real en la tabla `clientes`, `findUnique` devolvía `null` y el servidor respondía 400 `CLIENTE_NOT_FOUND`.
**Regla:** Cada vez que se agregue una excepción en Zod (como `.refine()`), verificar que el handler del endpoint tenga el mismo condicional. Si el schema permite un valor mágico (`viaje_particular`), el handler debe detectar ese valor antes de hacer consultas a la DB para evitar falsos 400.

### 32. Cálculo de Costo de Combustible: Adaptar UI a Lógica de Negocio del Cliente
**Problema:** El formulario original de finalizar viaje pedía "Combustible (L)" y "Costo (Gs)" como campos separados, asumiendo que el cliente cargaba litros reales y el costo del ticket de la estación. El negocio real del cliente calcula el costo multiplicando la distancia recorrida (diferencia de km) por un costo fijo por kilómetro (ej: 1.400 Gs/km). Esto generaba confusión: el cliente ponía la diferencia de km en "Litros" y el costo por km en "Costo", causando datos inconsistentes.
**Regla:** Antes de diseñar formularios de entradas de datos, entender la lógica de negocio real del cliente. Si el costo se calcula como `distancia × costoPorKm`, la UI debe reflejar eso: un solo campo "Costo por Km" con el cálculo total mostrado dinámicamente, y el backend recibe `combustibleLitros: undefined` (null) y `combustibleCosto: distanciaOdometro * costoPorKm`. No asumir la mecánica de "litros cargados en el tanque" si el cliente no la usa.

### 33. FK Constraints en RegistroVehiculo vs IDs Mágicos (Viaje Particular)
**Problema:** El modelo `ViajeActivo` no tenía FK constraints en `clienteId`/`proyectoId`, por lo que el valor mágico `'viaje_particular'` se guardaba sin problema. Pero `RegistroVehiculo` SÍ tenía `@relation` a `Cliente`/`Proyecto`, causando `Foreign key constraint violated` (error P2003) al intentar crear un registro vehicular con esos IDs inventados.
**Regla:** Si un modelo usa IDs mágicos que no existen en tablas referenciadas, no debe tener FK constraints reales. En este caso, `RegistroVehiculo` almacena los nombres en `clienteNombre`/`proyectoNombre`, así que las relaciones FK no eran necesarias. Al removerlas, los viajes particulares funcionan correctamente. Siempre verificar que modelos relacionados tengan el mismo nivel de constraints — si uno permite valores mágicos, el otro también debe permitirlos.

### 34. Refrescar Estado Global (dbState) Después de Mutaciones Asíncronas
**Problema:** Al finalizar un viaje desde `VehiculoTab.tsx` (tab Vehículo en RegistroOperativo), el servidor creaba correctamente el `registroVehiculo` en la DB, pero el estado global `dbState` en `App.tsx` nunca se refrescaba. Al cambiar al panel Admin > Vehículos, `VehiculosAdminView` leía `data.registrosVehiculo` del estado stale y el nuevo registro no aparecía. El problema era que `RegistroOperativo` no recibía un `onRefresh`, a diferencia de `AdminPanel` y `VehiculosAdminView` que sí lo tenían.
**Regla:** Toda mutación que cree o modifique datos visibles en múltiples tabs/paneles debe gatillar un refresh del estado global. La cadena de props debe incluir `onRefresh` desde `App.tsx` hasta el componente que realiza la mutación. Si un componente nuevo (como `RegistroOperativo` o `VehiculoTab`) realiza operaciones que afectan datos compartidos, debe tener `onRefresh` igual que los demás — no asumir que el estado se actualiza solo.

### 35. Dashboard Unificado: Routing de Delete para IDs de Vehículos vs Registros de Horas
**Problema:** El Dashboard unifica registros de horas (`/api/registros/`) y registros de vehículos (`/api/vehiculo/registro/`) en una misma lista. Al eliminar desde el Dashboard, `handleDeleteRegistro` en `App.tsx` siempre llamaba a `/api/registros/:id` sin importar el tipo de registro. Los IDs de vehículos empiezan con `regveh_`, así que la petición caía en el endpoint de registros de horas, que devolvía 404.
**Regla:** Cuando dos tipos de entidades con endpoints distintos se muestran en una misma lista unificada, el handler de eliminación debe detectar el tipo por convención de ID (ej: prefijo `regveh_`) y rutear al endpoint correcto. Alternativa: incluir un campo `tipo` en los datos unificados. En este caso, se optó por detectar `id.startsWith('regveh_')` para rutear a `/api/vehiculo/registro/:id`.

### 36. Formulario de Edición Desincronizado con la Lógica de Negocio Actualizada
**Problema:** Se actualizó el modal de creación (`ModalFinalizarViaje.tsx`) para calcular el costo como `distancia × costoPorKm`, pero el formulario de edición en `VehiculosAdminView.tsx` seguía mostrando "Litros" y "Costo Total" como antes. Además, el handler PATCH del backend seguía esperando `combustibleLitros` y `precioLitro`, y el schema Zod los requería. Al abrir la edición de un registro creado con el nuevo flujo, `combustibleLitros` era `null` y el campo "Litros" aparecía vacío, confundiendo al usuario.
**Regla:** Cada vez que se modifica la lógica de creación de un recurso (qué datos ingresa el usuario y cómo se calculan), hay que actualizar en cascada:
1. Schema Zod del endpoint de update (PUT/PATCH) — remover campos obsoletos
2. Handler del endpoint — remover cálculos basados en esos campos
3. Hook de edición frontend (`startEdit`) — adaptar cómo se cargan los datos iniciales
4. Formulario de edición — reflejar los mismos inputs que el de creación
5. Submit del formulario — enviar la misma estructura de datos que el de creación
No asumir que los formularios de creación y edición pueden divergir; siempre deben estar alineados.

### 37. Métricas y Cards de Lista Desincronizadas tras Cambio de Lógica de Negocio
**Problema:** Al cambiar la lógica de combustible de "litros cargados" a "costo por km × distancia", se actualizaron el modal de creación y el formulario de edición, pero las tarjetas de métricas (totales), las cards individuales de cada viaje en la lista, y el componente `Dashboard.tsx` seguían referenciando `combustibleLitros` y mostrando "L" (litros) y "L/km". El resultado era que números de costo se etiquetaban como litros (ej: 9800.0 L cuando era Gs. 9.800).
**Regla:** Cada vez que se modifica la lógica de almacenamiento de un campo (qué representa y cómo se calcula), hay que auditar **todos** los componentes que referencian ese campo o su representación visual. La cadena completa incluye:
1. Formulario de creación
2. Formulario de edición
3. Tarjetas de métricas/resumen (totales)
4. Cards individuales en listas
5. Componentes de Dashboard que usan ese tipo de registro
6. Descripciones textuales que incluyan el campo
Buscar TODAS las referencias a `combustibleLitros`, `consumoPorKm`, `precioLitro`, `L`, `L/km` en el codebase, no solo en los formularios.

### 38. Módulo de Reportes Ignoraba Vehículos: Datos Parciales en Reportería
**Problema:** `Reportes.tsx` solo filtraba `data.registros` (MO/Insumos) e ignoraba completamente `data.registrosVehiculo`. Los filtros de cliente, proyecto, fecha y concepto no incluían viajes vehiculares, por lo que el "Total Filtrado" en Reportes mostraba cifras más bajas que el Dashboard (que sí unifica ambas fuentes). La Pre-Factura también excluía costos de vehículos de los proyectos.
**Regla:** Cuando existan múltiples fuentes de datos transaccionales (registros de horas, registros de vehículos, etc.) que representan costos para un mismo proyecto/cliente, cualquier módulo de reportería o facturación debe unificarlas antes de aplicar filtros y calcular métricas. La unificación debe hacerse al nivel del `useMemo` de datos filtrados, transformando las fuentes secundarias al mismo tipo/interfaz que la primaria (ej: mapear `RegistroVehiculo` a `RegistroItem` con concepto `'Vehículo'`). El mismo patrón que usa Dashboard debe replicarse en Reportes.

### 39. Prop `showPrices` No Pasada a Subcomponentes Causa ReferenceError en Runtime
**Problema:** Se agregó la lógica `{showPrices && (...)}` dentro de `RegistroCard` y `RegistroVehiculoCard` para ocultar montos al Operario, pero `showPrices` no estaba definida en las props de esos componentes. `RegistroCardProps` y `RegistroVehiculoCardProps` no incluían el campo `showPrices`, así que al renderizar tiraba `ReferenceError: showPrices is not defined`.
**Regla:** Cada vez que se introduce una variable condicional en un subcomponente, hay que asegurarse de que esté declarada en su interfaz de props y que se pase desde el padre. Si el componente es `React.memo`, verificar tanto la interfaz como los usos de renderizado. No asumir que una variable del closure del padre está disponible en el hijo.

### 40. `onRefresh` Debe Pasarse al Hook, No Solo al Componente Padre
**Problema:** `VehiculoTab.tsx` recibía `onRefresh` como prop y lo pasaba al modal, pero el hook `useViaje` (definido dentro del mismo archivo) usaba `onRefresh` en `finalizarViaje` sin recibirlo como parámetro. El error `onRefresh is not defined` aparecía recién en runtime al finalizar el viaje, después de que la API respondía exitosamente, porque `finalizarViaje` intentaba llamar `onRefresh()` que era `undefined` dentro del closure del hook.
**Regla:** Cuando un hook interno necesita un callback que viene del exterior (como `onRefresh`), debe recibirlo explícitamente en sus parámetros. No asumir que el hook tiene acceso al closure del componente padre, incluso si están en el mismo archivo.

### 41. Obtener kmInicial del Servidor en Lugar del Estado Local para Finalizar Viaje
**Problema:** `ModalFinalizarViaje` usaba `kmInicio` del estado local (`useViaje`) que se sincronizaba con localStorage. Si el estado local se corrompía (ej: viaje iniciado pero API rechazó la creación), `kmInicio` quedaba `null` y se calculaban distancias absurdas (kmFinal - 0). Se intentaron múltiples parches de validación que fracasaron porque la raíz era confiar en estado local no verificado.
**Solución:** Al presionar "Finalizar Viaje", el frontend ahora pide los datos reales del viaje activo a `GET /api/viaje/active/:usuario` y usa el `kmInicial` que devuelve el servidor. Como el servidor guarda el km inicial en la tabla `ViajeActivo` al crear el viaje, siempre tiene el valor correcto. El estado local solo se usa como fallback (`serverKmInicio || kmInicio || 0`).
**Regla:** Para operaciones críticas que dependen de datos precisos (como km inicial), obtener los datos del servidor en el momento de la acción en lugar de confiar en estado local que puede estar corrupto. El estado local es útil para UI instantánea, pero las operaciones transaccionales deben verificar contra el servidor.

### 42. `step="0.5"` Impide Decimales Arbitrarios en Cantidad de Insumos
**Problema:** El input de cantidad de insumos tenía `step="0.5"`, que solo permitía incrementos de 0.5 (0.5, 1.0, 1.5...). El cliente necesita cargar medidas como 0.7592 m² (1.46 × 0.52), imposible con step="0.5". Además, `parseFloat(e.target.value) || 0` resetaba a 0 si el parse fallaba en vez de permitir decimales con punto.
**Solución:** Cambiar `step="0.5"` a `step="any"` para permitir cualquier valor decimal. El servidor y la DB ya soportan decimales (`Decimal(10, 2)` en Prisma, `z.number().positive()` en Zod).
**Regla:** Usar `step="any"` en inputs de cantidad cuando el dominio de negocio requiere decimales arbitrarios (medidas, pesos, áreas). No asumir que las cantidades son siempre enteras. Verificar que todas las capas (frontend → Zod → Prisma) soporten el mismo nivel de precisión.

### 43. Bloquear Contexto (Cliente/Proyecto) También Cuando el Timer Finalizó, No Solo Mientras Corre
**Problema:** Los selects de Cliente y Proyecto se bloqueaban con `disabled={timerRunning}`, pero se desbloqueaban en cuanto el timer finalizaba (`timerEnd`). El operario podía cambiar de proyecto entre que finalizaba el timer y registraba las horas de MO, causando que el registro apareciera en un proyecto diferente al que se hizo el trabajo.
**Solución:** Cambiar la condición a `disabled={timerRunning || !!timerEnd}` para mantener el contexto bloqueado desde que arranca el timer hasta que se registra la MO. El operario no puede cambiar cliente/proyecto mientras haya un timer pendiente de registrar.
**Regla:** Toda operación de dos fases (timer → registro) debe bloquear los inputs de contexto (cliente, proyecto, colaborador) desde que se inicia la primera fase hasta que se completa la segunda. No desbloquear entre fases.

### 44. Accesibilidad: Botones Icon-Only Necesitan `aria-label`
**Problema:** 6 botones en la UI solo tenían un ícono `<X>` sin texto visible, `aria-label` ni `title`. Herramientas de auditoría (aXe) reportaban "Buttons must have discernible text". Adicionalmente, los `<select>` y `<input>` de los filtros del Dashboard no tenían `id`, por lo que los `<label>` no estaban asociados programáticamente.
**Solución:** Agregar `aria-label="Cerrar"`, `aria-label="Eliminar línea"`, `aria-label="Cambiar foto"` a cada botón icon-only. Agregar `id` a selects/inputs y `htmlFor` a sus labels correspondientes.
**Regla:** Todo botón que solo contenga un ícono debe tener `aria-label` descriptivo. Todo `<label>` debe estar asociado a su campo mediante `htmlFor` + `id`. No confiar solo en el wrapping visual del label.

### 45. Endpoint PUT `/api/proyectos/:id` Duplicado y Estado Mal Mapeado
**Problema:** Existían dos handlers para `PUT /api/proyectos/:id` (líneas 1018 y 3695). El primero ganaba por orden de registro, pero devolvía `updated.estado` (Prisma enum crudo: `'EN_PROCESO'`) en vez del valor UI (`'En Proceso'`). El segundo endpoint nunca se ejecutaba (dead code). Al editar un proyecto, el badge mostraba `'EN_PROCESO'` hasta recargar la página.
**Solución:** Mapear `updated.estado` a UI en el endpoint activo y eliminar el endpoint duplicado. El bundle se redujo de 149.6kb a 148.3kb.
**Regla:** Siempre mapear enums de Prisma a valores UI antes de devolverlos en respuestas API. No devolver `updated.estado` directamente. No dejar handlers duplicados — Express ejecuta el primero registrado y el resto es dead code que solo confunde.

### 46. Filtro de Marcaciones Usaba Match Exacto en Lugar de `contains`
**Problema:** El endpoint `/api/marcacion/admin/timeline` usaba `{ usuario }` como filtro exacto. Si el admin escribía parte de un nombre en el buscador, no encontraba nada. Además, el frontend enviaba `limite=100` que ocultaba registros antiguos.
**Solución:** Cambiar a `{ usuario: { contains, mode: 'insensitive' } }` en el servidor y eliminar el `limite=100` del frontend para usar el default de 200 del servidor.
**Regla:** Los filtros de búsqueda en paneles de administración deben usar `contains` (no match exacto) para permitir búsqueda parcial. No hardcodear límites en el frontend sin coordinación con el servidor.

### 47. Patrón Estándar de Listas para Módulos de Administración
**Problema:** Cada submódulo del AdminPanel implementaba listas de forma diferente: Clientes sin búsqueda ni paginación, Proyectos igual, Colaboradores igual. Solo Marcaciones y AuditLog tenían filtros básicos. No había un estándar.
**Solución:** Crear la skill `admin-list-pattern` en `.agents/skills/admin-list-pattern.md` que define: estados obligatorios (searchText, currentPage, itemsPerPage), cálculos (filteredItems, paginatedItems, totalPages), componentes UI reutilizables (search input, pagination footer), y reset de página al cambiar filtros.
**Regla:** Todos los módulos de administración que muestren listas de datos deben implementar el mismo patrón: búsqueda por texto, paginación con selector de items por página, y reset de página al cambiar filtros. Usar la skill `admin-list-pattern` como referencia.

### 48. ClientesTab: Primer Módulo en Implementar el Patrón `admin-list-pattern`
**Problema:** La lista de Clientes en AdminPanel mostraba todos los clientes sin filtro ni paginación. Con ~100+ clientes, la UI se volvía pesada y difícil de navegar.
**Solución:** Aplicar la skill `admin-list-pattern` en ClientesTab: agregar `searchText` state con búsqueda por nombre/código/ID, `currentPage`/`itemsPerPage` con paginación, y componentes UI de búsqueda + paginador. El contador de la sección ahora refleja resultados filtrados.
**Regla:** Al implementar el patrón en un nuevo módulo, seguir la skill en orden: (1) agregar estados, (2) agregar useEffect reset, (3) agregar useMemo filtrado, (4) agregar useMemo paginado, (5) agregar search input en JSX, (6) reemplazar `.map()` con items paginados, (7) agregar paginador al final.

### 49. ProyectosTab: Segundo Módulo en Implementar el Patrón `admin-list-pattern`
**Problema:** La lista de Proyectos en AdminPanel no tenía búsqueda, filtro por estado ni paginación. Con ~100+ proyectos, los administradores tenían que scrollear toda la lista para encontrar uno.
**Solución:** Aplicar el patrón de `admin-list-pattern` con: búsqueda por nombre/cliente/ID, filtro por estado (Pendiente/En Proceso/Completado), paginación completa con selector de items. El contador ahora refleja resultados filtrados.
**Regla:** Misma secuencia que ClientesTab. Además, usar `filterStatus` con un `<select>` para filtrar por estado enum cuando el modelo lo tenga. Filtrar también por nombre del cliente relacionado usando `data.clientes.find()`.

### 50. ColaboradoresTab: Tercer Módulo en Implementar el Patrón `admin-list-pattern`
**Problema:** El listado de colaboradores en AdminPanel no tenía búsqueda ni paginación. Con ~50+ contratistas, encontrar uno requería scrollear.
**Solución:** Aplicar el patrón `admin-list-pattern` con búsqueda por nombre/rol/usuario y paginación. El contador de la sección refleja resultados filtrados.
**Regla:** Al implementar en módulos con DataCard + inline editing, el search/pagination se agrega alrededor del `.map()` existente sin tocar la lógica de edición.

### 51. AuditLogTab: Paginación Cliente-Side con Selector de Items
**Problema:** AuditLogTab tenía un límite hardcodeado de 100 registros y mostraba todos en una lista sin paginación. Con miles de eventos de login, la UI se volvía inmanejable.
**Solución:** Agregar `currentPage`, `itemsPerPage` (default 25), `useMemo` paginado sobre `data.slice()`, y paginador con páginas numeradas acotadas a 10 botones. Se aumentó el límite del servidor de 100 a 200. El filtro por usuario resetea la página a 1.
**Regla:** Para listas largas con datos ya cargados en memoria, usar paginación client-side con `slice()`. Mantener un límite de fetch razonable (200) y paginar en cliente para evitar saturar la UI. Mostrar máximo 10 botones de página con scroll centered en la página activa.

### 52. TimelineMarcaciones: Paginación con Patrón `admin-list-pattern`
**Problema:** El timeline de marcaciones mostraba todos los registros del servidor en una lista vertical sin paginación. Con cientos de marcaciones, el listado era imposible de navegar.
**Solución:** Agregar `currentPage`, `itemsPerPage` (default 25), `useMemo` paginado y paginador con selector 25/50/100 items. Mismo patrón que AuditLogTab.
**Regla:** Misma implementación que AuditLog: paginación client-side con `slice()`, máximo 10 botones de página, selector de items.

### 53. VehiculosAdminView: Último Módulo en Implementar `admin-list-pattern`
**Problema:** La lista de viajes en el panel de vehículos no tenía paginación. Con cientos de viajes, la lista se volvía inmanejable.
**Solución:** Agregar paginación con 10/25/50 items sobre `registrosFiltrados` (que ya tenía filtro por alertas). Usar `React.useMemo` y `React.useEffect` ya que el componente importa `React` como default.
**Regla:** Todos los módulos de administración ahora tienen el mismo patrón: filtros + paginación + items-per-page selector. La skill `admin-list-pattern` documenta el estándar completo.

```
┌───────────────┬──────────────────────────────────────────┐
│ Módulo        │ Estado                                   │
├───────────────┼──────────────────────────────────────────┤
│ Clientes      │ ✅ Búsqueda + paginación                 │
├───────────────┼──────────────────────────────────────────┤
│ Proyectos     │ ✅ Búsqueda + filtro estado + paginación │
├───────────────┼──────────────────────────────────────────┤
│ Colaboradores │ ✅ Búsqueda + paginación                 │
├───────────────┼──────────────────────────────────────────┤
│ AuditLog      │ ✅ Filtro usuario + paginación           │
├───────────────┼──────────────────────────────────────────┤
│ Marcaciones   │ ✅ Filtro usuario + paginación           │
├───────────────┼──────────────────────────────────────────┤
│ Vehículos     │ ✅ Filtro alertas + paginación           │
└───────────────┴──────────────────────────────────────────┘

### 54. VehiculosAdminView: Refactor de Redundancia (Ponytail Audit)
**Problema:** `VehiculosAdminView.tsx` tenía 1.133 líneas con múltiples problemas de redundancia detectados por auditoría Ponytail: 14 `console.log` de debug, 2 modales con backdrop+container duplicado (40 líneas), tarjetas GPS Inicio/Fin duplicadas, botones foto Inicio/Fin duplicados, cache buster con `Date.now()` en cada render, 4 tarjetas de métricas con estructura repetida, imports no usados (`Calendar`, `Clock`), IIFE en JSX, y cálculos de `totales` sin `useMemo` iterando el arreglo 5 veces.
**Solución:** Extraer componentes `ModalShell`, `UbicacionCard`, `FotoButton`. Cache buster con IIFE (una vez al cargar). Tarjetas de métricas como array + `.map()`. `useMemo` en `totales`, `registrosVehiculo` y `registrosFiltrados`. Variables fuera del return en EditModal. Eliminar todos los `console.log` e imports muertos.
**Regla:** Después de cambios grandes en un componente, ejecutar auditoría Ponytail para identificar: (1) imports sin uso, (2) console.logs, (3) JSX duplicado, (4) cálculos sin memo, (5) patrones repetitivos convertibles a array+map. Bundle redujo ~11 kB (1.907 → 1.896 kB) y ~53 líneas netas eliminadas.

### 55. Dashboard: `Math.round()` Truncaba Decimales en Columna Cant/Horas
**Problema:** En el Dashboard, la columna "CANT / HORAS" usaba `Math.round(reg.cantidad)` para insumos, redondeando valores como 0.7592 a 1. El cliente necesita ver los decimales exactos.
**Solución:** Cambiar `Math.round(reg.cantidad).toLocaleString('es-PY')` por `Number(reg.cantidad).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 4 })`.
**Regla:** No usar `Math.round()` en valores que el usuario ingresó con decimales específicos. Usar `toLocaleString` con `maximumFractionDigits` para preservar la precisión original del dato.

### 56. Dashboard: Refactor de SortIcon, FilterBadge y Consolidación de Effects
**Problema:** Dashboard.tsx (1603 líneas) tenía 6 bloques duplicados de iconos de ordenamiento en headers de tabla, 4 bloques duplicados de badge "Filtrado" en charts, y 3 `useEffect` separados para resetear página al cambiar filtros/búsqueda/orden.
**Solución:** Extraer componentes `SortIcon` y `FilterBadge`. Consolidar los 3 efectos en uno con dependencias unificadas. Los componentes se definen fuera del componente principal como funciones puras sin estado.
**Regla:** Cuando un patrón JSX aparece 3+ veces en un mismo archivo, extraer a un componente. Cuando 2+ efectos tienen el mismo cuerpo, consolidarlos. Para iconos de ordenamiento en tablas, usar un componente `SortIcon` que recibe `field`, `currentField` y `currentOrder` como props.

### 57. RegistroOperativo: Eliminar 12 Imports Muertos y 7 Console Logs
**Problema:** `RegistroOperativo.tsx` tenía 2 imports muertos (`Clock`, `CheckCircle`), `ModalIniciarViaje.tsx` tenía 5 (`AnimatePresence`, `modalVariants`, `modalSpring`, `CheckCircle`, `Loader`), y `ModalFinalizarViaje.tsx` tenía 5 (`AnimatePresence`, `modalVariants`, `modalSpring`, `Square`, `AlertCircle`). También había 7 `console.error`/`console.warn` en producción que exponían datos internos del servidor.
**Solución:** Eliminar todos los imports no utilizados y reemplazar los `console.error` con comentarios silenciosos. Agregar `useMemo` en `proyectosFiltrados` y `currentUserColaborador`. Extraer componente `FeedbackBanner` para eliminar duplicación de 2 bloques idénticos de feedback animado.
**Regla:** Al auditar un componente verificar: (1) imports sin uso, (2) console.log/error/warn en producción, (3) cálculos derivados sin memo, (4) JSX duplicado extraíble a componente. Usar las skills `ponytail-review` y `code-reviewer` para detectar estos patrones automáticamente.