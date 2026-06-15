# Sistema aFull (app-unificada)

Aplicación monolítica Full-Stack para el costeo de proyectos, registro de mano de obra y consumo de insumos en tiempo real. Construida sobre Next.js 16 (App Router), React 19, Tailwind CSS v4, Prisma 6 y PostgreSQL (Supabase).

## 🚀 Características Principales

- 📊 **Dashboard Bento Grid:** Indicadores clave (KPIs) dinámicos y métricas de rentabilidad basadas en el 35% de markup.
- 🕒 **Control de Horas Detallado:** Cálculo exacto de minutos y costos en Mano de Obra a nivel de base de datos (con trigger SQL de cruce de medianoche).
- 📦 **Consumo de Insumos:** Desglose y costeo de materiales imputados en cada proyecto.
- 🔗 **Navegación Fluida:** Shell unificada con barra de navegación móvil (bottom nav) e interactividad responsive.
- ⚡ **Velocidad Extrema:** Estados de carga optimizados con Skeleton screens (`shimmer effects`) y notificaciones dinámicas via `sonner`.
- 🔐 **Sesiones Protegidas:** Autenticación fluida con tokens JWT (cookie HTTP-only via `jose`) y protección integral por middleware.
- 🗃️ **CRUDs Integrados:** Registro interactivo de proyectos, clientes, insumos y colaboradores mediante slide-overs (`Sheets`).

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router con Turbopack)
- **Biblioteca UI:** React 19 (Client & Server Components, useTransition, useForm)
- **Estilos:** Tailwind CSS v4 + ShadCN UI
- **ORM:** Prisma Client v6
- **Base de Datos:** PostgreSQL en Supabase
- **Seguridad:** JWT (`jose`)

## ⚡ Comandos de Inicialización

1. **Instalar Dependencias:**
   ```bash
   npm install
   ```

2. **Configurar Variables de Entorno (`.env`):**
   Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
   ```env
   DATABASE_URL="postgresql://postgres.xxx:xxx@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxx:xxx@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
   JWT_SECRET="tu-clave-secreta-de-32-caracteres"
   ```

3. **Iniciar Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```

4. **Compilar para Producción:**
   ```bash
   npm run build
   ```

Para más detalles técnicos, consulta la [Documentación Completa](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/DOCUMENTATION.md) y el [Historial de Cambios](file:///c:/Users/Morochief/Downloads/Sistema%20aFull/app-unificada/CHANGELOG.md).
