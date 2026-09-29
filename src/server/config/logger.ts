/**
 * Shared environment-aware logger.
 * Extracted from server.ts / server-auth.ts to avoid duplication.
 */

export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  info: console.log,
  warn: console.warn,
  error: console.error,
};
