/**
 * Public job-scheduling façade. Routes and tests should import only from
 * here — the choice of backend (BullMQ vs in-memory) is invisible to them.
 */

import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { closeQueues } from './queue.js';
import {
  bullmqFileDeletionWorker,
  bullmqScheduleFileDeletion,
} from './bullmq-scheduler.js';
import {
  memoryScheduleFileDeletion,
  memorySchedulerClose,
  memorySchedulerSize,
} from './memory-scheduler.js';

export interface ScheduledJob {
  id: string;
  runAt: string;
  backend: 'memory' | 'bullmq';
}

/**
 * Schedule a file-deletion. Returns immediately with the job id.
 *
 * The default delay is `TEMP_FILE_TTL_MS` (1h), matching the env contract.
 */
export async function scheduleFileDeletion(
  r2Key: string,
  operationId: string,
  delayMs: number = env.TEMP_FILE_TTL_MS,
): Promise<ScheduledJob> {
  if (!r2Key || !operationId) {
    throw new Error('scheduleFileDeletion: r2Key and operationId are required');
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error('scheduleFileDeletion: delayMs must be a non-negative number');
  }

  if (env.JOB_RUNNER === 'bullmq') {
    const result = await bullmqScheduleFileDeletion(r2Key, operationId, delayMs);
    return { ...result, backend: 'bullmq' };
  }
  const result = memoryScheduleFileDeletion(r2Key, operationId, delayMs);
  return { ...result, backend: 'memory' };
}

/**
 * Boot the file-deletion worker for the active backend.
 *
 *   - bullmq: spins up the BullMQ Worker (opens Redis sockets).
 *   - memory: nothing to start — work is run inline by the scheduler.
 */
export function startWorkers(): void {
  if (env.JOB_RUNNER === 'bullmq') {
    bullmqFileDeletionWorker();
    logger.info('Background workers started', {
      backend: 'bullmq',
      workers: ['file-deletion'],
    });
  } else {
    logger.info('Background workers started', {
      backend: 'memory',
      pendingTimers: memorySchedulerSize(),
    });
  }
}

/**
 * Drain whichever backend is active.
 *
 * Both branches are safe to call when nothing has been scheduled — they're
 * no-ops in that case.
 */
export async function shutdownScheduler(): Promise<void> {
  if (env.JOB_RUNNER === 'bullmq') {
    await closeQueues();
  } else {
    await memorySchedulerClose();
  }
}
