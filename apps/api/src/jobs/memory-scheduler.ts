/**
 * In-process job scheduler — used when JOB_RUNNER=memory (the dev default).
 *
 * Behaviour parity with BullMQ:
 *   - Stable, idempotent job IDs (`del:{operationId}:{r2Key}`).
 *   - 3 attempts, exponential backoff (5s → 10s → 20s).
 *   - Graceful close drains all pending timers.
 *
 * What it does NOT do (and why that's OK for dev):
 *   - Persistence across restarts. A pending delete is lost if the API is
 *     killed; the file lingers on disk under `LOCAL_STORAGE_DIR/temp/...`
 *     until the next manual cleanup. A `tmpwatch`-style script could mop
 *     these up, but the prod path (BullMQ) never has this problem.
 *
 * The env validator rejects this backend in production, so the parity gap
 * stays contained to dev.
 */

import { logger } from '../lib/logger.js';
import {
  executeFileDeletion,
  FILE_DELETION_QUEUE,
  type FileDeletionJobData,
  type FileDeletionJobResult,
} from './file-deletion.job.js';

interface PendingTask {
  timer: NodeJS.Timeout;
  attempt: number;
}

const RETRY_BACKOFF_MS = [5_000, 10_000, 20_000] as const;
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

const pending = new Map<string, PendingTask>();

function scheduleAttempt(
  jobId: string,
  data: FileDeletionJobData,
  attempt: number,
  delayMs: number,
): void {
  const timer = setTimeout(() => {
    pending.delete(jobId);

    void executeFileDeletion(data, { jobId, attempt })
      .then((result: FileDeletionJobResult) => {
        logger.info('In-memory job completed', {
          queue: FILE_DELETION_QUEUE,
          jobId,
          attempts: attempt,
          result,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_ATTEMPTS) {
          const nextDelay = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[MAX_ATTEMPTS - 1] ?? 5_000;
          logger.warn('In-memory job failed — retrying', {
            queue: FILE_DELETION_QUEUE,
            jobId,
            attempt,
            nextAttempt: attempt + 1,
            nextDelayMs: nextDelay,
            error: message,
          });
          scheduleAttempt(jobId, data, attempt + 1, nextDelay);
        } else {
          logger.error('In-memory job exhausted retries', {
            queue: FILE_DELETION_QUEUE,
            jobId,
            attempts: attempt,
            error: message,
          });
        }
      });
  }, delayMs);
  timer.unref();
  pending.set(jobId, { timer, attempt });
}

export function memoryScheduleFileDeletion(
  r2Key: string,
  operationId: string,
  delayMs: number,
): { id: string; runAt: string } {
  const jobId = `del:${operationId}:${r2Key}`;
  if (pending.has(jobId)) {
    logger.debug('In-memory scheduler: duplicate jobId — ignoring', { jobId });
    return { id: jobId, runAt: 'pending' };
  }

  scheduleAttempt(jobId, { r2Key, operationId }, 1, Math.max(0, delayMs));

  const runAt = new Date(Date.now() + delayMs).toISOString();
  logger.info('File deletion scheduled (memory)', {
    queue: FILE_DELETION_QUEUE,
    jobId,
    r2Key,
    operationId,
    delayMs,
    runAt,
  });
  return { id: jobId, runAt };
}

export async function memorySchedulerClose(): Promise<void> {
  for (const { timer } of pending.values()) {
    clearTimeout(timer);
  }
  const count = pending.size;
  pending.clear();
  if (count > 0) {
    logger.info('In-memory scheduler closed', { drainedTimers: count });
  }
}

/** Test/observability hook — number of pending timers. */
export function memorySchedulerSize(): number {
  return pending.size;
}
