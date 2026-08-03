/**
 * PDF tooling routes. Mounted at `/api/pdf` from `routes/index.ts`.
 *
 * Each tool gets its own sub-router so the surface stays composable:
 *   POST /api/pdf/compress
 */

import { Router } from 'express';

import { compressRouter } from './compress.js';

const router = Router();

router.use('/compress', compressRouter);

export { router as pdfRouter };
