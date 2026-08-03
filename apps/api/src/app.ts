import express, { type Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './lib/env.js';
import { httpLoggerStream } from './lib/logger.js';
import {
  apiRateLimiter,
  corsMiddleware,
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from './middleware/index.js';
import { apiRouter } from './routes/index.js';

/**
 * Build the Express app. Kept separate from `index.ts` so it can be
 * imported into integration tests without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }));

  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: httpLoggerStream }),
  );

  app.use('/api', apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
