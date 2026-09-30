/**
 * Vercel Serverless Function entry point
 * Bridges Express app to Vercel Serverless environment.
 */
import { app } from '../server.ts';

export default function handler(req: any, res: any) {
  try {
    // Si Vercel reescribió la URL, restaurar la ruta original solicitada
    const matchedPath = req.headers['x-matched-path'];
    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL HANDLER ERROR]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'VERCEL_HANDLER_ERROR',
          message: err?.message || 'Error processing serverless request',
        },
      }));
    }
  }
}
