/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema aFull - Server Entry Point (modular)
 * Refactor: monolito de 5080 lineas -> 14 routers modulares en src/server/routes/
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { seedUsersIfEmpty } from './server-auth.ts';

import { logger } from './src/server/config/logger.ts';
import { csrfTokens } from './src/server/shared.ts';

import { authRouter } from './src/server/routes/auth.routes.ts';
import { usersRouter } from './src/server/routes/users.routes.ts';
import { clientesRouter } from './src/server/routes/clientes.routes.ts';
import { proyectosRouter } from './src/server/routes/proyectos.routes.ts';
import { colaboradoresRouter } from './src/server/routes/colaboradores.routes.ts';
import { sucursalesRouter } from './src/server/routes/sucursales.routes.ts';
import { pedidosRouter } from './src/server/routes/pedidos.routes.ts';
import { portalRouter } from './src/server/routes/portal.routes.ts';
import { timerRouter } from './src/server/routes/timer.routes.ts';
import { viajeRouter } from './src/server/routes/viaje.routes.ts';
import { vehiculoRouter } from './src/server/routes/vehiculo.routes.ts';
import { carteraRouter } from './src/server/routes/cartera.routes.ts';
import { importRouter } from './src/server/routes/import.routes.ts';
import { presupuestosRouter } from './src/server/routes/presupuestos.routes.ts';
import { hojasRutaRouter } from './src/server/routes/hojasRuta.routes.ts';
import { operarioRouter } from './src/server/routes/operario.routes.ts';
import { dataRouter } from './src/server/routes/data.routes.ts';
import { registrosRouter } from './src/server/routes/registros.routes.ts';
import { marcacionRouter } from './src/server/routes/marcacion.routes.ts';
import { auditRouter } from './src/server/routes/audit.routes.ts';
import { permisosRouter } from './src/server/routes/permisos.routes.ts';
import { insumosRouter, seedInsumosIfEmpty } from './src/server/routes/insumos.routes.ts';
import { facturasCompraRouter } from './src/server/routes/facturasCompra.routes.ts';
import { startPedidosRetentionJob } from './src/server/jobs/pedidosRetention.ts';

declare global {
  namespace Express {
    interface Request {
      user?: import('./src/types.ts').JWTPayload;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;

const isProduction = process.env.NODE_ENV === 'production';
logger.info(`[HELMET] Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode - CSP ${isProduction ? 'ENABLED' : 'DISABLED'}`);

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.APP_URL || `http://localhost:${PORT}`)
    : [`http://localhost:${PORT}`, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

function validateCSRF(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionId = req.cookies?.sessionId;
  if (!sessionId || !csrfToken) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_TOKEN_MISSING', message: 'Token CSRF requerido' } });
  }
  const storedToken = csrfTokens.get(sessionId);
  if (!storedToken || storedToken.token !== csrfToken) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_TOKEN_INVALID', message: 'Token CSRF invalido' } });
  }
  next();
}

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/auth/login' || req.path === '/auth/logout' || req.path === '/csrf-token' || req.path.startsWith('/portal/')) {
    return next();
  }
  validateCSRF(req, res, next);
});

// ============ ROUTERS MODULARES ============
app.use('/api', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/proyectos', proyectosRouter);
app.use('/api/colaboradores', colaboradoresRouter);
app.use('/api/admin/sucursales', sucursalesRouter);
app.use('/api/admin/pedidos', pedidosRouter);
app.use('/api/portal', portalRouter);
app.use('/api/timer', timerRouter);
app.use('/api/viaje', viajeRouter);
app.use('/api/vehiculo', vehiculoRouter);
app.use('/api/admin/cartera', carteraRouter);
app.use('/api', importRouter);
app.use('/api/admin/presupuestos', presupuestosRouter);
app.use('/api/admin/hojas-ruta', hojasRutaRouter);
app.use('/api/operario', operarioRouter);
app.use('/api', dataRouter);
app.use('/api/registros', registrosRouter);
app.use('/api/marcacion', marcacionRouter);
app.use('/api/audit', auditRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/insumos', insumosRouter);
app.use('/api/facturas-compra', facturasCompraRouter);

// --- Static files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Global Error Handler ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('[ERROR HANDLER]', err);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'Error interno del servidor',
      ...(isDevelopment && err.stack && { stack: err.stack })
    }
  });
});

// --- Vite Dev Server / Static Files / Start ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    const fs = await import('fs');
    // IMPORTANTE: appType 'custom' para que no capture rutas que manejamos nosotros.
    // Servir portal.html ANTES de los middlewares de Vite para que /portal/:token
    // no caiga en el fallback SPA de index.html.
    // Usar vite.transformIndexHtml para que Vite inyecte el preamble de React Refresh (HMR).
    app.get('/portal/:token', async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      try {
        let raw = fs.readFileSync(path.resolve(process.cwd(), 'portal.html'), 'utf-8');
        raw = await vite.transformIndexHtml(req.url, raw);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(raw);
      } catch (e: any) {
        res.status(500).end(e.message);
      }
    });
    // Middlewares de Vite: sirven los .ts/.tsx con HMR
    app.use(vite.middlewares);
    // Fallback SPA: todo lo que no matchee arriba, sirve index.html con HMR preamble
    app.get('*', async (req: Request, res: Response) => {
      try {
        let raw = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        raw = await vite.transformIndexHtml(req.url, raw);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(raw);
      } catch (e: any) {
        res.status(500).end(e.message);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/portal/:token', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'portal.html'));
    });
    app.get('*', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`[Sistema aFull] Server running securely on http://localhost:${PORT}`);
    await seedUsersIfEmpty();
    await seedInsumosIfEmpty();
    startPedidosRetentionJob();
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export { app };
