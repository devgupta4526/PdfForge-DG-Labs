import { createApp } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { shutdownDb } from './lib/db.js';
import { shutdownScheduler, startWorkers } from './jobs/index.js';
import { closeStorage } from './storage/index.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`PDF Forge API listening on http://${env.HOST}:${env.PORT}`, {
    env: env.NODE_ENV,
    port: env.PORT,
    storageDriver: env.STORAGE_DRIVER,
    jobRunner: env.JOB_RUNNER,
  });
});

/* ─────────────────────────────────────────────────────────────────
 * Background workers — start at boot. With JOB_RUNNER=memory this is
 * a no-op (work is run inline from setTimeout); with JOB_RUNNER=bullmq
 * it boots the BullMQ worker and opens the Redis sockets.
 * ──────────────────────────────────────────────────────────────── */
try {
  startWorkers();
} catch (err) {
  logger.error('Failed to start background workers', {
    error: err instanceof Error ? err.message : String(err),
  });
}

/* ─────────────────────────────────────────────────────────────────
 * Graceful shutdown — SIGTERM/SIGINT/uncaught + unhandled rejection.
 * Order:
 *   1. Stop accepting HTTP traffic.
 *   2. Drain background jobs (Redis sockets / pending timers).
 *   3. Close the storage driver (R2 SDK / no-op for local).
 *   4. Drain the Postgres pool.
 * ──────────────────────────────────────────────────────────────── */
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully…`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after 15s timeout');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  await new Promise<void>((resolve) => {
    server.close((closeErr) => {
      if (closeErr) logger.error('Error closing HTTP server', { error: closeErr.message });
      resolve();
    });
  });

  try {
    await shutdownScheduler();
  } catch (err) {
    logger.error('Error shutting down scheduler', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await closeStorage();
  } catch (err) {
    logger.error('Error closing storage', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await shutdownDb();
    logger.info('Database pool drained');
  } catch (dbErr) {
    logger.error('Error draining database pool', {
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }

  process.exit(exitCode);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  void shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  void shutdown('unhandledRejection', 1);
});
