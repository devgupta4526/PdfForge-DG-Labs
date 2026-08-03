import { Router } from 'express';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { healthRouter } from './health.js';
import { pdfRouter } from './pdf/index.js';
import { storageRouter } from './storage.js';

const router = Router();

/**
 * Top-level API router. Mounted at `/api` from `src/index.ts`.
 * Add new feature routers here.
 */
router.use('/health', healthRouter);
router.use('/pdf', pdfRouter);

// Storage upload/download endpoints exist only when the local driver is
// active. In R2 mode the client uploads directly to Cloudflare.
if (env.STORAGE_DRIVER === 'local') {
  router.use('/storage', storageRouter);
  logger.info('Mounted local storage routes', { path: '/api/storage' });
}

export { router as apiRouter };
