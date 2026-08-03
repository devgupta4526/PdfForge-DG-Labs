import cors, { type CorsOptions } from 'cors';
import type { RequestHandler } from 'express';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

/**
 * CORS policy:
 *  - In development: reflect any origin (so `localhost:3000`, IDE proxies,
 *    LAN devices, etc. all work without configuration).
 *  - In production: allow only the explicit origins listed in `CORS_ORIGINS`.
 *  - Same-origin / curl / server-to-server (no `Origin` header) are always allowed.
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }

    if (env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    logger.warn('Blocked CORS origin', { origin });
    callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86_400,
};

export const corsMiddleware: RequestHandler = cors(corsOptions);
