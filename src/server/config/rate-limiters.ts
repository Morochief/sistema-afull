/**
 * Shared rate limiters.
 * Extracted from server.ts so all route modules can reuse them.
 */

import rateLimit from 'express-rate-limit';

/** Rate limiter for authentication endpoint (login). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 500,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiados intentos de inicio de sesión. Por favor, intentá nuevamente en 15 minutos.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limiter for public portal endpoints (client order portal). */
export const portalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes. Por favor, intentá nuevamente en un minuto.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
