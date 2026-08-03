/**
 * Public jobs surface — backend-agnostic.
 */
export {
  scheduleFileDeletion,
  shutdownScheduler,
  startWorkers,
  type ScheduledJob,
} from './scheduler.js';

export {
  FILE_DELETION_QUEUE,
  type FileDeletionJobData,
  type FileDeletionJobResult,
  type FileDeletionQueueName,
  executeFileDeletion,
} from './file-deletion.job.js';

/* Generic BullMQ primitives — re-exported for advanced use cases (e.g. adding
 * a second queue). Most callers should NOT touch these directly. */
export { closeQueues, createWorker, getQueue, createQueueEvents } from './queue.js';
