/**
 * BullMQ-backed file-deletion scheduler — used when JOB_RUNNER=bullmq.
 *
 * Wraps the generic queue + worker primitives with the file-deletion-specific
 * payload shape, defaults, and the same `executeFileDeletion` body the
 * in-memory backend uses.
 */

import type { Job, Queue, Worker } from 'bullmq';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { createWorker, getQueue } from './queue.js';
import {
  executeFileDeletion,
  FILE_DELETION_QUEUE,
  type FileDeletionJobData,
  type FileDeletionJobResult,
  type FileDeletionQueueName,
} from './file-deletion.job.js';

export type FileDeletionJob = Job<FileDeletionJobData, FileDeletionJobResult, FileDeletionQueueName>;

export function bullmqFileDeletionQueue(): Queue<
  FileDeletionJobData,
  FileDeletionJobResult,
  FileDeletionQueueName
> {
  return getQueue<FileDeletionJobData, FileDeletionJobResult, FileDeletionQueueName>(
    FILE_DELETION_QUEUE,
  );
}

export async function bullmqScheduleFileDeletion(
  r2Key: string,
  operationId: string,
  delayMs: number,
): Promise<{ id: string; runAt: string }> {
  const jobId = `del:${operationId}:${r2Key}`;
  const job = await bullmqFileDeletionQueue().add(
    FILE_DELETION_QUEUE,
    { r2Key, operationId },
    {
      jobId,
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 1000, age: 24 * 3600 },
      removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
    },
  );

  const runAt = new Date(Date.now() + delayMs).toISOString();
  logger.info('File deletion scheduled (bullmq)', {
    jobId: job.id ?? jobId,
    r2Key,
    operationId,
    delayMs,
    runAt,
  });
  return { id: job.id ?? jobId, runAt };
}

let cachedWorker:
  | Worker<FileDeletionJobData, FileDeletionJobResult, FileDeletionQueueName>
  | undefined;

export function bullmqFileDeletionWorker(): Worker<
  FileDeletionJobData,
  FileDeletionJobResult,
  FileDeletionQueueName
> {
  if (!cachedWorker) {
    cachedWorker = createWorker<FileDeletionJobData, FileDeletionJobResult, FileDeletionQueueName>({
      name: FILE_DELETION_QUEUE,
      processor: (job) =>
        executeFileDeletion(job.data, {
          jobId: job.id ?? 'unknown',
          attempt: job.attemptsMade + 1,
        }),
      concurrency: env.WORKER_CONCURRENCY,
    });
  }
  return cachedWorker;
}
