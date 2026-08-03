import { Router, type RequestHandler } from 'express';
import { HealthStatusSchema, type HealthStatus } from '@pdf-forge/shared';
import { env } from '../lib/env.js';

const router = Router();

const APP_VERSION = process.env['npm_package_version'] ?? '0.1.0';

const handleHealthCheck: RequestHandler = (_req, res) => {
  const payload: HealthStatus = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: env.NODE_ENV,
  };

  // Validate before sending — guarantees the response always matches the
  // shared contract consumed by the frontend.
  const parsed = HealthStatusSchema.parse(payload);
  res.status(200).json(parsed);
};

router.get('/', handleHealthCheck);

export { router as healthRouter };
