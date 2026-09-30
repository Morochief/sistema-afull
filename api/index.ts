/**
 * Vercel Serverless Function entry point
 * Bridges Express app to Vercel Serverless environment with dynamic loading.
 */

let appInstance: any = null;
let loadError: any = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (loadError) throw loadError;
  try {
    const mod = await import('../server.ts');
    appInstance = mod.app;
    return appInstance;
  } catch (err: any) {
    loadError = err;
    console.error('[CRITICAL] Failed to load server.ts in Vercel Lambda:', err);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    // Si Vercel reescribió la URL, restaurar la ruta original solicitada
    const matchedPath = req.headers['x-matched-path'];
    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    }
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL HANDLER ERROR]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'LAMBDA_STARTUP_CRASH',
          message: err?.message || 'Error processing serverless request',
          stack: err?.stack,
        },
      }));
    }
  }
}
