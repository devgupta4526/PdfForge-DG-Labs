import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../lib/env.js';

/** 404 fallback — reached when no route matched the incoming request. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: req.id,
  });
};

/**
 * Global Express error handler. Must be registered LAST.
 *
 * - `AppError`           → status + code from the instance
 * - `ZodError`           → 400 VALIDATION_ERROR + flattened issues
 * - everything else      → 500 INTERNAL_ERROR (stack hidden in production)
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id;

  if (err instanceof AppError) {
    logger.warn('Handled application error', {
      requestId,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      path: req.originalUrl,
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    const flattened = err.flatten();
    logger.warn('Validation error', { requestId, issues: flattened, path: req.originalUrl });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: flattened,
      },
      requestId,
    });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Unhandled error', {
    requestId,
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
      ...(env.NODE_ENV !== 'production' ? { details: { stack: error.stack } } : {}),
    },
    requestId,
  });
};
